import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import type { CustomEventRow, PersonRow } from "../types";

async function supabaseGet<T>(table: string, select = "*"): Promise<T[]> {
  if (!HAS_SUPABASE) return [];

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${table}: ${res.status} ${text}`);
  }

  return (await res.json()) as T[];
}

export async function fetchFamilyData(): Promise<{
  persons: PersonRow[];
  customEvents: CustomEventRow[];
}> {
  if (!HAS_SUPABASE) {
    return { persons: [], customEvents: [] };
  }

  const [persons, customEvents] = await Promise.all([
    supabaseGet<PersonRow>(
      "persons",
      "id,full_name,birth_year,birth_month,birth_day,death_year,death_month,death_day,is_deceased,avatar_url",
    ),
    supabaseGet<CustomEventRow>(
      "custom_events",
      "id,title,event_day,event_month,event_year",
    ),
  ]);

  return { persons, customEvents };
}
