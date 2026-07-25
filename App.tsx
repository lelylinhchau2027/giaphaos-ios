import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import EventsScreen from "./src/screens/EventsScreen";
import HomeScreen from "./src/screens/HomeScreen";
import MembersScreen from "./src/screens/MembersScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import {
  ensureNotificationPermissions,
} from "./src/services/notifications";
import {
  loadRuntimeConfig,
  type RuntimeConfig,
} from "./src/services/settings";
import { fetchFamilyData, hasConfig } from "./src/services/supabaseData";
import { syncWidgetAndNotifications } from "./src/services/widgetSync";
import type {
  CustomEventRow,
  PersonRow,
  RelationshipRow,
} from "./src/types";
import { colors } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type Tab = "home" | "events" | "members" | "settings";

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEventRow[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (cfg: RuntimeConfig) => {
    if (!hasConfig(cfg)) {
      setPersons([]);
      setCustomEvents([]);
      setRelationships([]);
      setError(
        "Chưa có Supabase URL/key. Vào tab Cài đặt hoặc truyền khi build workflow.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFamilyData(cfg);
      setPersons(data.persons);
      setCustomEvents(data.customEvents);
      setRelationships(data.relationships);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const cfg = await loadRuntimeConfig();
      setConfig(cfg);
      await ensureNotificationPermissions();
      await loadData(cfg);
      // Widget uses same Supabase env (built-in + process); refresh after data load
      await syncWidgetAndNotifications().catch(() => undefined);
    } catch (e) {
      console.warn("bootstrap", e);
    } finally {
      setReady(true);
      await SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loadData]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!config) return;
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadData(config).catch(() => undefined);
        syncWidgetAndNotifications().catch(() => undefined);
      }
    });
    return () => appState.remove();
  }, [config, loadData]);

  const onConfigSaved = async (cfg: RuntimeConfig) => {
    setConfig(cfg);
    await loadData(cfg);
    await syncWidgetAndNotifications().catch(() => undefined);
  };

  if (!ready || !config) {
    return <View style={styles.boot} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />

        <View style={styles.body}>
          {tab === "home" && (
            <HomeScreen
              siteName={config.siteName}
              persons={persons}
              customEvents={customEvents}
              loading={loading}
              error={error}
              onRefresh={() => loadData(config)}
              onOpenEvents={() => setTab("events")}
              onOpenSettings={() => setTab("settings")}
            />
          )}
          {tab === "events" && (
            <EventsScreen
              config={config}
              persons={persons}
              customEvents={customEvents}
              loading={loading}
              error={error}
              onRefresh={() => loadData(config)}
              onEventsChanged={(events) => {
                setCustomEvents(events);
                syncWidgetAndNotifications().catch(() => undefined);
              }}
            />
          )}
          {tab === "members" && (
            <MembersScreen
              persons={persons}
              relationships={relationships}
              loading={loading}
              onRefresh={() => loadData(config)}
            />
          )}
          {tab === "settings" && (
            <SettingsScreen config={config} onSaved={onConfigSaved} />
          )}
        </View>

        <View style={styles.tabBar}>
          {(
            [
              ["home", "🏠", "Trang chủ"],
              ["events", "📅", "Lịch"],
              ["members", "👥", "Thành viên"],
              ["settings", "⚙", "Cài đặt"],
            ] as const
          ).map(([id, icon, label]) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                style={styles.tabItem}
                onPress={() => setTab(id)}
              >
                <Text style={styles.tabIcon}>{icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 10, fontWeight: "600", color: colors.textSoft },
  tabLabelOn: { color: colors.amberDark, fontWeight: "800" },
});
