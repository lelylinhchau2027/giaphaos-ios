import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { exportPersonsCsv, exportRelationshipsCsv } from "../src/domain/csv";
import { exportToGedcom } from "../src/domain/gedcom";
import { useFamilyData } from "../src/context/FamilyDataContext";
import { importBackup } from "../src/services/supabaseData";
import type { PersonInsert } from "../src/types";
import { colors } from "../src/theme";

export default function DataScreen() {
  const { config, persons, relationships, reload } = useFamilyData();
  const [busy, setBusy] = useState(false);

  const writeAndShare = async (filename: string, content: string) => {
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) throw new Error("Không có thư mục file");
    const path = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(path, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "application/json" });
    } else {
      Alert.alert("Đã lưu", path);
    }
  };

  const exportJson = async () => {
    setBusy(true);
    try {
      const payload = {
        version: 2,
        timestamp: new Date().toISOString(),
        persons,
        relationships: relationships.map((r) => ({
          type: r.type,
          person_a: r.person_a,
          person_b: r.person_b,
        })),
      };
      await writeAndShare(
        `giaphaos-backup-${Date.now()}.json`,
        JSON.stringify(payload, null, 2),
      );
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Export thất bại");
    } finally {
      setBusy(false);
    }
  };

  const exportGedcom = async () => {
    setBusy(true);
    try {
      const text = exportToGedcom({ persons, relationships });
      await writeAndShare(`giaphaos-${Date.now()}.ged`, text);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Export thất bại");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const p = exportPersonsCsv(persons);
      const r = exportRelationshipsCsv(relationships);
      await writeAndShare(
        `giaphaos-persons-${Date.now()}.csv`,
        p + "\n\n# relationships\n" + r,
      );
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Export thất bại");
    } finally {
      setBusy(false);
    }
  };

  const importJson = async () => {
    Alert.alert(
      "Cảnh báo",
      "Import sẽ XÓA toàn bộ persons & relationships hiện tại rồi ghi đè. Tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tiếp tục",
          style: "destructive",
          onPress: async () => {
            try {
              const pick = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
              });
              if (pick.canceled || !pick.assets?.[0]) return;
              setBusy(true);
              const text = await FileSystem.readAsStringAsync(
                pick.assets[0].uri,
              );
              const payload = JSON.parse(text);
              const ps = (payload.persons || []) as (PersonInsert & {
                id?: string;
              })[];
              const rs = (payload.relationships || []) as {
                type: string;
                person_a: string;
                person_b: string;
              }[];
              if (!ps.length) throw new Error("File không có persons");
              await importBackup(config, ps, rs);
              await reload();
              Alert.alert("Xong", `Đã import ${ps.length} thành viên.`);
            } catch (e) {
              Alert.alert(
                "Lỗi",
                e instanceof Error ? e.message : "Import thất bại",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.lead}>
        Sao lưu / phục hồi dữ liệu gia phả. Import JSON sẽ ghi đè toàn bộ.
      </Text>
      <Text style={styles.meta}>
        Hiện có: {persons.length} thành viên · {relationships.length} quan hệ
      </Text>

      {busy && (
        <ActivityIndicator color={colors.amber} style={{ marginVertical: 12 }} />
      )}

      <Pressable style={styles.btn} onPress={exportJson} disabled={busy}>
        <Text style={styles.btnText}>Xuất JSON backup</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={exportGedcom} disabled={busy}>
        <Text style={styles.btnText}>Xuất GEDCOM</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={exportCsv} disabled={busy}>
        <Text style={styles.btnText}>Xuất CSV</Text>
      </Pressable>
      <Pressable style={styles.danger} onPress={importJson} disabled={busy}>
        <Text style={styles.dangerText}>Import JSON (ghi đè)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  lead: { color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  meta: { fontWeight: "700", color: colors.text, marginBottom: 16 },
  btn: {
    backgroundColor: colors.amber,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { color: colors.white, fontWeight: "800" },
  danger: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
  },
  dangerText: { color: colors.danger, fontWeight: "800" },
});
