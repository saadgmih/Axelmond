import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/colors";
import type { Course } from "../types";

type CourseCardProps = {
  course: Course;
  enrolled?: boolean;
  onPress?: () => void;
};

export default function CourseCard({ course, enrolled, onPress }: CourseCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="book-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.badges}>
          {course.isLiveNow ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
          {enrolled ? (
            <View style={styles.enrolledBadge}>
              <Text style={styles.enrolledText}>Inscrit</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.meta}>{course.level} · {course.credits} ECTS · {course.duration}</Text>
      <Text style={styles.description} numberOfLines={2}>{course.description}</Text>
      <View style={styles.footer}>
        <Text style={styles.instructor}>{course.instructor}</Text>
        <Text style={styles.price}>{course.price > 0 ? `${course.price} MAD` : "Gratuit"}</Text>
      </View>
      {onPress ? (
        <Text style={styles.link} onPress={onPress}>Voir le cours →</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  liveBadge: {
    backgroundColor: "#7f1d1d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  liveText: {
    color: "#fecaca",
    fontSize: 10,
    fontWeight: "800",
  },
  enrolledBadge: {
    backgroundColor: "#14532d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  enrolledText: {
    color: "#bbf7d0",
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  description: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  instructor: {
    color: colors.textMuted,
    fontSize: 12,
  },
  price: {
    color: colors.accentSoft,
    fontWeight: "700",
    fontSize: 13,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: spacing.md,
  },
});
