import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  minItemsToVirtualize?: number;
  variableHeight?: boolean;
  className?: string;
  style?: CSSProperties;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
}(sizes: number[]) {
  let totalHeight = 0;
  const offsets = sizes.map((size) => {
    const top = totalHeight;
    totalHeight += size;
    return top;
  });
  return { offsets, totalHeight };
}

function findStartIndex(offsets: number[], scrollTop: number) {
  if (offsets.length === 0) return 0;
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (offsets[mid] <= scrollTop) low = mid;
    else high = mid - 1;
  }
  return low;
}

function findEndIndex(offsets: number[], sizes: number[], scrollBottom: number, startIndex: number) {
  let end = startIndex;
  while (end < offsets.length && offsets[end] < scrollBottom) {
    end += 1;
  }
  return Math.min(offsets.length, end + 1);
}

function MeasuredRow<T>({
  index,
  item,
  top,
  estimateSize,
  variableHeight,
  onMeasure,
  renderItem,
}: {
  index: number;
  item: T;
  top: number;
  estimateSize: number;
  variableHeight: boolean;
  onMeasure: (index: number, height: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!variableHeight) return;
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height > 0) onMeasure(index, height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [index, item, variableHeight, onMeasure]);

  return (
    <div
      ref={ref}
      className="virtual-list-item absolute left-0 right-0"
      style={{ top, minHeight: variableHeight ? undefined : estimateSize }}
    >
      {renderItem(item, index)}
    </div>
  );
}

export function VirtualList<T>({
  items,
  estimateSize = 72,
  overscan = 6,
  minItemsToVirtualize = 24,
  variableHeight = false,
  className,
  style,
  getKey,
  renderItem,
  containerRef,
}: VirtualListProps<T>) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = containerRef ?? internalRef;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [sizes, setSizes] = useState<number[]>([]);

  const itemKeys = useMemo(() => items.map((item, index) => getKey(item, index)).join("|"), [items, getKey]);

  useEffect(() => {
    setSizes(items.map(() => estimateSize));
  }, [itemKeys, estimateSize, items.length]);

  const onMeasure = useCallback((index: number, height: number) => {
    setSizes((prev) => {
      if (prev[index] === height) return prev;
      const next = [...prev];
      next[index] = height;
      return next;
    });
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const update = () => setViewportHeight(element.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRef]);

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setScrollTop(element.scrollTop);
  }, [scrollRef]);

  if (items.length < minItemsToVirtualize) {
    return (
      <div className={className} style={style}>
        {items.map((item, index) => (
          <div key={getKey(item, index)} className="virtual-list-item">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  const effectiveSizes =
    sizes.length === items.length ? sizes : items.map((_, index) => sizes[index] ?? estimateSize);
  const { offsets, totalHeight } = buildOffsets(effectiveSizes);

  const startIndex = variableHeight
    ? Math.max(0, findStartIndex(offsets, scrollTop) - overscan)
    : Math.max(0, Math.floor(scrollTop / estimateSize) - overscan);

  const endIndex = variableHeight
    ? Math.min(
        items.length,
        findEndIndex(offsets, effectiveSizes, scrollTop + (viewportHeight || estimateSize), startIndex) + overscan,
      )
    : Math.min(
        items.length,
        startIndex + Math.ceil((viewportHeight || estimateSize) / estimateSize) + overscan * 2,
      );

  return (
    <div ref={scrollRef} className={className} style={{ overflowY: "auto", ...style }} onScroll={onScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.slice(startIndex, endIndex).map((item, offset) => {
          const index = startIndex + offset;
          return (
            <MeasuredRow
              key={getKey(item, index)}
              index={index}
              item={item}
              top={offsets[index] ?? index * estimateSize}
              estimateSize={estimateSize}
              variableHeight={variableHeight}
              onMeasure={onMeasure}
              renderItem={renderItem}
            />
          );
        })}
      </div>
    </div>
  );
}
