import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Person } from "../types";
import { colors, genderBg, genderColor } from "../theme";
import { formatYmd, genderLabel } from "../utils/format";
import GenderBadge from "./GenderBadge";

type Props = {
  person: Person;
  onPress?: () => void;
  compact?: boolean;
  role?: string;
};

export default function PersonCard({ person, onPress, compact, role }: Props) {
  const initial = person.full_name?.charAt(0)?.toUpperCase() || "?";
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, compact && styles.compact]}
    >
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: genderBg(person.gender) }]}>
          {person.avatar_url ? (
            <Image source={{ uri: person.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: genderColor(person.gender) }]}>
              {initial}
            </Text>
          )}
        </View>
        <GenderBadge gender={person.gender} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {person.full_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {role ? `${role} · ` : ""}
          {genderLabel(person.gender)}
          {person.birth_year ? ` · ${person.birth_year}` : ""}
          {person.is_deceased ? " · đã mất" : ""}
        </Text>
        {!compact && (
          <Text style={styles.dates} numberOfLines={1}>
            SN {formatYmd(person.birth_year, person.birth_month, person.birth_day)}
            {person.is_deceased
              ? ` · Mất ${formatYmd(person.death_year, person.death_month, person.death_day)}`
              : ""}
          </Text>
        )}
        {(person.generation != null || person.birth_order != null) && (
          <View style={styles.badges}>
            {person.generation != null && (
              <Text style={styles.badge}>Đời {person.generation}</Text>
            )}
            {person.birth_order != null && (
              <Text style={styles.badge}>Con thứ {person.birth_order}</Text>
            )}
            {person.is_in_law && (
              <Text style={styles.badgeWarn}>
                {person.gender === "male"
                  ? "Rể"
                  : person.gender === "female"
                    ? "Dâu"
                    : "Dâu/Rể"}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  compact: { padding: 10, marginBottom: 6 },
  avatarWrap: { width: 48, height: 48 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  avatarText: { fontSize: 18, fontWeight: "800" },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dates: { fontSize: 11, color: colors.textSoft, marginTop: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.amberDark,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeWarn: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.rose,
    backgroundColor: colors.roseSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
