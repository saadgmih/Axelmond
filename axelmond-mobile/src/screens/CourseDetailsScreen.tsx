import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { useCourse } from "../hooks/useCourses";
import { colors, spacing } from "../theme/colors";
import type { StudentStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<StudentStackParamList, "CourseDetails">;

export default function CourseDetailsScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { courseId } = route.params;
  const { course, loading, error } = useCourse(courseId);

  const enrolled = useMemo(
    () => Boolean(user?.enrolledCourses.includes(courseId)),
    [user?.enrolledCourses, courseId],
  );

  return (
    <ScreenContainer loading={loading}>
      {error || !course ? (
        <Text style={styles.error}>{error || "Cours introuvable"}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.meta}>{course.level} · {course.credits} ECTS · {course.duration}</Text>
          <Text style={styles.instructor}>Enseignant : {course.instructor}</Text>
          <Text style={styles.description}>{course.description}</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Prix</Text>
            <Text style={styles.infoValue}>{course.price > 0 ? `${course.price} MAD` : "Gratuit"}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Progression</Text>
            <Text style={styles.infoValue}>{course.progress}%</Text>
          </View>

          <Text style={styles.sectionTitle}>Modules ({course.modules.length})</Text>
          {course.modules.map((module) => (
            <View key={module.id} style={styles.moduleCard}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleMeta}>{module.type} · {module.duration}{module.completed ? " · Terminé" : ""}</Text>
            </View>
          ))}

          {course.isLiveNow ? (
            <Button
              label="Rejoindre la classe live"
              onPress={() => navigation.navigate("LiveClassroom", { courseId: course.id, courseTitle: course.title })}
            />
          ) : null}

          {!enrolled ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>Inscription via PayPal disponible sur le site web. L'app affiche le contenu public et vos cours déjà inscrits.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  instructor: { color: colors.textSoft, marginTop: spacing.sm },
  description: { color: colors.textSoft, marginTop: spacing.md, lineHeight: 22 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleTitle: { color: colors.text, fontWeight: "700" },
  moduleMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  noteBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: "#1e1b4b",
  },
  noteText: { color: colors.textSoft, lineHeight: 20 },
  error: { color: colors.danger },
});
