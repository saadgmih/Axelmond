import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type BrandHeaderProps = {
  subtitle?: string;
  compact?: boolean;
};

export default function BrandHeader({ subtitle, compact }: BrandHeaderProps) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.wrap, { marginBottom: compact ? spacing.md : spacing.lg }]}>
      <View style={[styles.badge, { backgroundColor: colors.cardGlow, borderColor: colors.border, borderRadius: radius.pill }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>Axelmond Research Labs</Text>
      </View>
      <Text style={[styles.brand, { color: colors.text, fontSize: compact ? 26 : 34 }]}>Axelmond</Text>
      <View style={[styles.accentLine, { backgroundColor: colors.gradientEnd }]} />
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  brand: {
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  accentLine: {
    width: 56,
    height: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
});
