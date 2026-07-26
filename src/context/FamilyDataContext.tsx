import * as SplashScreen from "expo-splash-screen";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import { ensureNotificationPermissions } from "../services/notifications";
import {
  loadRuntimeConfig,
  saveRuntimeConfig,
  type RuntimeConfig,
} from "../services/settings";
import { fetchFamilyData, hasConfig } from "../services/supabaseData";
import { syncWidgetAndNotifications } from "../services/widgetSync";
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
  reload: () => Promise<void>;
  setCustomEvents: (events: CustomEventRow[]) => void;
  setPersons: (persons: Person[]) => void;
  setRelationships: (rels: Relationship[]) => void;
  saveConfig: (partial: Partial<RuntimeConfig>) => Promise<void>;
  syncNative: () => Promise<void>;
};

const FamilyDataContext = createContext<FamilyDataContextValue | null>(null);

export function FamilyDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<RuntimeConfig>({
    supabaseUrl: "",
    supabaseAnonKey: "",
    siteName: "Gia Phả OS",
  });
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror web: open RLS / always editable
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
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFamilyData(cfg);
      setPersons(data.persons);
      setRelationships(data.relationships);
      setCustomEvents(data.customEvents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNative = useCallback(async () => {
    await syncWidgetAndNotifications().catch(() => undefined);
  }, []);

  const reload = useCallback(async () => {
    await loadData(config);
    await syncNative();
  }, [config, loadData, syncNative]);

  const saveConfig = useCallback(
    async (partial: Partial<RuntimeConfig>) => {
      const next = await saveRuntimeConfig(partial);
      setConfig(next);
      await loadData(next);
      await syncNative();
    },
    [loadData, syncNative],
  );

  useEffect(() => {
    (async () => {
      try {
        const cfg = await loadRuntimeConfig();
        setConfig(cfg);
        await ensureNotificationPermissions();
        await loadData(cfg);
        await syncNative();
      } catch (e) {
        console.warn("bootstrap", e);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
  }, [loadData, syncNative]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && ready) {
        loadData(config).catch(() => undefined);
        syncNative().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [config, loadData, ready, syncNative]);

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
      reload,
      setCustomEvents,
      setPersons,
      setRelationships,
      saveConfig,
      syncNative,
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
      reload,
      saveConfig,
      syncNative,
    ],
  );

  return (
    <FamilyDataContext.Provider value={value}>
      {children}
    </FamilyDataContext.Provider>
  );
}

export function useFamilyData() {
  const ctx = useContext(FamilyDataContext);
  if (!ctx) throw new Error("useFamilyData must be used within FamilyDataProvider");
  return ctx;
}
