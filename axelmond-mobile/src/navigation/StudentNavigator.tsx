import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import StudentDashboardScreen from "../screens/StudentDashboardScreen";
import CourseCatalogScreen from "../screens/CourseCatalogScreen";
import StudentProfileScreen from "../screens/StudentProfileScreen";
import CourseDetailsScreen from "../screens/CourseDetailsScreen";
import LiveClassroomScreen from "../screens/LiveClassroomScreen";
import { colors } from "../theme/colors";
import type { StudentStackParamList, StudentTabParamList } from "./types";

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<StudentStackParamList>();

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundDeep,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === "StudentDashboard"
              ? "grid-outline"
              : route.name === "CourseCatalog"
                ? "library-outline"
                : "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ title: "Accueil" }} />
      <Tab.Screen name="CourseCatalog" component={CourseCatalogScreen} options={{ title: "Cours" }} />
      <Tab.Screen name="StudentProfile" component={StudentProfileScreen} options={{ title: "Profil" }} />
    </Tab.Navigator>
  );
}

export default function StudentNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: "Détails du cours" }} />
      <Stack.Screen name="LiveClassroom" component={LiveClassroomScreen} options={{ title: "Classe live" }} />
    </Stack.Navigator>
  );
}
