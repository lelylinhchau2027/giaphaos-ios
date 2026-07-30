import * as SplashScreen from "expo-splash-screen";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, View } from "react-native";
import BootSplash from "../components/BootSplash";
import { ensureNotificationPermissions } from "../services/notifications";
import {
  loadRuntimeConfig,
  saveRuntimeConfig,
  type RuntimeConfig,
} from "../services/settings";
import { fetchFamilyData, hasConfig } from "../services/supabaseData";
import {
  syncWidgetAndNotifications,
  type SyncResult,
} from "../services/widgetSync";
import type { CustomEventRow, Person, Relationship } from "../types";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type FamilyDataContextValue = {
  ready: boolean;
  config: RuntimeConfig;
  persons: Person[];
  relationships: Relationship[];
  customEvents: CustomEventRow[];
  loading: boolean;
  error: string | null;
  canEdit: boolean;
  isAdmin: boolean;
  lastSync: SyncResult | null;
  reload: () => Promise<void>;
  setCustomEvents: (events: CustomEventRow[]) => void;
  setPersons: (persons: Person[]) => void;
  setRelationships: (rels: Relationship[]) => void;
  saveConfig: (partial: Partial<RuntimeConfig>) => Promise<void>;
  syncNative: () => Promise<SyncResult>;
};

const FamilyDataContext = createContext<FamilyDataContextValue | null>(null);

export function FamilyDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootMessage, setBootMessage] = useState("Đang khởi động…");
  const [config, setConfig] = useState<RuntimeConfig>({
    supabaseUrl: "",
    supabaseAnonKey: "",
    siteName: "Gia Phả Họ Lê",
  });
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  const canEdit = true;
  const isAdmin = true;

  const loadData = useCallback(async (cfg: RuntimeConfig) => {
    if (!hasConfig(cfg)) {
      setPersons([]);
      setRelationships([]);
      setCustomEvents([]);
      setError(
        "Chưa có Supabase URL/key. Vào Cài đặt hoặc truyền khi build workflow.",
      );
      return { persons: [] as Person[], customEvents: [] as CustomEventRow[] };
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFamilyData(cfg);
      setPersons(data.persons);
      setRelationships(data.relationships);
      setCustomEvents(data.customEvents);
      return {
        persons: data.persons,
        customEvents: data.customEvents,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      return { persons: [] as Person[], customEvents: [] as CustomEventRow[] };
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNative = useCallback(
    async (override?: {
      persons?: Person[];
      customEvents?: CustomEventRow[];
      siteName?: string;
    }): Promise<SyncResult> => {
      const result = await syncWidgetAndNotifications({
        persons: override?.persons ?? persons,
        customEvents: override?.customEvents ?? customEvents,
        siteName: override?.siteName ?? config.siteName,
      }).catch(
        (e): SyncResult => ({
          ok: false,
          memberCount: 0,
          eventCount: 0,
          error: e instanceof Error ? e.message : "sync failed",
        }),
      );
      setLastSync(result);
      return result;
    },
    [persons, customEvents, config.siteName],
  );

  const reload = useCallback(async () => {
    const data = await loadData(config);
    await syncNative({
      persons: data.persons,
      customEvents: data.customEvents,
      siteName: config.siteName,
    });
  }, [config, loadData, syncNative]);

  const saveConfig = useCallback(
    async (partial: Partial<RuntimeConfig>) => {
      const next = await saveRuntimeConfig(partial);
      setConfig(next);
      const data = await loadData(next);
      await syncNative({
        persons: data.persons,
        customEvents: data.customEvents,
        siteName: next.siteName,
      });
    },
    [loadData, syncNative],
  );

  useEffect(() => {
    (async () => {
      try {
        setBootMessage("Đang đọc cấu hình…");
        const cfg = await loadRuntimeConfig();
        setConfig(cfg);

        setBootMessage("Đang xin quyền thông báo…");
        await ensureNotificationPermissions().catch(() => undefined);

        setBootMessage(
          hasConfig(cfg) ? "Đang tải dữ liệu gia phả…" : "Chưa cấu hình Supabase…",
        );
        const data = await loadData(cfg);

        setBootMessage("Đang đồng bộ widget…");
        await syncWidgetAndNotifications({
          persons: data.persons,
          customEvents: data.customEvents,
          siteName: cfg.siteName,
        })
          .then((r) => setLastSync(r))
          .catch(() => undefined);
      } catch (e) {
        console.warn("bootstrap", e);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
    // bootstrap once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && ready) {
        loadData(config)
          .then((data) =>
            syncWidgetAndNotifications({
              persons: data.persons,
              customEvents: data.customEvents,
              siteName: config.siteName,
            }).then((r) => setLastSync(r)),
          )
          .catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [config, loadData, ready]);

  const value = useMemo(
    () => ({
      ready,
      config,
      persons,
      relationships,
      customEvents,
      loading,
      error,
      canEdit,
      isAdmin,
      lastSync,
      reload,
      setCustomEvents,
      setPersons,
      setRelationships,
      saveConfig,
      syncNative: () => syncNative(),
    }),
    [
      ready,
      config,
      persons,
      relationships,
      customEvents,
      loading,
      error,
      canEdit,
      isAdmin,
      lastSync,
      reload,
      saveConfig,
      syncNative,
    ],
  );

  return (
    <FamilyDataContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {!ready ? <BootSplash message={bootMessage} /> : null}
      </View>
    </FamilyDataContext.Provider>
  );
}

export function useFamilyData() {
  const ctx = useContext(FamilyDataContext);
  if (!ctx) throw new Error("useFamilyData must be used within FamilyDataProvider");
  return ctx;
}
