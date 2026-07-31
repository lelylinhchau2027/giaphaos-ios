import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CalendarType, CustomEventInsert } from "../types";
import { colors } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (row: CustomEventInsert) => Promise<void>;
  initial?: Partial<CustomEventInsert> | null;
};

export default function EventFormModal({
  visible,
  onClose,
  onSubmit,
  initial,
}: Props) {
  const now = new Date();
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(String(now.getDate()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
  const [isRecurring, setIsRecurring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(initial?.title || "");
    setDay(String(initial?.event_day ?? new Date().getDate()));
    setMonth(String(initial?.event_month ?? new Date().getMonth() + 1));
    setYear(String(initial?.event_year ?? new Date().getFullYear()));
    setCalendarType(initial?.calendar_type || "solar");
    setIsRecurring(initial?.is_recurring !== false);
    setError(null);
  };

  useEffect(() => {
    if (visible) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial?.title, initial?.event_day, initial?.event_month]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError(null);
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!title.trim()) {
      setError("Nhập tên sự kiện");
      return;
    }
    if (!d || d < 1 || d > 31 || !m || m < 1 || m > 12) {
      setError("Ngày/tháng không hợp lệ");
      return;
    }
    if (!isRecurring && (!y || y < 1900 || y > 2200)) {
      setError("Sự kiện một lần cần năm hợp lệ");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        event_day: d,
        event_month: m,
        event_year: isRecurring ? (y || null) : y,
        calendar_type: calendarType,
        is_recurring: isRecurring,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Thêm sự kiện</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.label}>Tên sự kiện *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Giỗ tổ họ, Lễ mừng thọ…"
              placeholderTextColor={colors.textSoft}
            />

            <Text style={styles.label}>Hệ lịch</Text>
            <View style={styles.row}>
              {(
                [
                  ["solar", "Dương lịch"],
                  ["lunar", "Âm lịch"],
                ] as const
              ).map(([v, label]) => (
                <Pressable
                  key={v}
                  style={[styles.chip, calendarType === v && styles.chipOn]}
                  onPress={() => setCalendarType(v)}
                >
                  <Text style={[styles.chipText, calendarType === v && styles.chipTextOn]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Lặp lại</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, isRecurring && styles.chipAmber]}
                onPress={() => setIsRecurring(true)}
              >
                <Text style={[styles.chipText, isRecurring && styles.chipTextOn]}>
                  Hằng năm
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, !isRecurring && styles.chipAmber]}
                onPress={() => setIsRecurring(false)}
              >
                <Text style={[styles.chipText, !isRecurring && styles.chipTextOn]}>
                  Một lần
                </Text>
              </Pressable>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.label}>Ngày *</Text>
                <TextInput
                  style={styles.input}
                  value={day}
                  onChangeText={setDay}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.label}>Tháng *</Text>
                <TextInput
                  style={styles.input}
                  value={month}
                  onChangeText={setMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              {!isRecurring && (
                <View style={styles.dateCol}>
                  <Text style={styles.label}>Năm *</Text>
                  <TextInput
                    style={styles.input}
                    value={year}
                    onChangeText={setYear}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              )}
            </View>

            <Text style={styles.hint}>
              {isRecurring
                ? calendarType === "lunar"
                  ? "Lặp mỗi năm theo ngày âm lịch (tự quy đổi dương khi hiển thị)."
                  : "Lặp mỗi năm theo ngày dương lịch."
                : calendarType === "lunar"
                  ? "Chỉ một lần — ngày/tháng/năm âm lịch."
                  : "Chỉ một lần — ngày/tháng/năm dương lịch."}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={styles.btnGhost} onPress={handleClose} disabled={saving}>
                <Text style={styles.btnGhostText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Lưu</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,25,23,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  close: { fontSize: 18, color: colors.textMuted, padding: 4 },
  body: { paddingHorizontal: 20, paddingBottom: 28, gap: 6 },
  label: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: colors.stone,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  chipOn: { backgroundColor: colors.stone, borderColor: colors.stone },
  chipAmber: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipText: { fontWeight: "700", color: colors.textMuted, fontSize: 13 },
  chipTextOn: { color: colors.white },
  dateRow: { flexDirection: "row", gap: 8 },
  dateCol: { flex: 1 },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  error: { color: colors.rose, fontWeight: "600", marginTop: 8 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  btnGhost: { paddingHorizontal: 16, paddingVertical: 12 },
  btnGhostText: { fontWeight: "700", color: colors.textMuted },
  btnPrimary: {
    backgroundColor: colors.amber,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 96,
    alignItems: "center",
  },
  btnPrimaryText: { color: colors.white, fontWeight: "800" },
});
