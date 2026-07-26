import type { Person, Relationship } from "../types";

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export function exportPersonsCsv(persons: Partial<Person>[]): string {
  return rowsToCsv(
    persons.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      gender: p.gender,
      birth_year: p.birth_year,
      birth_month: p.birth_month,
      birth_day: p.birth_day,
      death_year: p.death_year,
      death_month: p.death_month,
      death_day: p.death_day,
      is_deceased: p.is_deceased,
      is_in_law: p.is_in_law,
      birth_order: p.birth_order,
      generation: p.generation,
      avatar_url: p.avatar_url,
      note: p.note,
    })),
  );
}

export function exportRelationshipsCsv(
  relationships: Partial<Relationship>[],
): string {
  return rowsToCsv(
    relationships.map((r) => ({
      id: r.id,
      type: r.type,
      person_a: r.person_a,
      person_b: r.person_b,
      note: r.note,
    })),
  );
}
