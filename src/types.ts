export type EventType = "birthday" | "death_anniversary" | "custom";

export interface PersonRow {
  id: string;
  full_name: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  is_deceased: boolean;
  avatar_url?: string | null;
}

export interface CustomEventRow {
  id: string;
  title: string;
  event_day: number;
  event_month: number;
  event_year?: number | null;
}

export interface FamilyEventItem {
  id: string;
  personId?: string;
  personName: string;
  type: EventType;
  /** ISO date YYYY-MM-DD (local calendar) */
  date: string;
  /** Label hiển thị, vd 12/03 */
  eventDateLabel: string;
  /** Số ngày còn lại (0 = hôm nay) */
  daysUntil: number;
  originYear: number | null;
}

export interface WidgetPayload {
  updatedAt: string;
  memberCount: number;
  events: FamilyEventItem[];
  siteName: string;
}
