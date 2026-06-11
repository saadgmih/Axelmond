import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import type { Course } from "../types";

type CourseCardProps = {
  course: Course;
  enrolled?: boolean;
  onPress?: () => void;
};

export default function CourseCard({ course, enrolled, onPress }: CourseCardProps) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.cardGlow, borderRadius: radius.pill }]}>
          <Ionicons name="book-outline" size={20} color={colors.primary} />
        </View>
        {enrolled ? (
          <View style={[styles.enrolledBadge, { backgroundColor: "#14532d", borderRadius: radius.sm }]}>
            <Text style={styles.enrolledText}>Inscrit</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {course.level} · {course.credits} ECTS · {course.duration}
      </Text>
      <Text style={[styles.description, { color: colors.textSoft }]} numberOfLines={2}>
        {course.description}
      </Text>
      <View style={styles.footer}>
        <Text style={[styles.instructor, { color: colors.textMuted }]}>{course.instructor}</Text>
        <Text style={[styles.price, { color: colors.accentSoft }]}>
          {course.price > 0 ? `${course.price} MAD` : "Gratuit"}
        </Text>
      </View>
      {course.progress > 0 ? (
        <View style={[styles.progressTrack, { backgroundColor: colors.backgroundDeep, borderRadius: radius.pill }]}>
          <View style={[styles.progressFill, { width: `${Math.min(course.progress, 100)}%`, backgroundColor: colors.primary, borderRadius: radius.pill }]} />
        </View>
      ) : null}
      {onPress ? (
        <Text style={[styles.link, { color: colors.primary }]} onPress={onPress}>
          Voir le cours →
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, borderWidth: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  enrolledBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  enrolledText: { color: "#bbf7d0", fontSize: 10, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "800", marginTop: 12 },
  meta: { fontSize: 12, marginTop: 4 },
  description: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  instructor: { fontSize: 12 },
  price: { fontWeight: "700", fontSize: 13 },
  progressTrack: { height: 6, marginTop: 12, overflow: "hidden" },
  progressFill: { height: 6 },
  link: { fontWeight: "700", marginTop: 12 },
});
