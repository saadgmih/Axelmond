import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput } from "react-native";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import CourseCard from "../components/CourseCard";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useCourses } from "../hooks/useCourses";
import { useNavigation } from "@react-navigation/native";
import type { StudentStackParamList, StudentTabParamList } from "../navigation/types";
import type { TeacherStackParamList, TeacherTabParamList } from "../navigation/types";

type StudentProps = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, "CourseCatalog">,
  NativeStackScreenProps<StudentStackParamList>
>;

type TeacherProps = CompositeScreenProps<
  BottomTabScreenProps<TeacherTabParamList, "CourseCatalog">,
  NativeStackScreenProps<TeacherStackParamList>
>;

type Props = StudentProps | TeacherProps;

export default function CourseCatalogScreen(_props: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
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
    <ScreenContainer title="Catalogue" subtitle="Modules académiques Performance Académique" loading={loading}>
      <TextInput
        placeholder="Rechercher un cours..."
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.search,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
        ]}
        value={query}
        onChangeText={setQuery}
      />
      {error ? <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>{error}</Text> : null}
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
        ListEmptyComponent={
          <EmptyState title="Aucun résultat" message="Essayez un autre mot-clé ou revenez plus tard." />
        }
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
});
