import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getBuiltInSupabase,
  loadRuntimeConfig,
  saveRuntimeConfig,
  type RuntimeConfig,
} from "../services/settings";
import { colors } from "../theme";

type Props = {
  config: RuntimeConfig;
  onSaved: (cfg: RuntimeConfig) => void;
};

export default function SettingsScreen({ config, onSaved }: Props) {
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
      const next = await saveRuntimeConfig({
        supabaseUrl: url,
        supabaseAnonKey: anon,
        siteName,
      });
      onSaved(next);
      Alert.alert("Đã lưu", "Dữ liệu sẽ tải lại từ Supabase mới.");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const resetBuiltIn = async () => {
    const next = await saveRuntimeConfig({
      supabaseUrl: builtIn.supabaseUrl,
      supabaseAnonKey: builtIn.supabaseAnonKey,
      siteName: builtIn.siteName,
    });
    setUrl(next.supabaseUrl);
    setAnon(next.supabaseAnonKey);
    setSiteName(next.siteName);
    onSaved(next);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Cài đặt</Text>
      <Text style={styles.lead}>
        App native — giao diện do IPA vẽ, dữ liệu đọc/ghi Supabase (không phụ
        thuộc WebView).
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
        style={[styles.input, styles.inputMulti]}
        value={anon}
        onChangeText={setAnon}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        placeholder="eyJhbGciOi..."
        placeholderTextColor={colors.textSoft}
      />

      <Text style={styles.hint}>
        Build-in (lúc đóng IPA):{"\n"}
        {builtIn.supabaseUrl || "(trống — điền khi Run workflow)"}
      </Text>

      <Text style={styles.migration}>
        Sự kiện âm lịch / một lần cần chạy migration SQL:{"\n"}
        docs/migrations/2026-07-25_custom_events_calendar.sql{"\n"}
        trên Supabase → SQL Editor.
      </Text>

      <Pressable style={styles.btnPrimary} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnPrimaryText}>Lưu & dùng cấu hình này</Text>
        )}
      </Pressable>

      <Pressable style={styles.btnGhost} onPress={resetBuiltIn}>
        <Text style={styles.btnGhostText}>Khôi phục giá trị lúc build</Text>
      </Pressable>

      <Pressable
        style={styles.btnGhost}
        onPress={async () => {
          await loadRuntimeConfig();
          Alert.alert("OK", "Config đã có trong bộ nhớ máy.");
        }}
      >
        <Text style={styles.btnGhostText}>Kiểm tra lưu trữ local</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: "800", color: colors.text },
  lead: {
    marginTop: 8,
    marginBottom: 12,
    color: colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
  },
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
  inputMulti: { minHeight: 88, textAlignVertical: "top" },
  hint: {
    marginTop: 12,
    fontSize: 11,
    color: colors.textSoft,
    lineHeight: 16,
  },
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
  btnPrimary: {
    marginTop: 20,
    backgroundColor: colors.stone,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimaryText: { color: colors.white, fontWeight: "800" },
  btnGhost: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnGhostText: { color: colors.textMuted, fontWeight: "700" },
});
