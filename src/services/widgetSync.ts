import { ExtensionStorage } from "@bacons/apple-targets";
import { APP_GROUP } from "../config";
import type {
  CustomEventRow,
  FamilyEventItem,
  Person,
  WidgetPayload,
} from "../types";
import { computeUpcomingEvents } from "./events";
import { scheduleEventNotifications } from "./notifications";
import { loadRuntimeConfig } from "./settings";
import { fetchFamilyData, hasConfig } from "./supabaseData";
import { reloadWidgets, saveWidgetData } from "../utils/widgetNative";

/** Widget shows a wider window so it is not always empty. */
export const WIDGET_EVENT_DAYS = 45;
/** Notifications stay focused on the near term. */
export const NOTIF_EVENT_DAYS = 14;

const storage = new ExtensionStorage(APP_GROUP);

/** Widget kind must match Swift `GiaPhaWidget.kind`. */
const WIDGET_KIND = "GiaPhaWidget";

function toWidgetEvent(e: FamilyEventItem) {
  return {
    id: String(e.id),
    personId: e.personId ?? null,
    personName: e.personName,
    type: e.type,
    date: e.date,
    eventDateLabel: e.eventDateLabel,
    daysUntil: e.daysUntil,
    originYear: e.originYear ?? null,
  };
}

function writeWidgetPayload(
  payload: WidgetPayload & {
    supabaseUrl?: string;
    hasKey?: boolean;
    syncError?: string;
    windowDays?: number;
  },
) {
  try {
    console.log("DEBUG: Writing to App Group, siteName:", payload.siteName);
    storage.set("siteName", payload.siteName);
    storage.set("memberCount", payload.memberCount);
    storage.set("updatedAt", payload.updatedAt);
    storage.set("windowDays", payload.windowDays ?? WIDGET_EVENT_DAYS);
    storage.set("hasKey", payload.hasKey ? 1 : 0);
    storage.set("syncError", payload.syncError ?? "");
    if (payload.supabaseUrl) {
      storage.set("supabaseUrl", payload.supabaseUrl);
    }

    // String JSON — Swift reads via string(forKey:)
    const json = JSON.stringify(payload.events.map(toWidgetEvent));
    
    // NEW: Use native file writer for robustness
    saveWidgetData(json);
    
    // Legacy storage
    storage.set("eventsJson", json);

    ExtensionStorage.reloadWidget(WIDGET_KIND);
    ExtensionStorage.reloadWidget();
    reloadWidgets(); // Force native reload
  } catch (e) {
    console.warn("widget write", e);
  }
}
// ... (rest of the file remains same)

export type SyncResult = {
  ok: boolean;
  memberCount: number;
  eventCount: number;
  error?: string;
  eventsPreview?: string[];
};

/**
 * Prefer in-memory persons/events when provided (right after user edits),
 * otherwise fetch from Supabase.
 */
export async function syncWidgetAndNotifications(opts?: {
  persons?: Person[];
  customEvents?: CustomEventRow[];
  siteName?: string;
}): Promise<SyncResult> {
  try {
    const cfg = await loadRuntimeConfig();
    const configured = hasConfig(cfg);

    if (!configured) {
      writeWidgetPayload({
        updatedAt: new Date().toISOString(),
        memberCount: 0,
        events: [],
        siteName: cfg.siteName,
        supabaseUrl: cfg.supabaseUrl || "",
        hasKey: false,
        syncError: "Chưa cấu hình Supabase trong Cài đặt",
        windowDays: WIDGET_EVENT_DAYS,
      });
      return {
        ok: false,
        memberCount: 0,
        eventCount: 0,
        error: "Chưa cấu hình Supabase.",
      };
    }

    let persons = opts?.persons;
    let customEvents = opts?.customEvents;

    if (!persons || !customEvents) {
      const data = await fetchFamilyData(cfg);
      persons = data.persons;
      customEvents = data.customEvents;
    }

    // Wider window for widget; if still empty, grab next few of the year
    let events = computeUpcomingEvents(
      persons,
      customEvents,
      WIDGET_EVENT_DAYS,
    );

    if (events.length === 0) {
      events = computeUpcomingEvents(persons, customEvents, 365).slice(0, 8);
    } else {
      events = events.slice(0, 10);
    }

    const notifEvents = computeUpcomingEvents(
      persons,
      customEvents,
      NOTIF_EVENT_DAYS,
    );

    const payload: WidgetPayload = {
      updatedAt: new Date().toISOString(),
      memberCount: persons.length,
      events: events as WidgetPayload["events"],
      siteName: opts?.siteName || cfg.siteName,
    };

    writeWidgetPayload({
      ...payload,
      supabaseUrl: cfg.supabaseUrl,
      hasKey: Boolean(cfg.supabaseAnonKey),
      syncError: "",
      windowDays: WIDGET_EVENT_DAYS,
    });

    await scheduleEventNotifications(notifEvents, NOTIF_EVENT_DAYS).catch(
      () => undefined,
    );

    return {
      ok: true,
      memberCount: persons.length,
      eventCount: events.length,
      eventsPreview: events.slice(0, 3).map((e) => e.personName),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    try {
      writeWidgetPayload({
        updatedAt: new Date().toISOString(),
        memberCount: 0,
        events: [],
        siteName: "Gia Phả OS",
        syncError: msg,
        windowDays: WIDGET_EVENT_DAYS,
      });
    } catch {
      // ignore
    }
    return {
      ok: false,
      memberCount: 0,
      eventCount: 0,
      error: msg,
    };
  }
}
