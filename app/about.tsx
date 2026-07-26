import { ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "../src/theme";

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.title}>Gia Phả OS</Text>
      <Text style={styles.p}>
        Ứng dụng quản lý gia phả native cho iOS — danh sách, cây gia phả,
        mindmap, sự kiện (sinh nhật / giỗ âm), tra cứu danh xưng, thống kê, sao
        lưu dữ liệu.
      </Text>
      <Text style={styles.p}>
        Dữ liệu lưu trên Supabase. Widget màn hình chính và thông báo local
        đồng bộ khi mở app.
      </Text>
      <Text style={styles.p}>Phiên bản app 1.0.0 (build 2).</Text>
      <Text style={styles.p}>Phát triển bởi Nam Cậu</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 12 },
  p: { color: colors.textMuted, lineHeight: 22, marginBottom: 12, fontSize: 14 },
});
