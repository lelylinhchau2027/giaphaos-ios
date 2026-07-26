import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useFamilyData } from "../src/context/FamilyDataContext";
import { getBuiltInSupabase } from "../src/services/settings";
import { colors } from "../src/theme";

export default function SettingsRoute() {
  const { config, saveConfig } = useFamilyData();
  const builtIn = getBuiltInSupabase();
  const [url, setUrl] = useState(config.supabaseUrl);
  const [anon, setAnon] = useState(config.supabaseAnonKey);
  const [siteName, setSiteName] = useState(config.siteName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(config.supabaseUrl);
    setAnon(config.supabaseAnonKey);
    setSiteName(config.siteName);
  }, [config]);

  const save = async () => {
    setSaving(true);
    try {
      await saveConfig({
        supabaseUrl: url,
        supabaseAnonKey: anon,
        siteName,
      });
      Alert.alert("Đã lưu", "Dữ liệu sẽ tải lại từ Supabase.");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.lead}>
        App native — UI do IPA vẽ, dữ liệu chỉ từ Supabase.
      </Text>

      <Text style={styles.label}>Tên hiển thị</Text>
      <TextInput
        style={styles.input}
        value={siteName}
        onChangeText={setSiteName}
        placeholder="Gia Phả OS"
        placeholderTextColor={colors.textSoft}
      />

      <Text style={styles.label}>Supabase URL</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://xxxxx.supabase.co"
        placeholderTextColor={colors.textSoft}
      />

      <Text style={styles.label}>Supabase anon key</Text>
      <TextInput
        style={[styles.input, styles.multi]}
        value={anon}
        onChangeText={setAnon}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        placeholder="eyJ..."
        placeholderTextColor={colors.textSoft}
      />

      <Text style={styles.hint}>
        Build-in: {builtIn.supabaseUrl || "(trống)"}
      </Text>

      <Text style={styles.migration}>
        Sự kiện âm lịch / một lần: chạy migration{"\n"}
        docs/migrations/2026-07-25_custom_events_calendar.sql
      </Text>

      <Pressable style={styles.btn} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Lưu cấu hình</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  lead: { color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  label: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: colors.stone,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  multi: { minHeight: 88, textAlignVertical: "top" },
  hint: { marginTop: 12, fontSize: 11, color: colors.textSoft },
  migration: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.amberSoft,
    color: colors.amberDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  btn: {
    marginTop: 20,
    backgroundColor: colors.stone,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: colors.white, fontWeight: "800" },
});
