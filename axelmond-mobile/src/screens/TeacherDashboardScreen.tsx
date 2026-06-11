import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import CourseCard from "../components/CourseCard";
import ScreenContainer from "../components/ScreenContainer";
import { useCourses } from "../hooks/useCourses";
import { colors, spacing } from "../theme/colors";
import type { TeacherStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<TeacherStackParamList, "TeacherDashboard">;

export default function TeacherDashboardScreen({ navigation }: Props) {
  const { courses, loading, error } = useCourses();

  const teacherCourses = useMemo(() => courses.filter((course) => course.published !== false), [courses]);
  const liveCourses = useMemo(() => teacherCourses.filter((course) => course.isLiveNow), [teacherCourses]);

  return (
    <ScreenContainer title="Espace enseignant" subtitle="Gérez vos modules et sessions live" loading={loading}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{teacherCourses.length}</Text>
          <Text style={styles.statLabel}>Modules</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{liveCourses.length}</Text>
          <Text style={styles.statLabel}>Live actifs</Text>
        </View>
      </View>

      {liveCourses.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sessions live</Text>
          {liveCourses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.liveCard}
              onPress={() => navigation.navigate("LiveClassroom", { courseId: course.id, courseTitle: course.title })}
            >
              <Text style={styles.liveTitle}>{course.title}</Text>
              <Text style={styles.liveMeta}>{course.liveSubject || "Session en cours"}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Vos cours publiés</Text>
      <FlatList
        data={teacherCourses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CourseCard course={item} onPress={() => navigation.navigate("CourseDetails", { courseId: item.id })} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun cours publié.</Text>}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: spacing.sm },
  liveCard: {
    backgroundColor: "#450a0a",
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#991b1b",
  },
  liveTitle: { color: colors.text, fontWeight: "800" },
  liveMeta: { color: "#fecaca", marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
