import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Person } from "../types";
import { colors } from "../theme";
import PersonCard from "./PersonCard";

type Props = {
  persons: Person[];
  loading?: boolean;
  onRefresh?: () => void;
  onPressPerson: (p: Person) => void;
  onAdd?: () => void;
  canEdit?: boolean;
};

export default function MemberList({
  persons,
  loading,
  onRefresh,
  onPressPerson,
  onAdd,
  canEdit,
}: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name_asc");

  const data = useMemo(() => {
    let list = persons.filter((p) => {
      const match = p.full_name.toLowerCase().includes(q.trim().toLowerCase());
      if (!match) return false;
      switch (filter) {
        case "male":
          return p.gender === "male";
        case "female":
          return p.gender === "female";
        case "in_law_female":
          return p.gender === "female" && p.is_in_law;
        case "in_law_male":
          return p.gender === "male" && p.is_in_law;
        case "deceased":
          return p.is_deceased;
        case "first_child":
          return p.birth_order === 1;
        default:
          return true;
      }
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "birth_asc":
          return (a.birth_year || 9999) - (b.birth_year || 9999);
        case "birth_desc":
          return (b.birth_year || 0) - (a.birth_year || 0);
        case "name_desc":
          return b.full_name.localeCompare(a.full_name, "vi");
        case "generation_asc":
          if (a.generation !== b.generation)
            return (a.generation || 999) - (b.generation || 999);
          return (a.birth_order || 999) - (b.birth_order || 999);
        case "updated_desc":
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
        case "name_asc":
        default:
          return a.full_name.localeCompare(b.full_name, "vi");
      }
    });
    return list;
  }, [persons, q, filter, sort]);

  const filters = [
    ["all", "Tất cả"],
    ["male", "Nam"],
    ["female", "Nữ"],
    ["in_law_female", "Dâu"],
    ["in_law_male", "Rể"],
    ["deceased", "Đã mất"],
    ["first_child", "Con trưởng"],
  ] as const;

  const sorts = [
    ["name_asc", "Tên A→Z"],
    ["name_desc", "Tên Z→A"],
    ["birth_asc", "Năm sinh ↑"],
    ["birth_desc", "Năm sinh ↓"],
    ["generation_asc", "Đời"],
    ["updated_desc", "Mới cập nhật"],
  ] as const;

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Tìm kiếm thành viên..."
          placeholderTextColor={colors.textSoft}
          value={q}
          onChangeText={setQ}
        />
        {canEdit && onAdd ? (
          <Pressable style={styles.addBtn} onPress={onAdd}>
            <Text style={styles.addText}>+ Thêm</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        {filters.map(([id, label]) => (
          <Pressable
            key={id}
            style={[styles.chip, filter === id && styles.chipOn]}
            onPress={() => setFilter(id)}
          >
            <Text style={[styles.chipText, filter === id && styles.chipTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chipRow}>
        {sorts.map(([id, label]) => (
          <Pressable
            key={id}
            style={[styles.chip, sort === id && styles.chipOn]}
            onPress={() => setSort(id)}
          >
            <Text style={[styles.chipText, sort === id && styles.chipTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.count}>{data.length} / {persons.length} thành viên</Text>

      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!loading} onRefresh={onRefresh} />
          ) : undefined
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Không có thành viên phù hợp.</Text>
        }
        renderItem={({ item }) => (
          <PersonCard person={item} onPress={() => onPressPerson(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { flexDirection: "row", gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  search: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  chipRow: {
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
  count: {
    fontSize: 11,
    color: colors.textSoft,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
