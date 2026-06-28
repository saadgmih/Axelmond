import React from "react";

interface LogoSymbolProps {
  className?: string;
}

export default function LogoSymbol({ className = "w-10 h-10" }: LogoSymbolProps) {
  return (
    <img
      src="/logo-symbol.png"
      alt="Performance Académique"
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
}
