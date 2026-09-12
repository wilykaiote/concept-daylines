import type { ComposerDraft } from "./composer";

const TASKS_STORAGE_KEY = "twineline.tasks";
const TARGET_TIME_STORAGE_KEY = "twineline.targetTime";
const DEFAULT_TARGET_TIME = "17:00";

function isComposerDraft(value: unknown): value is ComposerDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return typeof draft.title === "string";
}

export function loadTasks(): ComposerDraft[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isComposerDraft);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: ComposerDraft[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function isTargetTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function loadTargetTime(): string {
  try {
    const raw = localStorage.getItem(TARGET_TIME_STORAGE_KEY);
    if (raw && isTargetTime(raw)) return raw;
  } catch {
    // Ignore read failures.
  }
  return DEFAULT_TARGET_TIME;
}

export function saveTargetTime(time: string): void {
  if (!isTargetTime(time)) return;
  try {
    localStorage.setItem(TARGET_TIME_STORAGE_KEY, time);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function msUntilTargetTime(hhmm: string, now = new Date()): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatTargetTimeLabel(hhmm: string): string {
  const [hoursRaw, minutes] = hhmm.split(":").map(Number);
  const period = hoursRaw >= 12 ? "PM" : "AM";
  const hours12 = hoursRaw % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export const WEEKDAY_BUTTONS = [
  { id: 0, label: "S", name: "Sunday" },
  { id: 1, label: "M", name: "Monday" },
  { id: 2, label: "T", name: "Tuesday" },
  { id: 3, label: "W", name: "Wednesday" },
  { id: 4, label: "T", name: "Thursday" },
  { id: 5, label: "F", name: "Friday" },
  { id: 6, label: "S", name: "Saturday" },
] as const;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toStartOfDay(date: Date): Date {
  return startOfDay(date);
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateForWeekday(weekday: number, now = new Date()): Date {
  const today = startOfDay(now);
  const delta = (weekday - today.getDay() + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + delta);
  return next;
}

export function weekdaysFromToday(now = new Date()) {
  const start = now.getDay();
  return [...WEEKDAY_BUTTONS.slice(start), ...WEEKDAY_BUTTONS.slice(0, start)];
}

export function formatMonthYearLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function shiftMonth(date: Date, delta: number): Date {
  const next = startOfDay(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + delta);
  return next;
}

export function buildMonthCalendarDays(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function formatTwinelineDateLabel(date: Date, now = new Date()): string {
  const selected = startOfDay(date);
  const today = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((selected.getTime() - today.getTime()) / dayMs);
  const relative =
    diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : diffDays === -1 ? "Yesterday" : null;
  const stamp = `${MONTH_LABELS[selected.getMonth()]} ${selected.getDate()}`;
  return relative ? `${stamp} - ${relative}` : stamp;
}
