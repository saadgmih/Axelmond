import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import CourseCard from "../components/CourseCard";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { useCourses } from "../hooks/useCourses";
import { colors, spacing } from "../theme/colors";
import type { StudentStackParamList, StudentTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, "StudentDashboard">,
  NativeStackScreenProps<StudentStackParamList>
>;

export default function StudentDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { courses, loading, error } = useCourses();

  const enrolledCourses = useMemo(
    () => courses.filter((course) => user?.enrolledCourses.includes(course.id)),
    [courses, user?.enrolledCourses],
  );

  const liveCourses = useMemo(
    () => enrolledCourses.filter((course) => course.isLiveNow),
    [enrolledCourses],
  );

  const averageProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / enrolledCourses.length)
    : 0;

  return (
    <ScreenContainer title={`Bonjour, ${user?.fullName?.split(" ")[0] || "étudiant"}`} subtitle="Votre tableau de bord académique" loading={loading}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{enrolledCourses.length}</Text>
          <Text style={styles.statLabel}>Cours inscrits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{averageProgress}%</Text>
          <Text style={styles.statLabel}>Progression</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{liveCourses.length}</Text>
          <Text style={styles.statLabel}>Live</Text>
        </View>
      </View>

      {liveCourses.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sessions en direct</Text>
          {liveCourses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.liveCard}
              onPress={() => navigation.navigate("LiveClassroom", { courseId: course.id, courseTitle: course.title })}
            >
              <Text style={styles.liveTitle}>{course.title}</Text>
              <Text style={styles.liveMeta}>{course.liveSubject || "Cours en direct"}</Text>
              <Text style={styles.liveAction}>Rejoindre →</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Mes cours</Text>
      <FlatList
        data={enrolledCourses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            enrolled
            onPress={() => navigation.navigate("CourseDetails", { courseId: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun cours inscrit pour le moment.</Text>}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  liveCard: {
    backgroundColor: "#450a0a",
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#991b1b",
  },
  liveTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  liveMeta: {
    color: "#fecaca",
    marginTop: 4,
  },
  liveAction: {
    color: colors.accentSoft,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
