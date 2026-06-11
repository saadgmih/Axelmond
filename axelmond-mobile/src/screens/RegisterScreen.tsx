import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import BrandHeader from "../components/BrandHeader";
import Button from "../components/Button";
import Input from "../components/Input";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { theme } = useTheme();
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
          <BrandHeader subtitle="Rejoignez Axelmond Research Labs" compact />

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

          <Input label="Nom complet" value={fullName} onChangeText={setFullName} />
          <Input label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
          {sector === "student" ? (
            <Input label="Filière (optionnel)" value={filiere} onChangeText={setFiliere} />
          ) : (
            <Input label="Code invitation professeur" value={professorInviteCode} onChangeText={setProfessorInviteCode} />
          )}

          {error ? <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text> : null}
          {message ? <Text style={{ color: theme.colors.success, marginBottom: 12 }}>{message}</Text> : null}

          <Button label="Créer mon compte" loading={loading} onPress={handleRegister} />
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrap}>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Déjà inscrit ? Se connecter</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
