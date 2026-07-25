import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEB_URL as BUILT_IN_WEB_URL } from "../config";

const KEY_WEB_URL = "@giaphaos/web_url";

export type AppSettings = {
  /** URL web thực tế app sẽ mở. Null = dùng URL build-in. */
  webUrl: string | null;
};

export function getBuiltInWebUrl(): string {
  return BUILT_IN_WEB_URL.replace(/\/$/, "");
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const webUrl = await AsyncStorage.getItem(KEY_WEB_URL);
    return {
      webUrl: webUrl && webUrl.trim() ? webUrl.trim().replace(/\/$/, "") : null,
    };
  } catch {
    return { webUrl: null };
  }
}

export async function saveWebUrl(url: string | null): Promise<void> {
  if (!url || !url.trim()) {
    await AsyncStorage.removeItem(KEY_WEB_URL);
    return;
  }
  let cleaned = url.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  cleaned = cleaned.replace(/\/$/, "");
  await AsyncStorage.setItem(KEY_WEB_URL, cleaned);
}

/** URL hiệu lực: override người dùng → URL lúc build. */
export async function resolveWebUrl(): Promise<string> {
  const { webUrl } = await loadSettings();
  return webUrl || getBuiltInWebUrl();
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(
      /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`,
    );
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
