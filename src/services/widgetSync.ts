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
    const events = computeUpcomingEvents(persons, customEvents, 30);

    const payload: WidgetPayload = {
      updatedAt: new Date().toISOString(),
      memberCount: persons.length,
      events: events.slice(0, 12),
      siteName: cfg.siteName,
    };
    writeWidgetPayload(payload);
    await scheduleEventNotifications(events).catch(() => undefined);

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
