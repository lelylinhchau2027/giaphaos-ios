import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  computeKinship,
  type PersonNode,
} from "../src/domain/kinshipHelpers";
import { useFamilyData } from "../src/context/FamilyDataContext";
import type { Person, Relationship } from "../src/types";
import { colors } from "../src/theme";

function toNode(p: Person): PersonNode {
  return {
    id: p.id,
    full_name: p.full_name,
    gender: (p.gender as PersonNode["gender"]) || "other",
    birth_year: p.birth_year,
    birth_order: p.birth_order,
    generation: p.generation,
    is_in_law: p.is_in_law,
  };
}

export default function KinshipScreen() {
  const { persons, relationships } = useFamilyData();
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [picking, setPicking] = useState<"a" | "b" | null>(null);
  const [q, setQ] = useState("");

  const personA = persons.find((p) => p.id === aId) || null;
  const personB = persons.find((p) => p.id === bId) || null;

  const result = useMemo(() => {
    if (!personA || !personB || personA.id === personB.id) return null;
    const nodes = persons.map(toNode);
    const edges = relationships.map((r: Relationship) => ({
      type: r.type,
      person_a: r.person_a,
      person_b: r.person_b,
    }));
    return computeKinship(toNode(personA), toNode(personB), nodes, edges);
  }, [personA, personB, persons, relationships]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return persons.slice(0, 40);
    return persons
      .filter((p) => p.full_name.toLowerCase().includes(term))
      .slice(0, 40);
  }, [persons, q]);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.lead}>
        Chọn hai người để xem danh xưng tiếng Việt trong gia tộc.
      </Text>

      <Picker
        label="Người A"
        person={personA}
        onPress={() => {
          setPicking("a");
          setQ("");
        }}
      />
      <Picker
        label="Người B"
        person={personB}
        onPress={() => {
          setPicking("b");
          setQ("");
        }}
      />

      {picking && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            Chọn {picking === "a" ? "Người A" : "Người B"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Tìm tên..."
            placeholderTextColor={colors.textSoft}
            value={q}
            onChangeText={setQ}
          />
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 260 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  if (picking === "a") setAId(item.id);
                  else setBId(item.id);
                  setPicking(null);
                }}
              >
                <Text style={styles.rowName}>{item.full_name}</Text>
              </Pressable>
            )}
          />
          <Pressable onPress={() => setPicking(null)}>
            <Text style={styles.cancel}>Đóng</Text>
          </Pressable>
        </View>
      )}

      {result && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Kết quả</Text>
          <Text style={styles.call}>
            {personA?.full_name} gọi {personB?.full_name}:{" "}
            <Text style={styles.highlight}>{result.aCallsB}</Text>
          </Text>
          <Text style={styles.call}>
            {personB?.full_name} gọi {personA?.full_name}:{" "}
            <Text style={styles.highlight}>{result.bCallsA}</Text>
          </Text>
          <Text style={styles.desc}>{result.description}</Text>
          {result.pathLabels?.length > 0 && (
            <View style={styles.path}>
              {result.pathLabels.map((p, i) => (
                <Text key={i} style={styles.pathItem}>
                  • {p}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Picker({
  label,
  person,
  onPress,
}: {
  label: string;
  person: Person | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.picker} onPress={onPress}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Text style={styles.pickerValue}>
        {person ? person.full_name : "Chạm để chọn…"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  lead: { color: colors.textMuted, marginBottom: 14, lineHeight: 20 },
  picker: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  pickerLabel: { fontSize: 11, fontWeight: "800", color: colors.textSoft },
  pickerValue: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 4 },
  panel: {
    backgroundColor: colors.stone100,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  panelTitle: { fontWeight: "800", marginBottom: 8, color: colors.text },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.text,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { fontWeight: "600", color: colors.text },
  cancel: {
    textAlign: "center",
    marginTop: 10,
    color: colors.amberDark,
    fontWeight: "700",
  },
  result: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  resultTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: colors.text },
  call: { color: colors.text, marginBottom: 8, lineHeight: 22 },
  highlight: { color: colors.amberDark, fontWeight: "800" },
  desc: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  path: { marginTop: 12 },
  pathItem: { fontSize: 12, color: colors.textSoft, marginBottom: 4 },
});
