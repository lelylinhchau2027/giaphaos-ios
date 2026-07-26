import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import FamilyTreeView from "../../src/components/FamilyTreeView";
import MemberList from "../../src/components/MemberList";
import MindmapView from "../../src/components/MindmapView";
import ViewToggle, { type ViewMode } from "../../src/components/ViewToggle";
import { useFamilyData } from "../../src/context/FamilyDataContext";
import { colors } from "../../src/theme";

export default function DashboardScreen() {
  const {
    ready,
    config,
    persons,
    relationships,
    loading,
    error,
    canEdit,
    reload,
  } = useFamilyData();
  const [view, setView] = useState<ViewMode>("list");

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.site}>{config.siteName}</Text>
          <Text style={styles.sub}>
            {persons.length} thành viên · {relationships.length} quan hệ
          </Text>
        </View>
        {canEdit && (
          <Pressable
            style={styles.add}
            onPress={() => router.push("/member/new")}
          >
            <Text style={styles.addText}>+ Thêm</Text>
          </Pressable>
        )}
      </View>

      <ViewToggle view={view} onChange={setView} />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable onPress={() => router.push("/settings")}>
            <Text style={styles.link}>Cấu hình Supabase →</Text>
          </Pressable>
        </View>
      ) : null}

      {view === "list" && (
        <MemberList
          persons={persons}
          loading={loading}
          onRefresh={reload}
          canEdit={canEdit}
          onAdd={() => router.push("/member/new")}
          onPressPerson={(p) => router.push(`/member/${p.id}`)}
        />
      )}
      {view === "tree" && (
        <FamilyTreeView
          persons={persons}
          relationships={relationships}
          onPressPerson={(p) => router.push(`/member/${p.id}`)}
        />
      )}
      {view === "mindmap" && (
        <MindmapView
          persons={persons}
          relationships={relationships}
          onPressPerson={(p) => router.push(`/member/${p.id}`)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  site: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  add: {
    backgroundColor: colors.amber,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  errorBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
  },
  errorTitle: { fontWeight: "800", color: colors.danger },
  errorBody: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  link: { marginTop: 8, color: colors.amberDark, fontWeight: "700" },
});
