import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Person, Relationship, RelationshipType } from "../types";
import {
  deleteRelationship,
  insertRelationship,
  upsertPerson,
} from "../services/supabaseData";
import type { RuntimeConfig } from "../services/settings";
import { colors } from "../theme";

type Enriched = {
  id: string;
  type: string;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  target: Person;
  note: string | null;
  realId: string;
};

type Props = {
  config: RuntimeConfig;
  person: Person;
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
  onChanged: () => Promise<void>;
  onOpenPerson: (id: string) => void;
};

export default function RelationshipManager({
  config,
  person,
  persons,
  relationships,
  canEdit = true,
  onChanged,
  onOpenPerson,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [dir, setDir] = useState<"parent" | "child" | "spouse">("child");
  const [relType, setRelType] = useState<RelationshipType>("biological_child");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [spouseName, setSpouseName] = useState("");
  const [addingSpouse, setAddingSpouse] = useState(false);

  const personsMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  const enriched = useMemo(() => {
    const list: Enriched[] = [];
    for (const r of relationships) {
      if (r.person_a === person.id) {
        const target = personsMap.get(r.person_b);
        if (!target) continue;
        let direction: Enriched["direction"] = "spouse";
        if (r.type === "marriage") direction = "spouse";
        else if (r.type === "biological_child" || r.type === "adopted_child")
          direction = "child";
        list.push({
          id: r.id,
          realId: r.id,
          type: r.type,
          direction,
          target,
          note: r.note ?? null,
        });
      } else if (r.person_b === person.id) {
        const target = personsMap.get(r.person_a);
        if (!target) continue;
        let direction: Enriched["direction"] = "spouse";
        if (r.type === "marriage") direction = "spouse";
        else if (r.type === "biological_child" || r.type === "adopted_child")
          direction = "parent";
        list.push({
          id: r.id,
          realId: r.id,
          type: r.type,
          direction,
          target,
          note: r.note ?? null,
        });
      }
    }

    // children-in-law
    const childIds = list.filter((x) => x.direction === "child").map((x) => x.target.id);
    for (const r of relationships) {
      if (r.type !== "marriage") continue;
      const aIsChild = childIds.includes(r.person_a);
      const bIsChild = childIds.includes(r.person_b);
      if (!aIsChild && !bIsChild) continue;
      const childId = aIsChild ? r.person_a : r.person_b;
      const spouseId = aIsChild ? r.person_b : r.person_a;
      if (list.some((x) => x.target.id === spouseId)) continue;
      const spouse = personsMap.get(spouseId);
      const child = personsMap.get(childId);
      if (!spouse || !child) continue;
      let note = `Vợ/chồng của ${child.full_name}`;
      if (spouse.gender === "female") note = `Con dâu (vợ của ${child.full_name})`;
      if (spouse.gender === "male") note = `Con rể (chồng của ${child.full_name})`;
      list.push({
        id: r.id + "_inlaw",
        realId: r.id,
        type: "marriage",
        direction: "child_in_law",
        target: spouse,
        note,
      });
    }
    return list;
  }, [person.id, personsMap, relationships]);

  const groups = {
    parent: enriched.filter((e) => e.direction === "parent"),
    spouse: enriched.filter((e) => e.direction === "spouse"),
    child: enriched.filter((e) => e.direction === "child"),
    child_in_law: enriched.filter((e) => e.direction === "child_in_law"),
  };

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return persons.filter((p) => p.id !== person.id).slice(0, 12);
    return persons
      .filter(
        (p) =>
          p.id !== person.id && p.full_name.toLowerCase().includes(term),
      )
      .slice(0, 20);
  }, [persons, person.id, search]);

  const dirLabel = (d: Enriched["direction"]) => {
    switch (d) {
      case "parent":
        return "Cha/Mẹ";
      case "spouse":
        return "Vợ/Chồng";
      case "child":
        return "Con";
      case "child_in_law":
        return "Dâu/Rể";
    }
  };

  const linkPerson = async (target: Person) => {
    setBusy(true);
    try {
      let type: RelationshipType = "marriage";
      let person_a = person.id;
      let person_b = target.id;

      if (dir === "spouse") {
        type = "marriage";
      } else if (dir === "parent") {
        type = relType === "adopted_child" ? "adopted_child" : "biological_child";
        person_a = target.id; // parent
        person_b = person.id; // child
      } else {
        type = relType === "adopted_child" ? "adopted_child" : "biological_child";
        person_a = person.id;
        person_b = target.id;
      }

      await insertRelationship(config, { type, person_a, person_b });
      setAdding(false);
      setSearch("");
      await onChanged();
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không thêm được quan hệ");
    } finally {
      setBusy(false);
    }
  };

  const removeRel = (item: Enriched) => {
    if (item.direction === "child_in_law") {
      Alert.alert("Gợi ý", "Hãy xóa quan hệ hôn nhân từ trang con/dâu rể.");
      return;
    }
    Alert.alert("Xóa quan hệ", `Xóa liên kết với ${item.target.full_name}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRelationship(config, item.realId);
            await onChanged();
          } catch (e) {
            Alert.alert("Lỗi", e instanceof Error ? e.message : "Không xóa được");
          }
        },
      },
    ]);
  };

  const quickSpouse = async () => {
    if (!spouseName.trim()) return;
    setBusy(true);
    try {
      const gender = person.gender === "male" ? "female" : "male";
      const created = await upsertPerson(config, {
        full_name: spouseName.trim(),
        gender,
        is_in_law: true,
        is_deceased: false,
      });
      await insertRelationship(config, {
        type: "marriage",
        person_a: person.id,
        person_b: created.id,
      });
      setSpouseName("");
      setAddingSpouse(false);
      await onChanged();
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không tạo được");
    } finally {
      setBusy(false);
    }
  };

  const Section = ({
    title,
    items,
  }: {
    title: string;
    items: Enriched[];
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} ({items.length})
      </Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>—</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.item}>
            <Pressable style={{ flex: 1 }} onPress={() => onOpenPerson(item.target.id)}>
              <Text style={styles.itemName}>{item.target.full_name}</Text>
              <Text style={styles.itemMeta}>
                {dirLabel(item.direction)}
                {item.type !== "marriage" ? ` · ${item.type}` : ""}
                {item.note ? ` · ${item.note}` : ""}
              </Text>
            </Pressable>
            {canEdit && item.direction !== "child_in_law" && (
              <Pressable onPress={() => removeRel(item)}>
                <Text style={styles.remove}>Xóa</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Quan hệ gia đình</Text>
      <Section title="Cha/Mẹ" items={groups.parent} />
      <Section title="Vợ/Chồng" items={groups.spouse} />
      <Section title="Con" items={groups.child} />
      <Section title="Con dâu/rể" items={groups.child_in_law} />

      {canEdit && (
        <View style={styles.actions}>
          <Pressable
            style={styles.btn}
            onPress={() => {
              setAdding((v) => !v);
              setAddingSpouse(false);
            }}
          >
            <Text style={styles.btnText}>
              {adding ? "Đóng" : "+ Liên kết người có sẵn"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.btnGhost}
            onPress={() => {
              setAddingSpouse((v) => !v);
              setAdding(false);
            }}
          >
            <Text style={styles.btnGhostText}>+ Tạo vợ/chồng mới</Text>
          </Pressable>
        </View>
      )}

      {adding && (
        <View style={styles.panel}>
          <Text style={styles.label}>Hướng quan hệ</Text>
          <View style={styles.row}>
            {(
              [
                ["parent", "Thêm cha/mẹ"],
                ["child", "Thêm con"],
                ["spouse", "Thêm vợ/chồng"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                style={[styles.chip, dir === id && styles.chipOn]}
                onPress={() => {
                  setDir(id);
                  if (id === "spouse") setRelType("marriage");
                  else setRelType("biological_child");
                }}
              >
                <Text style={[styles.chipText, dir === id && styles.chipTextOn]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {(dir === "parent" || dir === "child") && (
            <View style={styles.row}>
              {(
                [
                  ["biological_child", "Ruột"],
                  ["adopted_child", "Nuôi"],
                ] as const
              ).map(([id, label]) => (
                <Pressable
                  key={id}
                  style={[styles.chip, relType === id && styles.chipOn]}
                  onPress={() => setRelType(id)}
                >
                  <Text
                    style={[styles.chipText, relType === id && styles.chipTextOn]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Tìm thành viên..."
            placeholderTextColor={colors.textSoft}
            value={search}
            onChangeText={setSearch}
          />
          {busy && <ActivityIndicator color={colors.amber} />}
          {searchResults.map((p) => (
            <Pressable key={p.id} style={styles.result} onPress={() => linkPerson(p)}>
              <Text style={styles.resultName}>{p.full_name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {addingSpouse && (
        <View style={styles.panel}>
          <TextInput
            style={styles.input}
            placeholder="Họ tên vợ/chồng mới"
            placeholderTextColor={colors.textSoft}
            value={spouseName}
            onChangeText={setSpouseName}
          />
          <Pressable style={styles.btn} onPress={quickSpouse} disabled={busy}>
            <Text style={styles.btnText}>{busy ? "..." : "Tạo & kết hôn"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 16 },
  heading: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 8 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: colors.textMuted, marginBottom: 6 },
  empty: { color: colors.textSoft, fontSize: 13 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 6,
  },
  itemName: { fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  remove: { color: colors.danger, fontWeight: "700", fontSize: 12, padding: 6 },
  actions: { gap: 8, marginTop: 4 },
  btn: {
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: colors.white, fontWeight: "800" },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  btnGhostText: { color: colors.amberDark, fontWeight: "800" },
  panel: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.stone100,
    borderRadius: 14,
    gap: 8,
  },
  label: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  chipText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  chipTextOn: { color: colors.amberDark },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  result: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: { fontWeight: "600", color: colors.text },
});
