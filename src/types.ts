export type EventType = "birthday" | "death_anniversary" | "custom";
export type CalendarType = "solar" | "lunar";

export interface PersonRow {
  id: string;
  full_name: string;
  gender?: string | null;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  is_deceased: boolean;
  is_in_law?: boolean | null;
  generation?: number | null;
  birth_order?: number | null;
  avatar_url?: string | null;
  note?: string | null;
}

export interface RelationshipRow {
  id: string;
  type: "marriage" | "biological_child" | "adopted_child" | string;
  person_a: string;
  person_b: string;
  note?: string | null;
}

export interface CustomEventRow {
  id: string;
  title: string;
  event_day: number;
  event_month: number;
  event_year?: number | null;
  calendar_type?: CalendarType | null;
  is_recurring?: boolean | null;
}

export interface CustomEventInsert {
  title: string;
  event_day: number;
  event_month: number;
  event_year?: number | null;
  calendar_type: CalendarType;
  is_recurring: boolean;
}

export interface FamilyEventItem {
  id: string;
  personId?: string;
  personName: string;
  type: EventType;
  /** ISO date YYYY-MM-DD (solar occurrence) */
  date: string;
  eventDateLabel: string;
  daysUntil: number;
  originYear: number | null;
  calendarType?: CalendarType;
  isRecurring?: boolean;
}

export interface WidgetPayload {
  updatedAt: string;
  memberCount: number;
  events: FamilyEventItem[];
  siteName: string;
}
