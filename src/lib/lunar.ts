import { Lunar, Solar } from "lunar-javascript";

/** Solar Date for lunar M/D occurring within a given solar year. */
export function getSolarForLunarInYear(
  lunarMonth: number,
  lunarDay: number,
  solarYear: number,
): Date | null {
  for (let offset = -1; offset <= 1; offset++) {
    try {
      const l = Lunar.fromYmd(solarYear + offset, lunarMonth, lunarDay);
      const s = l.getSolar();
      if (s.getYear() === solarYear) {
        return new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      }
    } catch {
      // invalid lunar day / leap
    }
  }
  return null;
}

export function solarFromLunarYmd(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
): Date | null {
  try {
    const l = Lunar.fromYmd(lunarYear, lunarMonth, lunarDay);
    const s = l.getSolar();
    return new Date(s.getYear(), s.getMonth() - 1, s.getDay());
  } catch {
    return null;
  }
}

export function solarToLunarParts(
  year: number,
  month: number,
  day: number,
): { year: number; month: number; day: number } | null {
  try {
    const s = Solar.fromYmd(year, month, day);
    const l = s.getLunar();
    return {
      year: l.getYear(),
      month: Math.abs(l.getMonth()),
      day: l.getDay(),
    };
  } catch {
    return null;
  }
}
