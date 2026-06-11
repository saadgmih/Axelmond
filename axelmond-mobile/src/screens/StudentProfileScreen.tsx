import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../services/api";
import type { StudentStackParamList, StudentTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, "StudentProfile">,
  NativeStackScreenProps<StudentStackParamList>
>;

export default function StudentProfileScreen(_props: Props) {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const profileData = await api.getStudentProfile().catch(async () => {
          const fallbackSummary = await api.getStudentObjectivesSummary().catch(() => null);
          return user ? { user, objectivesSummary: fallbackSummary || {} } : null;
        });
        setSummary(profileData?.objectivesSummary ?? null);
        await refreshUser();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profil indisponible");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser, user]);

  return (
    <ScreenContainer title="Mon profil" subtitle="Informations académiques et session" loading={loading}>
      {error ? <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{user?.fullName}</Text>
          <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
          <Text style={{ color: theme.colors.textSoft, marginTop: 4 }}>
            {user?.levelOrTitle}
            {user?.filiere ? ` · ${user.filiere}` : ""}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Cours inscrits" value={user?.enrolledCourses.length || 0} />
          <StatCard label="Objectifs actifs" value={summary?.inProgress ?? 0} accent={theme.colors.primary} />
          <StatCard label="Terminés" value={summary?.completed ?? 0} accent={theme.colors.success} />
        </View>

        <Button label="Se déconnecter" variant="danger" onPress={() => logout()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  name: { fontSize: 22, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
});
