import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SITE_NAME as BUILT_IN_SITE_NAME,
  SUPABASE_ANON_KEY as BUILT_IN_ANON,
  SUPABASE_URL as BUILT_IN_URL,
} from "../config";

const KEY_SUPABASE_URL = "@giaphaos/supabase_url";
const KEY_SUPABASE_ANON = "@giaphaos/supabase_anon";
const KEY_SITE_NAME = "@giaphaos/site_name";
const KEY_NOTIF_HOUR = "@giaphaos/notif_hour";
const KEY_NOTIF_MINUTE = "@giaphaos/notif_minute";

export type NotificationTimePref = { hour: number; minute: number };

export const DEFAULT_NOTIF_TIME: NotificationTimePref = { hour: 21, minute: 0 };

export async function loadNotificationTime(): Promise<NotificationTimePref> {
  try {
    const [h, m] = await Promise.all([
      AsyncStorage.getItem(KEY_NOTIF_HOUR),
      AsyncStorage.getItem(KEY_NOTIF_MINUTE),
    ]);
    const hour = h != null ? Number(h) : DEFAULT_NOTIF_TIME.hour;
    const minute = m != null ? Number(m) : DEFAULT_NOTIF_TIME.minute;
    return {
      hour: Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_NOTIF_TIME.hour,
      minute:
        Number.isFinite(minute) && minute >= 0 && minute <= 59
          ? minute
          : DEFAULT_NOTIF_TIME.minute,
    };
  } catch {
    return DEFAULT_NOTIF_TIME;
  }
}

export async function saveNotificationTime(
  pref: NotificationTimePref,
): Promise<NotificationTimePref> {
  const hour = Math.min(23, Math.max(0, Math.round(pref.hour)));
  const minute = Math.min(59, Math.max(0, Math.round(pref.minute)));
  await Promise.all([
    AsyncStorage.setItem(KEY_NOTIF_HOUR, String(hour)),
    AsyncStorage.setItem(KEY_NOTIF_MINUTE, String(minute)),
  ]);
  return { hour, minute };
}

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
      siteName: site || BUILT_IN_SITE_NAME || "Gia Phả Họ Lê",
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
    siteName: (partial.siteName ?? current.siteName).trim() || "Gia Phả Họ Lê",
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
