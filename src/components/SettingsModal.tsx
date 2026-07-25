import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getBuiltInWebUrl,
  isValidHttpUrl,
  loadSettings,
  saveWebUrl,
} from "../services/settings";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Gọi sau khi lưu — parent reload WebView với URL mới */
  onSaved: (webUrl: string) => void;
};

export default function SettingsModal({ visible, onClose, onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [builtIn, setBuiltIn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setBuiltIn(getBuiltInWebUrl());
    loadSettings().then((s) => {
      setUrl(s.webUrl || getBuiltInWebUrl());
    });
  }, [visible]);

  const onSave = async () => {
    setError(null);
    if (!isValidHttpUrl(url)) {
      setError("URL không hợp lệ. Ví dụ: https://giapha-cua-ban.vercel.app");
      return;
    }
    setSaving(true);
    try {
      await saveWebUrl(url);
      const resolved = (await loadSettings()).webUrl || getBuiltInWebUrl();
      onSaved(resolved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    setSaving(true);
    try {
      await saveWebUrl(null);
      const built = getBuiltInWebUrl();
      setUrl(built);
      onSaved(built);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Cấu hình nguồn dữ liệu</Text>
          <Text style={styles.hint}>
            App iOS chỉ là WebView — giao diện & dữ liệu = đúng trang web bạn
            nhập bên dưới (cùng site bạn mở trên Safari/Chrome).
          </Text>

          <Text style={styles.label}>URL web Gia Phả</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://..."
            placeholderTextColor="#a8a29e"
          />

          <Text style={styles.meta}>
            URL lúc build IPA (mặc định):{"\n"}
            <Text style={styles.mono}>{builtIn}</Text>
          </Text>

          <Text style={styles.note}>
            • Nếu trên web bạn đã đăng nhập, hãy đăng nhập lại trong app (cookie
            Safari không chuyển sang app).{"\n"}
            • Muốn đổi URL vĩnh viễn cho IPA mới: khi Run workflow, điền{" "}
            <Text style={styles.mono}>web_url</Text> đúng domain của bạn.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            <Pressable style={styles.btnGhost} onPress={onClose} disabled={saving}>
              <Text style={styles.btnGhostText}>Đóng</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={onReset} disabled={saving}>
              <Text style={styles.btnGhostText}>Mặc định</Text>
            </Pressable>
            <Pressable style={styles.btnPrimary} onPress={onSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Lưu & tải lại</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,25,23,0.45)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fafaf9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1c1917",
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#57534e",
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#292524",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1c1917",
  },
  meta: {
    fontSize: 12,
    color: "#78716c",
    lineHeight: 18,
  },
  mono: {
    fontFamily: "Menlo",
    fontSize: 11,
    color: "#44403c",
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: "#78716c",
    backgroundColor: "#f5f5f4",
    padding: 12,
    borderRadius: 12,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnGhostText: {
    color: "#57534e",
    fontWeight: "700",
    fontSize: 14,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#1c1917",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
