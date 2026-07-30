import { ExtensionStorage } from "@bacons/apple-targets";
import type {
  CustomEventRow,
  FamilyEventItem,
  Person,
  WidgetPayload,
} from "../types";
import { computeUpcomingEvents } from "./events";
import { scheduleEventNotifications } from "./notifications";
import { loadRuntimeConfig, type RuntimeConfig } from "./settings";
import { fetchFamilyData, hasConfig } from "./supabaseData";
import { getSupabase } from "./supabaseClient";

/** Widget shows a wider window so it is not always empty. */
export const WIDGET_EVENT_DAYS = 45;
/** Notifications stay focused on the near term. */
export const NOTIF_EVENT_DAYS = 14;

/** Widget kind must match Swift `GiaPhaWidget.kind`. */
const WIDGET_KIND = "GiaPhaWidget";

/** Fixed single-row cache the widget reads via Supabase REST — see docs/migrations/2026-07-30_widget_cache.sql */
const WIDGET_CACHE_ID = "default";

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

/**
 * ESign (Apple ID cá nhân) không cấp được App Group entitlement, nên app
 * và widget không thể chia sẻ dữ liệu qua App Group container nữa. Widget
 * tự gọi Supabase REST trực tiếp (xem targets/widget/widgets.swift) — app
 * chỉ cần ghi snapshot đã tính sẵn vào bảng `widget_cache`.
 */
async function pushWidgetCache(
  cfg: RuntimeConfig,
  payload: WidgetPayload,
): Promise<void> {
  const sb = getSupabase(cfg);
  if (!sb) return;
  const { error } = await sb.from("widget_cache").upsert({
    id: WIDGET_CACHE_ID,
    site_name: payload.siteName,
    member_count: payload.memberCount,
    events_json: JSON.stringify(payload.events.map(toWidgetEvent)),
    updated_at: payload.updatedAt,
  });
  if (error) {
    console.warn("widget_cache upsert failed", error.message);
  }
}

function reloadWidget() {
  try {
    ExtensionStorage.reloadWidget(WIDGET_KIND);
    ExtensionStorage.reloadWidget();
  } catch (e) {
    console.warn("reloadWidget", e);
  }
}

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

    await pushWidgetCache(cfg, payload);
    reloadWidget();

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
    return {
      ok: false,
      memberCount: 0,
      eventCount: 0,
      error: msg,
    };
  }
}
