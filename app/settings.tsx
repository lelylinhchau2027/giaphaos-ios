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
import { useFamilyData } from "../src/context/FamilyDataContext";
import { getBuiltInSupabase } from "../src/services/settings";
import { APP_GROUP } from "../src/config";
import { colors } from "../src/theme";
import { getWidgetLogs } from "../src/utils/widgetNative";

export default function SettingsRoute() {
  const { config, saveConfig, syncNative, lastSync, persons, customEvents } =
    useFamilyData();
  const builtIn = getBuiltInSupabase();
  const [url, setUrl] = useState(config.supabaseUrl);
  const [anon, setAnon] = useState(config.supabaseAnonKey);
  const [siteName, setSiteName] = useState(config.siteName);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const onViewWidgetLogs = () => {
    getWidgetLogs((logs) => {
      Alert.alert(
        "Log widget (debug)",
        logs && logs.trim().length > 0
          ? logs
          : "(Chưa có log — bấm 'Đồng bộ widget ngay' trước)",
      );
    });
  };

  const onSyncWidget = async () => {
    setSyncing(true);
    try {
      const r = await syncNative();
      if (r.ok) {
        Alert.alert(
          "Đã đồng bộ widget",
          `${r.memberCount} thành viên · ${r.eventCount} sự kiện sắp tới` +
            (r.eventsPreview?.length
              ? `\n\nGần nhất: ${r.eventsPreview.join(", ")}`
              : "\n\n(Không có sự kiện trong ~45–365 ngày — kiểm tra ngày sinh / tab Lịch)") +
            `\n\nApp Group: ${APP_GROUP}\nGỡ widget cũ rồi thêm lại nếu chưa hiện.`,
        );
      } else {
        Alert.alert(
          "Đồng bộ thất bại",
          r.error ||
            "Kiểm tra Supabase URL/key. Nếu dùng ESign, cert cần hỗ trợ App Group.",
        );
      }
    } finally {
      setSyncing(false);
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

      <View style={styles.syncBox}>
        <Text style={styles.syncTitle}>Widget & thông báo</Text>
        <Text style={styles.syncBody}>
          App: {persons.length} TV · {customEvents.length} sự kiện tùy chỉnh
          {"\n"}
          Lần sync:{" "}
          {lastSync
            ? lastSync.ok
              ? `OK · ${lastSync.eventCount} sự kiện`
              : `Lỗi: ${lastSync.error}`
            : "chưa"}
          {"\n"}
          App Group: {APP_GROUP}
        </Text>
        <Pressable
          style={styles.btnSync}
          onPress={onSyncWidget}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color={colors.amberDark} />
          ) : (
            <Text style={styles.btnSyncText}>Đồng bộ widget ngay</Text>
          )}
        </Pressable>
        <Text style={styles.syncTip}>
          Sau khi sync: gỡ widget khỏi màn hình chính → thêm lại widget “Gia
          Phả”. ESign phải giữ App Group {APP_GROUP}.
        </Text>
        <Pressable style={styles.btnLogs} onPress={onViewWidgetLogs}>
          <Text style={styles.btnLogsText}>Xem log widget (debug)</Text>
        </Pressable>
      </View>

      <Text style={styles.migration}>
        Sự kiện âm lịch / một lần: chạy migration SQL trên Supabase nếu chưa.
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
  syncBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncTitle: { fontWeight: "800", color: colors.text, fontSize: 15 },
  syncBody: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  btnSync: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.amberSoft,
  },
  btnSyncText: { color: colors.amberDark, fontWeight: "800" },
  btnLogs: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  btnLogsText: {
    color: colors.textSoft,
    fontWeight: "700",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  syncTip: {
    marginTop: 10,
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
  btn: {
    marginTop: 20,
    backgroundColor: colors.stone,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: colors.white, fontWeight: "800" },
});
