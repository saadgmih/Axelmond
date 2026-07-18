import { lazy, Suspense } from "react";

const LatexText = lazy(() => import("./LatexText"));

interface LazyLatexTextProps {
  value: string;
  className?: string;
  compact?: boolean;
}

export default function LazyLatexText({ value, className = "", compact = false }: LazyLatexTextProps) {
  return (
    <Suspense fallback={<span className={className}>{value}</span>}>
      <LatexText value={value} className={className} compact={compact} />
    </Suspense>
  );
}
