import type {
  CustomEventRow,
  FamilyEventItem,
  PersonRow,
} from "../types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIsoLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Tính sự kiện 0–30 ngày tới (sinh nhật dương lịch, giỗ dương lịch đơn giản, custom).
 * Widget + local notification dùng bộ này — không phụ thuộc lunar-javascript.
 */
export function computeUpcomingEvents(
  persons: PersonRow[],
  customEvents: CustomEventRow[],
  withinDays = 30,
): FamilyEventItem[] {
  const today = startOfToday();
  const year = today.getFullYear();
  const items: FamilyEventItem[] = [];

  const pushIfUpcoming = (
    month: number,
    day: number,
    base: Omit<FamilyEventItem, "date" | "daysUntil" | "eventDateLabel"> & {
      eventDateLabel?: string;
    },
  ) => {
    // Ứng viên năm nay và năm sau
    for (const y of [year, year + 1]) {
      const occurrence = new Date(y, month - 1, day);
      if (Number.isNaN(occurrence.getTime())) continue;
      const diff = daysBetween(today, occurrence);
      if (diff >= 0 && diff <= withinDays) {
        items.push({
          ...base,
          date: toIsoLocal(occurrence),
          daysUntil: diff,
          eventDateLabel:
            base.eventDateLabel ?? `${pad(day)}/${pad(month)}`,
        });
        break;
      }
    }
  };

  for (const p of persons) {
    if (p.birth_month && p.birth_day) {
      pushIfUpcoming(p.birth_month, p.birth_day, {
        id: `birth-${p.id}`,
        personId: p.id,
        personName: p.full_name,
        type: "birthday",
        originYear: p.birth_year,
      });
    }

    if (p.is_deceased && p.death_month && p.death_day) {
      pushIfUpcoming(p.death_month, p.death_day, {
        id: `death-${p.id}`,
        personId: p.id,
        personName: p.full_name,
        type: "death_anniversary",
        originYear: p.death_year,
        eventDateLabel: `${pad(p.death_day)}/${pad(p.death_month)} (giỗ)`,
      });
    }
  }

  for (const ce of customEvents) {
    if (ce.event_month && ce.event_day) {
      pushIfUpcoming(ce.event_month, ce.event_day, {
        id: `custom-${ce.id}`,
        personName: ce.title,
        type: "custom",
        originYear: ce.event_year ?? null,
      });
    }
  }

  items.sort((a, b) => a.daysUntil - b.daysUntil || a.personName.localeCompare(b.personName, "vi"));
  return items;
}

export function eventTypeLabel(type: FamilyEventItem["type"]) {
  switch (type) {
    case "birthday":
      return "Sinh nhật";
    case "death_anniversary":
      return "Ngày giỗ";
    case "custom":
      return "Sự kiện";
    default:
      return "Sự kiện";
  }
}
