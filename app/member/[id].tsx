import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import RelationshipManager from "../../src/components/RelationshipManager";
import { useFamilyData } from "../../src/context/FamilyDataContext";
import { deletePerson } from "../../src/services/supabaseData";
import { colors, genderBg, genderColor } from "../../src/theme";
import {
  formatLunarDeath,
  formatYmd,
  genderLabel,
} from "../../src/utils/format";

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    config,
    persons,
    relationships,
    canEdit,
    isAdmin,
    reload,
  } = useFamilyData();

  const person = useMemo(
    () => persons.find((p) => p.id === id),
    [persons, id],
  );

  if (!person) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Không tìm thấy thành viên.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const lunarDeath = person.is_deceased
    ? formatLunarDeath(person.death_year, person.death_month, person.death_day)
    : null;

  const onDelete = () => {
    Alert.alert("Xóa thành viên", `Xóa “${person.full_name}”?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePerson(config, person.id);
            await reload();
            router.replace("/");
          } catch (e) {
            Alert.alert(
              "Lỗi",
              e instanceof Error ? e.message : "Không xóa được",
            );
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: genderBg(person.gender) }]}>
          {person.avatar_url ? (
            <Image source={{ uri: person.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: genderColor(person.gender) }]}>
              {person.full_name.charAt(0)}
            </Text>
          )}
        </View>
        <Text style={styles.name}>{person.full_name}</Text>
        <Text style={styles.meta}>
          {genderLabel(person.gender)}
          {person.is_in_law ? " · Dâu/Rể" : ""}
          {person.is_deceased ? " · Đã mất" : ""}
        </Text>
        <View style={styles.badges}>
          {person.generation != null && (
            <Text style={styles.badge}>Đời {person.generation}</Text>
          )}
          {person.birth_order != null && (
            <Text style={styles.badge}>Con thứ {person.birth_order}</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Row
          label="Sinh"
          value={formatYmd(person.birth_year, person.birth_month, person.birth_day)}
        />
        {person.is_deceased && (
          <>
            <Row
              label="Mất (dương)"
              value={formatYmd(
                person.death_year,
                person.death_month,
                person.death_day,
              )}
            />
            {lunarDeath && <Row label="Mất (âm)" value={lunarDeath} />}
          </>
        )}
        {person.note ? <Row label="Ghi chú" value={person.note} /> : null}
      </View>

      {canEdit && (
        <View style={styles.actions}>
          <Pressable
            style={styles.edit}
            onPress={() => router.push(`/member/edit/${person.id}`)}
          >
            <Text style={styles.editText}>Sửa thông tin</Text>
          </Pressable>
          <Pressable style={styles.delete} onPress={onDelete}>
            <Text style={styles.deleteText}>Xóa</Text>
          </Pressable>
        </View>
      )}

      <RelationshipManager
        config={config}
        person={person}
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
        onChanged={reload}
        onOpenPerson={(pid) => router.push(`/member/${pid}`)}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: colors.textMuted },
  link: { color: colors.amberDark, fontWeight: "700" },
  body: { padding: 16, paddingBottom: 48 },
  hero: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 88, height: 88 },
  avatarText: { fontSize: 32, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 10 },
  meta: { color: colors.textMuted, marginTop: 4 },
  badges: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: {
    backgroundColor: colors.amberSoft,
    color: colors.amberDark,
    fontWeight: "800",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 11, fontWeight: "700", color: colors.textSoft },
  rowValue: { fontSize: 14, color: colors.text, marginTop: 2, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  edit: {
    flex: 1,
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  editText: { color: colors.white, fontWeight: "800" },
  delete: {
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    justifyContent: "center",
  },
  deleteText: { color: colors.danger, fontWeight: "800" },
});
