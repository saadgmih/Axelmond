import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../hooks/useTheme";

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export default function Input({ label, error, style, ...rest }: InputProps) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.wrap, { marginBottom: spacing.md }]}>
      <Text style={[styles.label, { color: colors.textSoft }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            color: colors.text,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, paddingVertical: 14, fontSize: 15 },
  error: { fontSize: 12, marginTop: 4 },
});
