import { addDays, dayKey, parseTaskDate } from "./calendarTimeline";
import { withMetaAuto, type ComposerDraft } from "./composer";
import { toStartOfDay } from "./taskStorage";

export type RecurringUnit = "day" | "week" | "month";

export type RecurringSchedule = {
  count: number;
  unit: RecurringUnit;
};

/** Extra days beyond the visible timeline when materializing series. */
export const RECURRING_MATERIALIZE_BUFFER_DAYS = 7;
/** Fallback timeline length when the UI count is unknown (matches default dayline). */
export const RECURRING_MATERIALIZE_DEFAULT_TIMELINE_DAYS = 31;
/**
 * @deprecated Prefer `recurringMaterializeHorizonDays(timelineDayCount)`.
 * Kept as the default window size (timeline + buffer).
 */
export const RECURRING_MATERIALIZE_HORIZON_DAYS =
  RECURRING_MATERIALIZE_DEFAULT_TIMELINE_DAYS + RECURRING_MATERIALIZE_BUFFER_DAYS;
/** Safety cap so dense schedules (e.g. daily) cannot explode. */
export const RECURRING_MATERIALIZE_MAX_OCCURRENCES = 45;

/** Visible timeline days + buffer — keep stored series small on mobile. */
export function recurringMaterializeHorizonDays(timelineDayCount?: number): number {
  const base =
    timelineDayCount != null && Number.isFinite(timelineDayCount)
      ? Math.max(1, Math.round(timelineDayCount))
      : RECURRING_MATERIALIZE_DEFAULT_TIMELINE_DAYS;
  return base + RECURRING_MATERIALIZE_BUFFER_DAYS;
}

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

/**
 * Forced occurrence date for Automatic and completion. Null if not recurring.
 * Always the schedule-required day — never first-fit / “find a free day”.
 */
export function forcedRecurringDateKey(
  task: Pick<ComposerDraft, "date" | "recurring">,
  now: Date = new Date(),
): string | null {
  const schedule = parseRecurring(task.recurring);
  if (!schedule) return null;
  return nextRecurringDateKey(task, schedule, now);
}

/** Build the next incomplete occurrence after completing a recurring task. */
export function buildNextRecurringTask(
  task: ComposerDraft,
  now: Date = new Date(),
): ComposerDraft | null {
  const nextDate = forcedRecurringDateKey(task, now);
  if (nextDate == null) return null;
  const seriesId = task.series_id ?? crypto.randomUUID();
  // Force onto the repeat day (may land in Overflow). Do not rehome bystander dated tasks.
  return withMetaAuto(
    {
      ...task,
      id: crypto.randomUUID(),
      series_id: seriesId,
      date: nextDate,
      // Keep starts_at / due_at (timed recurring stays at the same clock times).
      completed_at: null,
      created_at: new Date().toISOString(),
    },
    "schedule",
  );
}

export function recurringHorizonEnd(
  now: Date = new Date(),
  horizonDays: number = RECURRING_MATERIALIZE_HORIZON_DAYS,
): Date {
  return addDays(toStartOfDay(now), Math.max(0, horizonDays));
}

/** Drop open series members dated after `throughDate` (inclusive keep). */
export function pruneRecurringSeriesBeyondHorizon(
  tasks: ComposerDraft[],
  throughDate: Date,
): ComposerDraft[] {
  const throughKey = dayKey(toStartOfDay(throughDate));
  return tasks.filter((task) => {
    if (task.series_id == null || task.date == null) return true;
    if (task.completed_at != null) return true;
    return task.date <= throughKey;
  });
}

/**
 * Occurrence date keys from anchor through `throughDate` (inclusive), stepping
 * by the schedule. Includes the anchor day.
 */
export function enumerateRecurringDateKeys(
  anchorDate: Date | string,
  schedule: RecurringSchedule,
  throughDate: Date,
  maxOccurrences: number = RECURRING_MATERIALIZE_MAX_OCCURRENCES,
): string[] {
  const through = toStartOfDay(throughDate);
  let cursor =
    typeof anchorDate === "string"
      ? (parseTaskDate(anchorDate) ?? toStartOfDay(new Date()))
      : toStartOfDay(anchorDate);
  const keys: string[] = [];
  let guard = 0;
  while (cursor.getTime() <= through.getTime() && guard < maxOccurrences) {
    keys.push(dayKey(cursor));
    cursor = addRecurringInterval(cursor, schedule);
    guard += 1;
  }
  return keys;
}

/** Clone template onto each date key (new ids, shared series_id). */
export function materializeRecurringSeries(
  template: ComposerDraft,
  schedule: RecurringSchedule,
  throughDate: Date,
  options?: { seriesId?: string; includeAnchor?: boolean },
): ComposerDraft[] {
  const anchor = parseTaskDate(template.date);
  if (anchor == null) return [];
  const seriesId = options?.seriesId ?? template.series_id ?? crypto.randomUUID();
  const includeAnchor = options?.includeAnchor !== false;
  const keys = enumerateRecurringDateKeys(anchor, schedule, throughDate);
  const dateKeys = includeAnchor ? keys : keys.slice(1);
  const createdAt = new Date().toISOString();
  return dateKeys.map((date) => ({
    ...template,
    id: crypto.randomUUID(),
    series_id: seriesId,
    date,
    recurring: formatRecurring(schedule.count, schedule.unit),
    completed_at: null,
    created_at: createdAt,
  }));
}

/**
 * Ensure open series members fill the horizon from the latest dated member
 * (or from `fromDateKey` when provided).
 */
export function topUpRecurringSeries(
  tasks: ComposerDraft[],
  seriesId: string,
  throughDate: Date,
  fromDateKey?: string | null,
): ComposerDraft[] {
  if (!seriesId) return tasks;
  const members = tasks.filter(
    (task) => task.series_id === seriesId && task.completed_at == null,
  );
  if (members.length === 0) return tasks;

  const sample = members.find((task) => parseRecurring(task.recurring) != null) ?? members[0];
  const schedule = parseRecurring(sample.recurring);
  if (!schedule) return tasks;

  const dated = members
    .map((task) => task.date)
    .filter((date): date is string => date != null)
    .sort();
  const latestKey = dated[dated.length - 1] ?? null;
  const existingDates = new Set(dated);

  let seedKey = fromDateKey ?? latestKey;
  if (seedKey == null) return tasks;
  // Step from the seed (latest open, or completed date) by one interval, then fill.
  const seedDate = parseTaskDate(seedKey);
  if (seedDate == null) return tasks;
  let cursor = addRecurringInterval(seedDate, schedule);
  // If we already have the seed as an open member and are topping from latest,
  // start after latest (cursor already one step past seed).
  const additions: ComposerDraft[] = [];
  const through = toStartOfDay(throughDate);
  let guard = 0;
  while (cursor.getTime() <= through.getTime() && guard < RECURRING_MATERIALIZE_MAX_OCCURRENCES) {
    const key = dayKey(cursor);
    if (!existingDates.has(key)) {
      additions.push({
        ...sample,
        id: crypto.randomUUID(),
        series_id: seriesId,
        date: key,
        recurring: formatRecurring(schedule.count, schedule.unit),
        completed_at: null,
        created_at: new Date().toISOString(),
      });
      existingDates.add(key);
    }
    cursor = addRecurringInterval(cursor, schedule);
    guard += 1;
  }
  if (additions.length === 0) return tasks;
  return [...additions, ...tasks];
}

/** Remove open series members on/after `fromDateKey` except `keepId`. */
export function removeFutureSeriesMembers(
  tasks: ComposerDraft[],
  seriesId: string,
  fromDateKey: string,
  keepId: string | null,
): ComposerDraft[] {
  return tasks.filter((task) => {
    if (task.series_id !== seriesId) return true;
    if (keepId != null && task.id === keepId) return true;
    const date = task.date;
    if (date == null) return true;
    // Drop other members on or after the edit anchor.
    return date < fromDateKey;
  });
}

/**
 * Complete one occurrence: drop it; top up the series. If it was the last
 * open member (or had no series), fall back to spawning the next occurrence.
 */
export function completeRecurringOccurrence(
  tasks: ComposerDraft[],
  completed: ComposerDraft,
  now: Date = new Date(),
  horizonDays: number = RECURRING_MATERIALIZE_HORIZON_DAYS,
): ComposerDraft[] {
  const without = tasks.filter((task) => task.id !== completed.id);
  const seriesId = completed.series_id;
  const schedule = parseRecurring(completed.recurring);
  const through = recurringHorizonEnd(now, horizonDays);

  if (seriesId == null || schedule == null) {
    const next = buildNextRecurringTask(completed, now);
    return next ? [next, ...without] : without;
  }

  const siblings = without.filter(
    (task) => task.series_id === seriesId && task.completed_at == null,
  );
  if (siblings.length === 0) {
    const next = buildNextRecurringTask(completed, now);
    if (!next) return without;
    // Rematerialize a full horizon from the next date.
    const seeded = { ...next, series_id: seriesId };
    const rest = materializeRecurringSeries(seeded, schedule, through, {
      seriesId,
      includeAnchor: false,
    });
    return [seeded, ...rest, ...without];
  }

  return topUpRecurringSeries(without, seriesId, through, completed.date);
}
