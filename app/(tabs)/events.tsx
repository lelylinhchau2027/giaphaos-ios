import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import EventFormModal from "../../src/components/EventFormModal";
import { useFamilyData } from "../../src/context/FamilyDataContext";
import {
  computeEventsForYear,
  daysUntilLabel,
  eventTypeLabel,
} from "../../src/services/events";
import {
  deleteCustomEvent,
  insertCustomEvent,
  updateCustomEvent,
} from "../../src/services/supabaseData";
import type { CustomEventInsert, FamilyEventItem } from "../../src/types";
import { colors } from "../../src/theme";

const MONTH_LABELS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

export default function EventsTab() {
  const {
    ready,
    config,
    persons,
    customEvents,
    loading,
    error,
    reload,
    setCustomEvents,
    syncNative,
  } = useFamilyData();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FamilyEventItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const all = useMemo(
    () => computeEventsForYear(persons, customEvents, year),
    [persons, customEvents, year],
  );

  const filtered = useMemo(
    () =>
      all.filter((e) => {
        const [, m] = e.date.split("-").map(Number);
        return m === month;
      }),
    [all, month],
  );

  const countsByMonth = useMemo(() => {
    const c = Array.from({ length: 13 }, () => 0);
    for (const e of all) {
      const [, m] = e.date.split("-").map(Number);
      if (m >= 1 && m <= 12) c[m] += 1;
    }
    return c;
  }, [all]);

  const onRefreshLocal = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const onAdd = async (row: CustomEventInsert) => {
    const created = await insertCustomEvent(config, row);
    setCustomEvents([...customEvents, created]);
    await syncNative();
  };

  const onEditSave = async (row: CustomEventInsert) => {
    if (!editing || editing.type !== "custom") return;
    try {
      const updated = await updateCustomEvent(config, editing.id, row);
      setCustomEvents(
        customEvents.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      );
      setEditing(null);
      await syncNative();
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không sửa được");
      throw e;
    }
  };

  const editingSource = editing
    ? customEvents.find((c) => c.id === editing.id)
    : null;

  const onDelete = (ev: FamilyEventItem) => {
    if (ev.type !== "custom") return;
    Alert.alert("Xóa sự kiện", `Xóa “${ev.personName}”?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCustomEvent(config, ev.id);
            setCustomEvents(customEvents.filter((c) => c.id !== ev.id));
            await syncNative();
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

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.h1}>Sự kiện</Text>
        <View style={styles.yearRow}>
          <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={10}>
            <Text style={styles.yearBtn}>‹</Text>
          </Pressable>
          <Text style={styles.year}>{year}</Text>
          <Pressable onPress={() => setYear((y) => y + 1)} hitSlop={10}>
            <Text style={styles.yearBtn}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Month grid 4×3 — not vertical pills */}
      <View style={styles.monthGrid}>
        {MONTH_LABELS.map((label, i) => {
          const m = i + 1;
          const active = month === m;
          const count = countsByMonth[m];
          return (
            <Pressable
              key={m}
              onPress={() => setMonth(m)}
              style={[styles.monthCell, active && styles.monthCellOn]}
            >
              <Text style={[styles.monthLabel, active && styles.monthLabelOn]}>
                {label}
              </Text>
              {count > 0 ? (
                <Text style={[styles.monthCount, active && styles.monthCountOn]}>
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(e) => `${e.id}-${e.date}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={onRefreshLocal}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Không có sự kiện tháng này.</Text>
        }
        ListHeaderComponent={
          <Text style={styles.listHint}>
            Sự kiện tùy chỉnh: bấm Sửa / Xóa. Sinh nhật & giỗ tự động từ thành
            viên.
          </Text>
        }
        renderItem={({ item }) => {
          const isToday = item.daysUntil === 0;
          const isSoon = item.daysUntil > 0 && item.daysUntil <= 7;
          const tone =
            item.type === "birthday"
              ? colors.blue
              : item.type === "death_anniversary"
                ? colors.rose
                : colors.emerald;
          return (
            <View style={[styles.card, isToday && styles.cardToday]}>
              <View style={[styles.icon, { backgroundColor: `${tone}18` }]}>
                <Text style={{ fontSize: 18 }}>
                  {item.type === "birthday"
                    ? "🎂"
                    : item.type === "death_anniversary"
                      ? "🕯️"
                      : "📅"}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.personName}
                </Text>
                <Text style={styles.cardMeta}>
                  {eventTypeLabel(item.type)} · {item.eventDateLabel}
                  {item.isRecurring === false ? " · 1 lần" : ""}
                </Text>
                {item.type === "custom" && (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => setEditing(item)}
                    >
                      <Text style={styles.actionEdit}>Sửa</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => onDelete(item)}
                    >
                      <Text style={styles.actionDel}>Xóa</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.badge,
                  isToday && styles.badgeToday,
                  isSoon && !isToday && styles.badgeSoon,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    (isToday || isSoon) && styles.badgeTextOn,
                  ]}
                >
                  {daysUntilLabel(item.daysUntil)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setAdding(true)}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <EventFormModal
        visible={adding}
        onClose={() => setAdding(false)}
        onSubmit={async (row) => {
          await onAdd(row);
          setAdding(false);
        }}
      />

      <EventFormModal
        visible={Boolean(editing && editingSource)}
        onClose={() => setEditing(null)}
        initial={
          editingSource
            ? {
                title: editingSource.title,
                event_day: editingSource.event_day,
                event_month: editingSource.event_month,
                event_year: editingSource.event_year,
                calendar_type:
                  editingSource.calendar_type === "lunar" ? "lunar" : "solar",
                is_recurring: editingSource.is_recurring !== false,
              }
            : undefined
        }
        onSubmit={onEditSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  yearBtn: { fontSize: 28, color: colors.amberDark, fontWeight: "300" },
  year: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    minWidth: 56,
    textAlign: "center",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  monthCell: {
    width: "23%",
    flexGrow: 1,
    minWidth: "22%",
    maxWidth: "24.5%",
    aspectRatio: 1.6,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  monthCellOn: {
    backgroundColor: colors.amber,
    borderColor: colors.amberDark,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  monthLabelOn: { color: colors.white },
  monthCount: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSoft,
    marginTop: 2,
  },
  monthCountOn: { color: colors.amberSoft },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  listHint: {
    fontSize: 11,
    color: colors.textSoft,
    marginBottom: 8,
    lineHeight: 16,
  },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  error: { color: colors.danger, paddingHorizontal: 16, marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardToday: { borderColor: colors.amber, backgroundColor: colors.amberSoft },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontWeight: "700", color: colors.text, fontSize: 14 },
  cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionBtn: { paddingVertical: 2 },
  actionEdit: { color: colors.amberDark, fontWeight: "800", fontSize: 12 },
  actionDel: { color: colors.danger, fontWeight: "800", fontSize: 12 },
  badge: {
    backgroundColor: colors.stone100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  badgeToday: { backgroundColor: colors.amber },
  badgeSoon: { backgroundColor: colors.amberSoft },
  badgeText: { fontSize: 11, fontWeight: "800", color: colors.textMuted },
  badgeTextOn: { color: colors.white },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.amber,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "300",
    marginTop: -2,
  },
});
