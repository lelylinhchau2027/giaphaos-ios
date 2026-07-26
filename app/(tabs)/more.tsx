import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFamilyData } from "../../src/context/FamilyDataContext";
import { colors } from "../../src/theme";

const ITEMS: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  admin?: boolean;
}[] = [
  {
    href: "/kinship",
    icon: "🔗",
    title: "Tra cứu danh xưng",
    desc: "Hai người gọi nhau là gì",
  },
  {
    href: "/stats",
    icon: "📊",
    title: "Thống kê gia phả",
    desc: "Nam/nữ, đời, dâu rể…",
  },
  {
    href: "/lineage",
    icon: "🔢",
    title: "Thứ tự gia phả",
    desc: "Tính đời & thứ tự con",
    admin: true,
  },
  {
    href: "/data",
    icon: "💾",
    title: "Sao lưu & Phục hồi",
    desc: "JSON / GEDCOM / CSV",
    admin: true,
  },
  {
    href: "/about",
    icon: "ℹ️",
    title: "Giới thiệu",
    desc: "Thông tin ứng dụng",
  },
  {
    href: "/settings",
    icon: "⚙️",
    title: "Cài đặt",
    desc: "Supabase URL & key",
  },
];

export default function MoreScreen() {
  const { config, persons, isAdmin } = useFamilyData();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Thêm</Text>
      <Text style={styles.lead}>
        {config.siteName} · {persons.length} thành viên
      </Text>

      {ITEMS.filter((i) => !i.admin || isAdmin).map((item) => (
        <Pressable
          key={item.href}
          style={styles.card}
          onPress={() => router.push(item.href as never)}
        >
          <Text style={styles.icon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  lead: { color: colors.textMuted, marginBottom: 16, marginTop: 4 },
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
  icon: { fontSize: 22 },
  title: { fontWeight: "800", color: colors.text, fontSize: 15 },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chev: { fontSize: 22, color: colors.textSoft, fontWeight: "300" },
});
