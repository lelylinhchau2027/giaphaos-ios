import { ExtensionStorage } from "@bacons/apple-targets";
import { APP_GROUP, HAS_SUPABASE, SITE_NAME } from "../config";
import type { FamilyEventItem, WidgetPayload } from "../types";
import { computeUpcomingEvents } from "./events";
import { scheduleEventNotifications } from "./notifications";
import { fetchFamilyData } from "./supabaseData";

const storage = new ExtensionStorage(APP_GROUP);

export async function syncWidgetAndNotifications(): Promise<{
  ok: boolean;
  memberCount: number;
  eventCount: number;
  error?: string;
}> {
  try {
    if (!HAS_SUPABASE) {
      const empty: WidgetPayload = {
        updatedAt: new Date().toISOString(),
        memberCount: 0,
        events: [],
        siteName: SITE_NAME,
      };
      writeWidgetPayload(empty);
      return {
        ok: false,
        memberCount: 0,
        eventCount: 0,
        error:
          "Chưa cấu hình Supabase (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY). Widget sẽ trống cho đến khi bạn thêm key.",
      };
    }

    const { persons, customEvents } = await fetchFamilyData();
    const events = computeUpcomingEvents(persons, customEvents, 30);

    const payload: WidgetPayload = {
      updatedAt: new Date().toISOString(),
      memberCount: persons.length,
      events: events.slice(0, 12),
      siteName: SITE_NAME,
    };

    writeWidgetPayload(payload);
    await scheduleEventNotifications(events, 7);

    return {
      ok: true,
      memberCount: persons.length,
      eventCount: events.length,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("syncWidgetAndNotifications", message);
    return {
      ok: false,
      memberCount: 0,
      eventCount: 0,
      error: message,
    };
  }
}

function writeWidgetPayload(payload: WidgetPayload) {
  // Widget Swift đọc các key phẳng + JSON events
  storage.set("siteName", payload.siteName);
  storage.set("memberCount", payload.memberCount);
  storage.set("updatedAt", payload.updatedAt);
  storage.set("eventsJson", JSON.stringify(payload.events));
  storage.set(
    "nextEvent",
    payload.events[0]
      ? serializeNext(payload.events[0])
      : JSON.stringify(null),
  );

  // Yêu cầu iOS reload timeline widget
  ExtensionStorage.reloadWidget();
}

function serializeNext(e: FamilyEventItem) {
  return JSON.stringify({
    personName: e.personName,
    type: e.type,
    date: e.date,
    daysUntil: e.daysUntil,
    eventDateLabel: e.eventDateLabel,
  });
}
