export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";
export type UserRole = "admin" | "editor" | "member";
export type EventType = "birthday" | "death_anniversary" | "custom";
export type CalendarType = "solar" | "lunar";

export interface Person {
  id: string;
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  avatar_url: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;
}

/** @deprecated use Person */
export type PersonRow = Person;

export interface Relationship {
  id: string;
  type: RelationshipType | string;
  person_a: string;
  person_b: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** @deprecated use Relationship */
export type RelationshipRow = Relationship;

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

export interface PersonInsert {
  full_name: string;
  gender: Gender;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  death_year?: number | null;
  death_month?: number | null;
  death_day?: number | null;
  is_deceased?: boolean;
  is_in_law?: boolean;
  birth_order?: number | null;
  generation?: number | null;
  avatar_url?: string | null;
  note?: string | null;
}

export interface PrivateDetails {
  person_id: string;
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;
  facebook_url?: string | null;
}
