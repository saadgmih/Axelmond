import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: string;
  onActionPress?: () => void;
};

export default function SectionHeader({ title, subtitle, action, onActionPress }: SectionHeaderProps) {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={[styles.wrap, { marginBottom: spacing.sm }]}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Text style={[styles.action, { color: colors.primary }]} onPress={onActionPress}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  action: {
    fontWeight: "700",
    fontSize: 13,
  },
});
