import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  computeUpcomingEvents,
  daysUntilLabel,
  eventTypeLabel,
} from "../services/events";
import type { CustomEventRow, PersonRow } from "../types";
import { colors } from "../theme";

type Props = {
  siteName: string;
  persons: PersonRow[];
  customEvents: CustomEventRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onOpenEvents: () => void;
  onOpenSettings: () => void;
};

export default function HomeScreen({
  siteName,
  persons,
  customEvents,
  loading,
  error,
  onRefresh,
  onOpenEvents,
  onOpenSettings,
}: Props) {
  const upcoming = useMemo(
    () => computeUpcomingEvents(persons, customEvents, 30),
    [persons, customEvents],
  );

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🌳</Text>
        <Text style={styles.siteName}>{siteName}</Text>
        <Text style={styles.sub}>
          {persons.length} thành viên · {upcoming.length} sự kiện 30 ngày tới
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.heroBtn} onPress={onOpenEvents}>
            <Text style={styles.heroBtnText}>Xem lịch</Text>
          </Pressable>
          <Pressable style={styles.heroBtnGhost} onPress={onOpenSettings}>
            <Text style={styles.heroBtnGhostText}>Cài đặt</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>Sắp tới</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable onPress={onOpenSettings}>
            <Text style={styles.link}>Cấu hình Supabase →</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={upcoming}
        keyExtractor={(e) => `${e.id}-${e.date}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.amber} style={{ marginTop: 24 }} />
          ) : (
            <Text style={styles.empty}>
              Không có sự kiện trong 30 ngày tới. Kéo để làm mới hoặc thêm sự
              kiện ở tab Lịch.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>
              {item.type === "birthday"
                ? "🎂"
                : item.type === "death_anniversary"
                  ? "🕯️"
                  : "📅"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.personName}</Text>
              <Text style={styles.cardMeta}>
                {eventTypeLabel(item.type)} · {item.eventDateLabel}
                {item.isRecurring === false ? " · 1 lần" : ""}
              </Text>
            </View>
            <Text
              style={[
                styles.days,
                item.daysUntil === 0 && styles.daysToday,
                item.daysUntil > 0 && item.daysUntil <= 7 && styles.daysSoon,
              ]}
            >
              {daysUntilLabel(item.daysUntil)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.stone,
  },
  emoji: { fontSize: 28 },
  siteName: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
  },
  sub: { marginTop: 6, color: "#a8a29e", fontSize: 13 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  heroBtn: {
    backgroundColor: colors.amber,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroBtnText: { color: colors.white, fontWeight: "800" },
  heroBtnGhost: {
    borderWidth: 1,
    borderColor: "#57534e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroBtnGhostText: { color: "#e7e5e4", fontWeight: "700" },
  section: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardEmoji: { fontSize: 22 },
  cardTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  days: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: "#f5f5f4",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
  },
  daysToday: { backgroundColor: colors.amber, color: colors.white },
  daysSoon: { backgroundColor: "#fee2e2", color: colors.rose },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    padding: 24,
    lineHeight: 20,
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.roseSoft,
  },
  errorTitle: { fontWeight: "800", color: colors.rose },
  errorBody: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  link: { color: colors.amberDark, fontWeight: "700", marginTop: 8 },
});
