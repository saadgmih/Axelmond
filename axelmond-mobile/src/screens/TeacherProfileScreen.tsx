import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../services/api";
import type { AcademicProfile } from "../types";
import type { TeacherTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<TeacherTabParamList, "TeacherProfile">;

export default function TeacherProfileScreen(_props: Props) {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileData] = await Promise.all([
          api.getTeacherProfile().catch(() => null),
          refreshUser(),
        ]);
        setProfile(profileData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profil indisponible");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  return (
    <ScreenContainer title="Profil enseignant" subtitle="Identité académique et session" loading={loading}>
      {error ? <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{user?.fullName}</Text>
          <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
          <Text style={{ color: theme.colors.textSoft, marginTop: 4 }}>{user?.levelOrTitle}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Rôle" value={user?.role === "ADMIN" ? "Admin" : "Prof."} />
          <StatCard label="Modules" value={user?.enrolledCourses?.length || 0} accent={theme.colors.primary} />
        </View>

        {profile ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Profil académique</Text>
            {profile.title ? <Text style={{ color: theme.colors.textSoft, marginBottom: 4 }}>Titre : {profile.title}</Text> : null}
            {profile.department ? <Text style={{ color: theme.colors.textSoft, marginBottom: 4 }}>Département : {profile.department}</Text> : null}
            {profile.lab ? <Text style={{ color: theme.colors.textSoft, marginBottom: 4 }}>Laboratoire : {profile.lab}</Text> : null}
            {profile.speciality ? <Text style={{ color: theme.colors.textSoft, marginBottom: 4 }}>Spécialité : {profile.speciality}</Text> : null}
            {profile.bio ? (
              <Text style={{ color: theme.colors.textSoft, marginTop: 8, lineHeight: 20 }}>{profile.bio}</Text>
            ) : null}
          </View>
        ) : null}

        <Button label="Se déconnecter" variant="danger" onPress={() => logout()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  name: { fontSize: 22, fontWeight: "800" },
  cardTitle: { fontWeight: "800", marginBottom: 8 },
  row: { marginBottom: 4 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
});
