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
    // Simulator vẫn cho phép local notifications trên một số bản iOS
    console.warn("Không phải thiết bị thật — thông báo có thể hạn chế.");
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
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
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D97706",
    });
  }
}

/**
 * Lên lịch local notification cho sự kiện trong 7 ngày tới.
 * Huỷ lịch cũ của app trước khi set lại (tránh trùng).
 */
export async function scheduleEventNotifications(
  events: FamilyEventItem[],
  withinDays = 7,
) {
  const ok = await ensureNotificationPermissions();
  if (!ok) return { scheduled: 0, skipped: true as const };

  await setupAndroidChannel();

  // Xoá toàn bộ lịch local do app tạo
  await Notifications.cancelAllScheduledNotificationsAsync();

  const upcoming = events.filter((e) => e.daysUntil >= 0 && e.daysUntil <= withinDays);
  let scheduled = 0;

  for (const event of upcoming) {
    // Báo lúc 8:00 sáng ngày sự kiện
    const [y, m, d] = event.date.split("-").map(Number);
    const fireAt = new Date(y, m - 1, d, 8, 0, 0);
    if (fireAt.getTime() <= Date.now()) {
      // Hôm nay mà đã qua 8h → báo sau 10 giây (nhắc nhẹ)
      if (event.daysUntil === 0) {
        fireAt.setTime(Date.now() + 10_000);
      } else {
        continue;
      }
    }

    const typeLabel = eventTypeLabel(event.type);
    const when =
      event.daysUntil === 0
        ? "hôm nay"
        : event.daysUntil === 1
          ? "ngày mai"
          : `trong ${event.daysUntil} ngày`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeLabel}: ${event.personName}`,
        body: `${typeLabel} ${when} (${event.eventDateLabel}). Chạm để mở Gia Phả.`,
        data: {
          eventId: event.id,
          personId: event.personId ?? null,
          url: "/dashboard/events",
        },
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

  // Nhắc sớm: 1 ngày trước (18:00) nếu còn trong cửa sổ
  for (const event of upcoming.filter((e) => e.daysUntil >= 1 && e.daysUntil <= withinDays)) {
    const [y, m, d] = event.date.split("-").map(Number);
    const fireAt = new Date(y, m - 1, d, 18, 0, 0);
    fireAt.setDate(fireAt.getDate() - 1);
    if (fireAt.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Ngày mai: ${event.personName}`,
        body: `${eventTypeLabel(event.type)} ngày mai (${event.eventDateLabel}).`,
        data: {
          eventId: event.id,
          personId: event.personId ?? null,
          url: "/dashboard/events",
        },
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
