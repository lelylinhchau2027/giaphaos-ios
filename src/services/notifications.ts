import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { FamilyEventItem } from "../types";
import { eventTypeLabel } from "./events";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn("Không phải thiết bị thật — thông báo có thể hạn chế.");
  }

  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const asked = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowDisplayInCarPlay: false,
    },
  });

  return (
    asked.granted ||
    asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("family-events", {
      name: "Sự kiện gia đình",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D97706",
    });
  }
}

/**
 * Chỉ 1 thông báo mỗi ngày lúc 21:00.
 * Nội dung: tóm tắt sự kiện của ngày hôm sau (trong cửa sổ withinDays).
 */
export async function scheduleEventNotifications(
  events: FamilyEventItem[],
  withinDays = 7,
) {
  const ok = await ensureNotificationPermissions();
  if (!ok) return { scheduled: 0, skipped: true as const };

  await setupAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const upcoming = events.filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= withinDays,
  );

  // Group events by calendar day (ISO date)
  const byDate = new Map<string, FamilyEventItem[]>();
  for (const e of upcoming) {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  }

  let scheduled = 0;
  const now = Date.now();

  for (const [isoDate, dayEvents] of byDate) {
    // Notify at 21:00 the evening BEFORE the event day
    // (remind about tomorrow). For "today" events that already passed 21:00 yesterday,
    // skip — user already missed evening reminder.
    const [y, m, d] = isoDate.split("-").map(Number);
    const eventDay = new Date(y, m - 1, d);
    const fireAt = new Date(y, m - 1, d, 21, 0, 0);
    fireAt.setDate(fireAt.getDate() - 1); // 21:00 day before

    // If reminder time already passed, skip (no flood of immediate notifs)
    if (fireAt.getTime() <= now) continue;

    // Also skip if event is more than withinDays away from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysOut = Math.round(
      (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysOut < 1 || daysOut > withinDays) continue;

    const names = dayEvents
      .slice(0, 4)
      .map((e) => `${eventTypeLabel(e.type)}: ${e.personName}`)
      .join(" · ");
    const more =
      dayEvents.length > 4 ? ` và ${dayEvents.length - 4} sự kiện khác` : "";
    const whenLabel =
      daysOut === 1 ? "Ngày mai" : `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Gia Phả · ${whenLabel} (${dayEvents.length} sự kiện)`,
        body: names + more,
        data: { url: "/events", date: isoDate },
        sound: true,
        ...(Platform.OS === "android" ? { channelId: "family-events" } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    scheduled += 1;
  }

  return { scheduled, skipped: false as const };
}

export function addNotificationResponseListener(
  handler: (urlPath: string | null) => void,
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      url?: string;
    };
    handler(data?.url ?? null);
  });
}
