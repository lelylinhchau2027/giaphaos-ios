import type {
  CustomEventInsert,
  CustomEventRow,
  Person,
  PersonInsert,
  PrivateDetails,
  Relationship,
  RelationshipType,
} from "../types";
import type { RuntimeConfig } from "./settings";
import { getSupabase, hasConfig } from "./supabaseClient";

export { hasConfig };

const PERSON_SELECT =
  "id,full_name,gender,birth_year,birth_month,birth_day,death_year,death_month,death_day,is_deceased,is_in_law,generation,birth_order,avatar_url,note,created_at,updated_at";

export async function fetchFamilyData(cfg: RuntimeConfig): Promise<{
  persons: Person[];
  customEvents: CustomEventRow[];
  relationships: Relationship[];
}> {
  const sb = getSupabase(cfg);
  if (!sb) return { persons: [], customEvents: [], relationships: [] };

  const [personsRes, eventsRes, relsRes] = await Promise.all([
    sb.from("persons").select(PERSON_SELECT).order("full_name", { ascending: true }),
    sb
      .from("custom_events")
      .select("id,title,event_day,event_month,event_year,calendar_type,is_recurring")
      .order("event_month", { ascending: true })
      .order("event_day", { ascending: true }),
    sb.from("relationships").select("id,type,person_a,person_b,note"),
  ]);

  if (personsRes.error) throw new Error(personsRes.error.message);

  let customEvents: CustomEventRow[] = [];
  if (eventsRes.error) {
    // Migration not applied
    if (
      eventsRes.error.message.includes("calendar_type") ||
      eventsRes.error.code === "42703"
    ) {
      const legacy = await sb
        .from("custom_events")
        .select("id,title,event_day,event_month,event_year")
        .order("event_month", { ascending: true });
      if (legacy.error) throw new Error(legacy.error.message);
      customEvents = (legacy.data || []) as CustomEventRow[];
    } else {
      throw new Error(eventsRes.error.message);
    }
  } else {
    customEvents = (eventsRes.data || []) as CustomEventRow[];
  }

  return {
    persons: (personsRes.data || []) as Person[],
    customEvents,
    relationships: (relsRes.error ? [] : relsRes.data || []) as Relationship[],
  };
}

export async function fetchPrivateDetails(
  cfg: RuntimeConfig,
  personId: string,
): Promise<PrivateDetails | null> {
  const sb = getSupabase(cfg);
  if (!sb) return null;
  const { data, error } = await sb
    .from("person_details_private")
    .select("person_id,phone_number,occupation,current_residence,facebook_url")
    .eq("person_id", personId)
    .maybeSingle();
  if (error) return null;
  return data as PrivateDetails | null;
}

export async function upsertPerson(
  cfg: RuntimeConfig,
  data: PersonInsert,
  id?: string,
): Promise<Person> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");

  if (id) {
    const { data: updated, error } = await sb
      .from("persons")
      .update(data)
      .eq("id", id)
      .select(PERSON_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return updated as Person;
  }

  const { data: created, error } = await sb
    .from("persons")
    .insert(data)
    .select(PERSON_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return created as Person;
}

export async function upsertPrivateDetails(
  cfg: RuntimeConfig,
  details: PrivateDetails,
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");
  const { error } = await sb.from("person_details_private").upsert(details);
  if (error) throw new Error(error.message);
}

export async function deletePerson(
  cfg: RuntimeConfig,
  id: string,
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");

  const { data: rels, error: relErr } = await sb
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${id},person_b.eq.${id}`)
    .limit(1);
  if (relErr) throw new Error(relErr.message);
  if (rels && rels.length > 0) {
    throw new Error(
      "Không thể xóa: thành viên còn quan hệ. Hãy xóa quan hệ trước.",
    );
  }

  const { error } = await sb.from("persons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertRelationship(
  cfg: RuntimeConfig,
  row: {
    type: RelationshipType | string;
    person_a: string;
    person_b: string;
    note?: string | null;
  },
): Promise<Relationship> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");
  const { data, error } = await sb
    .from("relationships")
    .insert(row)
    .select("id,type,person_a,person_b,note")
    .single();
  if (error) throw new Error(error.message);
  return data as Relationship;
}

export async function deleteRelationship(
  cfg: RuntimeConfig,
  id: string,
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");
  const { error } = await sb.from("relationships").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(
  cfg: RuntimeConfig,
  localUri: string,
  mimeType = "image/jpeg",
): Promise<string> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = `${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;

  const res = await fetch(localUri);
  const blob = await res.blob();
  const { error } = await sb.storage.from("avatars").upload(path, blob, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function insertCustomEvent(
  cfg: RuntimeConfig,
  row: CustomEventInsert,
): Promise<CustomEventRow> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");

  const body = {
    title: row.title,
    event_day: row.event_day,
    event_month: row.event_month,
    event_year: row.event_year ?? null,
    calendar_type: row.calendar_type,
    is_recurring: row.is_recurring,
  };

  let { data, error } = await sb
    .from("custom_events")
    .insert(body)
    .select("id,title,event_day,event_month,event_year,calendar_type,is_recurring")
    .single();

  if (error && (error.message.includes("calendar_type") || error.code === "42703")) {
    const legacy = await sb
      .from("custom_events")
      .insert({
        title: row.title,
        event_day: row.event_day,
        event_month: row.event_month,
        event_year: row.event_year ?? null,
      })
      .select("id,title,event_day,event_month,event_year")
      .single();
    if (legacy.error) throw new Error(legacy.error.message);
    return legacy.data as CustomEventRow;
  }

  if (error) throw new Error(error.message);
  return data as CustomEventRow;
}

export async function updateCustomEvent(
  cfg: RuntimeConfig,
  id: string,
  row: CustomEventInsert,
): Promise<CustomEventRow> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");

  const fullBody = {
    title: row.title,
    event_day: row.event_day,
    event_month: row.event_month,
    event_year: row.event_year ?? null,
    calendar_type: row.calendar_type,
    is_recurring: row.is_recurring,
  };

  let { data, error } = await sb
    .from("custom_events")
    .update(fullBody)
    .eq("id", id)
    .select(
      "id,title,event_day,event_month,event_year,calendar_type,is_recurring",
    )
    .single();

  // DB chưa chạy migration → bỏ calendar_type / is_recurring
  if (
    error &&
    (error.message.includes("calendar_type") ||
      error.message.includes("is_recurring") ||
      error.code === "42703" ||
      error.message.includes("column"))
  ) {
    const legacy = await sb
      .from("custom_events")
      .update({
        title: row.title,
        event_day: row.event_day,
        event_month: row.event_month,
        event_year: row.event_year ?? null,
      })
      .eq("id", id)
      .select("id,title,event_day,event_month,event_year")
      .single();
    if (legacy.error) throw new Error(legacy.error.message);
    return {
      ...(legacy.data as CustomEventRow),
      calendar_type: row.calendar_type,
      is_recurring: row.is_recurring,
    };
  }

  if (error) throw new Error(error.message);
  return data as CustomEventRow;
}

export async function deleteCustomEvent(
  cfg: RuntimeConfig,
  id: string,
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");
  const { error } = await sb.from("custom_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function applyLineageUpdates(
  cfg: RuntimeConfig,
  updates: { id: string; generation: number | null; birth_order: number | null }[],
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");
  for (const u of updates) {
    const { error } = await sb
      .from("persons")
      .update({ generation: u.generation, birth_order: u.birth_order })
      .eq("id", u.id);
    if (error) throw new Error(error.message);
  }
}

export async function importBackup(
  cfg: RuntimeConfig,
  persons: (PersonInsert & { id?: string })[],
  relationships: { type: string; person_a: string; person_b: string }[],
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) throw new Error("Chưa cấu hình Supabase");

  const { error: delRel } = await sb
    .from("relationships")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delRel) throw new Error(delRel.message);

  const { error: delPersons } = await sb
    .from("persons")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delPersons) throw new Error(delPersons.message);

  const chunk = 100;
  for (let i = 0; i < persons.length; i += chunk) {
    const slice = persons.slice(i, i + chunk).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      gender: p.gender,
      birth_year: p.birth_year ?? null,
      birth_month: p.birth_month ?? null,
      birth_day: p.birth_day ?? null,
      death_year: p.death_year ?? null,
      death_month: p.death_month ?? null,
      death_day: p.death_day ?? null,
      is_deceased: p.is_deceased ?? false,
      is_in_law: p.is_in_law ?? false,
      birth_order: p.birth_order ?? null,
      generation: p.generation ?? null,
      avatar_url: p.avatar_url ?? null,
      note: p.note ?? null,
    }));
    const { error } = await sb.from("persons").insert(slice);
    if (error) throw new Error(error.message);
  }

  for (let i = 0; i < relationships.length; i += chunk) {
    const slice = relationships.slice(i, i + chunk).map((r) => ({
      type: r.type,
      person_a: r.person_a,
      person_b: r.person_b,
    }));
    const { error } = await sb.from("relationships").insert(slice);
    if (error) throw new Error(error.message);
  }
}
