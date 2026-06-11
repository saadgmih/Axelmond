import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import BrandHeader from "../components/BrandHeader";
import Button from "../components/Button";
import Input from "../components/Input";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import type { ApiError } from "../types";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login, verifyEmail } = useAuth();
  const { theme } = useTheme();
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
          <BrandHeader subtitle="Connectez-vous à votre espace académique mobile" />

          <View style={styles.sectorRow}>
            {(["student", "teacher"] as const).map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.sectorBtn,
                  {
                    backgroundColor: sector === value ? theme.colors.cardGlow : theme.colors.surface,
                    borderColor: sector === value ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSector(value)}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {value === "student" ? "Étudiant" : "Enseignant"}
                </Text>
              </Pressable>
            ))}
          </View>

          {!needsVerification ? (
            <>
              <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <Input label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
              {error ? <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text> : null}
              <Button label="Se connecter" loading={loading} onPress={handleLogin} />
            </>
          ) : (
            <>
              <Text style={{ color: theme.colors.textSoft, marginBottom: 12 }}>
                Saisissez le code envoyé à {verificationEmail}
              </Text>
              <Input label="Code de vérification" value={verificationCode} onChangeText={setVerificationCode} />
              {error ? <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text> : null}
              <Button label="Valider le code" loading={loading} onPress={handleVerify} />
            </>
          )}

          <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkWrap}>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Pas de compte ? Créer un compte</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 32, paddingTop: 16 },
  sectorRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  sectorBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  linkWrap: { marginTop: 24, alignItems: "center" },
});
