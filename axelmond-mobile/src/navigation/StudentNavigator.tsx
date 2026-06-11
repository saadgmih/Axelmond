import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudentDashboardScreen from "../screens/StudentDashboardScreen";
import CourseCatalogScreen from "../screens/CourseCatalogScreen";
import StudentProfileScreen from "../screens/StudentProfileScreen";
import CourseDetailsScreen from "../screens/CourseDetailsScreen";
import LiveClassroomScreen from "../screens/LiveClassroomScreen";
import { createTabScreenOptions, stackScreenOptions } from "./tabBar";
import type { StudentStackParamList, StudentTabParamList } from "./types";

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<StudentStackParamList>();

function StudentTabs() {
  return (
    <Tab.Navigator
      id="StudentTabs"
      screenOptions={createTabScreenOptions({
        StudentDashboard: "grid-outline",
        CourseCatalog: "library-outline",
        StudentProfile: "person-outline",
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
    <Stack.Navigator id="StudentStack" screenOptions={stackScreenOptions}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: "Détails du cours" }} />
      <Stack.Screen name="LiveClassroom" component={LiveClassroomScreen} options={{ title: "Cours en direct", headerBackTitle: "Retour" }} />
    </Stack.Navigator>
  );
}
