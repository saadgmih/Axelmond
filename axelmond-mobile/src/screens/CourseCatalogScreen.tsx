import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
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
  BottomTabScreenProps<StudentTabParamList, "CourseCatalog">,
  NativeStackScreenProps<StudentStackParamList>
>;

export default function CourseCatalogScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { courses, loading, error } = useCourses();
  const [query, setQuery] = useState("");

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(normalized)
        || course.description.toLowerCase().includes(normalized)
        || course.instructor.toLowerCase().includes(normalized),
    );
  }, [courses, query]);

  return (
    <ScreenContainer title="Catalogue" subtitle="Parcourez les modules académiques" loading={loading}>
      <TextInput
        placeholder="Rechercher un cours..."
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        value={query}
        onChangeText={setQuery}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={filteredCourses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            enrolled={user?.enrolledCourses.includes(item.id)}
            onPress={() => navigation.navigate("CourseDetails", { courseId: item.id })}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
