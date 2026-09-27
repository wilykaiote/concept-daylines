import { addDays, dayKey, parseTaskDate } from "./calendarTimeline";
import type { ComposerDraft } from "./composer";
import { toStartOfDay } from "./taskStorage";

export type RecurringUnit = "day" | "week" | "month";

export type RecurringSchedule = {
  count: number;
  unit: RecurringUnit;
};

const UNIT_CHAR: Record<RecurringUnit, string> = {
  day: "d",
  week: "w",
  month: "m",
};

const CHAR_UNIT: Record<string, RecurringUnit> = {
  d: "day",
  w: "week",
  m: "month",
};

export const DEFAULT_RECURRING_COUNT = 1;
export const DEFAULT_RECURRING_UNIT: RecurringUnit = "day";
export const MIN_RECURRING_COUNT = 1;
export const MAX_RECURRING_COUNT = 99;

export function clampRecurringCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RECURRING_COUNT;
  return Math.min(MAX_RECURRING_COUNT, Math.max(MIN_RECURRING_COUNT, Math.round(value)));
}

/** Serialize to `ComposerDraft.recurring`, e.g. `1d`, `2w`, `1m`. */
export function formatRecurring(count: number, unit: RecurringUnit): string {
  return `${clampRecurringCount(count)}${UNIT_CHAR[unit]}`;
}

export function parseRecurring(value: string | null | undefined): RecurringSchedule | null {
  if (!value) return null;
  const match = /^(\d+)([dwm])$/i.exec(value.trim());
  if (!match) return null;
  const unit = CHAR_UNIT[match[2].toLowerCase()];
  if (!unit) return null;
  const count = clampRecurringCount(Number(match[1]));
  return { count, unit };
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  // Clamp overflow (e.g. Jan 31 + 1 month → last day of Feb).
  if (next.getDate() !== date.getDate()) {
    next.setDate(0);
  }
  return toStartOfDay(next);
}

export function addRecurringInterval(date: Date, schedule: RecurringSchedule): Date {
  const start = toStartOfDay(date);
  if (schedule.unit === "day") return addDays(start, schedule.count);
  if (schedule.unit === "week") return addDays(start, schedule.count * 7);
  return addMonths(start, schedule.count);
}

/**
 * Next occurrence on/after today, advancing from the task's date (or today).
 * Always takes at least one interval step from the base date.
 */
export function nextRecurringDateKey(
  task: Pick<ComposerDraft, "date">,
  schedule: RecurringSchedule,
  now: Date = new Date(),
): string {
  const today = toStartOfDay(now);
  const scheduled = parseTaskDate(task.date);
  let cursor = scheduled ?? today;
  cursor = addRecurringInterval(cursor, schedule);
  let guard = 0;
  while (cursor.getTime() < today.getTime() && guard < 500) {
    cursor = addRecurringInterval(cursor, schedule);
    guard += 1;
  }
  return dayKey(cursor);
}

/** Build the next incomplete occurrence after completing a recurring task. */
export function buildNextRecurringTask(
  task: ComposerDraft,
  now: Date = new Date(),
): ComposerDraft | null {
  const schedule = parseRecurring(task.recurring);
  if (!schedule) return null;
  const nextDate = nextRecurringDateKey(task, schedule, now);
  return {
    ...task,
    id: crypto.randomUUID(),
    date: nextDate,
    completed_at: null,
    created_at: new Date().toISOString(),
    auto_rescheduled: true,
  };
}
