import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, radius, spacing } from "../theme/colors";

type ButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export default function Button({ label, variant = "primary", loading, disabled, style, ...rest }: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style as never,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{loading ? "Chargement..." : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  ghostLabel: {
    color: colors.primary,
  },
});
