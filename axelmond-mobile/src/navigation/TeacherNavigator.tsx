import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TeacherDashboardScreen from "../screens/TeacherDashboardScreen";
import CourseDetailsScreen from "../screens/CourseDetailsScreen";
import LiveClassroomScreen from "../screens/LiveClassroomScreen";
import { colors } from "../theme/colors";
import type { TeacherStackParamList } from "./types";

const Stack = createNativeStackNavigator<TeacherStackParamList>();

export default function TeacherNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ title: "Espace enseignant" }} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: "Détails du cours" }} />
      <Stack.Screen name="LiveClassroom" component={LiveClassroomScreen} options={{ title: "Classe live" }} />
    </Stack.Navigator>
  );
}
