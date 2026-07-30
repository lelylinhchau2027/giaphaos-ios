import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Gender, Person } from "../types";
import {
  fetchPrivateDetails,
  uploadAvatar,
  upsertPerson,
  upsertPrivateDetails,
} from "../services/supabaseData";
import type { RuntimeConfig } from "../services/settings";
import { colors } from "../theme";

type Props = {
  config: RuntimeConfig;
  initial?: Person | null;
  isAdmin?: boolean;
  onSuccess: (id: string) => void;
  onCancel: () => void;
};

/**
 * Module-scope on purpose: defining this inside MemberForm's render would
 * give it a new function identity every keystroke, so React would remount
 * (not just re-render) every TextInput on each change — dropping focus and
 * dismissing the keyboard after a single character.
 */
function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad" | "url";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export default function MemberForm({
  config,
  initial,
  isAdmin = true,
  onSuccess,
  onCancel,
}: Props) {
  const editing = Boolean(initial?.id);
  const [fullName, setFullName] = useState(initial?.full_name || "");
  const [gender, setGender] = useState<Gender>(initial?.gender || "male");
  const [birthYear, setBirthYear] = useState(String(initial?.birth_year ?? ""));
  const [birthMonth, setBirthMonth] = useState(String(initial?.birth_month ?? ""));
  const [birthDay, setBirthDay] = useState(String(initial?.birth_day ?? ""));
  const [isDeceased, setIsDeceased] = useState(initial?.is_deceased || false);
  const [deathYear, setDeathYear] = useState(String(initial?.death_year ?? ""));
  const [deathMonth, setDeathMonth] = useState(String(initial?.death_month ?? ""));
  const [deathDay, setDeathDay] = useState(String(initial?.death_day ?? ""));
  const [isInLaw, setIsInLaw] = useState(initial?.is_in_law || false);
  const [birthOrder, setBirthOrder] = useState(String(initial?.birth_order ?? ""));
  const [note, setNote] = useState(initial?.note || "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url || "");
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [phone, setPhone] = useState(initial?.phone_number || "");
  const [occupation, setOccupation] = useState(initial?.occupation || "");
  const [residence, setResidence] = useState(initial?.current_residence || "");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial?.id) return;
    fetchPrivateDetails(config, initial.id).then((d) => {
      if (!d) return;
      setPhone(d.phone_number || "");
      setOccupation(d.occupation || "");
      setResidence(d.current_residence || "");
      setFacebookUrl(d.facebook_url || "");
    });
  }, [config, initial?.id]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần quyền", "Cho phép truy cập ảnh để chọn avatar.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setLocalAvatar(res.assets[0].uri);
    }
  };

  const num = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const save = async () => {
    if (!fullName.trim()) {
      Alert.alert("Thiếu tên", "Nhập họ và tên.");
      return;
    }
    setSaving(true);
    try {
      let finalAvatar = avatarUrl || null;
      if (localAvatar) {
        finalAvatar = await uploadAvatar(config, localAvatar);
      }

      const person = await upsertPerson(
        config,
        {
          full_name: fullName.trim(),
          gender,
          birth_year: num(birthYear),
          birth_month: num(birthMonth),
          birth_day: num(birthDay),
          death_year: isDeceased ? num(deathYear) : null,
          death_month: isDeceased ? num(deathMonth) : null,
          death_day: isDeceased ? num(deathDay) : null,
          is_deceased: isDeceased,
          is_in_law: isInLaw,
          birth_order: num(birthOrder),
          avatar_url: finalAvatar,
          note: note.trim() || null,
        },
        initial?.id,
      );

      if (isAdmin) {
        await upsertPrivateDetails(config, {
          person_id: person.id,
          phone_number: phone.trim() || null,
          occupation: occupation.trim() || null,
          current_residence: residence.trim() || null,
          facebook_url: facebookUrl.trim() || null,
        });
      }

      onSuccess(person.id);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.title}>{editing ? "Sửa thành viên" : "Thêm thành viên"}</Text>

      <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
        {localAvatar || avatarUrl ? (
          <Image
            source={{ uri: localAvatar || avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarHint}>Chọn ảnh</Text>
          </View>
        )}
      </Pressable>

      <Field label="Họ và tên *" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" />

      <Text style={styles.label}>Giới tính</Text>
      <View style={styles.row}>
        {(["male", "female", "other"] as Gender[]).map((g) => (
          <Pressable
            key={g}
            style={[styles.chip, gender === g && styles.chipOn]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextOn]}>
              {g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Ngày sinh (dương)</Text>
      <View style={styles.row3}>
        <Field label="Ngày" value={birthDay} onChange={setBirthDay} keyboardType="number-pad" />
        <Field label="Tháng" value={birthMonth} onChange={setBirthMonth} keyboardType="number-pad" />
        <Field label="Năm" value={birthYear} onChange={setBirthYear} keyboardType="number-pad" />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Đã mất</Text>
        <Switch value={isDeceased} onValueChange={setIsDeceased} trackColor={{ true: colors.amber }} />
      </View>

      {isDeceased && (
        <>
          <Text style={styles.section}>Ngày mất (dương — dùng cho giỗ âm)</Text>
          <View style={styles.row3}>
            <Field label="Ngày" value={deathDay} onChange={setDeathDay} keyboardType="number-pad" />
            <Field label="Tháng" value={deathMonth} onChange={setDeathMonth} keyboardType="number-pad" />
            <Field label="Năm" value={deathYear} onChange={setDeathYear} keyboardType="number-pad" />
          </View>
        </>
      )}

      <View style={styles.switchRow}>
        <Text style={styles.label}>Là dâu / rể (in-law)</Text>
        <Switch value={isInLaw} onValueChange={setIsInLaw} trackColor={{ true: colors.amber }} />
      </View>

      <Field
        label="Thứ tự con (birth order)"
        value={birthOrder}
        onChange={setBirthOrder}
        keyboardType="number-pad"
        placeholder="1 = con trưởng"
      />
      <Field label="Ghi chú" value={note} onChange={setNote} multiline placeholder="..." />

      {isAdmin && (
        <>
          <Text style={styles.section}>Thông tin riêng</Text>
          <Field label="Điện thoại" value={phone} onChange={setPhone} keyboardType="phone-pad" />
          <Field
            label="Link Facebook"
            value={facebookUrl}
            onChange={setFacebookUrl}
            placeholder="https://facebook.com/..."
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field label="Nghề nghiệp" value={occupation} onChange={setOccupation} />
          <Field label="Nơi ở" value={residence} onChange={setResidence} />
        </>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.cancel} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>Hủy</Text>
        </Pressable>
        <Pressable style={styles.save} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Lưu</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 16 },
  avatarWrap: { alignSelf: "center", marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.amberSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.amber,
  },
  avatarHint: { color: colors.amberDark, fontWeight: "700", fontSize: 12 },
  field: { marginBottom: 10, flex: 1 },
  label: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  row3: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  chipText: { fontWeight: "700", color: colors.textMuted, fontSize: 13 },
  chipTextOn: { color: colors.amberDark },
  section: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: colors.stone,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  cancelText: { fontWeight: "700", color: colors.textMuted },
  save: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.amber,
    alignItems: "center",
  },
  saveText: { fontWeight: "800", color: colors.white },
});
