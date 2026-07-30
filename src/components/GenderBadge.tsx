import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Props = {
  gender?: string | null;
  size?: number;
};

/** Small male/female marker meant to sit on the corner of an avatar circle. */
export default function GenderBadge({ gender, size = 16 }: Props) {
  if (gender !== "male" && gender !== "female") return null;
  const isMale = gender === "male";
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isMale ? colors.sky : colors.rose,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.65 }]}>
        {isMale ? "♂" : "♀"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  icon: {
    color: colors.white,
    fontWeight: "800",
  },
});
