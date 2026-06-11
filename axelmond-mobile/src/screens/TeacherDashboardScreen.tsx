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
import { useCourses } from "../hooks/useCourses";
import { useTheme } from "../hooks/useTheme";
import type { TeacherStackParamList, TeacherTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TeacherTabParamList, "TeacherDashboard">,
  NativeStackScreenProps<TeacherStackParamList>
>;

export default function TeacherDashboardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { courses, loading, error } = useCourses();

  const teacherCourses = useMemo(
    () => courses.filter((course) => course.published !== false),
    [courses],
  );

  const totalStudentsEstimate = teacherCourses.reduce((sum, course) => sum + Math.max(course.progress, 0), 0);

  return (
    <ScreenContainer title="Espace enseignant" subtitle="Pilotage pédagogique Axelmond" loading={loading}>
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <StatCard label="Modules" value={teacherCourses.length} />
        <StatCard label="Publiés" value={teacherCourses.filter((c) => c.published !== false).length} accent={theme.colors.success} />
        <StatCard label="Actifs" value={teacherCourses.filter((c) => c.progress > 0).length} accent={theme.colors.accentSoft} />
      </View>

      <SectionHeader
        title="Modules publiés"
        subtitle="Gérez vos parcours académiques"
        action="Tous les modules"
        onActionPress={() => navigation.navigate("CourseCatalog")}
      />

      <FlatList
        data={teacherCourses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CourseCard course={item} onPress={() => navigation.navigate("CourseDetails", { courseId: item.id })} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="school-outline"
            title="Aucun module publié"
            message="Vos cours apparaîtront ici dès qu'ils seront disponibles sur la plateforme."
          />
        }
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  error: { marginBottom: 16 },
});
