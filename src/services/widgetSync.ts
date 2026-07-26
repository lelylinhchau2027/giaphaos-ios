import { ExtensionStorage } from "@bacons/apple-targets";
import { APP_GROUP } from "../config";
import type { WidgetPayload } from "../types";
import { computeUpcomingEvents } from "./events";
import { scheduleEventNotifications } from "./notifications";
import { loadRuntimeConfig } from "./settings";
import { fetchFamilyData, hasConfig } from "./supabaseData";

const storage = new ExtensionStorage(APP_GROUP);

function writeWidgetPayload(payload: WidgetPayload) {
  try {
    storage.set("siteName", payload.siteName);
    storage.set("memberCount", payload.memberCount);
    storage.set("updatedAt", payload.updatedAt);
    storage.set("eventsJson", JSON.stringify(payload.events));
    ExtensionStorage.reloadWidget();
  } catch (e) {
    console.warn("widget write", e);
  }
}

export async function syncWidgetAndNotifications(): Promise<{
  ok: boolean;
  memberCount: number;
  eventCount: number;
  error?: string;
}> {
  try {
    const cfg = await loadRuntimeConfig();
    if (!hasConfig(cfg)) {
      const empty: WidgetPayload = {
        updatedAt: new Date().toISOString(),
        memberCount: 0,
        events: [],
        siteName: cfg.siteName,
      };
      writeWidgetPayload(empty);
      return {
        ok: false,
        memberCount: 0,
        eventCount: 0,
        error: "Chưa cấu hình Supabase.",
      };
    }

    const { persons, customEvents } = await fetchFamilyData(cfg);
    // Widget + notif: 7 ngày gần nhất
    const events = computeUpcomingEvents(persons, customEvents, 7);

    // Only fields Swift WidgetEvent decodes (avoid surprise decode failures)
    const widgetEvents = events.slice(0, 8).map((e) => ({
      id: e.id,
      personId: e.personId ?? null,
      personName: e.personName,
      type: e.type,
      date: e.date,
      eventDateLabel: e.eventDateLabel,
      daysUntil: e.daysUntil,
      originYear: e.originYear,
    }));

    const payload: WidgetPayload = {
      updatedAt: new Date().toISOString(),
      memberCount: persons.length,
      events: widgetEvents as WidgetPayload["events"],
      siteName: cfg.siteName,
    };
    writeWidgetPayload(payload);
    await scheduleEventNotifications(events, 7).catch(() => undefined);

    return {
      ok: true,
      memberCount: persons.length,
      eventCount: events.length,
    };
  } catch (e) {
    return {
      ok: false,
      memberCount: 0,
      eventCount: 0,
      error: e instanceof Error ? e.message : "sync failed",
    };
  }
}
