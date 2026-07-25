import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import WebApp from "./src/components/WebApp";
import {
  addNotificationResponseListener,
  ensureNotificationPermissions,
} from "./src/services/notifications";
import { syncWidgetAndNotifications } from "./src/services/widgetSync";

// giữ splash đến khi sẵn sàng
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [ready, setReady] = useState(false);
  const [deepPath, setDeepPath] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      await ensureNotificationPermissions();
      await syncWidgetAndNotifications();
    } catch (e) {
      console.warn("bootstrap", e);
    } finally {
      setReady(true);
      await SplashScreen.hideAsync().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    bootstrap();

    const sub = addNotificationResponseListener((urlPath) => {
      if (urlPath) setDeepPath(urlPath);
    });

    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // Mỗi lần mở app: sync lại widget + lịch thông báo
        syncWidgetAndNotifications().catch(() => undefined);
      }
    });

    // Sync định kỳ mỗi 6 giờ khi app còn sống
    const timer = setInterval(
      () => {
        syncWidgetAndNotifications().catch(() => undefined);
      },
      6 * 60 * 60 * 1000,
    );

    return () => {
      sub.remove();
      appState.remove();
      clearInterval(timer);
    };
  }, [bootstrap]);

  if (!ready) {
    return <View style={styles.boot} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <WebApp path={deepPath} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: "#fafaf9",
  },
  root: {
    flex: 1,
    backgroundColor: "#fafaf9",
  },
});
