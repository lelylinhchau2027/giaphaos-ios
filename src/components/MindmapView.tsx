import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getChildren, getSpouses, pickDefaultRootId } from "../domain/treeRoot";
import type { Person, Relationship } from "../types";
import { colors, genderColor } from "../theme";

type Props = {
  persons: Person[];
  relationships: Relationship[];
  onPressPerson: (p: Person) => void;
};

function MindNode({
  person,
  personsMap,
  relationships,
  depth,
  expanded,
  toggle,
  onPressPerson,
  visited,
}: {
  person: Person;
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onPressPerson: (p: Person) => void;
  visited: Set<string>;
}) {
  if (visited.has(person.id)) return null;
  const next = new Set(visited);
  next.add(person.id);

  const children = getChildren(person.id, relationships, personsMap);
  const spouses = getSpouses(person.id, relationships, personsMap);
  const isOpen = expanded.has(person.id);
  const hasKids = children.length > 0;

  return (
    <View style={{ marginLeft: depth * 14 }}>
      <View style={styles.row}>
        {hasKids ? (
          <Pressable style={styles.expand} onPress={() => toggle(person.id)}>
            <Text style={styles.expandText}>{isOpen ? "▼" : "▶"}</Text>
          </Pressable>
        ) : (
          <View style={styles.expandPlaceholder} />
        )}
        <Pressable
          style={[styles.node, { borderColor: genderColor(person.gender) }]}
          onPress={() => onPressPerson(person)}
        >
          <Text style={styles.name} numberOfLines={1}>
            {person.full_name}
          </Text>
          {person.generation != null && (
            <Text style={styles.gen}>Đ{person.generation}</Text>
          )}
        </Pressable>
        {spouses.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.spouse, { borderColor: genderColor(s.gender) }]}
            onPress={() => onPressPerson(s)}
          >
            <Text style={styles.spouseText} numberOfLines={1}>
              {s.full_name}
            </Text>
          </Pressable>
        ))}
      </View>
      {isOpen &&
        children.map((c) => (
          <MindNode
            key={c.id}
            person={c}
            personsMap={personsMap}
            relationships={relationships}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            onPressPerson={onPressPerson}
            visited={next}
          />
        ))}
    </View>
  );
}

export default function MindmapView({
  persons,
  relationships,
  onPressPerson,
}: Props) {
  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );
  const rootId = pickDefaultRootId(persons, relationships);
  const root = rootId ? personsMap.get(rootId) : null;

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (rootId) s.add(rootId);
    return s;
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const expandAll = () => {
    const s = new Set(persons.map((p) => p.id));
    setExpanded(s);
  };

  const collapseAll = () => {
    setExpanded(rootId ? new Set([rootId]) : new Set());
  };

  if (!root) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Chưa có dữ liệu mindmap.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable style={styles.btn} onPress={expandAll}>
          <Text style={styles.btnText}>Mở hết</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={collapseAll}>
          <Text style={styles.btnText}>Thu gọn</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <MindNode
          person={root}
          personsMap={personsMap}
          relationships={relationships}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          onPressPerson={onPressPerson}
          visited={new Set()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { fontSize: 12, fontWeight: "700", color: colors.text },
  scroll: { padding: 12, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 4 },
  expand: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  expandPlaceholder: { width: 22 },
  expandText: { fontSize: 10, color: colors.textMuted },
  node: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 180,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: { fontSize: 13, fontWeight: "700", color: colors.text, flexShrink: 1 },
  gen: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.amberDark,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  spouse: {
    backgroundColor: colors.stone100,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 120,
  },
  spouseText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textMuted },
});
