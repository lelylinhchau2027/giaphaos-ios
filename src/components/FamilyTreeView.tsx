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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  computeEldestSonChain,
  pickDefaultRootId,
  type EldestSonChainEntry,
} from "../domain/treeRoot";
import {
  CARD_W,
  NODE_MARGIN,
  computeNodeWidth,
  measureKidsRow,
  planLayout,
  type LayoutFilters,
} from "../domain/treeLayout";
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

const GOLD = colors.amberMid;
const GOLD_GLOW = colors.amberDark;
/** Thời gian "đốm sáng" đi từ 1 đời sang đời kế tiếp. */
const CHASE_STEP_MS = 550;

/**
 * Đoạn line vàng nhấp nháy — TÁCH RIÊNG khỏi TreeLine để chỉ những line thực
 * sự đang sáng mới mount Reanimated (useAnimatedStyle). Gọi hook này cho MỌI
 * line trong cây (kể cả khi tắt tính năng trưởng nam) từng gây treo/crash khi
 * cây có nhiều thành viên.
 *
 * Nền LUÔN đặc màu vàng (opacity 1) — line chỉ dày 2px nên nếu mờ đi dù chỉ
 * một chút, trên nền sáng nó biến thành màu nhạt gần như xám, trông như đứt
 * đoạn dù logic highlight vẫn đúng. "Đốm sáng chạy" được thể hiện bằng shadow
 * (glow) phát sáng thêm quanh line, không làm giảm độ đặc của màu nền.
 */
function AnimatedGoldLine({
  style,
  depth,
  chaseProgress,
}: {
  style: object;
  depth: number;
  chaseProgress: SharedValue<number> | null;
}) {
  const animStyle = useAnimatedStyle(() => {
    if (!chaseProgress) return { shadowOpacity: 0 };
    const dist = Math.abs(chaseProgress.value - depth);
    const glow = Math.max(0, 1 - dist);
    return { shadowOpacity: glow * 0.9, shadowRadius: 1 + glow * 4 };
  });
  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: GOLD,
          shadowColor: GOLD_GLOW,
          shadowOffset: { width: 0, height: 0 },
        },
        animStyle,
      ]}
    />
  );
}

/** Một đoạn line — vẽ tĩnh (màu xám, không tốn overhead animation) hoặc vàng nhấp nháy. */
function TreeLine({
  style,
  highlighted,
  depth,
  chaseProgress,
}: {
  style: object;
  highlighted: boolean;
  depth: number;
  chaseProgress: SharedValue<number> | null;
}) {
  if (!highlighted) return <View style={style} />;
  return <AnimatedGoldLine style={style} depth={depth} chaseProgress={chaseProgress} />;
}

/**
 * Viền vàng nhấp nháy — bao quanh CẢ KHỐI (coupleBox: trưởng nam + vợ/chồng,
 * dù 1/2/3 người) thành MỘT viền chung duy nhất, thay vì mỗi thẻ tự vẽ viền
 * riêng rồi chồng chéo lên nhau ở điểm giáp ranh giữa các thẻ.
 *
 * Viền (borderColor) LUÔN đặc màu vàng — chỉ độ sáng của shadow xung quanh
 * nhấp nháy theo "đốm sáng chạy", không làm mờ viền như trước (mờ viền khiến
 * thẻ trưởng nam trông như chưa được tô vàng).
 */
function GoldGlowRing({
  depth,
  chaseProgress,
  style,
}: {
  depth: number;
  chaseProgress: SharedValue<number> | null;
  style?: object;
}) {
  const glowStyle = useAnimatedStyle(() => {
    if (!chaseProgress) return { shadowOpacity: 0.5 };
    const dist = Math.abs(chaseProgress.value - depth);
    const glow = Math.max(0, 1 - dist);
    return { shadowOpacity: 0.35 + glow * 0.45, shadowRadius: 5 + glow * 5 };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.goldGlowRing, style, glowStyle]}
    />
  );
}

/** Compact vertical card — mirrors web FamilyNodeCard */
function TreePersonCard({
  person,
  role,
  showRing,
  showPlus,
  onPress,
  showEldestLabel,
}: {
  person: Person;
  role?: string;
  showRing?: boolean;
  showPlus?: boolean;
  onPress: () => void;
  /** Chỉ true cho đúng người con trai — không hiện trên thẻ vợ/chồng của họ. */
  showEldestLabel?: boolean;
}) {
  const initial = person.full_name?.charAt(0)?.toUpperCase() || "?";
  const age =
    !person.is_deceased && person.birth_year
      ? new Date().getFullYear() - person.birth_year
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        person.is_deceased && styles.cardDeceased,
      ]}
    >
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
        {showEldestLabel ? <Text style={styles.metaPillGold}>👑 Trưởng nam</Text> : null}
      </View>

      {role ? <Text style={styles.roleText}>{role}</Text> : null}
    </Pressable>
  );
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
  /** id -> {depth, spouseId} trong chuỗi trưởng nam (null khi tính năng tắt). */
  highlightChain: Map<string, EldestSonChainEntry> | null;
  chaseProgress: SharedValue<number> | null;
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
  chaseProgress,
}: TreeNodeProps) {
  if (visited.has(person.id)) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  const myEntry = highlightChain?.get(person.id);
  const isHighlighted = myEntry != null;

  const filters: LayoutFilters = { hideSpouses, hideMales, hideFemales };
  const plan = planLayout(person, personsMap, relationships, filters);

  const commonChildProps = {
    personsMap,
    relationships,
    onPressPerson,
    hideSpouses,
    hideMales,
    hideFemales,
    highlightChain,
    chaseProgress,
  };

  /** Hàng con + line nối, không kèm stem phía trên (dùng khi cha đã tự vẽ stem riêng). */
  function renderKidsRow(kids: Person[]) {
    // Stem của cha rơi vào ĐÚNG TÂM cả hàng con, còn con trưởng thường nằm
    // ngoài cùng bên trái → đoạn ngang giữa hai điểm đó đi xuyên qua cột của
    // các em. Nếu chỉ tô vàng 2 cánh tay của riêng con trưởng (như trước) thì
    // vệt vàng đứt ngay khi cha có từ 3 con trở lên. Vì vậy tính toạ độ thật
    // của từng cột (bằng đúng hằng số layout, không dùng onLayout) rồi phủ MỘT
    // thanh vàng liền mạch từ tâm hàng tới tâm cột con trưởng.
    const { colCenters, rowCenter } = measureKidsRow(
      kids,
      personsMap,
      relationships,
      filters,
      nextVisited,
    );

    const goldIdx = isHighlighted ? kids.findIndex((c) => highlightChain?.has(c.id)) : -1;
    const goldEntry = goldIdx >= 0 ? highlightChain!.get(kids[goldIdx].id)! : null;
    const goldLeft = goldIdx >= 0 ? Math.min(rowCenter, colCenters[goldIdx]) : 0;
    const goldWidth =
      goldIdx >= 0 ? Math.abs(colCenters[goldIdx] - rowCenter) + LINE_W : 0;

    return (
      <View style={styles.kidsRow}>
        {kids.map((child, index) => {
          const isOnly = kids.length === 1;
          const isFirst = index === 0;
          const isLast = index === kids.length - 1;
          const childEntry = highlightChain?.get(child.id);
          const childHighlighted = childEntry != null;
          const childDepth = childEntry?.depth ?? 0;
          return (
            <View key={child.id} style={styles.kidCol}>
              {isOnly ? (
                <View style={styles.onlyStemWrap}>
                  <TreeLine
                    style={styles.vStub}
                    highlighted={childHighlighted}
                    depth={childDepth}
                    chaseProgress={chaseProgress}
                  />
                </View>
              ) : (
                <View style={styles.connector}>
                  {/* Cánh tay ngang luôn vẽ xám — phần vàng do goldTrail bên
                      dưới phủ lên nguyên một dải, tránh đứt đoạn/thừa đuôi. */}
                  <View style={[styles.hArm, isFirst ? styles.hArmHidden : null]} />
                  <TreeLine
                    style={styles.vStub}
                    highlighted={childHighlighted}
                    depth={childDepth}
                    chaseProgress={chaseProgress}
                  />
                  <View style={[styles.hArm, isLast ? styles.hArmHidden : null]} />
                </View>
              )}
              <TreeNode person={child} visited={nextVisited} {...commonChildProps} />
            </View>
          );
        })}

        {goldEntry && goldWidth > LINE_W ? (
          <View style={styles.goldTrailLayer} pointerEvents="none">
            <AnimatedGoldLine
              style={[styles.goldTrail, { left: goldLeft - LINE_W / 2, width: goldWidth }]}
              depth={goldEntry.depth}
              chaseProgress={chaseProgress}
            />
          </View>
        ) : null}
      </View>
    );
  }

  function renderKids(kids: Person[]) {
    if (kids.length === 0) return null;
    // Stem chỉ vàng khi chuỗi trưởng nam thực sự đi tiếp xuống hàng con này —
    // người cuối chuỗi không được thò một đoạn vàng cụt xuống đám con gái.
    const continuesChain = isHighlighted && kids.some((c) => highlightChain?.has(c.id));
    return (
      <View style={styles.kidsBlock}>
        <TreeLine
          style={styles.parentStem}
          highlighted={continuesChain}
          depth={myEntry?.depth ?? 0}
          chaseProgress={chaseProgress}
        />
        {renderKidsRow(kids)}
      </View>
    );
  }

  // 1 vợ/chồng trở xuống: giữ nguyên cách hiển thị gộp chung một khối.
  if (plan.mode === "single") {
    return (
      <View style={styles.nodeCol}>
        <View style={styles.coupleBoxWrap}>
          <View style={styles.coupleBox}>
            <TreePersonCard
              person={person}
              onPress={() => onPressPerson(person)}
              showEldestLabel={isHighlighted}
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
          {isHighlighted ? (
            <GoldGlowRing depth={myEntry!.depth} chaseProgress={chaseProgress} />
          ) : null}
        </View>

        {renderKids(plan.children)}
      </View>
    );
  }

  // >1 vợ/chồng: chồng/vợ giữa, các vợ/chồng còn lại xếp 2 bên; mỗi cuộc hôn
  // nhân có 1 nhánh nối riêng bắt đầu từ đúng điểm giữa 2 avatar của cặp đó.
  // Vị trí tính bằng công thức (CARD_W/NODE_MARGIN cố định) — KHÔNG dùng
  // onLayout/state để tránh vòng lặp re-render.
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

  type RenderBranch = { key: string; spouseId: string | null; children: Person[]; topAnchorLocal: number };
  const orderedSpouses = [...rowLeft, ...rowRight];
  const renderBranches: RenderBranch[] = [];
  for (const spouse of orderedSpouses) {
    const branch = branches.find((b) => b.spouse?.id === spouse.id);
    if (!branch || branch.children.length === 0) continue;
    const rowIdx = rowIndexById.get(spouse.id)!;
    const topAnchorLocal = ((personIndexInRow + rowIdx + 1) / 2) * CARD_W;
    renderBranches.push({ key: spouse.id, spouseId: spouse.id, children: branch.children, topAnchorLocal });
  }
  const unassignedBranch = branches.find((b) => b.spouse === null);
  if (unassignedBranch && unassignedBranch.children.length > 0) {
    renderBranches.push({
      key: "unassigned",
      spouseId: null,
      children: unassignedBranch.children,
      topAnchorLocal: personIndexInRow * CARD_W + CARD_W / 2,
    });
  }

  const branchWidths = renderBranches.map((b) =>
    b.children.reduce(
      (sum, c) =>
        sum +
        computeNodeWidth(c, personsMap, relationships, filters, nextVisited) +
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
      <View style={[styles.coupleBoxWrap, { width: coupleRowWidth }]}>
        <View style={[styles.coupleBox, { width: coupleRowWidth }]}>
          {rowItems.map((p) =>
            p.id === person.id ? (
              <TreePersonCard
                key={p.id}
                person={p}
                onPress={() => onPressPerson(p)}
                showEldestLabel={isHighlighted}
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
        {isHighlighted ? (
          <GoldGlowRing depth={myEntry!.depth} chaseProgress={chaseProgress} />
        ) : null}
      </View>

      {renderBranches.length > 0 ? (
        <>
          <View style={[styles.multiConnectorOverlay, { width: outerWidth, height: STEM_H }]}>
            {renderBranches.map((b, idx) => {
              const topX = coupleRowOffset + b.topAnchorLocal;
              const botX = bottomAnchors[idx];
              const left = Math.min(topX, botX);
              const barWidth = Math.abs(botX - topX) + LINE_W;

              const branchHighlighted = b.children.some((c) => highlightChain?.has(c.id));
              const branchDepth =
                b.children
                  .map((c) => highlightChain?.get(c.id)?.depth)
                  .find((d) => d != null) ?? 0;

              return (
                <View key={b.key} style={StyleSheet.absoluteFill} pointerEvents="none">
                  <TreeLine
                    style={[styles.multiStub, { left: topX - LINE_W / 2, top: 0, height: BEND_Y }]}
                    highlighted={branchHighlighted}
                    depth={branchDepth}
                    chaseProgress={chaseProgress}
                  />
                  <TreeLine
                    style={[
                      styles.multiBar,
                      { left, top: BEND_Y - LINE_W / 2, width: barWidth },
                    ]}
                    highlighted={branchHighlighted}
                    depth={branchDepth}
                    chaseProgress={chaseProgress}
                  />
                  <TreeLine
                    style={[
                      styles.multiStub,
                      { left: botX - LINE_W / 2, top: BEND_Y, height: STEM_H - BEND_Y },
                    ]}
                    highlighted={branchHighlighted}
                    depth={branchDepth}
                    chaseProgress={chaseProgress}
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
  const chaseProgress = useSharedValue(0);

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

  const maxChainDepth = useMemo(() => {
    if (!highlightChain || highlightChain.size === 0) return 0;
    let max = 0;
    highlightChain.forEach((v) => {
      if (v.depth > max) max = v.depth;
    });
    return max;
  }, [highlightChain]);

  // "Đốm sáng" vàng chạy liên tục từ đời gốc (0) đến đời cuối cùng của chuỗi, rồi lặp lại.
  useEffect(() => {
    if (!highlightChain || maxChainDepth === 0) {
      chaseProgress.value = 0;
      return;
    }
    chaseProgress.value = 0;
    chaseProgress.value = withRepeat(
      withTiming(maxChainDepth, {
        duration: maxChainDepth * CHASE_STEP_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightChain, maxChainDepth]);

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
                chaseProgress={chaseProgress}
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
  /** Bọc ngoài coupleBox — cho phép GoldGlowRing định vị absolute bao trọn
   * CẢ khối (dù 1/2/3 thẻ) thành 1 viền chung duy nhất, thay vì mỗi thẻ 1 viền. */
  coupleBoxWrap: {
    position: "relative",
  },
  coupleBox: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
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
  /** Lớp phủ nằm trên các cánh tay xám, dùng để vẽ dải vàng liền mạch từ tâm
   * hàng (chỗ stem của cha đáp xuống) sang tâm cột của con trưởng. */
  goldTrailLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  goldTrail: {
    position: "absolute",
    top: 0,
    height: LINE_W,
  },

  /* —— nhiều vợ/chồng: chồng giữa, vợ 2 bên, mỗi hôn nhân 1 nhánh nối riêng.
   * Width của nodeCol/coupleBox/branchesRow đều là số cụ thể tính sẵn bằng
   * computeNodeWidth (không phải "auto"), nên overlay ở giữa chỉ cần nằm
   * trong luồng bình thường — toạ độ các line luôn khớp chính xác. */
  multiConnectorOverlay: {
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
    flexDirection: "row",
    alignItems: "flex-start",
  },
  multiBranchCol: {
    marginHorizontal: 6,
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
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  /** Icon nổi ở khe giữa 2 thẻ trong cùng 1 coupleBox — KHÔNG có nền/viền
   * riêng, để không tạo cảm giác "viền riêng cho từng người" chồng lên viền
   * chung của cả khối (kể cả khi khối đang phát sáng vàng). */
  badgeIcon: {
    position: "absolute",
    top: 14,
    left: -8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  badgeIconText: {
    fontSize: 11,
    textShadowColor: colors.white,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  badgeIconPlus: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textMuted,
    marginTop: -1,
    textShadowColor: colors.white,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
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
