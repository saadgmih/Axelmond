import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
};

export default function EmptyState({
  icon = "folder-open-outline",
  title,
  message,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.wrap, { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={36} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderWidth: 1,
    marginTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
