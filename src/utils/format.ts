import { solarToLunarParts } from "../lib/lunar";

export function formatYmd(
  y: number | null | undefined,
  m: number | null | undefined,
  d: number | null | undefined,
): string {
  if (!y && !m && !d) return "—";
  const parts = [
    d ? String(d).padStart(2, "0") : "??",
    m ? String(m).padStart(2, "0") : "??",
    y ? String(y) : "????",
  ];
  return parts.join("/");
}

export function formatLunarDeath(
  y: number | null | undefined,
  m: number | null | undefined,
  d: number | null | undefined,
): string | null {
  if (!y || !m || !d) return null;
  try {
    const lunar = solarToLunarParts(y, m, d);
    if (!lunar) return null;
    return `ÂL ${String(lunar.day).padStart(2, "0")}/${String(lunar.month).padStart(2, "0")}/${lunar.year}`;
  } catch {
    return null;
  }
}

export function genderLabel(g?: string | null) {
  if (g === "male") return "Nam";
  if (g === "female") return "Nữ";
  return "Khác";
}
