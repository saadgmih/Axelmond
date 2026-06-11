import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/index";

export function createTabScreenOptions(
  icons: Record<string, keyof typeof Ionicons.glyphMap>,
): (props: { route: { name: string } }) => BottomTabNavigationOptions {
  return ({ route }) => ({
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.backgroundDeep,
      borderTopColor: colors.border,
      height: 64,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "700",
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name={icons[route.name] || "ellipse-outline"} size={size} color={color} />
    ),
  });
}

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
