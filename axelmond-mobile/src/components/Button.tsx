import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { useTheme } from "../hooks/useTheme";

type ButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export default function Button({ label, variant = "primary", loading, disabled, style, ...rest }: ButtonProps) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  const variantStyles = {
    primary: { backgroundColor: colors.primaryDark },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    ghost: { backgroundColor: "transparent" },
    danger: { backgroundColor: colors.danger },
  } as const;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
        variantStyles[variant],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style as never,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      <Text style={[styles.label, { color: variant === "ghost" ? colors.primary : colors.text }]}>
        {loading ? "Chargement..." : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  label: { fontWeight: "700", fontSize: 15 },
});
