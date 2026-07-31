import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  computeEldestSonChain,
  getChildren,
  getChildrenGroupedBySpouses,
  getSpouses,
  pickDefaultRootId,
  type ChildrenBranch,
} from "../domain/treeRoot";
import type { Person, Relationship } from "../types";
import { colors, genderBg, genderColor } from "../theme";
import GenderBadge from "./GenderBadge";

type Props = {
  persons: Person[];
  relationships: Relationship[];
  onPressPerson: (p: Person) => void;
};

const LINE = colors.stone200;
const LINE_W = 2;
const STEM_H = 22;
const CARD_W = 88;
/** Mỗi node (nodeCol) có marginHorizontal:6 hai bên → 12px giữa 2 anh em cạnh nhau. */
const NODE_MARGIN = 12;

const GOLD = colors.amberMid;
const GOLD_GLOW = colors.amberDark;
/** Độ trễ giữa mỗi đời khi "chạy" hiệu ứng trưởng nam — tạo cảm giác lan dần xuống. */
const CHASE_PHASE_MS = 260;
const CHASE_CYCLE_MS = 1500;

/** Nhấp nháy tuần hoàn, lệch pha theo `depth` — dùng chung cho cả đường nối và viền thẻ. */
function useChasePulse(active: boolean, depth: number) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = withDelay(
      Math.max(0, depth) * CHASE_PHASE_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 320 }),
          withTiming(0.25, { duration: CHASE_CYCLE_MS - 320 }),
        ),
        -1,
        false,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, depth]);
  return progress;
}

/** Một đoạn line — vẽ tĩnh (màu xám) hoặc vàng nhấp nháy khi nằm trên chuỗi trưởng nam. */
function TreeLine({
  style,
  highlighted,
  depth,
}: {
  style: object;
  highlighted: boolean;
  depth: number;
}) {
  const pulse = useChasePulse(highlighted, depth);
  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: GOLD,
    opacity: 0.45 + pulse.value * 0.55,
  }));
  if (!highlighted) return <View style={style} />;
  return <Animated.View style={[style, animStyle]} />;
}

/** Compact vertical card — mirrors web FamilyNodeCard */
function TreePersonCard({
  person,
  role,
  showRing,
  showPlus,
  onPress,
  chaseDepth,
}: {
  person: Person;
  role?: string;
  showRing?: boolean;
  showPlus?: boolean;
  onPress: () => void;
  /** Có mặt (>=0) khi thẻ này nằm trên chuỗi trưởng nam đang bật hiệu ứng. */
  chaseDepth?: number;
}) {
  const initial = person.full_name?.charAt(0)?.toUpperCase() || "?";
  const age =
    !person.is_deceased && person.birth_year
      ? new Date().getFullYear() - person.birth_year
      : null;
  const highlighted = chaseDepth != null;
  const pulse = useChasePulse(highlighted, chaseDepth ?? 0);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        person.is_deceased && styles.cardDeceased,
      ]}
    >
      {highlighted ? (
        <Animated.View pointerEvents="none" style={[styles.goldGlowRing, glowStyle]} />
      ) : null}

      {showRing ? (
        <View style={styles.badgeIcon}>
          <Text style={styles.badgeIconText}>💍</Text>
        </View>
      ) : null}
      {showPlus ? (
        <View style={styles.badgeIcon}>
          <Text style={styles.badgeIconPlus}>+</Text>
        </View>
      ) : null}

      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: genderBg(person.gender) },
          ]}
        >
          {person.avatar_url ? (
            <Image source={{ uri: person.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: genderColor(person.gender) }]}>
              {initial}
            </Text>
          )}
        </View>
        <GenderBadge gender={person.gender} size={14} />
      </View>

      <Text style={styles.cardName} numberOfLines={2}>
        {person.full_name}
      </Text>

      <View style={styles.cardMetaRow}>
        {person.is_deceased ? (
          <Text style={styles.metaPillMuted}>Đã mất</Text>
        ) : age != null ? (
          <Text style={styles.metaPillAge}>{age} tuổi</Text>
        ) : null}
        {person.is_in_law ? (
          <Text
            style={[
              styles.metaPillInLaw,
              person.gender === "male" && styles.metaPillInLawM,
              person.gender === "female" && styles.metaPillInLawF,
            ]}
          >
            {person.gender === "male" ? "Rể" : person.gender === "female" ? "Dâu" : "Khách"}
          </Text>
        ) : null}
        {highlighted ? <Text style={styles.metaPillGold}>👑 Trưởng nam</Text> : null}
      </View>

      {role ? <Text style={styles.roleText}>{role}</Text> : null}
    </Pressable>
  );
}

const passesGenderFilter = (
  g: Person["gender"],
  hideMales: boolean,
  hideFemales: boolean,
) => !(hideMales && g === "male") && !(hideFemales && g === "female");

type LayoutPlan =
  | { mode: "single"; spouses: Person[]; children: Person[] }
  | {
      mode: "multi";
      rawSpouses: Person[];
      rowLeft: Person[];
      rowRight: Person[];
      branches: ChildrenBranch[];
    };

/**
 * Quyết định layout (1 khối gộp hay tách nhánh nhiều vợ/chồng) — dùng chung
 * bởi cả phần tính bề rộng (computeNodeWidth) lẫn phần render, để 2 bên luôn
 * khớp nhau tuyệt đối (không bị lệch nhánh nối do tính sai kích thước).
 */
function planLayout(
  person: Person,
  personsMap: Map<string, Person>,
  relationships: Relationship[],
  hideSpouses: boolean,
  hideMales: boolean,
  hideFemales: boolean,
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
    children: b.children.filter((c) => passesGenderFilter(c.gender, hideMales, hideFemales)),
  }));

  return { mode: "multi", rawSpouses, rowLeft, rowRight: rightSpouses, branches };
}

/**
 * Bề rộng (px) mà node này sẽ thực sự chiếm khi render — tính đệ quy bằng
 * đúng các hằng số layout (CARD_W, NODE_MARGIN) mà JSX bên dưới dùng, để suy
 * ra chính xác điểm giữa avatar cho nhánh nối nhiều vợ/chồng mà không cần đo
 * layout thật (tránh giật/lệch khung hình).
 */
function computeNodeWidth(
  person: Person,
  personsMap: Map<string, Person>,
  relationships: Relationship[],
  hideSpouses: boolean,
  hideMales: boolean,
  hideFemales: boolean,
  visited: Set<string>,
): number {
  if (visited.has(person.id)) return CARD_W;
  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  const plan = planLayout(person, personsMap, relationships, hideSpouses, hideMales, hideFemales);

  const widthOfKids = (kids: Person[]) =>
    kids.reduce(
      (sum, c) =>
        sum +
        computeNodeWidth(c, personsMap, relationships, hideSpouses, hideMales, hideFemales, nextVisited) +
        NODE_MARGIN,
      0,
    );

  if (plan.mode === "single") {
    if (plan.children.length === 0) return CARD_W;
    return Math.max(CARD_W, widthOfKids(plan.children));
  }

  const coupleRowWidth = (plan.rawSpouses.length + 1) * CARD_W;
  let branchesRowWidth = 0;
  for (const b of plan.branches) {
    if (b.children.length === 0) continue;
    branchesRowWidth += widthOfKids(b.children) + NODE_MARGIN;
  }
  return Math.max(coupleRowWidth, branchesRowWidth);
}

type TreeNodeProps = {
  person: Person;
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  visited: Set<string>;
  onPressPerson: (p: Person) => void;
  hideSpouses: boolean;
  hideMales: boolean;
  hideFemales: boolean;
  /** id -> độ sâu trong chuỗi trưởng nam (null khi tính năng tắt). */
  highlightChain: Map<string, number> | null;
};

function TreeNode({
  person,
  personsMap,
  relationships,
  visited,
  onPressPerson,
  hideSpouses,
  hideMales,
  hideFemales,
  highlightChain,
}: TreeNodeProps) {
  if (visited.has(person.id)) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  const myDepth = highlightChain?.get(person.id);
  const isHighlighted = myDepth != null;

  const plan = planLayout(person, personsMap, relationships, hideSpouses, hideMales, hideFemales);

  const commonChildProps = {
    personsMap,
    relationships,
    onPressPerson,
    hideSpouses,
    hideMales,
    hideFemales,
    highlightChain,
  };

  /** Hàng con + line nối, không kèm stem phía trên (dùng khi cha đã tự vẽ stem riêng). */
  function renderKidsRow(kids: Person[]) {
    return (
      <View style={styles.kidsRow}>
        {kids.map((child, index) => {
          const isOnly = kids.length === 1;
          const isFirst = index === 0;
          const isLast = index === kids.length - 1;
          const childDepth = highlightChain?.get(child.id);
          const childHighlighted = childDepth != null;
          return (
            <View key={child.id} style={styles.kidCol}>
              {isOnly ? (
                <View style={styles.onlyStemWrap}>
                  <TreeLine
                    style={styles.vStub}
                    highlighted={childHighlighted}
                    depth={childDepth ?? 0}
                  />
                </View>
              ) : (
                <View style={styles.connector}>
                  <TreeLine
                    style={[styles.hArm, isFirst ? styles.hArmHidden : null]}
                    highlighted={childHighlighted && !isFirst}
                    depth={childDepth ?? 0}
                  />
                  <TreeLine
                    style={styles.vStub}
                    highlighted={childHighlighted}
                    depth={childDepth ?? 0}
                  />
                  <TreeLine
                    style={[styles.hArm, isLast ? styles.hArmHidden : null]}
                    highlighted={childHighlighted && !isLast}
                    depth={childDepth ?? 0}
                  />
                </View>
              )}
              <TreeNode person={child} visited={nextVisited} {...commonChildProps} />
            </View>
          );
        })}
      </View>
    );
  }

  function renderKids(kids: Person[]) {
    if (kids.length === 0) return null;
    return (
      <View style={styles.kidsBlock}>
        <TreeLine style={styles.parentStem} highlighted={isHighlighted} depth={myDepth ?? 0} />
        {renderKidsRow(kids)}
      </View>
    );
  }

  // 1 vợ/chồng trở xuống: giữ nguyên cách hiển thị gộp chung một khối.
  if (plan.mode === "single") {
    return (
      <View style={styles.nodeCol}>
        <View style={styles.coupleBox}>
          <TreePersonCard
            person={person}
            onPress={() => onPressPerson(person)}
            chaseDepth={myDepth}
          />
          {plan.spouses.map((s, idx) => (
            <TreePersonCard
              key={s.id}
              person={s}
              role={s.gender === "male" ? "Chồng" : "Vợ"}
              showRing={idx === 0}
              showPlus={idx > 0}
              onPress={() => onPressPerson(s)}
            />
          ))}
        </View>

        {renderKids(plan.children)}
      </View>
    );
  }

  // >1 vợ/chồng: chồng/vợ giữa, các vợ/chồng còn lại xếp 2 bên; mỗi cuộc hôn
  // nhân có 1 nhánh nối riêng bắt đầu từ đúng điểm giữa 2 avatar của cặp đó.
  const { rawSpouses, rowLeft, rowRight, branches } = plan;
  const rowItems: Person[] = [...rowLeft, person, ...rowRight];
  const personIndexInRow = rowLeft.length;
  const coupleRowWidth = rowItems.length * CARD_W;

  const rowIndexById = new Map<string, number>();
  rowItems.forEach((p, i) => rowIndexById.set(p.id, i));

  const maleCount = rawSpouses.filter((s) => s.gender === "male").length;
  const femaleCount = rawSpouses.filter((s) => s.gender === "female").length;
  const roleById = new Map<string, string>();
  {
    let maleSeen = 0;
    let femaleSeen = 0;
    for (const s of rawSpouses) {
      if (s.gender === "male") {
        maleSeen += 1;
        roleById.set(s.id, maleCount > 1 ? `Chồng ${maleSeen}` : "Chồng");
      } else if (s.gender === "female") {
        femaleSeen += 1;
        roleById.set(s.id, femaleCount > 1 ? `Vợ ${femaleSeen}` : "Vợ");
      }
    }
  }

  type RenderBranch = {
    key: string;
    children: Person[];
    topAnchorLocal: number;
  };

  const orderedSpouses = [...rowLeft, ...rowRight];
  const renderBranches: RenderBranch[] = [];
  for (const spouse of orderedSpouses) {
    const branch = branches.find((b) => b.spouse?.id === spouse.id);
    if (!branch || branch.children.length === 0) continue;
    const rowIdx = rowIndexById.get(spouse.id)!;
    const topAnchorLocal = ((personIndexInRow + rowIdx + 1) / 2) * CARD_W;
    renderBranches.push({ key: spouse.id, children: branch.children, topAnchorLocal });
  }
  const unassignedBranch = branches.find((b) => b.spouse === null);
  if (unassignedBranch && unassignedBranch.children.length > 0) {
    renderBranches.push({
      key: "unassigned",
      children: unassignedBranch.children,
      topAnchorLocal: personIndexInRow * CARD_W + CARD_W / 2,
    });
  }

  const branchWidths = renderBranches.map((b) =>
    b.children.reduce(
      (sum, c) =>
        sum +
        computeNodeWidth(c, personsMap, relationships, hideSpouses, hideMales, hideFemales, nextVisited) +
        NODE_MARGIN,
      0,
    ),
  );
  const branchesRowWidth = branchWidths.reduce((a, w) => a + w + NODE_MARGIN, 0);
  const outerWidth = Math.max(coupleRowWidth, branchesRowWidth);
  const coupleRowOffset = (outerWidth - coupleRowWidth) / 2;
  const branchesRowOffset = (outerWidth - branchesRowWidth) / 2;

  let cursor = branchesRowOffset;
  const bottomAnchors: number[] = [];
  branchWidths.forEach((w) => {
    cursor += NODE_MARGIN / 2;
    bottomAnchors.push(cursor + w / 2);
    cursor += w + NODE_MARGIN / 2;
  });

  const BEND_Y = STEM_H / 2;

  return (
    <View style={[styles.nodeCol, { width: outerWidth }]}>
      <View style={[styles.coupleBox, { width: coupleRowWidth }]}>
        {rowItems.map((p) =>
          p.id === person.id ? (
            <TreePersonCard
              key={p.id}
              person={p}
              onPress={() => onPressPerson(p)}
              chaseDepth={myDepth}
            />
          ) : (
            <TreePersonCard
              key={p.id}
              person={p}
              role={roleById.get(p.id)}
              onPress={() => onPressPerson(p)}
            />
          ),
        )}
      </View>

      {renderBranches.length > 0 ? (
        <>
          <View style={[styles.multiConnectorOverlay, { width: outerWidth, height: STEM_H }]}>
            {renderBranches.map((b, idx) => {
              const topX = coupleRowOffset + b.topAnchorLocal;
              const botX = bottomAnchors[idx];
              const left = Math.min(topX, botX);
              const barWidth = Math.abs(botX - topX) + LINE_W;
              const branchHighlighted = b.children.some(
                (c) => highlightChain?.has(c.id),
              );
              const branchDepth =
                (highlightChain && b.children
                  .map((c) => highlightChain.get(c.id))
                  .find((d) => d != null)) ?? 0;

              return (
                <View key={b.key} style={StyleSheet.absoluteFill} pointerEvents="none">
                  <TreeLine
                    style={[styles.multiStub, { left: topX - LINE_W / 2, top: 0, height: BEND_Y }]}
                    highlighted={branchHighlighted}
                    depth={branchDepth}
                  />
                  <TreeLine
                    style={[
                      styles.multiBar,
                      { left, top: BEND_Y - LINE_W / 2, width: barWidth },
                    ]}
                    highlighted={branchHighlighted}
                    depth={branchDepth}
                  />
                  <TreeLine
                    style={[
                      styles.multiStub,
                      { left: botX - LINE_W / 2, top: BEND_Y, height: STEM_H - BEND_Y },
                    ]}
                    highlighted={branchHighlighted}
                    depth={branchDepth}
                  />
                </View>
              );
            })}
          </View>

          <View style={[styles.multiBranchesRow, { width: branchesRowWidth }]}>
            {renderBranches.map((b) => (
              <View key={b.key} style={styles.multiBranchCol}>
                {renderKidsRow(b.children)}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function FamilyTreeView({
  persons,
  relationships,
  onPressPerson,
}: Props) {
  const [rootId, setRootId] = useState<string | null>(null);
  const [hideSpouses, setHideSpouses] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEldestSon, setShowEldestSon] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  const effectiveRoot =
    rootId && personsMap.has(rootId)
      ? rootId
      : pickDefaultRootId(persons, relationships, rootId);

  const rootPerson = effectiveRoot ? personsMap.get(effectiveRoot) : null;

  const highlightChain = useMemo(() => {
    if (!showEldestSon || !rootPerson) return null;
    return computeEldestSonChain(rootPerson.id, relationships, personsMap);
  }, [showEldestSon, rootPerson, relationships, personsMap]);

  const roots = useMemo(
    () => [...persons].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi")),
    [persons],
  );

  const filteredRoots = useMemo(() => {
    if (!searchQuery) return roots;
    return roots.filter((p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [roots, searchQuery]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(2.5, Math.max(0.35, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const zoomBy = (factor: number) => {
    const next = Math.min(2.5, Math.max(0.35, savedScale.value * factor));
    scale.value = withTiming(next, { duration: 150 });
    savedScale.value = next;
  };

  const resetView = () => {
    scale.value = withTiming(1, { duration: 180 });
    savedScale.value = 1;
    tx.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(0, { duration: 180 });
    savedTx.value = 0;
    savedTy.value = 0;
  };

  if (!rootPerson) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Chưa có dữ liệu cây gia phả.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Root picker & Filter */}
      <View style={styles.toolbar}>
        <Pressable
          style={styles.rootPicker}
          onPress={() => setSearchModalVisible(true)}
        >
          <Text style={styles.rootLabel}>Gốc:</Text>
          <Text style={styles.rootName} numberOfLines={1}>
            {rootPerson.full_name}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterBtn, showEldestSon && styles.filterBtnGold]}
          onPress={() => setShowEldestSon((v) => !v)}
        >
          <Text
            style={[styles.filterBtnText, showEldestSon && styles.filterBtnGoldText]}
          >
            👑 Trưởng nam
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterBtn, showFilters && styles.filterBtnOn]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text
            style={[styles.filterBtnText, showFilters && styles.filterBtnTextOn]}
          >
            Lọc
          </Text>
        </Pressable>
      </View>

      {/* Root Search Modal */}
      <Modal
        visible={searchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm tên gốc..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <FlatList
              data={filteredRoots}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.rootItem}
                  onPress={() => {
                    setRootId(item.id);
                    resetView();
                    setSearchModalVisible(false);
                    setSearchQuery("");
                  }}
                >
                  <Text>{item.full_name}</Text>
                </Pressable>
              )}
            />
            <Pressable
              style={styles.closeBtn}
              onPress={() => setSearchModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showFilters && (
        <View style={styles.filters}>
          {(
            [
              ["hideSpouses", "Ẩn dâu/rể", hideSpouses, setHideSpouses],
              ["hideMales", "Ẩn nam", hideMales, setHideMales],
              ["hideFemales", "Ẩn nữ", hideFemales, setHideFemales],
            ] as const
          ).map(([key, label, val, set]) => (
            <Pressable
              key={key}
              style={[styles.chip, val && styles.chipOn]}
              onPress={() => set(!val)}
            >
              <Text style={[styles.chipText, val && styles.chipTextOn]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Zoom controls */}
      <View style={styles.zoomBar}>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1 / 1.25)}>
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Pressable style={styles.zoomReset} onPress={resetView}>
          <Text style={styles.zoomResetText}>100%</Text>
        </Pressable>
        <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1.25)}>
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
      </View>

      {/* Fixed frame — tree stays inside tab area (like web TransformWrapper) */}
      <View style={styles.frame}>
        <GestureDetector gesture={composed}>
          {/* Fills the whole frame so pan/pinch respond anywhere, not just over a card */}
          <Animated.View style={styles.gestureLayer}>
            <Animated.View style={[styles.canvas, animStyle]}>
              <TreeNode
                person={rootPerson}
                personsMap={personsMap}
                relationships={relationships}
                visited={new Set()}
                onPressPerson={onPressPerson}
                hideSpouses={hideSpouses}
                hideMales={hideMales}
                hideFemales={hideFemales}
                highlightChain={highlightChain}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <Text style={styles.hint}>
        Pinch zoom · kéo di chuyển · chạm thẻ xem chi tiết
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: { color: colors.textMuted },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 8,
    marginBottom: 4,
  },
  rootPicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rootLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  rootName: { fontSize: 13, fontWeight: "700", color: colors.text },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  rootItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  closeBtn: {
    marginTop: 10,
    padding: 12,
    alignItems: "center",
    backgroundColor: colors.stone100,
    borderRadius: 8,
  },
  closeBtnText: { fontWeight: "700" },

  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnOn: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amber,
  },
  filterBtnGold: {
    backgroundColor: colors.amberMid,
    borderColor: colors.amberDark,
  },
  filterBtnText: { fontSize: 12, fontWeight: "700", color: colors.text },
  filterBtnTextOn: { color: colors.amberDark },
  filterBtnGoldText: { color: colors.white },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  chipText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  chipTextOn: { color: colors.amberDark },

  zoomBar: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 6,
  },
  zoomBtn: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textMuted,
    lineHeight: 20,
  },
  zoomReset: {
    minWidth: 48,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 6,
  },
  zoomResetText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },

  frame: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 10,
    marginBottom: 4,
    backgroundColor: colors.stone100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  gestureLayer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    padding: 28,
    paddingTop: 36,
    alignItems: "center",
  },

  /* —— tree geometry (CSS-tree equivalent) —— */
  nodeCol: {
    alignItems: "center",
    marginHorizontal: 6,
  },
  coupleBox: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    alignSelf: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "visible",
  },
  kidsBlock: {
    alignItems: "center",
  },
  parentStem: {
    width: LINE_W,
    height: STEM_H,
    backgroundColor: LINE,
  },
  kidsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  kidCol: {
    alignItems: "center",
  },
  connector: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    height: STEM_H,
  },
  hArm: {
    flex: 1,
    height: LINE_W,
    backgroundColor: LINE,
  },
  hArmHidden: {
    backgroundColor: "transparent",
  },
  vStub: {
    width: LINE_W,
    height: STEM_H,
    backgroundColor: LINE,
  },
  onlyStemWrap: {
    width: "100%",
    height: STEM_H,
    alignItems: "center",
  },

  /* —— nhiều vợ/chồng: chồng giữa, vợ 2 bên, mỗi hôn nhân 1 nhánh nối riêng —— */
  multiConnectorOverlay: {
    alignSelf: "center",
    position: "relative",
  },
  multiStub: {
    position: "absolute",
    width: LINE_W,
    backgroundColor: LINE,
  },
  multiBar: {
    position: "absolute",
    height: LINE_W,
    backgroundColor: LINE,
  },
  multiBranchesRow: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  multiBranchCol: {
    marginHorizontal: NODE_MARGIN / 2,
    alignItems: "center",
  },

  /* —— person card —— */
  card: {
    width: CARD_W,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    position: "relative",
  },
  cardDeceased: {
    opacity: 0.75,
  },
  goldGlowRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GOLD,
    shadowColor: GOLD_GLOW,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  badgeIcon: {
    position: "absolute",
    top: 14,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 2,
  },
  badgeIconText: { fontSize: 10 },
  badgeIconPlus: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: -1,
  },
  avatarWrap: { width: 44, height: 44, marginBottom: 6 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarImg: { width: 44, height: 44 },
  avatarText: { fontSize: 16, fontWeight: "800" },
  cardName: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: 14,
    minHeight: 28,
    paddingHorizontal: 2,
  },
  cardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 2,
    marginTop: 4,
    minHeight: 16,
  },
  metaPillAge: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.amberDark,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  metaPillMuted: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.textSoft,
    backgroundColor: colors.stone100,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  metaPillInLaw: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.stone100,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  metaPillInLawM: {
    color: colors.sky,
    backgroundColor: colors.skySoft,
  },
  metaPillInLawF: {
    color: colors.rose,
    backgroundColor: colors.roseSoft,
  },
  metaPillGold: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.white,
    backgroundColor: GOLD,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  roleText: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "600",
    color: colors.textSoft,
  },

  hint: {
    textAlign: "center",
    fontSize: 10,
    color: colors.textSoft,
    paddingBottom: 6,
    paddingTop: 2,
  },
});
