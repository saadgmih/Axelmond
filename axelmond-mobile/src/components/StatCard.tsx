import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type StatCardProps = {
  label: string;
  value: string | number;
  accent?: string;
};

export default function StatCard({ label, value, accent }: StatCardProps) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md }]}>
      <Text style={[styles.value, { color: accent || colors.primary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
});
