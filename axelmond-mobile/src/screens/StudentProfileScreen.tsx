import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { colors, spacing } from "../theme/colors";
import type { StudentStackParamList, StudentTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, "StudentProfile">,
  NativeStackScreenProps<StudentStackParamList>
>;

export default function StudentProfileScreen(_props: Props) {
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileData, summaryData] = await Promise.all([
          api.getStudentProfile().catch(() => null),
          api.getStudentObjectivesSummary().catch(() => null),
        ]);
        setProfile(profileData);
        setSummary(profileData?.objectivesSummary ?? summaryData);
        await refreshUser();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profil indisponible");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  return (
    <ScreenContainer title="Mon profil" subtitle="Informations académiques et session" loading={loading}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.meta}>{user?.levelOrTitle}{user?.filiere ? ` · ${user.filiere}` : ""}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistiques</Text>
          <Text style={styles.row}>Cours inscrits : {user?.enrolledCourses.length || 0}</Text>
          <Text style={styles.row}>Objectifs actifs : {summary?.inProgress ?? 0}</Text>
          <Text style={styles.row}>Objectifs terminés : {summary?.completed ?? 0}</Text>
        </View>

        {profile?.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bio</Text>
            <Text style={styles.row}>{profile.bio}</Text>
          </View>
        ) : null}

        <Button label="Se déconnecter" variant="danger" onPress={() => logout()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: 22, fontWeight: "800" },
  meta: { color: colors.textMuted, marginTop: 4 },
  cardTitle: { color: colors.text, fontWeight: "800", marginBottom: spacing.sm },
  row: { color: colors.textSoft, marginBottom: 4 },
  error: { color: colors.danger, marginBottom: spacing.md },
});
