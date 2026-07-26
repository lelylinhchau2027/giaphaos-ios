import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export type ViewMode = "list" | "tree" | "mindmap";

type Props = {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
};

const TABS: { id: ViewMode; label: string; icon: string }[] = [
  { id: "list", label: "Danh sách", icon: "☰" },
  { id: "tree", label: "Gia phả", icon: "🌳" },
  { id: "mindmap", label: "Mindmap", icon: "◎" },
];

export default function ViewToggle({ view, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {TABS.map((t) => {
        const active = view === t.id;
        return (
          <Pressable
            key={t.id}
            style={[styles.tab, active && styles.tabOn]}
            onPress={() => onChange(t.id)}
          >
            <Text style={styles.icon}>{t.icon}</Text>
            <Text style={[styles.label, active && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#e7e5e480",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabOn: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: { fontSize: 12 },
  label: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  labelOn: { color: colors.text },
});
