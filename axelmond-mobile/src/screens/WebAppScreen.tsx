import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { WEB_APP_URL } from "../config";

function isInternalUrl(url: string): boolean {
  try {
    const target = new URL(url);
    const origin = new URL(WEB_APP_URL);
    return target.origin === origin.origin;
  } catch {
    return false;
  }
}

function shouldOpenExternally(url: string): boolean {
  return /^(mailto:|tel:|sms:|geo:)/i.test(url);
}

export default function WebAppScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNavigationStateChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    if (state.loading === false) {
      setLoading(false);
      setError(null);
    }
  }, []);

  const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest) => {
    const { url } = request;
    if (!url || url === "about:blank") return true;
    if (shouldOpenExternally(url)) {
      void Linking.openURL(url);
      return false;
    }
    if (isInternalUrl(url)) return true;
    void Linking.openURL(url);
    return false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadStart={() => {
          setLoading(true);
          setError(null);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError("Impossible de charger l'application. Vérifiez votre connexion.");
        }}
        onHttpError={() => {
          setLoading(false);
          setError("Le serveur est momentanément indisponible.");
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        originWhitelist={["https://*", "http://*"]}
        pullToRefreshEnabled={Platform.OS === "android"}
        startInLoadingState
        userAgent={
          Platform.OS === "ios"
            ? undefined
            : "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      />

      {loading && !error && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#818cf8" />
          <Text style={styles.loadingText}>Chargement d&apos;Axelmond…</Text>
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Connexion impossible</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryLabel}>Réessayer</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
  },
  errorTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
