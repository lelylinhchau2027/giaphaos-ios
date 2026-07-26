export interface KinshipResult {
  /** Person A gọi Person B là gì */
  aCallsB: string;
  /** Person B gọi Person A là gì */
  bCallsA: string;
  /** Mô tả chi tiết nhánh quan hệ */
  description: string;
  /** Số bậc cách nhau */
  distance: number;
  /** Các bước quan hệ chi tiết */
  pathLabels: string[];
}

export interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
}

interface RelEdge {
  type: "marriage" | "biological_child" | "adopted_child" | string;
  person_a: string;
  person_b: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * So sánh thứ bậc giữa hai người (cùng bố mẹ hoặc cùng thế hệ)
 * Ưu tiên: Thứ tự sinh (birth_order) -> Năm sinh (birth_year)
 */
function compareSeniority(
  a: PersonNode,
  b: PersonNode,
): "senior" | "junior" | "equal" {
  if (a.id === b.id) return "equal";

  if (a.birth_order != null && b.birth_order != null) {
    if (a.birth_order < b.birth_order) return "senior";
    if (a.birth_order > b.birth_order) return "junior";
  }

  if (a.birth_year != null && b.birth_year != null) {
    if (a.birth_year < b.birth_year) return "senior";
    if (a.birth_year > b.birth_year) return "junior";
  }

  return "equal";
}

// ── Vietnamese Terminology Constants ──────────────────────────────────────

const ANCESTORS = [
  "",
  "Bố/Mẹ",
  "Ông/Bà",
  "Cụ",
  "Kỵ",
  "Sơ",
  "Tiệm",
  "Tiểu",
  "Di",
  "Diễn",
];
const DESCENDANTS = [
  "",
  "Con",
  "Cháu",
  "Chắt",
  "Chít",
  "Chút",
  "Chét",
  "Chót",
  "Chẹt",
];

/**
 * Lấy danh xưng trực hệ vế trên
 */
function getDirectAncestorTerm(
  depth: number,
  gender: "male" | "female" | "other",
  isPaternal: boolean,
): string {
  if (depth === 1) return gender === "female" ? "Mẹ" : "Bố";
  if (depth === 2) {
    const base = gender === "female" ? "Bà" : "Ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  const title = ANCESTORS[depth] || `Tổ đời ${depth}`;
  if (depth === 3) {
    const base = gender === "female" ? "Cụ bà" : "Cụ ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  return title;
}

/**
 * Lấy danh xưng trực hệ vế dưới
 */
function getDirectDescendantTerm(
  depth: number,
  gender: "male" | "female" | "other",
): string {
  const base = DESCENDANTS[depth] || `Cháu đời ${depth}`;
  const suffix =
    gender === "male" ? " trai" : gender === "female" ? " gái" : "";
  return base + suffix;
}

// ── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Giải quyết danh xưng huyết thống giữa A và B
 */
function resolveBloodTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[], // Từ A lên tới LCA (không bao gồm LCA)
  pathB: PersonNode[], // Từ B lên tới LCA (không bao gồm LCA)
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;

  // 1. QUAN HỆ TRỰC HỆ (A là con cháu B hoặc ngược lại)
  if (depthA === 0) {
    // A chính là LCA. B là con cháu của A.
    // Xác định vế Nội/Ngoại của A đối với B: Dựa vào người cha/mẹ trực tiếp của B
    const parentOfB = pathB[1];
    const isPaternal = parentOfB ? parentOfB.gender === "male" : true;

    const bCallsA = getDirectAncestorTerm(depthB, genderA, isPaternal);
    const aCallsB = getDirectDescendantTerm(depthB, genderB);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  if (depthB === 0) {
    // B chính là LCA. A là con cháu của B.
    const parentOfA = pathA[1];
    const isPaternal = parentOfA ? parentOfA.gender === "male" : true;

    const aCallsB = getDirectAncestorTerm(depthA, genderB, isPaternal);
    const bCallsA = getDirectDescendantTerm(depthA, genderA);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  // 2. QUAN HỆ NGANG HÀNG (Anh chị em ruột hoặc họ hàng)
  const branchA = pathA[pathA.length - 1]; // Con của LCA phía A
  const branchB = pathB[pathB.length - 1]; // Con của LCA phía B

  if (!branchA || !branchB) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

  // Xác định vế Nội/Ngoại: Dựa vào giới tính của người cha/mẹ trực tiếp của A (nếu có)
  const parentOfA = pathA[1];
  const isPaternalA = parentOfA ? parentOfA.gender === "male" : branchA.gender === "male";
  const seniority = compareSeniority(branchA, branchB);

  // Anh chị em ruột (Cùng bố mẹ)
  if (depthA === 1 && depthB === 1) {
    const aSenior = compareSeniority(personA, personB);
    if (aSenior === "senior") {
      return [
        genderB === "female" ? "Em gái" : "Em trai",
        genderA === "female" ? "Chị gái" : "Anh trai",
        "Anh chị em ruột",
      ];
    } else {
      return [
        genderB === "female" ? "Chị gái" : "Anh trai",
        genderA === "female" ? "Em gái" : "Em trai",
        "Anh chị em ruột",
      ];
    }
  }

  // Chú/Bác/Cô/Cậu/Dì/Ông/Bà (Vế trên - Vế dưới)
  if (depthA > 1 && depthB === 1) {
    const genDiff = depthA - depthB;
    let termForB = "";
    let termForA = "";

    if (genDiff === 1) {
      // B là anh/chị/em của Bố/Mẹ A
      const ancestorAtDepthMinus1 = pathA[pathA.length - 2] || branchA;
      const isMaleAncestor = ancestorAtDepthMinus1.gender === "male";
      
      if (isMaleAncestor) {
        // Bên Nội
        if (seniority === "junior") {
          termForB = "Bác";
        } else {
          termForB = genderB === "female" ? "Cô" : "Chú";
        }
      } else {
        // Bên Ngoại
        if (seniority === "junior") {
          termForB = "Bác";
        } else {
          termForB = genderB === "female" ? "Dì" : "Cậu";
        }
      }
      termForA = "Cháu";
    } else if (genDiff === 2) {
      // B là anh/chị/em của Ông/Bà A
      // Người dùng yêu cầu chỉ gọi là "Ông/Bà"
      termForB = genderB === "female" ? "Bà" : "Ông";
      termForA = "Cháu";
    } else {
      // B là anh/chị/em của Cụ/Kỵ... A
      const baseTerm = ANCESTORS[genDiff] || `Tổ đời ${genDiff}`;
      if (genDiff === 3) {
        termForB = genderB === "female" ? "Cụ bà" : "Cụ ông";
      } else {
        termForB = baseTerm;
      }
      termForA = DESCENDANTS[genDiff];
    }

    const suffix = genderA === "male" ? " trai" : genderA === "female" ? " gái" : "";

    return [
      termForB,
      termForA + suffix,
      isPaternalA ? "Bên Nội (Vế trên)" : "Bên Ngoại (Vế trên)",
    ];
  }

  // Ngược lại của trường hợp trên
  if (depthA === 1 && depthB > 1) {
    const [bCallsA, aCallsB, desc] = resolveBloodTerms(
      depthB,
      depthA,
      personB,
      personA,
      pathB,
      pathA,
    );
    return [aCallsB, bCallsA, desc];
  }

  // Anh em họ (Cùng thế hệ hoặc lệch thế hệ nhưng không trực hệ)
  if (depthA > 1 && depthB > 1) {
    const side = isPaternalA ? "Nội" : "Ngoại";

    if (depthA === depthB) {
      // Cùng thế hệ
      if (seniority === "senior") {
        return [
          "Em họ",
          genderA === "female" ? "Chị họ" : "Anh họ",
          `Anh em họ ${side}`,
        ];
      } else {
        return [
          genderB === "female" ? "Chị họ" : "Anh họ",
          "Em họ",
          `Anh em họ ${side}`,
        ];
      }
    } else {
      // Lệch thế hệ
      const genDiff = depthA - depthB;
      if (genDiff > 0) {
        // B ở vế trên
        let termForB = "Họ hàng";
        if (genDiff === 1) {
          if (isPaternalA) {
            termForB =
              genderB === "female"
                ? "Cô họ"
                : seniority === "senior"
                  ? "Chú họ"
                  : "Bác họ";
          } else {
            termForB = genderB === "female" ? "Dì họ" : "Cậu họ";
          }
        } else {
          termForB = genderB === "female" ? "Bà họ" : "Ông họ";
        }
        return [termForB, "Cháu họ", `Họ hàng ${side}`];
      } else {
        const [bCallsA, aCallsB, desc] = resolveBloodTerms(
          depthB,
          depthA,
          personB,
          personA,
          pathB,
          pathA,
        );
        return [aCallsB, bCallsA, desc];
      }
    }
  }

  return ["Người trong họ", "Người trong họ", "Quan hệ họ hàng"];
}

// ── Data Processing ──────────────────────────────────────────────────────────

function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
) {
  const depths = new Map<string, { depth: number; path: PersonNode[] }>();
  const queue: { id: string; depth: number; path: PersonNode[] }[] = [
    { id, depth: 0, path: [] },
  ];

  while (queue.length > 0) {
    const { id: currentId, depth, path } = queue.shift()!;
    if (!depths.has(currentId)) {
      depths.set(currentId, { depth, path });

      const currentNode = personsMap.get(currentId);
      if (!currentNode) continue;

      const parents = parentMap.get(currentId) ?? [];
      for (const pId of parents) {
        const pNode = personsMap.get(pId);
        if (pNode) {
          // Lưu con đường: từ người gốc lên, path chứa các nút trung gian
          queue.push({
            id: pId,
            depth: depth + 1,
            path: [...path, currentNode],
          });
        }
      }
    }
  }
  return depths;
}

function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
): KinshipResult | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap);
  const ancB = getAncestryData(personB.id, parentMap, personsMap);

  let lcaId: string | null = null;
  let minDistance = Infinity;

  for (const [id, dataA] of ancA) {
    if (ancB.has(id)) {
      const dist = dataA.depth + ancB.get(id)!.depth;
      if (dist < minDistance) {
        minDistance = dist;
        lcaId = id;
      }
    }
  }

  if (!lcaId) return null;

  const dataA = ancA.get(lcaId)!;
  const dataB = ancB.get(lcaId)!;

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
  );

  const lcaName = personsMap.get(lcaId)?.full_name ?? "Tổ tiên chung";
  const pathParts: string[] = [];
  pathParts.push(`${personA.full_name} cách ${lcaName} ${dataA.depth} đời.`);
  pathParts.push(`${personB.full_name} cách ${lcaName} ${dataB.depth} đời.`);

  return {
    aCallsB,
    bCallsA,
    description: `${description} (Tổ tiên chung: ${lcaName})`,
    distance: minDistance,
    pathLabels: pathParts,
  };
}

/**
 * Chuyển đổi danh xưng huyết thống sang danh xưng hôn nhân tương ứng
 */
function getSpouseTitle(title: string, gender: string): string {
  const base = title.split(" ")[0];
  if (base === "Chú") return gender === "female" ? "Thím" : "Chú";
  if (base === "Cậu") return gender === "female" ? "Mợ" : "Cậu";
  if (base === "Cô" || base === "Dì") return gender === "male" ? "Chú" : base;
  if (base === "Bác") return gender === "female" ? "Bác gái" : "Bác trai";
  if (base === "Con") return gender === "female" ? "Con dâu" : "Con rể";
  if (base === "Cháu") return gender === "female" ? "Cháu dâu" : "Cháu rể";
  if (base === "Ông") return gender === "female" ? "Bà" : "Ông";
  if (base === "Bà") return gender === "male" ? "Ông" : "Bà";
  if (base === "Cụ") return gender === "female" ? "Cụ bà" : "Cụ ông";
  if (DESCENDANTS.includes(base)) {
    return gender === "female" ? `${base} dâu` : `${base} rể`;
  }
  return title;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function computeKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      const p = parentMap.get(r.person_b) ?? [];
      p.push(r.person_a);
      parentMap.set(r.person_b, p);
    } else if (r.type === "marriage") {
      const sA = spouseMap.get(r.person_a) ?? [];
      sA.push(r.person_b);
      spouseMap.set(r.person_a, sA);
      const sB = spouseMap.get(r.person_b) ?? [];
      sB.push(r.person_a);
      spouseMap.set(r.person_b, sB);
    }
  }

  // 0. Kiểm tra quan hệ hôn nhân trực tiếp
  const spousesA = spouseMap.get(personA.id) ?? [];
  if (spousesA.includes(personB.id)) {
    return {
      aCallsB: personB.gender === "female" ? "Vợ" : "Chồng",
      bCallsA: personA.gender === "female" ? "Vợ" : "Chồng",
      description: "Quan hệ Hôn nhân",
      distance: 0,
      pathLabels: [`${personA.full_name} và ${personB.full_name} là vợ chồng.`],
    };
  }

  // 1. Kiểm tra quan hệ huyết thống
  const blood = findBloodKinship(personA, personB, personsMap, parentMap);
  if (blood) return blood;

  // 2. Kiểm tra quan hệ thông qua hôn nhân của A (Vợ/Chồng của A gọi B)
  for (const sId of spousesA) {
    if (sId === personB.id) continue; // Đã xử lý ở bước 0
    const spouseA = personsMap.get(sId);
    if (!spouseA) continue;
    const res = findBloodKinship(spouseA, personB, personsMap, parentMap);
    if (res) {
      // Quy tắc: A gọi B giống như spouseA gọi B
      const aCallsB = res.aCallsB;
      // B gọi A là "phiên bản vợ/chồng" của cách B gọi spouseA
      const bCallsA = getSpouseTitle(res.bCallsA, personA.gender);

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseA.full_name}`,
        pathLabels: [
          `${personA.full_name} là vợ/chồng của ${spouseA.full_name}`,
          ...res.pathLabels,
        ],
      };
    }
  }

  // 3. Kiểm tra quan hệ thông qua hôn nhân của B (A gọi Vợ/Chồng của B)
  const spousesB = spouseMap.get(personB.id) ?? [];
  for (const sId of spousesB) {
    const spouseB = personsMap.get(sId);
    if (!spouseB) continue;
    const res = findBloodKinship(personA, spouseB, personsMap, parentMap);
    if (res) {
      // A gọi B là "phiên bản vợ/chồng" của cách A gọi spouseB
      const aCallsB = getSpouseTitle(res.aCallsB, personB.gender);
      // B gọi A giống như spouseB gọi A
      const bCallsA = res.bCallsA;

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseB.full_name}`,
        pathLabels: [
          ...res.pathLabels,
          `${personB.full_name} là vợ/chồng của ${spouseB.full_name}`,
        ],
      };
    }
  }

  // 4. Kiểm tra quan hệ thông qua hôn nhân của cả A và B (Vợ/Chồng của A gọi Vợ/Chồng của B)
  for (const sIdA of spousesA) {
    const spouseA = personsMap.get(sIdA);
    if (!spouseA) continue;
    for (const sIdB of spousesB) {
      const spouseB = personsMap.get(sIdB);
      if (!spouseB) continue;
      const res = findBloodKinship(spouseA, spouseB, personsMap, parentMap);
      if (res) {
        // A gọi B là "phiên bản vợ/chồng" của cách spouseA gọi spouseB
        const aCallsB = getSpouseTitle(res.aCallsB, personB.gender);
        // B gọi A là "phiên bản vợ/chồng" của cách spouseB gọi spouseA
        const bCallsA = getSpouseTitle(res.bCallsA, personA.gender);

        return {
          ...res,
          aCallsB,
          bCallsA,
          description: `Thông qua hôn nhân của ${spouseA.full_name} và ${spouseB.full_name}`,
          pathLabels: [
            `${personA.full_name} là vợ/chồng của ${spouseA.full_name}`,
            ...res.pathLabels,
            `${personB.full_name} là vợ/chồng của ${spouseB.full_name}`,
          ],
        };
      }
    }
  }

  return {
    aCallsB: "Chưa xác định",
    bCallsA: "Chưa xác định",
    description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
    distance: -1,
    pathLabels: [],
  };
}
