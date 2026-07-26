import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RuntimeConfig } from "./settings";

let cached: { key: string; client: SupabaseClient } | null = null;

export function getSupabase(cfg: RuntimeConfig): SupabaseClient | null {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  const key = `${cfg.supabaseUrl}|${cfg.supabaseAnonKey}`;
  if (cached?.key === key) return cached.client;
  const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  cached = { key, client };
  return client;
}

export function hasConfig(cfg: RuntimeConfig) {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
}
