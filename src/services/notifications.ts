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

export type NotifTime = { hour: number; minute: number };

/** Giờ cố định cho thông báo đúng ngày sự kiện diễn ra. */
const EVENT_DAY_HOUR = 6;
const EVENT_DAY_MINUTE = 0;

type Bucket = {
  fireAt: Date;
  items: { event: FamilyEventItem; daysLeft: number }[];
};

function addBucketItem(
  buckets: Map<string, Bucket>,
  fireAt: Date,
  event: FamilyEventItem,
  daysLeft: number,
) {
  const key = fireAt.toDateString();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { fireAt, items: [] };
    buckets.set(key, bucket);
  }
  bucket.items.push({ event, daysLeft });
}

/**
 * Thông báo hàng ngày vào giờ đã cài đặt (mặc định 21:00) cho mỗi ngày trong
 * cửa sổ `withinDays` trước khi sự kiện diễn ra; đến đúng ngày sự kiện thì
 * đổi sang thông báo lúc 6:00 sáng. Nhiều sự kiện rơi cùng một lần thông báo
 * sẽ được gộp chung.
 */
export async function scheduleEventNotifications(
  events: FamilyEventItem[],
  withinDays = 7,
  notifTime: NotifTime = { hour: 21, minute: 0 },
) {
  const ok = await ensureNotificationPermissions();
  if (!ok) return { scheduled: 0, skipped: true as const };

  await setupAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const upcoming = events.filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= withinDays,
  );

  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leadBuckets = new Map<string, Bucket>();
  const eventDayBuckets = new Map<string, Bucket>();

  for (const e of upcoming) {
    const daysLeft = e.daysUntil;

    // Nhắc mỗi ngày, vào giờ đã cài đặt, kể từ hôm nay tới trước ngày diễn ra.
    for (let offset = 0; offset < daysLeft; offset++) {
      const fireDay = new Date(today);
      fireDay.setDate(fireDay.getDate() + offset);
      const fireAt = new Date(
        fireDay.getFullYear(),
        fireDay.getMonth(),
        fireDay.getDate(),
        notifTime.hour,
        notifTime.minute,
        0,
      );
      addBucketItem(leadBuckets, fireAt, e, daysLeft - offset);
    }

    // Đúng ngày sự kiện: thông báo lúc 6:00 sáng.
    const eventFireDay = new Date(today);
    eventFireDay.setDate(eventFireDay.getDate() + daysLeft);
    const eventFireAt = new Date(
      eventFireDay.getFullYear(),
      eventFireDay.getMonth(),
      eventFireDay.getDate(),
      EVENT_DAY_HOUR,
      EVENT_DAY_MINUTE,
      0,
    );
    addBucketItem(eventDayBuckets, eventFireAt, e, 0);
  }

  let scheduled = 0;

  const fireBucket = async (bucket: Bucket, isEventDay: boolean) => {
    // Bỏ qua nếu giờ thông báo đã trôi qua — tránh dội thông báo tức thì.
    if (bucket.fireAt.getTime() <= now) return;

    const items = bucket.items.slice(0, 4);
    const more =
      bucket.items.length > 4
        ? ` và ${bucket.items.length - 4} sự kiện khác`
        : "";
    const names = items
      .map((it) => {
        const label = isEventDay
          ? "hôm nay"
          : it.daysLeft === 1
            ? "còn 1 ngày"
            : `còn ${it.daysLeft} ngày`;
        return `${eventTypeLabel(it.event.type)}: ${it.event.personName} (${label})`;
      })
      .join(" · ");

    await Notifications.scheduleNotificationAsync({
      content: {
        title: isEventDay
          ? `Gia Phả · Hôm nay (${bucket.items.length} sự kiện)`
          : `Gia Phả · Sắp tới (${bucket.items.length} sự kiện)`,
        body: names + more,
        data: { url: "/events" },
        sound: true,
        ...(Platform.OS === "android" ? { channelId: "family-events" } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: bucket.fireAt,
      },
    });
    scheduled += 1;
  };

  for (const bucket of leadBuckets.values()) await fireBucket(bucket, false);
  for (const bucket of eventDayBuckets.values()) await fireBucket(bucket, true);

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
