import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { getChildren, getSpouses, pickDefaultRootId } from "../domain/treeRoot";
import type { Person, Relationship } from "../types";
import { colors } from "../theme";
import PersonCard from "./PersonCard";

type Props = {
  persons: Person[];
  relationships: Relationship[];
  onPressPerson: (p: Person) => void;
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
    <View style={styles.node}>
      <View style={styles.couple}>
        <View style={styles.nodeCard}>
          <PersonCard
            person={person}
            compact
            onPress={() => onPressPerson(person)}
          />
        </View>
        {spouses.map((s) => (
          <View key={s.id} style={styles.nodeCard}>
            <PersonCard
              person={s}
              compact
              role={s.gender === "male" ? "Chồng" : "Vợ"}
              onPress={() => onPressPerson(s)}
            />
          </View>
        ))}
      </View>
      {children.length > 0 && (
        <View style={styles.children}>
          <View style={styles.vline} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.childRow}>
              {children.map((c) => (
                <View key={c.id} style={styles.childWrap}>
                  <View style={styles.childStem} />
                  <TreeNode
                    person={c}
                    personsMap={personsMap}
                    relationships={relationships}
                    visited={nextVisited}
                    onPressPerson={onPressPerson}
                    hideSpouses={hideSpouses}
                    hideMales={hideMales}
                    hideFemales={hideFemales}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
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

  const roots = useMemo(() => {
    const childIds = new Set(
      relationships
        .filter(
          (r) => r.type === "biological_child" || r.type === "adopted_child",
        )
        .map((r) => r.person_b),
    );
    return persons
      .filter((p) => !childIds.has(p.id) && !p.is_in_law)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
  }, [persons, relationships]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(3, Math.max(0.4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
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

  if (!rootPerson) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Chưa có dữ liệu cây gia phả.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.rootRow}>
            <Text style={styles.rootLabel}>Gốc:</Text>
            {(roots.length ? roots : persons).slice(0, 40).map((p) => (
              <Pressable
                key={p.id}
                style={[
                  styles.rootChip,
                  effectiveRoot === p.id && styles.rootChipOn,
                ]}
                onPress={() => setRootId(p.id)}
              >
                <Text
                  style={[
                    styles.rootChipText,
                    effectiveRoot === p.id && styles.rootChipTextOn,
                  ]}
                  numberOfLines={1}
                >
                  {p.full_name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Pressable
          style={styles.filterBtn}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text style={styles.filterBtnText}>Lọc</Text>
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filters}>
          {(
            [
              ["hideSpouses", "Ẩn vợ/chồng", hideSpouses, setHideSpouses],
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

      <GestureDetector gesture={composed}>
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
      </GestureDetector>
      <Text style={styles.hint}>Pinch để zoom · kéo để di chuyển</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 8,
    marginBottom: 6,
  },
  rootRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 8 },
  rootLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  rootChip: {
    maxWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rootChipOn: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  rootChipText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  rootChipTextOn: { color: colors.amberDark },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnText: { fontSize: 12, fontWeight: "700", color: colors.text },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
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
  canvas: { padding: 16, minWidth: "100%" },
  node: { alignItems: "center" },
  couple: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  nodeCard: { width: 200 },
  children: { alignItems: "center", marginTop: 4 },
  vline: { width: 2, height: 16, backgroundColor: colors.border },
  childRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingTop: 4 },
  childWrap: { alignItems: "center" },
  childStem: { width: 2, height: 12, backgroundColor: colors.border, marginBottom: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: colors.textMuted },
  hint: {
    textAlign: "center",
    fontSize: 10,
    color: colors.textSoft,
    paddingBottom: 8,
  },
});
