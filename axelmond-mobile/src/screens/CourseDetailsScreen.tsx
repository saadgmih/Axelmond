import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useCourse } from "../hooks/useCourses";
import type { StudentStackParamList } from "../navigation/types";
import type { TeacherStackParamList } from "../navigation/types";

type Props =
  | NativeStackScreenProps<StudentStackParamList, "CourseDetails">
  | NativeStackScreenProps<TeacherStackParamList, "CourseDetails">;

export default function CourseDetailsScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { courseId } = route.params;
  const { course, loading, error } = useCourse(courseId);

  const enrolled = useMemo(
    () => Boolean(user?.enrolledCourses.includes(courseId)),
    [user?.enrolledCourses, courseId],
  );

  const completedModules = course?.modules.filter((module) => module.completed).length || 0;

  return (
    <ScreenContainer loading={loading}>
      {error || !course ? (
        <Text style={{ color: theme.colors.danger }}>{error || "Cours introuvable"}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
          <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
            {course.level} · {course.credits} ECTS · {course.duration}
          </Text>
          <Text style={{ color: theme.colors.textSoft, marginTop: 8 }}>Enseignant : {course.instructor}</Text>
          <Text style={{ color: theme.colors.textSoft, marginTop: 16, lineHeight: 22 }}>{course.description}</Text>

          <View style={styles.statsRow}>
            <StatCard label="Prix" value={course.price > 0 ? `${course.price} MAD` : "Gratuit"} accent={theme.colors.accentSoft} />
            <StatCard label="Progression" value={`${course.progress}%`} />
            <StatCard label="Modules" value={course.modules.length} />
          </View>

          {!enrolled ? (
            <View style={[styles.noteBox, { backgroundColor: theme.colors.cardGlow, borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>
                Ce module est visible dans le catalogue. L'inscription complète se fait via la plateforme web Performance Académique.
              </Text>
            </View>
          ) : null}

          {course.isLiveNow ? (
            <Button
              label="Rejoindre le live"
              onPress={() =>
                navigation.navigate("LiveClassroom", { courseId: course.id, courseTitle: course.title })
              }
              style={{ marginBottom: 16 }}
            />
          ) : null}

          <SectionHeader title={`Contenu (${course.modules.length})`} subtitle={`${completedModules} module(s) terminé(s)`} />

          {course.modules.map((module) => (
            <View
              key={module.id}
              style={[styles.moduleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{module.title}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                {module.type} · {module.duration}
                {module.completed ? " · Terminé" : ""}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 16 },
  noteBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  moduleCard: { borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1 },
});
