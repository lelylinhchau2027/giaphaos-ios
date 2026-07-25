import {
  getSolarForLunarInYear,
  solarFromLunarYmd,
  solarToLunarParts,
} from "../lib/lunar";
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

/** Occurrence (solar) of a custom event in a given solar year, or null. */
export function customEventOccurrenceInYear(
  ce: CustomEventRow,
  year: number,
): { date: Date; label: string } | null {
  if (!ce.event_month || !ce.event_day) return null;
  const calendar = ce.calendar_type === "lunar" ? "lunar" : "solar";
  const recurring = ce.is_recurring !== false;

  if (!recurring) {
    if (!ce.event_year) return null;
    if (calendar === "solar") {
      if (ce.event_year !== year) return null;
      return {
        date: new Date(year, ce.event_month - 1, ce.event_day),
        label: `${pad(ce.event_day)}/${pad(ce.event_month)}/${ce.event_year}`,
      };
    }
    const occ = solarFromLunarYmd(ce.event_year, ce.event_month, ce.event_day);
    if (!occ || occ.getFullYear() !== year) return null;
    return {
      date: occ,
      label: `${pad(ce.event_day)}/${pad(ce.event_month)}/${ce.event_year} ÂL`,
    };
  }

  if (calendar === "solar") {
    return {
      date: new Date(year, ce.event_month - 1, ce.event_day),
      label: `${pad(ce.event_day)}/${pad(ce.event_month)}`,
    };
  }

  const occ = getSolarForLunarInYear(ce.event_month, ce.event_day, year);
  if (!occ) return null;
  return {
    date: occ,
    label: `${pad(ce.event_day)}/${pad(ce.event_month)} ÂL`,
  };
}

export function computeEventsForYear(
  persons: PersonRow[],
  customEvents: CustomEventRow[],
  year: number,
): FamilyEventItem[] {
  const items: FamilyEventItem[] = [];
  const today = startOfToday();

  for (const p of persons) {
    if (p.birth_month && p.birth_day) {
      const occurrence = new Date(year, p.birth_month - 1, p.birth_day);
      items.push({
        id: `birth-${p.id}`,
        personId: p.id,
        personName: p.full_name,
        type: "birthday",
        date: toIsoLocal(occurrence),
        eventDateLabel: `${pad(p.birth_day)}/${pad(p.birth_month)}`,
        daysUntil: daysBetween(today, occurrence),
        originYear: p.birth_year,
        calendarType: "solar",
        isRecurring: true,
      });
    }

    if (p.is_deceased && p.death_month && p.death_day) {
      const deathYear = p.death_year ?? year;
      const lunar = solarToLunarParts(deathYear, p.death_month, p.death_day);
      if (lunar) {
        const occurrence = getSolarForLunarInYear(
          lunar.month,
          lunar.day,
          year,
        );
        if (occurrence) {
          items.push({
            id: `death-${p.id}`,
            personId: p.id,
            personName: p.full_name,
            type: "death_anniversary",
            date: toIsoLocal(occurrence),
            eventDateLabel: `${pad(lunar.day)}/${pad(lunar.month)} ÂL`,
            daysUntil: daysBetween(today, occurrence),
            originYear: p.death_year,
            calendarType: "lunar",
            isRecurring: true,
          });
        }
      }
    }
  }

  for (const ce of customEvents) {
    const hit = customEventOccurrenceInYear(ce, year);
    if (!hit) continue;
    items.push({
      id: ce.id,
      personName: ce.title,
      type: "custom",
      date: toIsoLocal(hit.date),
      eventDateLabel: hit.label,
      daysUntil: daysBetween(today, hit.date),
      originYear: ce.event_year ?? null,
      calendarType: ce.calendar_type === "lunar" ? "lunar" : "solar",
      isRecurring: ce.is_recurring !== false,
    });
  }

  items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.personName.localeCompare(b.personName, "vi"),
  );
  return items;
}

/**
 * Sự kiện trong [0, withinDays] ngày tới (widget + home).
 */
export function computeUpcomingEvents(
  persons: PersonRow[],
  customEvents: CustomEventRow[],
  withinDays = 30,
): FamilyEventItem[] {
  const today = startOfToday();
  const year = today.getFullYear();
  const pool = [
    ...computeEventsForYear(persons, customEvents, year),
    ...computeEventsForYear(persons, customEvents, year + 1),
  ];

  const seen = new Set<string>();
  const out: FamilyEventItem[] = [];
  for (const e of pool) {
    if (seen.has(e.id)) continue;
    if (e.daysUntil < 0 || e.daysUntil > withinDays) continue;
    seen.add(e.id);
    out.push(e);
  }
  out.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      a.personName.localeCompare(b.personName, "vi"),
  );
  return out;
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

export function daysUntilLabel(days: number): string {
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  if (days < 0) return "Đã qua";
  if (days <= 30) return `${days} ngày nữa`;
  if (days <= 60) return `${Math.ceil(days / 7)} tuần nữa`;
  return `${Math.ceil(days / 30)} tháng nữa`;
}
