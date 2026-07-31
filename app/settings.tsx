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
import {
  getBuiltInSupabase,
  loadNotificationTime,
  saveNotificationTime,
  type NotificationTimePref,
} from "../src/services/settings";
import { colors } from "../src/theme";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function SettingsRoute() {
  const { config, saveConfig, syncNative, lastSync, persons, customEvents } =
    useFamilyData();
  const builtIn = getBuiltInSupabase();
  const [url, setUrl] = useState(config.supabaseUrl);
  const [anon, setAnon] = useState(config.supabaseAnonKey);
  const [siteName, setSiteName] = useState(config.siteName);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [notifTime, setNotifTime] = useState<NotificationTimePref>({
    hour: 21,
    minute: 0,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    setUrl(config.supabaseUrl);
    setAnon(config.supabaseAnonKey);
    setSiteName(config.siteName);
  }, [config]);

  useEffect(() => {
    loadNotificationTime().then(setNotifTime);
  }, []);

  const adjustHour = (delta: number) =>
    setNotifTime((t) => ({ ...t, hour: (t.hour + delta + 24) % 24 }));
  const adjustMinute = (delta: number) =>
    setNotifTime((t) => ({ ...t, minute: (t.minute + delta + 60) % 60 }));

  const saveNotifTime = async () => {
    setNotifSaving(true);
    try {
      const saved = await saveNotificationTime(notifTime);
      setNotifTime(saved);
      await syncNative();
      Alert.alert(
        "Đã lưu",
        `Thông báo hàng ngày sẽ nhắc lúc ${pad2(saved.hour)}:${pad2(saved.minute)}.`,
      );
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setNotifSaving(false);
    }
  };

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
              : "\n\n(Không có sự kiện trong ~45–365 ngày — kiểm tra ngày sinh / tab Lịch)"),
        );
      } else {
        Alert.alert(
          "Đồng bộ thất bại",
          r.error || "Kiểm tra Supabase URL/key trong Cài đặt.",
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
        placeholder="Gia Phả Họ Lê"
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
          Widget tự lấy dữ liệu từ Supabase, không cần mở app để đồng bộ —
          nhưng bấm nút này ngay sau khi đổi dữ liệu để widget cập nhật liền
          thay vì chờ WidgetKit tự refresh.
        </Text>

        <View style={styles.notifDivider} />

        <Text style={styles.syncTitle}>Giờ nhắc sự kiện sắp tới</Text>
        <Text style={styles.syncTip}>
          Nhắc mỗi ngày vào giờ này cho các sự kiện trong 7 ngày tới. Riêng
          đúng ngày sự kiện diễn ra sẽ luôn nhắc lúc 6:00 sáng.
        </Text>

        <View style={styles.timePickerRow}>
          <View style={styles.timeUnit}>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustHour(1)}
              hitSlop={8}
            >
              <Text style={styles.timeBtnText}>＋</Text>
            </Pressable>
            <Text style={styles.timeValue}>{pad2(notifTime.hour)}</Text>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustHour(-1)}
              hitSlop={8}
            >
              <Text style={styles.timeBtnText}>－</Text>
            </Pressable>
            <Text style={styles.timeUnitLabel}>Giờ</Text>
          </View>

          <Text style={styles.timeColon}>:</Text>

          <View style={styles.timeUnit}>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustMinute(5)}
              hitSlop={8}
            >
              <Text style={styles.timeBtnText}>＋</Text>
            </Pressable>
            <Text style={styles.timeValue}>{pad2(notifTime.minute)}</Text>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustMinute(-5)}
              hitSlop={8}
            >
              <Text style={styles.timeBtnText}>－</Text>
            </Pressable>
            <Text style={styles.timeUnitLabel}>Phút</Text>
          </View>

          <Pressable
            style={styles.btnSync}
            onPress={saveNotifTime}
            disabled={notifSaving}
          >
            {notifSaving ? (
              <ActivityIndicator color={colors.amberDark} />
            ) : (
              <Text style={styles.btnSyncText}>Lưu giờ nhắc</Text>
            )}
          </Pressable>
        </View>
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
  syncTip: {
    marginTop: 10,
    fontSize: 11,
    color: colors.textSoft,
    lineHeight: 16,
  },
  notifDivider: {
    marginTop: 14,
    marginBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  timePickerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  timeUnit: { alignItems: "center" },
  timeBtn: {
    width: 32,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  timeBtnText: { fontSize: 13, fontWeight: "800", color: colors.amberDark },
  timeValue: {
    marginVertical: 4,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    minWidth: 36,
    textAlign: "center",
  },
  timeUnitLabel: { fontSize: 10, color: colors.textSoft, marginTop: 2 },
  timeColon: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: -14,
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
