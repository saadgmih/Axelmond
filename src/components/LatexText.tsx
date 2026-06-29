import katex from "katex";
import type { ReactNode } from "react";

type LatexSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; displayMode: boolean; source: string };

type LatexTextProps = {
  value?: string | null;
  className?: string;
  compact?: boolean;
};

const DELIMITERS = [
  { open: "$$", close: "$$", displayMode: true },
  { open: "\\[", close: "\\]", displayMode: true },
  { open: "\\(", close: "\\)", displayMode: false },
  { open: "$", close: "$", displayMode: false },
] as const;

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findNextDelimiter(text: string, startIndex: number) {
  let best: { index: number; delimiter: (typeof DELIMITERS)[number] } | null = null;

  for (let index = startIndex; index < text.length; index += 1) {
    if (isEscaped(text, index)) continue;

    for (const delimiter of DELIMITERS) {
      if (!text.startsWith(delimiter.open, index)) continue;
      if (delimiter.open === "$" && text[index + 1]?.trim() === "") continue;
      if (!best || index < best.index || (index === best.index && delimiter.open.length > best.delimiter.open.length)) {
        best = { index, delimiter };
      }
    }

    if (best?.index === index) break;
  }

  return best;
}

function findClosingDelimiter(text: string, delimiter: (typeof DELIMITERS)[number], startIndex: number): number {
  for (let index = startIndex; index < text.length; index += 1) {
    if (isEscaped(text, index)) continue;
    if (text.startsWith(delimiter.close, index)) return index;
  }
  return -1;
}

export function splitLatexText(text: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const next = findNextDelimiter(text, cursor);
    if (!next) {
      segments.push({ type: "text", value: text.slice(cursor) });
      break;
    }

    if (next.index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, next.index) });
    }

    const mathStart = next.index + next.delimiter.open.length;
    const closeIndex = findClosingDelimiter(text, next.delimiter, mathStart);
    if (closeIndex === -1) {
      segments.push({ type: "text", value: text.slice(next.index) });
      break;
    }

    const sourceEnd = closeIndex + next.delimiter.close.length;
    segments.push({
      type: "math",
      value: text.slice(mathStart, closeIndex).trim(),
      displayMode: next.delimiter.displayMode,
      source: text.slice(next.index, sourceEnd),
    });
    cursor = sourceEnd;
  }

  return segments.filter((segment) => segment.value.length > 0);
}

function renderLatexSegment(segment: Extract<LatexSegment, { type: "math" }>): ReactNode {
  try {
    return (
      <span
        className={segment.displayMode ? "latex-rendered latex-rendered-display" : "latex-rendered"}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(segment.value, {
            displayMode: segment.displayMode,
            throwOnError: false,
            strict: "ignore",
            trust: false,
          }),
        }}
      />
    );
  } catch {
    return <code className="rounded bg-rose-950/50 px-1.5 py-0.5 text-rose-200">{segment.source}</code>;
  }
}

export default function LatexText({ value, className = "", compact = false }: LatexTextProps) {
  const segments = splitLatexText(value ?? "");

  if (segments.length === 0) {
    return null;
  }

  return (
    <span className={`latex-content ${compact ? "latex-content--compact" : ""} ${className}`.trim()}>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <span key={`${index}-text`} className="whitespace-pre-wrap">
            {segment.value}
          </span>
        ) : (
          <span key={`${index}-math`}>{renderLatexSegment(segment)}</span>
        ),
      )}
    </span>
  );
}
