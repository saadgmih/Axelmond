import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/Button";
import Input from "../components/Input";
import LogoHeader from "../components/LogoHeader";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { colors, spacing } from "../theme/colors";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [sector, setSector] = useState<"student" | "teacher">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [filiere, setFiliere] = useState("");
  const [professorInviteCode, setProfessorInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role: sector === "student" ? "STUDENT" : "PROFESSOR",
        filiere: sector === "student" ? filiere.trim() : undefined,
        professorInviteCode: sector === "teacher" ? professorInviteCode.trim() : undefined,
      });
      setMessage(result.message || "Compte créé. Vérifiez votre e-mail puis connectez-vous.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LogoHeader subtitle="Créer votre compte Axelmond" />

          <View style={styles.sectorRow}>
            <Pressable style={[styles.sectorBtn, sector === "student" && styles.sectorActive]} onPress={() => setSector("student")}>
              <Text style={styles.sectorText}>Étudiant</Text>
            </Pressable>
            <Pressable style={[styles.sectorBtn, sector === "teacher" && styles.sectorActive]} onPress={() => setSector("teacher")}>
              <Text style={styles.sectorText}>Enseignant</Text>
            </Pressable>
          </View>

          <Input label="Nom complet" value={fullName} onChangeText={setFullName} />
          <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
          {sector === "student" ? (
            <Input label="Filière (optionnel)" value={filiere} onChangeText={setFiliere} />
          ) : (
            <Input label="Code invitation professeur" value={professorInviteCode} onChangeText={setProfessorInviteCode} />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}

          <Button label="Créer mon compte" loading={loading} onPress={handleRegister} />
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
            <Text style={styles.link}>Déjà inscrit ? Se connecter</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl, paddingTop: spacing.lg },
  sectorRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectorBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectorActive: {
    borderColor: colors.primary,
    backgroundColor: "#1e1b4b",
  },
  sectorText: {
    color: colors.text,
    fontWeight: "700",
  },
  error: { color: colors.danger, marginBottom: spacing.md },
  success: { color: colors.success, marginBottom: spacing.md },
  linkWrap: { marginTop: spacing.lg, alignItems: "center" },
  link: { color: colors.primary, fontWeight: "700" },
});
