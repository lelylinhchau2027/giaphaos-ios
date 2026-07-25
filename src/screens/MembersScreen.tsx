import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { PersonRow, RelationshipRow } from "../types";
import { colors } from "../theme";

type Props = {
  persons: PersonRow[];
  relationships: RelationshipRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

function formatDate(
  y: number | null,
  m: number | null,
  d: number | null,
): string {
  if (!y && !m && !d) return "—";
  const parts = [
    d ? String(d).padStart(2, "0") : "??",
    m ? String(m).padStart(2, "0") : "??",
    y ? String(y) : "????",
  ];
  return parts.join("/");
}

export default function MembersScreen({
  persons,
  relationships,
  loading,
  onRefresh,
}: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PersonRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return persons;
    return persons.filter((p) => p.full_name.toLowerCase().includes(term));
  }, [persons, q]);

  const related = useMemo(() => {
    if (!selected) return { spouses: [] as PersonRow[], children: [] as PersonRow[], parents: [] as PersonRow[] };
    const byId = new Map(persons.map((p) => [p.id, p]));
    const spouses: PersonRow[] = [];
    const children: PersonRow[] = [];
    const parents: PersonRow[] = [];
    for (const r of relationships) {
      if (r.type === "marriage") {
        if (r.person_a === selected.id && byId.get(r.person_b))
          spouses.push(byId.get(r.person_b)!);
        if (r.person_b === selected.id && byId.get(r.person_a))
          spouses.push(byId.get(r.person_a)!);
      }
      if (r.type === "biological_child" || r.type === "adopted_child") {
        // convention: person_a parent, person_b child (check both)
        if (r.person_a === selected.id && byId.get(r.person_b))
          children.push(byId.get(r.person_b)!);
        if (r.person_b === selected.id && byId.get(r.person_a))
          parents.push(byId.get(r.person_a)!);
      }
    }
    return { spouses, children, parents };
  }, [selected, persons, relationships]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.h1}>Thành viên</Text>
        <Text style={styles.count}>{persons.length} người</Text>
      </View>

      <TextInput
        style={styles.search}
        value={q}
        onChangeText={setQ}
        placeholder="Tìm theo tên…"
        placeholderTextColor={colors.textSoft}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.amber} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>Chưa có thành viên hoặc chưa cấu hình Supabase</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setSelected(item)}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {item.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>
                {item.is_deceased ? "Đã mất" : "Còn sống"}
                {item.birth_year ? ` · ${item.birth_year}` : ""}
                {item.generation != null ? ` · Đời ${item.generation}` : ""}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
      />

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selected.full_name}</Text>
                  <Pressable onPress={() => setSelected(null)}>
                    <Text style={styles.close}>✕</Text>
                  </Pressable>
                </View>
                <Text style={styles.detailLine}>
                  Sinh: {formatDate(selected.birth_year, selected.birth_month, selected.birth_day)}
                </Text>
                {selected.is_deceased && (
                  <Text style={styles.detailLine}>
                    Mất: {formatDate(selected.death_year, selected.death_month, selected.death_day)}
                  </Text>
                )}
                {selected.note ? (
                  <Text style={styles.note}>{selected.note}</Text>
                ) : null}
                {related.spouses.length > 0 && (
                  <Text style={styles.rel}>
                    Phối ngẫu: {related.spouses.map((p) => p.full_name).join(", ")}
                  </Text>
                )}
                {related.parents.length > 0 && (
                  <Text style={styles.rel}>
                    Cha/mẹ: {related.parents.map((p) => p.full_name).join(", ")}
                  </Text>
                )}
                {related.children.length > 0 && (
                  <Text style={styles.rel}>
                    Con: {related.children.map((p) => p.full_name).join(", ")}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text },
  count: { fontWeight: "600", color: colors.textMuted },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontWeight: "800", color: colors.amberDark, fontSize: 16 },
  name: { fontWeight: "700", color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chev: { fontSize: 22, color: colors.textSoft },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(28,25,23,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, flex: 1 },
  close: { fontSize: 18, color: colors.textMuted, padding: 4 },
  detailLine: { fontSize: 14, color: colors.stone },
  note: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    backgroundColor: "#f5f5f4",
    padding: 12,
    borderRadius: 12,
  },
  rel: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
