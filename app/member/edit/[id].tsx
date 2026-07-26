import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import MemberForm from "../../../src/components/MemberForm";
import { useFamilyData } from "../../../src/context/FamilyDataContext";
import { colors } from "../../../src/theme";

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { config, persons, isAdmin, reload } = useFamilyData();
  const person = persons.find((p) => p.id === id);

  if (!person) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted }}>Không tìm thấy.</Text>
      </View>
    );
  }

  return (
    <MemberForm
      config={config}
      initial={person}
      isAdmin={isAdmin}
      onCancel={() => router.back()}
      onSuccess={async () => {
        await reload();
        router.back();
      }}
    />
  );
}
