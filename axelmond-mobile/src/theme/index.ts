export const darkColors = {
  background: "#0f172a",
  backgroundDeep: "#020617",
  surface: "#1e293b",
  surfaceLight: "#334155",
  border: "#334155",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  textSoft: "#cbd5e1",
  primary: "#818cf8",
  primaryDark: "#6366f1",
  accent: "#e6007e",
  accentSoft: "#f472b6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  gradientStart: "#6366f1",
  gradientMid: "#8b5cf6",
  gradientEnd: "#e6007e",
  cardGlow: "rgba(129, 140, 248, 0.12)",
};

export const lightColors = {
  background: "#f8fafc",
  backgroundDeep: "#eef2ff",
  surface: "#ffffff",
  surfaceLight: "#e2e8f0",
  border: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#64748b",
  textSoft: "#475569",
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  accent: "#db2777",
  accentSoft: "#ec4899",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  gradientStart: "#6366f1",
  gradientMid: "#8b5cf6",
  gradientEnd: "#db2777",
  cardGlow: "rgba(99, 102, 241, 0.08)",
};

export type ThemeColors = typeof darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  hero: 32,
  title: 24,
  subtitle: 18,
  body: 15,
  caption: 12,
  label: 11,
};

export type AppTheme = {
  mode: "dark" | "light";
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export const darkTheme: AppTheme = {
  mode: "dark",
  colors: darkColors,
  spacing,
  radius,
  typography,
};

export const lightTheme: AppTheme = {
  mode: "light",
  colors: lightColors,
  spacing,
  radius,
  typography,
};

// Default v1: dark mode (light theme ready for future toggle)
export const colors = darkColors;
