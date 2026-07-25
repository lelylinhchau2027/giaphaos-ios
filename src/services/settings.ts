import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SITE_NAME as BUILT_IN_SITE_NAME,
  SUPABASE_ANON_KEY as BUILT_IN_ANON,
  SUPABASE_URL as BUILT_IN_URL,
} from "../config";

const KEY_SUPABASE_URL = "@giaphaos/supabase_url";
const KEY_SUPABASE_ANON = "@giaphaos/supabase_anon";
const KEY_SITE_NAME = "@giaphaos/site_name";

export type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteName: string;
};

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const [url, anon, site] = await Promise.all([
      AsyncStorage.getItem(KEY_SUPABASE_URL),
      AsyncStorage.getItem(KEY_SUPABASE_ANON),
      AsyncStorage.getItem(KEY_SITE_NAME),
    ]);
    return {
      supabaseUrl: (url || BUILT_IN_URL || "").replace(/\/$/, ""),
      supabaseAnonKey: anon || BUILT_IN_ANON || "",
      siteName: site || BUILT_IN_SITE_NAME || "Gia Phả OS",
    };
  } catch {
    return {
      supabaseUrl: BUILT_IN_URL.replace(/\/$/, ""),
      supabaseAnonKey: BUILT_IN_ANON,
      siteName: BUILT_IN_SITE_NAME,
    };
  }
}

export async function saveRuntimeConfig(
  partial: Partial<RuntimeConfig>,
): Promise<RuntimeConfig> {
  const current = await loadRuntimeConfig();
  const next: RuntimeConfig = {
    supabaseUrl: (partial.supabaseUrl ?? current.supabaseUrl)
      .trim()
      .replace(/\/$/, ""),
    supabaseAnonKey: (partial.supabaseAnonKey ?? current.supabaseAnonKey).trim(),
    siteName: (partial.siteName ?? current.siteName).trim() || "Gia Phả OS",
  };
  await Promise.all([
    next.supabaseUrl
      ? AsyncStorage.setItem(KEY_SUPABASE_URL, next.supabaseUrl)
      : AsyncStorage.removeItem(KEY_SUPABASE_URL),
    next.supabaseAnonKey
      ? AsyncStorage.setItem(KEY_SUPABASE_ANON, next.supabaseAnonKey)
      : AsyncStorage.removeItem(KEY_SUPABASE_ANON),
    AsyncStorage.setItem(KEY_SITE_NAME, next.siteName),
  ]);
  return next;
}

export function getBuiltInSupabase() {
  return {
    supabaseUrl: BUILT_IN_URL.replace(/\/$/, ""),
    supabaseAnonKey: BUILT_IN_ANON,
    siteName: BUILT_IN_SITE_NAME,
  };
}
