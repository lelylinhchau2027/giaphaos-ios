import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Props = {
  /** Optional status line under the spinner */
  message?: string;
};

/**
 * Full-screen loading while bootstrap (config + Supabase + widget sync).
 */
export default function BootSplash({ message = "Đang tải gia phả…" }: Props) {
  return (
    <View style={styles.root} accessibilityRole="progressbar">
      <Text style={styles.emoji}>🌳</Text>
      <Text style={styles.title}>Gia Phả OS</Text>
      <ActivityIndicator
        size="large"
        color={colors.amber}
        style={styles.spinner}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.3,
  },
  spinner: { marginTop: 28 },
  message: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
  },
});
