import React, { createContext, useContext, useMemo } from "react";
import { darkTheme, lightTheme, type AppTheme } from "../theme/index";

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
});

export function ThemeProvider({
  children,
  mode = "dark",
}: {
  children: React.ReactNode;
  mode?: "dark" | "light";
}) {
  const value = useMemo(
    () => ({
      theme: mode === "light" ? lightTheme : darkTheme,
      isDark: mode !== "light",
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
