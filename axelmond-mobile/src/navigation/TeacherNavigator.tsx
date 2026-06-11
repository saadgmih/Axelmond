import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TeacherDashboardScreen from "../screens/TeacherDashboardScreen";
import CourseCatalogScreen from "../screens/CourseCatalogScreen";
import TeacherProfileScreen from "../screens/TeacherProfileScreen";
import CourseDetailsScreen from "../screens/CourseDetailsScreen";
import { createTabScreenOptions, stackScreenOptions } from "./tabBar";
import type { TeacherStackParamList, TeacherTabParamList } from "./types";

const Tab = createBottomTabNavigator<TeacherTabParamList>();
const Stack = createNativeStackNavigator<TeacherStackParamList>();

function TeacherTabs() {
  return (
    <Tab.Navigator
      id="TeacherTabs"
      screenOptions={createTabScreenOptions({
        TeacherDashboard: "school-outline",
        CourseCatalog: "book-outline",
        TeacherProfile: "person-circle-outline",
      })}
    >
      <Tab.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ title: "Accueil" }} />
      <Tab.Screen name="CourseCatalog" component={CourseCatalogScreen} options={{ title: "Modules" }} />
      <Tab.Screen name="TeacherProfile" component={TeacherProfileScreen} options={{ title: "Profil" }} />
    </Tab.Navigator>
  );
}

export default function TeacherNavigator() {
  return (
    <Stack.Navigator id="TeacherStack" screenOptions={stackScreenOptions}>
      <Stack.Screen name="TeacherTabs" component={TeacherTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: "Détails du cours" }} />
    </Stack.Navigator>
  );
}
