import { addDays, dayKey, parseTaskDate } from "./calendarTimeline";
import { withMetaAuto, type ComposerDraft } from "./composer";
import { toStartOfDay } from "./taskStorage";

export type RecurringUnit = "day" | "week" | "month" | "year";

export type RecurringSchedule = {
  count: number;
  unit: RecurringUnit;
  /** 0=Sun..6=Sat when unit is week (multi-select). */
  weekdays?: number[];
  /** 1–31 when unit is month. */
  monthDay?: number;
};

/** Buffer days kept beyond the default dayline length when materializing series. */
export const RECURRING_MATERIALIZE_BUFFER_DAYS = 7;
/** Default dayline length used when sizing the fixed materialize window. */
export const RECURRING_MATERIALIZE_DEFAULT_TIMELINE_DAYS = 31;
/**
 * Fixed stored horizon for recurring series (not tied to scroll window size).
 * Scrolling the dayline must not grow materialized occurrences.
 */
export const RECURRING_MATERIALIZE_HORIZON_DAYS =
  RECURRING_MATERIALIZE_DEFAULT_TIMELINE_DAYS + RECURRING_MATERIALIZE_BUFFER_DAYS;
/** Safety cap so dense schedules (e.g. daily) cannot explode. */
export const RECURRING_MATERIALIZE_MAX_OCCURRENCES = 45;

/** Fixed materialize window in days. Argument ignored (kept for call-site compatibility). */
export function recurringMaterializeHorizonDays(_timelineDayCount?: number): number {
  void _timelineDayCount;
  return RECURRING_MATERIALIZE_HORIZON_DAYS;
}

const UNIT_CHAR: Record<RecurringUnit, string> = {
  day: "d",
  week: "w",
  month: "m",
  year: "y",
};

const CHAR_UNIT: Record<string, RecurringUnit> = {
  d: "day",
  w: "week",
  m: "month",
  y: "year",
};

export const DEFAULT_RECURRING_COUNT = 1;
export const DEFAULT_RECURRING_UNIT: RecurringUnit = "day";
export const MIN_RECURRING_COUNT = 1;
export const MAX_RECURRING_COUNT = 99;
export const MIN_MONTH_DAY = 1;
export const MAX_MONTH_DAY = 31;

export function clampRecurringCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RECURRING_COUNT;
  return Math.min(MAX_RECURRING_COUNT, Math.max(MIN_RECURRING_COUNT, Math.round(value)));
}

export function clampMonthDay(value: number): number {
  if (!Number.isFinite(value)) return MIN_MONTH_DAY;
  return Math.min(MAX_MONTH_DAY, Math.max(MIN_MONTH_DAY, Math.round(value)));
}

export function normalizeWeekdays(weekdays: Iterable<number> | null | undefined): number[] {
  if (weekdays == null) return [];
  const set = new Set<number>();
  for (const day of weekdays) {
    if (!Number.isFinite(day)) continue;
    const n = Math.round(day);
    if (n >= 0 && n <= 6) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export type FormatRecurringExtras = {
  weekdays?: number[];
  monthDay?: number;
};

/** Serialize to `ComposerDraft.recurring`, e.g. `1d`, `2w:wd=1,3`, `1m:md=15`, `1y`. */
export function formatRecurring(
  count: number,
  unit: RecurringUnit,
  extras?: FormatRecurringExtras,
): string {
  let out = `${clampRecurringCount(count)}${UNIT_CHAR[unit]}`;
  if (unit === "week") {
    const weekdays = normalizeWeekdays(extras?.weekdays);
    if (weekdays.length > 0) out += `:wd=${weekdays.join(",")}`;
  } else if (unit === "month" && extras?.monthDay != null) {
    out += `:md=${clampMonthDay(extras.monthDay)}`;
  }
  return out;
}

export function formatRecurringSchedule(schedule: RecurringSchedule): string {
  return formatRecurring(schedule.count, schedule.unit, {
    weekdays: schedule.weekdays,
    monthDay: schedule.monthDay,
  });
}

export function parseRecurring(value: string | null | undefined): RecurringSchedule | null {
  if (!value) return null;
  const match = /^(\d+)([dwmy])(?::(.+))?$/i.exec(value.trim());
  if (!match) return null;
  const unit = CHAR_UNIT[match[2].toLowerCase()];
  if (!unit) return null;
  const count = clampRecurringCount(Number(match[1]));
  const schedule: RecurringSchedule = { count, unit };
  const suffix = match[3];
  if (suffix) {
    for (const part of suffix.split(";")) {
      const [rawKey, rawVal] = part.split("=");
      if (!rawKey || rawVal == null) continue;
      const key = rawKey.trim().toLowerCase();
      const val = rawVal.trim();
      if (key === "wd" && unit === "week") {
        const weekdays = normalizeWeekdays(
          val
            .split(",")
            .map((piece) => Number(piece.trim()))
            .filter((n) => Number.isFinite(n)),
        );
        if (weekdays.length > 0) schedule.weekdays = weekdays;
      } else if (key === "md" && unit === "month") {
        const md = Number(val);
        if (Number.isFinite(md)) schedule.monthDay = clampMonthDay(md);
      }
    }
  }
  return schedule;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  // Clamp overflow (e.g. Jan 31 + 1 month → last day of Feb).
  if (next.getDate() !== date.getDate()) {
    next.setDate(0);
  }
  return toStartOfDay(next);
}

/** Add years keeping the source month/day; Feb 29 → last day of Feb in non-leap years. */
function addYears(date: Date, years: number): Date {
  const month = date.getMonth();
  const day = date.getDate();
  const next = new Date(date.getFullYear() + years, month, day);
  if (next.getMonth() !== month) {
    next.setDate(0);
  }
  return toStartOfDay(next);
}

function startOfWeekSunday(date: Date): Date {
  const start = toStartOfDay(date);
  return addDays(start, -start.getDay());
}

function dateInMonth(year: number, monthIndex: number, monthDay: number): Date {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return toStartOfDay(new Date(year, monthIndex, Math.min(clampMonthDay(monthDay), last)));
}

/** Advance one interval for simple day/week/month/year schedules (no weekday list). */
export function addRecurringInterval(date: Date, schedule: RecurringSchedule): Date {
  const start = toStartOfDay(date);
  if (schedule.unit === "day") return addDays(start, schedule.count);
  if (schedule.unit === "week") return addDays(start, schedule.count * 7);
  if (schedule.unit === "year") return addYears(start, schedule.count);
  if (schedule.monthDay != null) {
    const next = addMonths(
      dateInMonth(start.getFullYear(), start.getMonth(), schedule.monthDay),
      schedule.count,
    );
    return dateInMonth(next.getFullYear(), next.getMonth(), schedule.monthDay);
  }
  return addMonths(start, schedule.count);
}

/**
 * Occurrence date keys from anchor through `throughDate` (inclusive).
 * Includes the anchor day when it matches the schedule.
 */
export function enumerateRecurringDateKeys(
  anchorDate: Date | string,
  schedule: RecurringSchedule,
  throughDate: Date,
  maxOccurrences: number = RECURRING_MATERIALIZE_MAX_OCCURRENCES,
): string[] {
  const through = toStartOfDay(throughDate);
  const anchor =
    typeof anchorDate === "string"
      ? (parseTaskDate(anchorDate) ?? toStartOfDay(new Date()))
      : toStartOfDay(anchorDate);
  const max = Math.max(1, maxOccurrences);

  if (schedule.unit === "week" && schedule.weekdays != null && schedule.weekdays.length > 0) {
    return enumerateWeekdayKeys(anchor, schedule, through, max);
  }
  if (schedule.unit === "month" && schedule.monthDay != null) {
    return enumerateMonthDayKeys(anchor, schedule, through, max);
  }
  if (schedule.unit === "year") {
    return enumerateYearKeys(anchor, schedule, through, max);
  }

  const keys: string[] = [];
  let cursor = anchor;
  let guard = 0;
  while (cursor.getTime() <= through.getTime() && guard < max) {
    keys.push(dayKey(cursor));
    cursor = addRecurringInterval(cursor, schedule);
    guard += 1;
  }
  return keys;
}

/** Year steps always use the anchor month/day so leap-day clamps do not stick. */
function enumerateYearKeys(
  anchor: Date,
  schedule: RecurringSchedule,
  through: Date,
  max: number,
): string[] {
  const keys: string[] = [];
  let step = 0;
  while (keys.length < max) {
    const next = addYears(anchor, step * schedule.count);
    if (next.getTime() > through.getTime()) break;
    keys.push(dayKey(next));
    step += 1;
  }
  return keys;
}

function enumerateWeekdayKeys(
  anchor: Date,
  schedule: RecurringSchedule,
  through: Date,
  max: number,
): string[] {
  const weekdays = normalizeWeekdays(schedule.weekdays);
  if (weekdays.length === 0) return [];
  const count = Math.max(1, schedule.count);
  const anchorWeekStart = startOfWeekSunday(anchor);
  const keys: string[] = [];
  let weekIndex = 0;
  let guard = 0;
  while (keys.length < max && guard < max * 14) {
    const weekStart = addDays(anchorWeekStart, weekIndex * 7);
    if (weekStart.getTime() > through.getTime() + 6 * 24 * 60 * 60 * 1000) break;
    if (weekIndex % count === 0) {
      for (const weekday of weekdays) {
        const day = addDays(weekStart, weekday);
        if (day.getTime() < anchor.getTime()) continue;
        if (day.getTime() > through.getTime()) continue;
        keys.push(dayKey(day));
        if (keys.length >= max) return keys;
      }
    }
    weekIndex += 1;
    guard += 1;
  }
  return keys;
}

function enumerateMonthDayKeys(
  anchor: Date,
  schedule: RecurringSchedule,
  through: Date,
  max: number,
): string[] {
  const monthDay = clampMonthDay(schedule.monthDay ?? anchor.getDate());
  const count = Math.max(1, schedule.count);
  let year = anchor.getFullYear();
  let month = anchor.getMonth();
  let candidate = dateInMonth(year, month, monthDay);
  if (candidate.getTime() < anchor.getTime()) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = dateInMonth(year, month, monthDay);
  }
  const keys: string[] = [];
  let guard = 0;
  year = candidate.getFullYear();
  month = candidate.getMonth();
  while (keys.length < max && guard < max + 4) {
    const day = dateInMonth(year, month, monthDay);
    if (day.getTime() > through.getTime()) break;
    if (day.getTime() >= anchor.getTime()) keys.push(dayKey(day));
    month += count;
    while (month > 11) {
      month -= 12;
      year += 1;
    }
    guard += 1;
  }
  return keys;
}

/**
 * Next occurrence on/after today, advancing from the task's date (or today).
 * Always skips the current occurrence date.
 */
export function nextRecurringDateKey(
  task: Pick<ComposerDraft, "date">,
  schedule: RecurringSchedule,
  now: Date = new Date(),
): string {
  const today = toStartOfDay(now);
  const scheduled = parseTaskDate(task.date) ?? today;
  const scheduledKey = dayKey(scheduled);
  const through = addDays(today, 366 * 3);
  const keys = enumerateRecurringDateKeys(scheduled, schedule, through, 500);
  for (const key of keys) {
    if (key === scheduledKey) continue;
    const date = parseTaskDate(key);
    if (date != null && date.getTime() >= today.getTime()) return key;
  }
  // Fallback: simple interval step when enumeration yields nothing.
  let cursor = addRecurringInterval(scheduled, schedule);
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
  const recurring = formatRecurringSchedule(schedule);
  return dateKeys.map((date) => ({
    ...template,
    id: crypto.randomUUID(),
    series_id: seriesId,
    date,
    recurring,
    completed_at: null,
    created_at: createdAt,
  }));
}

/**
 * Ensure open series members fill the horizon from the series epoch
 * (earliest open date), skipping dates on/before `fromDateKey` when set.
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
  const epochKey = dated[0] ?? sample.date;
  if (epochKey == null) return tasks;
  const existingDates = new Set(dated);
  const keys = enumerateRecurringDateKeys(epochKey, schedule, throughDate);
  const recurring = formatRecurringSchedule(schedule);
  const additions: ComposerDraft[] = [];
  for (const key of keys) {
    if (fromDateKey != null && key <= fromDateKey) continue;
    if (existingDates.has(key)) continue;
    additions.push({
      ...sample,
      id: crypto.randomUUID(),
      series_id: seriesId,
      date: key,
      recurring,
      completed_at: null,
      created_at: new Date().toISOString(),
    });
    existingDates.add(key);
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
