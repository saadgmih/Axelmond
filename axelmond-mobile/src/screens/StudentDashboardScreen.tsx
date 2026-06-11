import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import CourseCard from "../components/CourseCard";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useCourses } from "../hooks/useCourses";
import type { StudentStackParamList, StudentTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, "StudentDashboard">,
  NativeStackScreenProps<StudentStackParamList>
>;

export default function StudentDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { courses, loading, error } = useCourses();

  const enrolledCourses = useMemo(
    () => courses.filter((course) => user?.enrolledCourses.includes(course.id)),
    [courses, user?.enrolledCourses],
  );

  const averageProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / enrolledCourses.length)
    : 0;

  const totalCredits = enrolledCourses.reduce((sum, course) => sum + course.credits, 0);
  const completedModules = enrolledCourses.reduce(
    (sum, course) => sum + course.modules.filter((module) => module.completed).length,
    0,
  );

  return (
    <ScreenContainer
      title={`Bonjour, ${user?.fullName?.split(" ")[0] || "étudiant"}`}
      subtitle="Votre espace académique Axelmond"
      loading={loading}
    >
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <StatCard label="Cours inscrits" value={enrolledCourses.length} />
        <StatCard label="Progression" value={`${averageProgress}%`} accent={theme.colors.accentSoft} />
        <StatCard label="ECTS" value={totalCredits} />
      </View>

      <SectionHeader
        title="Mes cours"
        subtitle={`${completedModules} module(s) terminé(s)`}
        action="Catalogue"
        onActionPress={() => navigation.navigate("CourseCatalog")}
      />

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
        ListEmptyComponent={
          <EmptyState
            title="Aucun cours inscrit"
            message="Explorez le catalogue pour découvrir les modules académiques disponibles."
          />
        }
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  error: { marginBottom: 16 },
});
