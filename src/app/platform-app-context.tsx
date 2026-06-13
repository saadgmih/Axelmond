import { createContext, useContext, type ReactNode } from "react";
import type { PlatformAppContextValue } from "./platform-app-types";

const PlatformAppContext = createContext<PlatformAppContextValue | null>(null);

export function PlatformAppProvider({
  value,
  children,
}: {
  value: PlatformAppContextValue;
  children: ReactNode;
}) {
  return (
    <PlatformAppContext.Provider value={value}>
      {children}
    </PlatformAppContext.Provider>
  );
}

export function usePlatformAppContext(): PlatformAppContextValue {
  const value = useContext(PlatformAppContext);
  if (!value) {
    throw new Error("usePlatformAppContext must be used within PlatformAppProvider");
  }
  return value;
}
