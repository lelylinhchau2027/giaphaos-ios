import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { computeFamilyStats } from "../src/domain/stats";
import { useFamilyData } from "../src/context/FamilyDataContext";
import { colors } from "../src/theme";

export default function StatsScreen() {
  const { persons, relationships } = useFamilyData();
  const stats = useMemo(
    () => computeFamilyStats(persons, relationships),
    [persons, relationships],
  );

  const maxGen = Math.max(1, ...stats.byGeneration.map((g) => g.count));

  const cards = [
    { label: "Tổng thành viên", value: stats.total, color: colors.amber },
    { label: "Nam", value: stats.male, color: colors.sky },
    { label: "Nữ", value: stats.female, color: colors.rose },
    { label: "Con dâu", value: stats.inLawFemale, color: colors.rose },
    { label: "Con rể", value: stats.inLawMale, color: colors.sky },
    { label: "Đã mất", value: stats.deceased, color: colors.textMuted },
    { label: "Con trưởng", value: stats.firstBorn, color: colors.amberDark },
    { label: "Đã kết hôn", value: stats.married, color: colors.emerald },
    { label: "Chưa kết hôn", value: stats.unmarried, color: colors.blue },
  ];

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.grid}>
        {cards.map((c) => {
          const pct =
            stats.total > 0 ? Math.round((c.value / stats.total) * 100) : 0;
          return (
            <View key={c.label} style={styles.card}>
              <Text style={[styles.value, { color: c.color }]}>{c.value}</Text>
              <Text style={styles.label}>{c.label}</Text>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${pct}%`, backgroundColor: c.color },
                  ]}
                />
              </View>
              <Text style={styles.pct}>{pct}%</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.section}>Theo đời</Text>
      {stats.byGeneration.length === 0 ? (
        <Text style={styles.empty}>
          Chưa có generation. Chạy “Thứ tự gia phả” để tính.
        </Text>
      ) : (
        stats.byGeneration.map((g) => (
          <View key={g.gen} style={styles.genRow}>
            <Text style={styles.genLabel}>Đời {g.gen}</Text>
            <View style={styles.genBarBg}>
              <View
                style={[
                  styles.genBarFill,
                  { width: `${(g.count / maxGen) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.genCount}>{g.count}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47%",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  value: { fontSize: 28, fontWeight: "800" },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  barBg: {
    height: 4,
    backgroundColor: colors.stone100,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },
  pct: { fontSize: 10, color: colors.textSoft, marginTop: 4 },
  section: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  empty: { color: colors.textMuted },
  genRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  genLabel: { width: 52, fontSize: 12, fontWeight: "700", color: colors.textMuted },
  genBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.stone100,
    borderRadius: 4,
    overflow: "hidden",
  },
  genBarFill: { height: 8, backgroundColor: colors.amberMid, borderRadius: 4 },
  genCount: { width: 28, textAlign: "right", fontWeight: "800", color: colors.text },
});
