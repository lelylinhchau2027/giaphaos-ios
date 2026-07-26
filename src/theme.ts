export const colors = {
  bg: "#fafaf9",
  card: "#ffffff",
  border: "#e7e5e4",
  borderSoft: "#e7e5e4aa",
  text: "#1c1917",
  textMuted: "#78716c",
  textSoft: "#a8a29e",
  amber: "#d97706",
  amberSoft: "#fef3c7",
  amberDark: "#b45309",
  amberMid: "#f59e0b",
  stone: "#292524",
  stone100: "#f5f5f4",
  stone200: "#e7e5e4",
  rose: "#e11d48",
  roseSoft: "#fff1f2",
  sky: "#0ea5e9",
  skySoft: "#e0f2fe",
  blueSoft: "#eff6ff",
  blue: "#3b82f6",
  emeraldSoft: "#ecfdf5",
  emerald: "#059669",
  white: "#ffffff",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
};

export function genderColor(gender?: string | null) {
  if (gender === "female") return colors.rose;
  if (gender === "male") return colors.sky;
  return colors.textMuted;
}

export function genderBg(gender?: string | null) {
  if (gender === "female") return colors.roseSoft;
  if (gender === "male") return colors.skySoft;
  return colors.stone100;
}
