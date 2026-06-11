import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/Button";
import Input from "../components/Input";
import LogoHeader from "../components/LogoHeader";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import type { ApiError } from "../types";
import { colors, spacing } from "../theme/colors";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login, verifyEmail } = useAuth();
  const [sector, setSector] = useState<"student" | "teacher">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = sector === "student" ? "STUDENT" : "PROFESSOR";

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email, password, role);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.verificationRequired) {
        setNeedsVerification(true);
        setVerificationEmail(apiErr.email || email);
        setError("Vérifiez votre e-mail avec le code reçu.");
      } else {
        setError(apiErr.message || "Connexion impossible");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifyEmail(verificationEmail, verificationCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LogoHeader subtitle="Plateforme académique mobile Axelmond Research Labs" />

          <View style={styles.sectorRow}>
            <Pressable style={[styles.sectorBtn, sector === "student" && styles.sectorActive]} onPress={() => setSector("student")}>
              <Text style={styles.sectorText}>Étudiant</Text>
            </Pressable>
            <Pressable style={[styles.sectorBtn, sector === "teacher" && styles.sectorActive]} onPress={() => setSector("teacher")}>
              <Text style={styles.sectorText}>Enseignant</Text>
            </Pressable>
          </View>

          {!needsVerification ? (
            <>
              <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <Input label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Se connecter" loading={loading} onPress={handleLogin} />
            </>
          ) : (
            <>
              <Text style={styles.info}>Saisissez le code envoyé à {verificationEmail}</Text>
              <Input label="Code de vérification" value={verificationCode} onChangeText={setVerificationCode} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Valider le code" loading={loading} onPress={handleVerify} />
            </>
          )}

          <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkWrap}>
            <Text style={styles.link}>Pas de compte ? Créer un compte</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  info: {
    color: colors.textSoft,
    marginBottom: spacing.md,
  },
  linkWrap: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
  },
});
