import Constants from "expo-constants";

type Extra = {
  webUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  siteName?: string;
  appGroup?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** URL bản web Gia Phả (Vercel) — UI app = đúng bản web này */
export const WEB_URL =
  extra.webUrl ||
  process.env.EXPO_PUBLIC_WEB_URL ||
  "https://giapha-os.homielab.com";

export const SUPABASE_URL =
  extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";

export const SUPABASE_ANON_KEY =
  extra.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const SITE_NAME =
  extra.siteName || process.env.EXPO_PUBLIC_SITE_NAME || "Gia Phả OS";

/** App Group dùng chung giữa app chính và Widget */
export const APP_GROUP =
  extra.appGroup ||
  process.env.EXPO_PUBLIC_APP_GROUP ||
  "group.com.giaphaos.family";

export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
