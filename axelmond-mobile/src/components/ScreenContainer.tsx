import { ActivityIndicator, StyleSheet, Text, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";

type ScreenContainerProps = ViewProps & {
  loading?: boolean;
  title?: string;
  subtitle?: string;
};

export default function ScreenContainer({
  children,
  loading,
  title,
  subtitle,
  style,
  ...rest
}: ScreenContainerProps) {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.container, { paddingHorizontal: spacing.md }, style]} {...rest}>
        {(title || subtitle) && (
          <View style={[styles.header, { paddingBottom: spacing.md }]}>
            {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
          </View>
        )}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: { paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1 },
});
