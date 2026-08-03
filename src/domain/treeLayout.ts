import {
  getChildren,
  getChildrenGroupedBySpouses,
  getSpouses,
  type ChildrenBranch,
} from "./treeRoot";
import type { Person, Relationship } from "../types";

/** Bề rộng 1 thẻ người trong coupleBox. */
export const CARD_W = 88;
/** Mỗi node (nodeCol) có marginHorizontal:6 hai bên → 12px giữa 2 anh em cạnh nhau. */
export const NODE_MARGIN = 12;

export type LayoutPlan =
  | { mode: "single"; spouses: Person[]; children: Person[] }
  | {
      mode: "multi";
      rawSpouses: Person[];
      rowLeft: Person[];
      rowRight: Person[];
      branches: ChildrenBranch[];
    };

export type LayoutFilters = {
  hideSpouses: boolean;
  hideMales: boolean;
  hideFemales: boolean;
};

const passesGenderFilter = (
  g: Person["gender"],
  hideMales: boolean,
  hideFemales: boolean,
) => !(hideMales && g === "male") && !(hideFemales && g === "female");

/**
 * Quyết định layout (1 khối gộp hay tách nhánh nhiều vợ/chồng) — dùng chung
 * bởi TreeNode (lúc render) và computeNodeWidth (lúc tính toạ độ) để hai bên
 * không bao giờ lệch nhau.
 */
export function planLayout(
  person: Person,
  personsMap: Map<string, Person>,
  relationships: Relationship[],
  { hideSpouses, hideMales, hideFemales }: LayoutFilters,
): LayoutPlan {
  const rawSpouses = hideSpouses
    ? []
    : getSpouses(person.id, relationships, personsMap);

  if (rawSpouses.length <= 1) {
    const spouses = rawSpouses.filter((s) =>
      passesGenderFilter(s.gender, hideMales, hideFemales),
    );
    const children = getChildren(person.id, relationships, personsMap).filter((c) =>
      passesGenderFilter(c.gender, hideMales, hideFemales),
    );
    return { mode: "single", spouses, children };
  }

  // Xen kẽ 2 bên: vợ/chồng thứ 1 → phải (gần), thứ 2 → trái (gần), thứ 3 → phải (xa)...
  const rightSpouses: Person[] = [];
  const leftSpousesEncountered: Person[] = [];
  rawSpouses.forEach((s, i) => {
    if (i % 2 === 0) rightSpouses.push(s);
    else leftSpousesEncountered.push(s);
  });
  const rowLeft = [...leftSpousesEncountered].reverse();

  const branches = getChildrenGroupedBySpouses(
    person.id,
    rawSpouses,
    relationships,
    personsMap,
  ).map((b) => ({
    spouse: b.spouse,
    children: b.children.filter((c) =>
      passesGenderFilter(c.gender, hideMales, hideFemales),
    ),
  }));

  return { mode: "multi", rawSpouses, rowLeft, rowRight: rightSpouses, branches };
}

/**
 * Bề rộng (px) node này thực sự chiếm khi render — tính đệ quy bằng đúng các
 * hằng số layout (CARD_W, NODE_MARGIN) mà JSX dùng, để suy ra chính xác tâm
 * mỗi cột bằng công thức thuần tuý (không dùng onLayout/state — tránh vòng lặp
 * re-render từng gây crash).
 *
 * PHẢI khớp tuyệt đối với những gì Yoga đo được, nếu không vệt vàng "trưởng
 * nam" vẽ đè lên sẽ lệch khỏi line xám bên dưới.
 */
export function computeNodeWidth(
  person: Person,
  personsMap: Map<string, Person>,
  relationships: Relationship[],
  filters: LayoutFilters,
  visited: Set<string>,
): number {
  // Node đã vẽ ở nhánh khác → TreeNode trả về null, không chiếm chỗ.
  if (visited.has(person.id)) return 0;
  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  const plan = planLayout(person, personsMap, relationships, filters);

  const widthOfKids = (kids: Person[]) =>
    kids.reduce(
      (sum, c) =>
        sum +
        computeNodeWidth(c, personsMap, relationships, filters, nextVisited) +
        NODE_MARGIN,
      0,
    );

  if (plan.mode === "single") {
    // coupleBox xếp ngang: bản thân + (tối đa 1) vợ/chồng → mỗi thẻ CARD_W.
    const ownWidth = (1 + plan.spouses.length) * CARD_W;
    if (plan.children.length === 0) return ownWidth;
    return Math.max(ownWidth, widthOfKids(plan.children));
  }

  const coupleRowWidth = (plan.rawSpouses.length + 1) * CARD_W;
  let branchesRowWidth = 0;
  for (const b of plan.branches) {
    if (b.children.length === 0) continue;
    branchesRowWidth += widthOfKids(b.children) + NODE_MARGIN;
  }
  return Math.max(coupleRowWidth, branchesRowWidth);
}

/**
 * Toạ độ ngang của một hàng con: tâm từng cột và tâm cả hàng (chính là nơi
 * stem của cha đáp xuống, vì kidsBlock/nodeCol đều alignItems:"center").
 */
export function measureKidsRow(
  kids: Person[],
  personsMap: Map<string, Person>,
  relationships: Relationship[],
  filters: LayoutFilters,
  visited: Set<string>,
): { colCenters: number[]; rowCenter: number; rowWidth: number } {
  const colCenters: number[] = [];
  let x = 0;
  for (const c of kids) {
    const w =
      computeNodeWidth(c, personsMap, relationships, filters, visited) + NODE_MARGIN;
    colCenters.push(x + w / 2);
    x += w;
  }
  return { colCenters, rowCenter: x / 2, rowWidth: x };
}
