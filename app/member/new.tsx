import { router } from "expo-router";
import MemberForm from "../../src/components/MemberForm";
import { useFamilyData } from "../../src/context/FamilyDataContext";

export default function NewMemberScreen() {
  const { config, isAdmin, reload } = useFamilyData();
  return (
    <MemberForm
      config={config}
      isAdmin={isAdmin}
      onCancel={() => router.back()}
      onSuccess={async (id) => {
        await reload();
        router.replace(`/member/${id}`);
      }}
    />
  );
}
