import { useMemo, useState } from "react";
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
  withTiming,
} from "react-native-reanimated";
import { getChildren, getSpouses, pickDefaultRootId } from "../domain/treeRoot";
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

/** Compact vertical card — mirrors web FamilyNodeCard */
function TreePersonCard({
  person,
  role,
  showRing,
  showPlus,
  onPress,
}: {
  person: Person;
  role?: string;
  showRing?: boolean;
  showPlus?: boolean;
  onPress: () => void;
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
      </View>

      {role ? <Text style={styles.roleText}>{role}</Text> : null}
    </Pressable>
  );
}

function TreeNode({
  person,
  personsMap,
  relationships,
  visited,
  onPressPerson,
  hideSpouses,
  hideMales,
  hideFemales,
}: {
  person: Person;
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  visited: Set<string>;
  onPressPerson: (p: Person) => void;
  hideSpouses: boolean;
  hideMales: boolean;
  hideFemales: boolean;
}) {
  if (visited.has(person.id)) return null;
  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  let spouses = hideSpouses
    ? []
    : getSpouses(person.id, relationships, personsMap);
  let children = getChildren(person.id, relationships, personsMap);

  if (hideMales) {
    spouses = spouses.filter((s) => s.gender !== "male");
    children = children.filter((c) => c.gender !== "male");
  }
  if (hideFemales) {
    spouses = spouses.filter((s) => s.gender !== "female");
    children = children.filter((c) => c.gender !== "female");
  }

  return (
    <View style={styles.nodeCol}>
      {/* Couple unit: person + spouses side-by-side (web style) */}
      <View style={styles.coupleBox}>
        <TreePersonCard person={person} onPress={() => onPressPerson(person)} />
        {spouses.map((s, idx) => (
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

      {children.length > 0 ? (
        <View style={styles.kidsBlock}>
          {/* Vertical stem from parent couple down to children bar */}
          <View style={styles.parentStem} />

          <View style={styles.kidsRow}>
            {children.map((child, index) => {
              const isOnly = children.length === 1;
              const isFirst = index === 0;
              const isLast = index === children.length - 1;
              return (
                <View key={child.id} style={styles.kidCol}>
                  {/* Connector: left H — vertical stub — right H (CSS-tree style) */}
                  {isOnly ? (
                    <View style={styles.onlyStemWrap}>
                      <View style={styles.vStub} />
                    </View>
                  ) : (
                    <View style={styles.connector}>
                      <View
                        style={[styles.hArm, isFirst ? styles.hArmHidden : null]}
                      />
                      <View style={styles.vStub} />
                      <View
                        style={[styles.hArm, isLast ? styles.hArmHidden : null]}
                      />
                    </View>
                  )}

                  <TreeNode
                    person={child}
                    personsMap={personsMap}
                    relationships={relationships}
                    visited={nextVisited}
                    onPressPerson={onPressPerson}
                    hideSpouses={hideSpouses}
                    hideMales={hideMales}
                    hideFemales={hideFemales}
                  />
                </View>
              );
            })}
          </View>
        </View>
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
  filterBtnText: { fontSize: 12, fontWeight: "700", color: colors.text },
  filterBtnTextOn: { color: colors.amberDark },
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
