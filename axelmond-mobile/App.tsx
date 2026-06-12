import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { APP_SHELL_MODE } from "./src/config";
import { AuthProvider } from "./src/hooks/useAuth";
import { ThemeProvider } from "./src/hooks/useTheme";
import RootNavigator from "./src/navigation/RootNavigator";
import WebAppScreen from "./src/screens/WebAppScreen";

export default function App() {
  if (APP_SHELL_MODE === "web") {
    return (
      <SafeAreaProvider>
        <WebAppScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider mode="dark">
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
