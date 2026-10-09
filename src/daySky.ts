import { MINUTES_PER_DAY } from "./calendarTimeline";

/** Fixed for now; later can follow real sun times. */
export const SUNRISE_MIN = 6 * 60 + 30;
export const SUNSET_MIN = 19 * 60 + 30;

export type DaySkyStop = {
  color: string;
  /** 0–1 fraction of the day. */
  offset: number;
};

function dayOffset(min: number) {
  return Math.max(0, Math.min(1, min / MINUTES_PER_DAY));
}

export function daySkyStops(): DaySkyStop[] {
  return [
    { color: "#000000", offset: 0 },
    { color: "#000000", offset: dayOffset(SUNRISE_MIN - 90) },
    { color: "#d15a18", offset: dayOffset(SUNRISE_MIN) },
    { color: "#e8882a", offset: dayOffset(SUNRISE_MIN + 90) },
    { color: "#e8882a", offset: dayOffset(SUNSET_MIN - 90) },
    { color: "#d15a18", offset: dayOffset(SUNSET_MIN) },
    { color: "#000000", offset: dayOffset(SUNSET_MIN + 90) },
    { color: "#000000", offset: 1 },
  ];
}

/** CSS linear-gradient stop list for a full-day left→right sky. */
export function daySkyCssStops(): string {
  return daySkyStops()
    .map(({ color, offset }) => `${color} ${offset * 100}%`)
    .join(", ");
}

function parseHexColor(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHexColor(a);
  const [br, bg, bb] = parseHexColor(b);
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Sample the day-sky gradient at a minute-of-day. */
export function daySkyColorAtMinutes(min: number): string {
  const t = dayOffset(min);
  const stops = daySkyStops();
  if (t <= stops[0].offset) return stops[0].color;
  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1];
    const next = stops[i];
    if (t <= next.offset) {
      const span = next.offset - prev.offset;
      const local = span <= 0 ? 1 : (t - prev.offset) / span;
      return mixHex(prev.color, next.color, local);
    }
  }
  return stops[stops.length - 1].color;
}
