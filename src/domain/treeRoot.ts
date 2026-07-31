import type { Person, Relationship } from "../types";

export function pickDefaultRootId(
  persons: Person[],
  relationships: Relationship[],
  preferredRootId?: string | null,
): string | null {
  const pMap = new Map(persons.map((p) => [p.id, p]));
  if (preferredRootId && pMap.has(preferredRootId)) return preferredRootId;

  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child",
      )
      .map((r) => r.person_b),
  );

  const rootsFallback = persons.filter((p) => !childIds.has(p.id));
  if (rootsFallback.length === 0) {
    return persons[0]?.id ?? null;
  }

  const bloodlineRoots = rootsFallback.filter((p) => !p.is_in_law);
  const candidates = bloodlineRoots.length > 0 ? bloodlineRoots : rootsFallback;

  let maxChildren = -1;
  let best = candidates[0].id;
  for (const root of candidates) {
    const childCount = relationships.filter(
      (r) =>
        (r.type === "biological_child" || r.type === "adopted_child") &&
        r.person_a === root.id,
    ).length;
    if (childCount > maxChildren) {
      maxChildren = childCount;
      best = root.id;
    }
  }
  return best;
}

export function getChildren(
  personId: string,
  relationships: Relationship[],
  personsMap: Map<string, Person>,
): Person[] {
  return relationships
    .filter(
      (r) =>
        (r.type === "biological_child" || r.type === "adopted_child") &&
        r.person_a === personId,
    )
    .map((r) => personsMap.get(r.person_b))
    .filter(Boolean)
    .sort((a, b) => {
      const aOrder = a!.birth_order ?? Infinity;
      const bOrder = b!.birth_order ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a!.birth_year ?? Infinity) - (b!.birth_year ?? Infinity);
    }) as Person[];
}

export function getSpouses(
  personId: string,
  relationships: Relationship[],
  personsMap: Map<string, Person>,
): Person[] {
  return relationships
    .filter(
      (r) =>
        r.type === "marriage" &&
        (r.person_a === personId || r.person_b === personId),
    )
    .map((r) => {
      const spouseId = r.person_a === personId ? r.person_b : r.person_a;
      return personsMap.get(spouseId);
    })
    .filter(Boolean) as Person[];
}

export type ChildrenBranch = {
  /** null = không xác định được là con của người vợ/chồng nào (chưa gắn quan hệ với cha/mẹ còn lại) */
  spouse: Person | null;
  children: Person[];
};

/**
 * Gom con cái của `personId` theo từng người vợ/chồng, để cây gia phả có thể
 * tách nhánh khi một người có từ 2 vợ/chồng trở lên. Một đứa trẻ được xếp vào
 * nhánh của vợ/chồng X nếu tồn tại quan hệ cha/mẹ-con giữa X và đứa trẻ đó.
 * Con chưa rõ thuộc vợ/chồng nào (chỉ có 1 quan hệ cha/mẹ-con ghi nhận) được
 * gom vào nhánh `spouse: null`.
 */
export function getChildrenGroupedBySpouses(
  personId: string,
  spouses: Person[],
  relationships: Relationship[],
  personsMap: Map<string, Person>,
): ChildrenBranch[] {
  const allChildren = getChildren(personId, relationships, personsMap);
  const isChildRel = (r: Relationship) =>
    r.type === "biological_child" || r.type === "adopted_child";

  const branches: ChildrenBranch[] = spouses.map((spouse) => ({
    spouse,
    children: allChildren.filter((child) =>
      relationships.some(
        (r) => isChildRel(r) && r.person_a === spouse.id && r.person_b === child.id,
      ),
    ),
  }));

  const assignedIds = new Set(branches.flatMap((b) => b.children.map((c) => c.id)));
  const unassigned = allChildren.filter((c) => !assignedIds.has(c.id));
  if (unassigned.length > 0) {
    branches.push({ spouse: null, children: unassigned });
  }
  return branches;
}

export type EldestSonChainEntry = {
  depth: number;
  /** Vợ/chồng đã sinh ra con trai trưởng kế tiếp trong chuỗi — sáng viền cùng lúc. */
  spouseId: string | null;
};

/**
 * Chuỗi "trưởng nam": bắt đầu từ `rootId`, đi xuống qua con trai đầu lòng
 * (theo birth_order/birth_year, giữa TẤT CẢ vợ/chồng) của từng đời, cho tới
 * khi không còn con trai. Trả về Map id -> {depth, spouseId} để component vẽ
 * hiệu ứng "chạy" theo độ sâu và sáng viền cả cặp vợ chồng trưởng.
 */
export function computeEldestSonChain(
  rootId: string,
  relationships: Relationship[],
  personsMap: Map<string, Person>,
): Map<string, EldestSonChainEntry> {
  const chain = new Map<string, EldestSonChainEntry>();
  const visited = new Set<string>();
  const isChildRel = (r: Relationship) =>
    r.type === "biological_child" || r.type === "adopted_child";
  let current = personsMap.get(rootId) ?? null;
  let depth = 0;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const eldestSon = getChildren(current.id, relationships, personsMap).find(
      (c) => c.gender === "male",
    );

    let spouseId: string | null = null;
    if (eldestSon) {
      const spouses = getSpouses(current.id, relationships, personsMap);
      const match = spouses.find((s) =>
        relationships.some(
          (r) => isChildRel(r) && r.person_a === s.id && r.person_b === eldestSon.id,
        ),
      );
      spouseId = (match ?? spouses[0])?.id ?? null;
    }

    chain.set(current.id, { depth, spouseId });
    if (!eldestSon) break;
    current = eldestSon;
    depth += 1;
  }

  return chain;
}
