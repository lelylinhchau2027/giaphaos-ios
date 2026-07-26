import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  previewLineageUpdates,
  type ComputedUpdate,
} from "../src/domain/lineage";
import { useFamilyData } from "../src/context/FamilyDataContext";
import { applyLineageUpdates } from "../src/services/supabaseData";
import { colors } from "../src/theme";

export default function LineageScreen() {
  const { config, persons, relationships, reload } = useFamilyData();
  const [updates, setUpdates] = useState<ComputedUpdate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const compute = () => {
    setUpdates(previewLineageUpdates(persons, relationships));
  };

  const apply = async () => {
    if (!updates) return;
    const changed = updates.filter((u) => u.changed);
    if (changed.length === 0) {
      Alert.alert("Không đổi", "Không có bản ghi nào cần cập nhật.");
      return;
    }
    Alert.alert(
      "Áp dụng?",
      `Cập nhật generation/birth_order cho ${changed.length} thành viên.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Áp dụng",
          onPress: async () => {
            setBusy(true);
            try {
              await applyLineageUpdates(
                config,
                changed.map((u) => ({
                  id: u.id,
                  generation: u.new_generation,
                  birth_order: u.new_birth_order,
                })),
              );
              await reload();
              setUpdates(previewLineageUpdates(persons, relationships));
              Alert.alert("Xong", "Đã cập nhật thứ tự gia phả.");
            } catch (e) {
              Alert.alert("Lỗi", e instanceof Error ? e.message : "Thất bại");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const list = updates
    ? showAll
      ? updates
      : updates.filter((u) => u.changed)
    : [];

  return (
    <View style={styles.root}>
      <Text style={styles.lead}>
        Tính đời (generation) từ gốc huyết thống và thứ tự con theo năm sinh.
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={compute} disabled={busy}>
          <Text style={styles.btnText}>Tính toán</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, !updates && styles.btnDisabled]}
          onPress={apply}
          disabled={!updates || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Áp dụng</Text>
          )}
        </Pressable>
      </View>

      {updates && (
        <Pressable onPress={() => setShowAll((v) => !v)} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {showAll
              ? `Hiện ${updates.filter((u) => u.changed).length} thay đổi`
              : `Hiện tất cả (${updates.length})`}
          </Text>
        </Pressable>
      )}

      <FlatList
        data={list}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {updates
              ? "Không có thay đổi."
              : "Nhấn “Tính toán” để xem preview."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.changed && styles.cardChanged]}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.meta}>
              Đời: {item.old_generation ?? "—"} → {item.new_generation ?? "—"}
            </Text>
            <Text style={styles.meta}>
              Thứ tự: {item.old_birth_order ?? "—"} →{" "}
              {item.new_birth_order ?? "—"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  lead: {
    padding: 16,
    paddingBottom: 8,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  btn: {
    flex: 1,
    backgroundColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.white, fontWeight: "800" },
  toggle: { paddingHorizontal: 16, marginBottom: 8 },
  toggleText: { color: colors.amberDark, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardChanged: { borderColor: colors.amber, backgroundColor: colors.amberSoft },
  name: { fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
