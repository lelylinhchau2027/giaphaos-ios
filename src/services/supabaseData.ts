import type {
  CustomEventInsert,
  CustomEventRow,
  PersonRow,
  RelationshipRow,
} from "../types";
import type { RuntimeConfig } from "./settings";

function headers(cfg: RuntimeConfig) {
  return {
    apikey: cfg.supabaseAnonKey,
    Authorization: `Bearer ${cfg.supabaseAnonKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function base(cfg: RuntimeConfig) {
  return cfg.supabaseUrl.replace(/\/$/, "");
}

export function hasConfig(cfg: RuntimeConfig) {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
}

async function getJson<T>(cfg: RuntimeConfig, path: string): Promise<T> {
  const res = await fetch(`${base(cfg)}${path}`, { headers: headers(cfg) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function fetchFamilyData(cfg: RuntimeConfig): Promise<{
  persons: PersonRow[];
  customEvents: CustomEventRow[];
  relationships: RelationshipRow[];
}> {
  if (!hasConfig(cfg)) {
    return { persons: [], customEvents: [], relationships: [] };
  }

  const personSelect =
    "id,full_name,gender,birth_year,birth_month,birth_day,death_year,death_month,death_day,is_deceased,is_in_law,generation,birth_order,avatar_url,note";
  const eventSelect =
    "id,title,event_day,event_month,event_year,calendar_type,is_recurring";

  try {
    const [persons, customEvents, relationships] = await Promise.all([
      getJson<PersonRow[]>(
        cfg,
        `/rest/v1/persons?select=${encodeURIComponent(personSelect)}&order=full_name.asc`,
      ),
      getJson<CustomEventRow[]>(
        cfg,
        `/rest/v1/custom_events?select=${encodeURIComponent(eventSelect)}&order=event_month.asc,event_day.asc`,
      ).catch(async (e) => {
        // Fallback if migration not applied yet
        if (String(e.message).includes("42703") || String(e.message).includes("calendar_type")) {
          return getJson<CustomEventRow[]>(
            cfg,
            `/rest/v1/custom_events?select=${encodeURIComponent("id,title,event_day,event_month,event_year")}&order=event_month.asc,event_day.asc`,
          );
        }
        throw e;
      }),
      getJson<RelationshipRow[]>(
        cfg,
        `/rest/v1/relationships?select=${encodeURIComponent("id,type,person_a,person_b,note")}`,
      ).catch(() => [] as RelationshipRow[]),
    ]);
    return { persons, customEvents, relationships };
  } catch (e) {
    throw e;
  }
}

export async function insertCustomEvent(
  cfg: RuntimeConfig,
  row: CustomEventInsert,
): Promise<CustomEventRow> {
  if (!hasConfig(cfg)) throw new Error("Chưa cấu hình Supabase");

  const body = {
    title: row.title,
    event_day: row.event_day,
    event_month: row.event_month,
    event_year: row.event_year ?? null,
    calendar_type: row.calendar_type,
    is_recurring: row.is_recurring,
  };

  let res = await fetch(`${base(cfg)}/rest/v1/custom_events`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify(body),
  });

  // If columns missing, retry without new fields (legacy)
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (text.includes("calendar_type") || text.includes("is_recurring")) {
      res = await fetch(`${base(cfg)}/rest/v1/custom_events`, {
        method: "POST",
        headers: headers(cfg),
        body: JSON.stringify({
          title: row.title,
          event_day: row.event_day,
          event_month: row.event_month,
          event_year: row.event_year ?? null,
        }),
      });
    } else {
      throw new Error(`Thêm sự kiện thất bại: ${res.status} ${text}`);
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Thêm sự kiện thất bại: ${res.status} ${text}`);
  }

  const data = (await res.json()) as CustomEventRow[];
  return Array.isArray(data) ? data[0] : (data as unknown as CustomEventRow);
}

export async function deleteCustomEvent(
  cfg: RuntimeConfig,
  id: string,
): Promise<void> {
  if (!hasConfig(cfg)) throw new Error("Chưa cấu hình Supabase");
  const res = await fetch(
    `${base(cfg)}/rest/v1/custom_events?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: headers(cfg) },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Xóa thất bại: ${res.status} ${text}`);
  }
}
