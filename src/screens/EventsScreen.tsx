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
import EventFormModal from "../components/EventFormModal";
import {
  computeEventsForYear,
  daysUntilLabel,
  eventTypeLabel,
} from "../services/events";
import type { RuntimeConfig } from "../services/settings";
import {
  deleteCustomEvent,
  insertCustomEvent,
} from "../services/supabaseData";
import type {
  CustomEventInsert,
  CustomEventRow,
  FamilyEventItem,
  PersonRow,
} from "../types";
import { colors } from "../theme";

type Props = {
  config: RuntimeConfig;
  persons: PersonRow[];
  customEvents: CustomEventRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onEventsChanged: (events: CustomEventRow[]) => void;
};

export default function EventsScreen({
  config,
  persons,
  customEvents,
  loading,
  error,
  onRefresh,
  onEventsChanged,
}: Props) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [adding, setAdding] = useState(false);
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

  const onRefreshLocal = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const onAdd = async (row: CustomEventInsert) => {
    const created = await insertCustomEvent(config, row);
    onEventsChanged([...customEvents, created]);
  };

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
            onEventsChanged(customEvents.filter((c) => c.id !== ev.id));
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

  const renderItem = ({ item, index }: { item: FamilyEventItem; index: number }) => {
    const isToday = item.daysUntil === 0;
    const isSoon = item.daysUntil > 0 && item.daysUntil <= 7;
    const isPast = item.daysUntil < 0;
    const tone =
      item.type === "birthday"
        ? colors.blue
        : item.type === "death_anniversary"
          ? colors.rose
          : colors.emerald;

    return (
      <Pressable
        onLongPress={() => item.type === "custom" && onDelete(item)}
        style={[
          styles.card,
          isToday && styles.cardToday,
          isPast && styles.cardPast,
        ]}
      >
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
      </Pressable>
    );
  };

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

      <FlatList
        horizontal
        data={Array.from({ length: 12 }, (_, i) => i + 1)}
        keyExtractor={(m) => String(m)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.months}
        renderItem={({ item: m }) => (
          <Pressable
            onPress={() => setMonth(m)}
            style={[styles.monthChip, month === m && styles.monthChipOn]}
          >
            <Text style={[styles.monthText, month === m && styles.monthTextOn]}>
              Thg {m}
            </Text>
          </Pressable>
        )}
      />

      {error ? (
        <View style={styles.centerBox}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.errorHint}>
            Kiểm tra Supabase URL/key ở tab Cài đặt. Nếu thiếu cột lịch âm, chạy
            file SQL trong docs/migrations.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(e) => `${e.id}-${e.date}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefreshLocal} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.amber} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Không có sự kiện tháng {month}</Text>
              <Text style={styles.emptyBody}>
                Thêm sự kiện bằng nút + (hỗ trợ âm lịch & một lần / hằng năm)
              </Text>
            </View>
          )
        }
        renderItem={renderItem}
      />

      <Pressable style={styles.fab} onPress={() => setAdding(true)}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <EventFormModal
        visible={adding}
        onClose={() => setAdding(false)}
        onSubmit={onAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  yearBtn: { fontSize: 28, color: colors.textMuted, lineHeight: 30 },
  year: { fontSize: 16, fontWeight: "700", color: colors.stone, minWidth: 48, textAlign: "center" },
  months: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  monthChipOn: { backgroundColor: colors.stone, borderColor: colors.stone },
  monthText: { fontWeight: "700", color: colors.textMuted, fontSize: 13 },
  monthTextOn: { color: colors.white },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardToday: { backgroundColor: colors.amberSoft, borderColor: "#fcd34d" },
  cardPast: { opacity: 0.55 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#f5f5f4",
  },
  badgeToday: { backgroundColor: colors.amber },
  badgeSoon: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "800", color: colors.textMuted },
  badgeTextOn: { color: colors.white },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.amber,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: "600", marginTop: -2 },
  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontWeight: "700", color: colors.textMuted, fontSize: 15 },
  emptyBody: {
    textAlign: "center",
    color: colors.textSoft,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  centerBox: { paddingHorizontal: 20, paddingVertical: 8 },
  error: { color: colors.rose, fontWeight: "700" },
  errorHint: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
