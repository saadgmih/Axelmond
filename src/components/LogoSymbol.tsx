import React from "react";

interface LogoSymbolProps {
  className?: string;
}

export default function LogoSymbol({ className = "w-10 h-10" }: LogoSymbolProps) {
  return (
    <img
      src="/performance-logo-symbol.png"
      alt="Performance Académique"
      className={`${className} block object-contain select-none`}
      decoding="async"
      draggable={false}
    />
  );
}
