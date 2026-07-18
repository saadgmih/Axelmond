import React from "react";

interface LogoSymbolProps {
  className?: string;
}

export default function LogoSymbol({ className = "w-10 h-10" }: LogoSymbolProps) {
  return (
    <img
      src="/performance-logo-003a24a4-192.png"
      alt="Performance Académique"
      className={`${className} block object-contain select-none`}
      width={192}
      height={192}
      fetchPriority="high"
      decoding="async"
      draggable={false}
    />
  );
}
