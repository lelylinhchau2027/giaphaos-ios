import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getChildren, getSpouses, pickDefaultRootId } from "../domain/treeRoot";
import type { Person, Relationship } from "../types";
import { colors, genderBg, genderColor } from "../theme";

type Props = {
  persons: Person[];
  relationships: Relationship[];
  onPressPerson: (p: Person) => void;
};

type TreeFilters = {
  hideSpouses: boolean;
  hideMales: boolean;
  hideFemales: boolean;
};

function filterPeople(
  list: Person[],
  filters: TreeFilters,
): Person[] {
  return list.filter((p) => {
    if (filters.hideMales && p.gender === "male") return false;
    if (filters.hideFemales && p.gender === "female") return false;
    return true;
  });
}

function TreeBranch({
  person,
  personsMap,
  relationships,
  depth,
  expanded,
  toggle,
  filters,
  onPressPerson,
  visited,
}: {
  person: Person;
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  filters: TreeFilters;
  onPressPerson: (p: Person) => void;
  visited: Set<string>;
}) {
  if (visited.has(person.id)) return null;
  const next = new Set(visited);
  next.add(person.id);

  let children = getChildren(person.id, relationships, personsMap);
  children = filterPeople(children, filters);

  let spouses = filters.hideSpouses
    ? []
    : filterPeople(getSpouses(person.id, relationships, personsMap), filters);

  const isOpen = expanded.has(person.id);
  const hasKids = children.length > 0;
  const indent = Math.min(depth, 8) * 14;

  return (
    <View>
      <View style={[styles.row, { paddingLeft: 8 + indent }]}>
        {hasKids ? (
          <Pressable
            style={styles.expandBtn}
            onPress={() => toggle(person.id)}
            hitSlop={8}
          >
            <Text style={styles.expandIcon}>{isOpen ? "▼" : "▶"}</Text>
          </Pressable>
        ) : (
          <View style={styles.expandPlaceholder} />
        )}

        <Pressable
          style={[styles.node, { borderColor: genderColor(person.gender) }]}
          onPress={() => onPressPerson(person)}
        >
          <View
            style={[styles.dot, { backgroundColor: genderBg(person.gender) }]}
          >
            <Text style={[styles.dotText, { color: genderColor(person.gender) }]}>
              {person.full_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.nodeBody}>
            <Text style={styles.name} numberOfLines={1}>
              {person.full_name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {person.generation != null ? `Đời ${person.generation}` : ""}
              {person.birth_year ? ` · ${person.birth_year}` : ""}
              {person.is_deceased ? " · †" : ""}
              {person.is_in_law ? " · dâu/rể" : ""}
            </Text>
          </View>
          {hasKids ? (
            <Text style={styles.kidCount}>{children.length}</Text>
          ) : null}
        </Pressable>
      </View>

      {spouses.length > 0 && (
        <View style={[styles.spouseRow, { paddingLeft: 36 + indent }]}>
          {spouses.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.spouseChip, { borderColor: genderColor(s.gender) }]}
              onPress={() => onPressPerson(s)}
            >
              <Text style={styles.spouseText} numberOfLines={1}>
                {s.gender === "male" ? "♂ " : s.gender === "female" ? "♀ " : ""}
                {s.full_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isOpen &&
        children.map((c) => (
          <TreeBranch
            key={c.id}
            person={c}
            personsMap={personsMap}
            relationships={relationships}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            filters={filters}
            onPressPerson={onPressPerson}
            visited={next}
          />
        ))}
    </View>
  );
}

/** Collect all descendant ids from root (for expand-all). */
function collectDescendantIds(
  rootId: string,
  relationships: Relationship[],
  personsMap: Map<string, Person>,
): string[] {
  const ids: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    for (const c of getChildren(id, relationships, personsMap)) {
      stack.push(c.id);
    }
  }
  return ids;
}

export default function FamilyTreeView({
  persons,
  relationships,
  onPressPerson,
}: Props) {
  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  const defaultRoot = useMemo(
    () => pickDefaultRootId(persons, relationships),
    [persons, relationships],
  );

  const [rootId, setRootId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [hideSpouses, setHideSpouses] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const effectiveRoot =
    rootId && personsMap.has(rootId) ? rootId : defaultRoot;
  const rootPerson = effectiveRoot ? personsMap.get(effectiveRoot) : null;

  // When root changes, expand root + first level only
  useEffect(() => {
    if (!effectiveRoot) return;
    const next = new Set<string>([effectiveRoot]);
    for (const c of getChildren(effectiveRoot, relationships, personsMap)) {
      next.add(c.id);
    }
    setExpanded(next);
  }, [effectiveRoot, relationships, personsMap]);

  const filters: TreeFilters = { hideSpouses, hideMales, hideFemales };

  const searchHits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return persons.slice(0, 30);
    return persons
      .filter((p) => p.full_name.toLowerCase().includes(term))
      .slice(0, 40);
  }, [persons, search]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const expandAll = () => {
    if (!effectiveRoot) return;
    setExpanded(
      new Set(collectDescendantIds(effectiveRoot, relationships, personsMap)),
    );
  };

  const collapseAll = () => {
    if (!effectiveRoot) return;
    setExpanded(new Set([effectiveRoot]));
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
      {/* Root / person filter */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>Xem từ</Text>
        <Pressable
          style={styles.rootSelect}
          onPress={() => setShowPicker((v) => !v)}
        >
          <Text style={styles.rootSelectText} numberOfLines={1}>
            {rootPerson.full_name}
          </Text>
          <Text style={styles.chev}>{showPicker ? "▲" : "▼"}</Text>
        </Pressable>
      </View>

      {showPicker && (
        <View style={styles.picker}>
          <TextInput
            style={styles.search}
            placeholder="Tìm người để xem nhánh con cháu…"
            placeholderTextColor={colors.textSoft}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
            {searchHits.map((p) => (
              <Pressable
                key={p.id}
                style={[
                  styles.pickerItem,
                  p.id === effectiveRoot && styles.pickerItemOn,
                ]}
                onPress={() => {
                  setRootId(p.id);
                  setShowPicker(false);
                  setSearch("");
                }}
              >
                <Text
                  style={[
                    styles.pickerName,
                    p.id === effectiveRoot && styles.pickerNameOn,
                  ]}
                  numberOfLines={1}
                >
                  {p.full_name}
                  {p.generation != null ? ` · Đời ${p.generation}` : ""}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Display filters + expand */}
      <View style={styles.chipRow}>
        {(
          [
            ["spouses", "Ẩn vợ/chồng", hideSpouses, () => setHideSpouses((v) => !v)],
            ["m", "Ẩn nam", hideMales, () => setHideMales((v) => !v)],
            ["f", "Ẩn nữ", hideFemales, () => setHideFemales((v) => !v)],
          ] as const
        ).map(([k, label, on, fn]) => (
          <Pressable
            key={k}
            style={[styles.chip, on && styles.chipOn]}
            onPress={fn}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.chip} onPress={expandAll}>
          <Text style={styles.chipText}>Mở hết</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={collapseAll}>
          <Text style={styles.chipText}>Thu gọn</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Chạm ▶/▼ để mở nhánh · chạm tên để xem chi tiết · chọn “Xem từ” để lọc
        theo một người
      </Text>

      {/* Fixed frame — cannot drag outside tab area */}
      <View style={styles.frame}>
        <ScrollView
          style={styles.frameScroll}
          contentContainerStyle={styles.frameContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <TreeBranch
            person={rootPerson}
            personsMap={personsMap}
            relationships={relationships}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            filters={filters}
            onPressPerson={onPressPerson}
            visited={new Set()}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: colors.textMuted },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  toolbarLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
  },
  rootSelect: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rootSelectText: {
    flex: 1,
    fontWeight: "800",
    color: colors.amberDark,
    fontSize: 14,
  },
  chev: { fontSize: 10, color: colors.amberDark },
  picker: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    overflow: "hidden",
  },
  search: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  pickerList: { maxHeight: 150 },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerItemOn: { backgroundColor: colors.amberSoft },
  pickerName: { fontSize: 13, fontWeight: "600", color: colors.text },
  pickerNameOn: { color: colors.amberDark, fontWeight: "800" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  chipText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  chipTextOn: { color: colors.amberDark },
  hint: {
    fontSize: 10,
    color: colors.textSoft,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  frame: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  frameScroll: { flex: 1 },
  frameContent: { paddingVertical: 10, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingRight: 8,
  },
  expandBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  expandPlaceholder: { width: 28 },
  expandIcon: { fontSize: 10, color: colors.amberDark, fontWeight: "800" },
  node: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.stone100,
    borderRadius: 12,
    borderLeftWidth: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: { fontWeight: "800", fontSize: 13 },
  nodeBody: { flex: 1, minWidth: 0 },
  name: { fontWeight: "800", fontSize: 13, color: colors.text },
  meta: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  kidCount: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.amberDark,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  spouseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
    paddingRight: 8,
  },
  spouseChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.white,
    maxWidth: 160,
  },
  spouseText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
});
