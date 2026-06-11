import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/colors";

export default function LogoHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>Axelmond</Text>
      <Text style={styles.labs}>Research Labs</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brand: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  labs: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
