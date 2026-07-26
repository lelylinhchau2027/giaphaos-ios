import type { Person, Relationship } from "../types";

export interface ComputedUpdate {
  id: string;
  full_name: string;
  old_generation: number | null;
  new_generation: number | null;
  old_birth_order: number | null;
  new_birth_order: number | null;
  changed: boolean;
}

export function computeGenerations(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  const childParents = new Map<string, string[]>();
  const parentChildren = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
  }

  const spouseMap = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  }

  const roots = persons.filter((p) => !childParents.has(p.id) && !p.is_in_law);
  const genMap = new Map<string, number>();
  const queue: Array<{ id: string; gen: number }> = roots.map((r) => ({
    id: r.id,
    gen: 1,
  }));

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (genMap.has(id)) continue;
    genMap.set(id, gen);
    for (const childId of parentChildren.get(id) || []) {
      if (!genMap.has(childId)) queue.push({ id: childId, gen: gen + 1 });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const p of persons) {
      if (!p.is_in_law || genMap.has(p.id)) continue;
      for (const spouseId of spouseMap.get(p.id) || []) {
        if (genMap.has(spouseId)) {
          genMap.set(p.id, genMap.get(spouseId)!);
          changed = true;
          break;
        }
      }
    }
  }

  return genMap;
}

export function computeBirthOrders(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  const parentChildren = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
  }

  const personsById = new Map(persons.map((p) => [p.id, p]));
  const orderMap = new Map<string, number>();

  for (const [, childIds] of parentChildren) {
    const sorted = [...childIds].sort((a, b) => {
      const pa = personsById.get(a);
      const pb = personsById.get(b);
      const aYear = pa?.birth_year ?? Infinity;
      const bYear = pb?.birth_year ?? Infinity;
      if (aYear !== bYear) return aYear - bYear;
      return (pa?.full_name ?? "").localeCompare(pb?.full_name ?? "", "vi");
    });

    let order = 1;
    for (const childId of sorted) {
      const p = personsById.get(childId);
      if (p && !p.is_in_law) {
        if (!orderMap.has(childId) || orderMap.get(childId)! > order) {
          orderMap.set(childId, order);
        }
        order++;
      }
    }
  }

  return orderMap;
}

export function previewLineageUpdates(
  persons: Person[],
  relationships: Relationship[],
): ComputedUpdate[] {
  const genMap = computeGenerations(persons, relationships);
  const orderMap = computeBirthOrders(persons, relationships);

  const result: ComputedUpdate[] = persons.map((p) => {
    const newGen = genMap.has(p.id) ? genMap.get(p.id)! : null;
    const newOrder = orderMap.has(p.id) ? orderMap.get(p.id)! : null;
    return {
      id: p.id,
      full_name: p.full_name,
      old_generation: p.generation,
      new_generation: newGen,
      old_birth_order: p.birth_order,
      new_birth_order: newOrder,
      changed: newGen !== p.generation || newOrder !== p.birth_order,
    };
  });

  result.sort((a, b) => {
    if (a.changed !== b.changed) return a.changed ? -1 : 1;
    const gA = a.new_generation ?? 999;
    const gB = b.new_generation ?? 999;
    if (gA !== gB) return gA - gB;
    return (a.new_birth_order ?? 999) - (b.new_birth_order ?? 999);
  });

  return result;
}
