import type { Person, Relationship } from "../types";

export type FamilyStatsResult = {
  total: number;
  male: number;
  female: number;
  other: number;
  inLawFemale: number;
  inLawMale: number;
  deceased: number;
  firstBorn: number;
  married: number;
  unmarried: number;
  byGeneration: { gen: number; count: number }[];
};

export function computeFamilyStats(
  persons: Person[],
  relationships: Relationship[],
): FamilyStatsResult {
  const total = persons.length;
  const male = persons.filter((p) => p.gender === "male").length;
  const female = persons.filter((p) => p.gender === "female").length;
  const other = total - male - female;
  const inLawFemale = persons.filter(
    (p) => p.gender === "female" && p.is_in_law,
  ).length;
  const inLawMale = persons.filter(
    (p) => p.gender === "male" && p.is_in_law,
  ).length;
  const deceased = persons.filter((p) => p.is_deceased).length;
  const firstBorn = persons.filter((p) => p.birth_order === 1).length;

  const marriedIds = new Set<string>();
  for (const r of relationships) {
    if (r.type === "marriage") {
      marriedIds.add(r.person_a);
      marriedIds.add(r.person_b);
    }
  }
  const married = marriedIds.size;
  const unmarried = Math.max(0, total - married);

  const genCounts = new Map<number, number>();
  for (const p of persons) {
    if (p.generation != null) {
      genCounts.set(p.generation, (genCounts.get(p.generation) || 0) + 1);
    }
  }
  const byGeneration = [...genCounts.entries()]
    .map(([gen, count]) => ({ gen, count }))
    .sort((a, b) => a.gen - b.gen);

  return {
    total,
    male,
    female,
    other,
    inLawFemale,
    inLawMale,
    deceased,
    firstBorn,
    married,
    unmarried,
    byGeneration,
  };
}
