import { withMetaAuto, type ComposerDraft } from "./composer";
import { forcedRecurringDateKey, parseRecurring } from "./recurring";
import { toStartOfDay } from "./taskStorage";

export const PACK_START_MINUTES = 6 * 60;
export const PX_PER_MINUTE = 1;
export const MINUTES_PER_DAY = 24 * 60;
export const DAY_HEIGHT_PX = MINUTES_PER_DAY * PX_PER_MINUTE;
export const DEFAULT_TASK_MINUTES = 15;
/** Soft-pack gap between consecutive untimed tasks (master “Time Between Tasks”). */
export const DEFAULT_TASK_GAP_MINUTES = 15;
/** Minimum block height so title + complete control fit with no extra padding. */
export const MIN_BLOCK_HEIGHT_PX = 16;

export type CalendarTaskBlock = {
  key: string;
  taskId: string | null;
  title: string;
  task: ComposerDraft;
  /** Minutes from midnight on this day (may be clipped to visible start). */
  startMin: number;
  endMin: number;
  /** Unclipped packed range (absolute minutes from midnight). */
  packStartMin: number;
  packEndMin: number;
  /** Offset within the day's visible strip (after visibleStartMin). */
  topPx: number;
  heightPx: number;
  /** True when a dated task was packed after its `date`. */
  overdue: boolean;
};

export type CalendarDayLayout = {
  date: Date;
  dayKey: string;
  /** First visible minute on this day (from midnight). Today starts at "now". */
  visibleStartMin: number;
  /** Visible strip length in minutes (through end of day). */
  visibleMinutes: number;
  /** Task packing window (6:00 / now → countdown target). */
  packStartMin: number;
  packEndMin: number;
  packStartLabel: string;
  packEndLabel: string;
  /** null when marker is outside the visible strip or window is closed. */
  packStartTopPx: number | null;
  packEndTopPx: number | null;
  packBandTopPx: number | null;
  packBandHeightPx: number | null;
  blocks: CalendarTaskBlock[];
  /** Unclipped non-overdue blocks for the twineline schedule (includes past). */
  scheduleBlocks: CalendarTaskBlock[];
  hourMarkers: Array<{ hour: number; label: string; topPx: number }>;
};

type Interval = { start: number; end: number };

export function dayKey(date: Date): string {
  const d = toStartOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = toStartOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildDayRange(start: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    days.push(addDays(start, i));
  }
  return days;
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function packWindowStartMinutes(startTime: string): number {
  const parsed = parseTimeOfDay(startTime);
  if (parsed == null) return PACK_START_MINUTES;
  return Math.min(MINUTES_PER_DAY - 1, Math.max(0, parsed));
}

export function packWindowEndMinutes(
  targetTime: string,
  windowStartMinutes: number = PACK_START_MINUTES,
): number {
  const [hoursRaw, minutesRaw] = targetTime.split(":").map(Number);
  const hours = Number.isFinite(hoursRaw) ? hoursRaw : 17;
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const end = Math.min(MINUTES_PER_DAY, Math.max(0, hours * 60 + minutes));
  if (end <= windowStartMinutes) return MINUTES_PER_DAY;
  return end;
}

/** Packing window start for a day: now on today (at least window start), else window start. */
export function packStartForDay(
  day: Date,
  now: Date,
  packEnd: number,
  windowStartMinutes: number = PACK_START_MINUTES,
): number {
  const dayStart = toStartOfDay(day);
  const today = toStartOfDay(now);
  if (dayStart.getTime() < today.getTime()) return packEnd;
  if (dayStart.getTime() === today.getTime()) {
    const nowMin = minutesFromMidnight(now);
    return Math.min(packEnd, Math.max(windowStartMinutes, nowMin));
  }
  return windowStartMinutes;
}

export function parseTaskDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** Parse `YYYY-MM-DD` into a local start-of-day Date. */
export function parseTaskDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = toStartOfDay(new Date(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Parse `HH:mm` or `HH:mm:ss` into minutes from midnight. */
export function parseTimeOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** True when a dated task's calendar day/time has already been missed. */
export function isAnchoredTaskMissed(
  task: ComposerDraft,
  now: Date,
  packEndMinutes?: number,
  windowStartMinutes: number = PACK_START_MINUTES,
): boolean {
  const scheduled = parseTaskDate(task.date);
  if (!scheduled) return false;
  const today = toStartOfDay(now);
  if (scheduled.getTime() < today.getTime()) return true;
  if (scheduled.getTime() > today.getTime()) return false;

  const starts = parseTimeOfDay(task.starts_at);
  const due = parseTimeOfDay(task.due_at);
  if (starts == null && due == null) {
    // Date-only today: missed once the day's pack window has closed.
    if (packEndMinutes == null) return false;
    return packStartForDay(today, now, packEndMinutes, windowStartMinutes) >= packEndMinutes;
  }

  const duration = taskDurationMinutes(task);
  const nowMin = minutesFromMidnight(now);
  const startMin = starts != null ? starts : Math.max(0, (due as number) - duration);
  const endMin = starts != null ? startMin + duration : (due as number);
  // Missed only after the scheduled window ends (start + duration, or due_at).
  return endMin <= nowMin;
}

const URGENCY_RANK: Record<string, number> = {
  ASAP: 0,
  Now: 0, // legacy alias
  Soon: 1,
  Later: 2,
  Future: 3,
};

function urgencyRank(urgency: string | null | undefined): number {
  if (urgency && urgency in URGENCY_RANK) return URGENCY_RANK[urgency];
  return 4;
}

function impactScore(impact: number | null | undefined): number {
  if (typeof impact === "number" && Number.isFinite(impact)) return impact;
  return 0;
}

export function compareSoftPriority(a: ComposerDraft, b: ComposerDraft): number {
  const urgencyDelta = urgencyRank(a.urgency) - urgencyRank(b.urgency);
  if (urgencyDelta !== 0) return urgencyDelta;
  const impactDelta = impactScore(b.impact) - impactScore(a.impact);
  if (impactDelta !== 0) return impactDelta;
  const createdA = a.created_at ?? "";
  const createdB = b.created_at ?? "";
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;
  const idA = a.id ?? a.title;
  const idB = b.id ?? b.title;
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}

type TaskKind = "timed" | "dateOnly" | "undated";

function classifyTask(task: ComposerDraft): TaskKind {
  const date = parseTaskDate(task.date);
  if (!date) return "undated";
  if (parseTimeOfDay(task.starts_at) != null || parseTimeOfDay(task.due_at) != null) {
    return "timed";
  }
  return "dateOnly";
}

export function taskDurationMinutes(task: ComposerDraft): number {
  const raw = task.est_duration;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return DEFAULT_TASK_MINUTES;
  return Math.max(1, Math.round(raw));
}

/**
 * Latest minute a focus / next soft task can start and still finish in today's
 * pack window (and before the next hard-timed block, if any).
 * Used for Current focus "Free time" — not the earliest packed start.
 */
export function latestFocusFreeStartMin(
  task: ComposerDraft,
  packEndMin: number,
  nowMin: number,
  todayBlocks: ReadonlyArray<{
    startMin: number;
    overdue: boolean;
    taskId: string | null;
    task: ComposerDraft;
  }>,
  gapMinutes: number = 0,
): number {
  const duration = taskDurationMinutes(task);
  let latest = packEndMin - duration;

  const ownStarts = parseTimeOfDay(task.starts_at);
  if (ownStarts != null) {
    latest = Math.min(latest, ownStarts);
  } else {
    const ownDue = parseTimeOfDay(task.due_at);
    if (ownDue != null) latest = Math.min(latest, ownDue - duration);
  }

  let nextHardStart: number | null = null;
  for (const block of todayBlocks) {
    if (block.overdue) continue;
    if (block.startMin <= nowMin) continue;
    if (task.id != null && block.taskId === task.id) continue;
    const hard =
      parseTimeOfDay(block.task.starts_at) != null ||
      parseTimeOfDay(block.task.due_at) != null;
    if (!hard) continue;
    if (nextHardStart == null || block.startMin < nextHardStart) {
      nextHardStart = block.startMin;
    }
  }
  if (nextHardStart != null) {
    // Must finish before the hard block (gap matches soft-pack spacing).
    const beforeHard = nextHardStart - Math.max(0, gapMinutes) - duration;
    latest = Math.min(latest, nextHardStart, beforeHard);
  }

  return latest;
}

type PackBlock = Omit<CalendarTaskBlock, "topPx" | "heightPx">;

function pushBlock(
  byDay: Map<string, PackBlock[]>,
  day: Date,
  task: ComposerDraft,
  startMin: number,
  endMin: number,
  segmentIndex: number,
  overdue: boolean,
) {
  if (endMin <= startMin) return;
  const key = dayKey(day);
  const list = byDay.get(key) ?? [];
  list.push({
    key: `${task.id ?? task.title}-${key}-${segmentIndex}`,
    taskId: task.id,
    title: task.title,
    task,
    startMin,
    endMin,
    packStartMin: startMin,
    packEndMin: endMin,
    overdue,
  });
  byDay.set(key, list);
}

function isPlacementOverdue(task: ComposerDraft, placementDay: Date): boolean {
  const scheduled = parseTaskDate(task.date);
  if (!scheduled) return false;
  return toStartOfDay(placementDay).getTime() > scheduled.getTime();
}

/** Pin a timed task on its date without checking soft/timed collisions. */
function resolveTimedStartMin(
  task: ComposerDraft,
  packStart: number,
): number {
  const duration = taskDurationMinutes(task);
  const starts = parseTimeOfDay(task.starts_at);
  if (starts != null) return starts;
  const due = parseTimeOfDay(task.due_at);
  if (due != null) return Math.max(0, due - duration);
  return packStart;
}

/**
 * Place a timed task on its scheduled day. Missed timed tasks still keep their
 * absolute slot on the track and are also collected for Overflow.
 * Never rolls missed timed tasks onto later days.
 */
function placeTimedTask(
  byDay: Map<string, PackBlock[]>,
  task: ComposerDraft,
  now: Date,
  getPackEnd: (day: Date) => number,
  getWindowStart: (day: Date) => number,
  overdueTasks: ComposerDraft[],
) {
  const scheduled = parseTaskDate(task.date);
  if (!scheduled) return;

  const windowStart = getWindowStart(scheduled);
  const packEnd = getPackEnd(scheduled);
  const startMin = resolveTimedStartMin(task, windowStart);
  const endMin = startMin + taskDurationMinutes(task);
  if (isAnchoredTaskMissed(task, now, packEnd, windowStart)) {
    overdueTasks.push(task);
  }
  pushBlock(byDay, scheduled, task, startMin, endMin, 0, false);
}

/** Soft packing cursor: live now on today so softs slide; window start on future days. */
function softPackStartForDay(
  day: Date,
  now: Date,
  packEnd: number,
  windowStartMinutes: number,
): number {
  return packStartForDay(day, now, packEnd, windowStartMinutes);
}

function occupiedIntervalsForDay(byDay: Map<string, PackBlock[]>, key: string): Interval[] {
  const blocks = byDay.get(key) ?? [];
  return blocks
    .map((block) => ({ start: block.startMin, end: block.endMin }))
    .sort((a, b) => a.start - b.start);
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Interval[] = [{ start: sorted[0].start, end: sorted[0].end }];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const next = sorted[i];
    if (next.start <= prev.end) {
      prev.end = Math.max(prev.end, next.end);
    } else {
      merged.push({ start: next.start, end: next.end });
    }
  }
  return merged;
}

/** Expand occupied ranges by gap on both sides so softs keep aggression clearance. */
function inflateOccupied(
  occupied: Interval[],
  gapMinutes: number,
  packStart: number,
  packEnd: number,
): Interval[] {
  const gap = Math.max(0, gapMinutes);
  if (gap === 0) return mergeIntervals(occupied);
  return mergeIntervals(
    occupied.map((interval) => ({
      start: Math.max(packStart, interval.start - gap),
      end: Math.min(packEnd, interval.end + gap),
    })),
  );
}

function freeIntervals(packStart: number, packEnd: number, occupied: Interval[]): Interval[] {
  const free: Interval[] = [];
  let cursor = packStart;
  for (const occ of occupied) {
    const start = Math.max(occ.start, packStart);
    const end = Math.min(occ.end, packEnd);
    if (end <= start) continue;
    if (cursor < start) free.push({ start: cursor, end: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < packEnd) free.push({ start: cursor, end: packEnd });
  return free;
}

/** Earliest contiguous free hole that can hold `minutes`. */
function firstFitRange(free: Interval[], minutes: number): Interval | null {
  for (const hole of free) {
    if (hole.end - hole.start >= minutes) {
      return { start: hole.start, end: hole.start + minutes };
    }
  }
  return null;
}

/**
 * Remove a placed soft range (plus trailing gap) from the free-interval list.
 * Trailing gap keeps soft↔soft spacing without re-querying occupancy.
 */
function consumeFreeWithGap(free: Interval[], placed: Interval, gapMinutes: number): Interval[] {
  const gap = Math.max(0, gapMinutes);
  const cutStart = placed.start;
  const cutEnd = placed.end + gap;
  const next: Interval[] = [];
  for (const hole of free) {
    if (cutEnd <= hole.start || cutStart >= hole.end) {
      next.push(hole);
      continue;
    }
    if (hole.start < cutStart) {
      next.push({ start: hole.start, end: cutStart });
    }
    if (cutEnd < hole.end) {
      next.push({ start: cutEnd, end: hole.end });
    }
  }
  return next.filter((hole) => hole.end > hole.start);
}

function packSoftTasks(
  byDay: Map<string, PackBlock[]>,
  dateOnlyByDay: Map<string, ComposerDraft[]>,
  undated: ComposerDraft[],
  now: Date,
  getPackEnd: (day: Date) => number,
  getWindowStart: (day: Date) => number,
  overdueTasks: ComposerDraft[],
  deferredTasks: ComposerDraft[],
  gapMinutes: number,
  todaySoftBaselineIds: ReadonlySet<string>,
  _frozenPlacements: ReadonlyMap<string, SoftPackPlacement>,
) {
  void _frozenPlacements;
  const undatedQueue = [...undated].sort(compareSoftPriority);
  const dateOnlyQueues = new Map<string, ComposerDraft[]>();
  for (const [key, list] of dateOnlyByDay) {
    dateOnlyQueues.set(key, [...list].sort(compareSoftPriority));
  }

  const todayStart = toStartOfDay(now);
  const todayKey = dayKey(todayStart);
  let day = todayStart;
  let guard = 0;
  const gap = Math.max(0, gapMinutes);
  let undatedTodayResolved = false;

  const isBaselineSoft = (task: ComposerDraft) =>
    task.id != null && todaySoftBaselineIds.has(task.id);

  const hasRemaining = () =>
    undatedQueue.length > 0 ||
    [...dateOnlyQueues.values()].some((list) => list.length > 0);

  const drainDateOnlyToOverdue = (key: string) => {
    const stranded = dateOnlyQueues.get(key) ?? [];
    while (stranded.length > 0) {
      overdueTasks.push(stranded.shift()!);
    }
    dateOnlyQueues.set(key, stranded);
  };

  /** Baseline leftovers → Deferring; other undated stay queued to spill forward. */
  const splitTodayUndatedLeftovers = () => {
    if (undatedTodayResolved) return;
    const spill: ComposerDraft[] = [];
    while (undatedQueue.length > 0) {
      const task = undatedQueue.shift()!;
      if (isBaselineSoft(task)) {
        deferredTasks.push(task);
      } else {
        spill.push(task);
      }
    }
    undatedQueue.push(...spill);
    undatedTodayResolved = true;
  };

  while (hasRemaining() && guard < 1000) {
    guard += 1;
    const key = dayKey(day);
    const isToday = day.getTime() === todayStart.getTime();
    const packEnd = getPackEnd(day);
    const windowStart = getWindowStart(day);
    const packStart = softPackStartForDay(day, now, packEnd, windowStart);
    if (packStart >= packEnd) {
      drainDateOnlyToOverdue(key);
      if (isToday) splitTodayUndatedLeftovers();
      day = addDays(day, 1);
      continue;
    }

    const occupied = inflateOccupied(
      occupiedIntervalsForDay(byDay, key),
      gap,
      packStart,
      packEnd,
    );
    let free = freeIntervals(packStart, packEnd, occupied);
    if (free.length === 0) {
      drainDateOnlyToOverdue(key);
      if (isToday) splitTodayUndatedLeftovers();
      day = addDays(day, 1);
      continue;
    }

    // Freeze pins intentionally ignored — softs slide from live packStart around timed.

    const sameDayQueue = dateOnlyQueues.get(key) ?? [];

    // Priority 1: date-only / soft-anchored for this day. Fail → Rescheduling.
    while (sameDayQueue.length > 0) {
      const task = sameDayQueue[0];
      const minutes = taskDurationMinutes(task);
      const range = firstFitRange(free, minutes);
      if (!range) {
        overdueTasks.push(sameDayQueue.shift()!);
        continue;
      }
      sameDayQueue.shift();
      const overdue = isPlacementOverdue(task, day);
      pushBlock(byDay, day, task, range.start, range.end, 0, overdue);
      free = consumeFreeWithGap(free, range, gap);
    }
    dateOnlyQueues.set(key, sameDayQueue);

    // Priority 2: undated softs — today from live packStart, then spill non-baseline forward.
    if (isToday) {
      while (undatedQueue.length > 0) {
        const task = undatedQueue[0];
        const minutes = taskDurationMinutes(task);
        const range = firstFitRange(free, minutes);
        if (!range) break;
        undatedQueue.shift();
        pushBlock(byDay, day, task, range.start, range.end, 0, false);
        free = consumeFreeWithGap(free, range, gap);
      }
      splitTodayUndatedLeftovers();
    } else if (undatedTodayResolved) {
      while (undatedQueue.length > 0) {
        const task = undatedQueue[0];
        const minutes = taskDurationMinutes(task);
        const range = firstFitRange(free, minutes);
        if (!range) break;
        undatedQueue.shift();
        pushBlock(byDay, day, task, range.start, range.end, 0, false);
        free = consumeFreeWithGap(free, range, gap);
      }
    }

    day = addDays(day, 1);
  }

  for (const [key, list] of dateOnlyQueues) {
    if (list.length === 0) continue;
    if (key <= todayKey) {
      while (list.length > 0) overdueTasks.push(list.shift()!);
      dateOnlyQueues.set(key, list);
    }
  }
  if (!undatedTodayResolved) splitTodayUndatedLeftovers();
  while (undatedQueue.length > 0) {
    const task = undatedQueue.shift()!;
    if (isBaselineSoft(task)) deferredTasks.push(task);
  }
}

function sortOverdueTasks(tasks: ComposerDraft[]): ComposerDraft[] {
  return [...tasks].sort((a, b) => {
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    const timeA =
      parseTimeOfDay(a.starts_at) ?? parseTimeOfDay(a.due_at) ?? Number.POSITIVE_INFINITY;
    const timeB =
      parseTimeOfDay(b.starts_at) ?? parseTimeOfDay(b.due_at) ?? Number.POSITIVE_INFINITY;
    if (timeA !== timeB) return timeA - timeB;
    return compareSoftPriority(a, b);
  });
}

const AUTO_RESCHEDULE_LOOKAHEAD_DAYS = 366;

/** Soft fully overtaken on today (same rule as App overflow merge). */
function isFullyOvertakenSoftOnToday(
  layout: CalendarTasksLayout,
  taskId: string,
  now: Date,
): boolean {
  const todayKey = dayKey(toStartOfDay(now));
  const nowMin = minutesFromMidnight(now);
  const today = layout.days.find((day) => day.dayKey === todayKey);
  if (!today) return false;
  for (const block of today.scheduleBlocks) {
    if (block.task.id !== taskId && block.taskId !== taskId) continue;
    const end = block.packEndMin ?? block.endMin;
    if (end > nowMin) continue;
    const task = block.task;
    if (
      parseTimeOfDay(task.starts_at) == null &&
      parseTimeOfDay(task.due_at) == null
    ) {
      return true;
    }
  }
  return false;
}

function stillCountsAsOverflow(
  layout: CalendarTasksLayout,
  taskId: string,
  now: Date,
): boolean {
  if (layout.overdueTasks.some((task) => task.id === taskId)) return true;
  if (layout.deferredTasks.some((task) => task.id === taskId)) return true;
  return isFullyOvertakenSoftOnToday(layout, taskId, now);
}

function kindRescheduleRank(task: ComposerDraft): number {
  const kind = classifyTask(task);
  if (kind === "timed") return 0;
  if (kind === "dateOnly") return 1;
  return 2;
}

function sortOverflowForReschedule(tasks: ComposerDraft[]): ComposerDraft[] {
  return [...tasks].sort((a, b) => {
    const rankDelta = kindRescheduleRank(a) - kindRescheduleRank(b);
    if (rankDelta !== 0) return rankDelta;
    return compareSoftPriority(a, b);
  });
}

function withTaskDate(
  tasks: ComposerDraft[],
  taskId: string,
  nextDate: string,
  times: Pick<ComposerDraft, "starts_at" | "due_at">,
): ComposerDraft[] {
  return tasks.map((task) =>
    task.id === taskId
      ? withMetaAuto(
          {
            ...task,
            date: nextDate,
            starts_at: times.starts_at,
            due_at: times.due_at,
          },
          "schedule",
        )
      : task,
  );
}

export type RescheduleOverflowResult = {
  tasks: ComposerDraft[];
  /** Undated overflow ids to drop from today's window baseline so they spill-pack. */
  releaseBaselineIds: string[];
};

/**
 * Move overflow tasks by kind priority (timed → date-only → undated).
 * Timed/date-only: only `date` changes; times unchanged.
 * Undated (non-recurring): no field changes — caller releases baseline so packer places them.
 * When `overflowTasks` is omitted, uses layout overdue only (midnight path).
 */
export function rescheduleOverdueTasksForNewDay(
  tasks: ComposerDraft[],
  now: Date,
  getTargetTimeForDay: (day: Date) => string,
  taskGapMinutes: number = DEFAULT_TASK_GAP_MINUTES,
  getWindowStartTimeForDay: (day: Date) => string = () => "06:00",
  overflowTasks?: readonly ComposerDraft[],
): RescheduleOverflowResult {
  const empty: RescheduleOverflowResult = { tasks, releaseBaselineIds: [] };
  const layoutTasks = (
    candidateTasks: ComposerDraft[],
  ): CalendarTasksLayout =>
    layoutCalendarTasks(
      candidateTasks,
      now,
      getTargetTimeForDay,
      taskGapMinutes,
      getWindowStartTimeForDay,
    );

  const initialLayout = layoutTasks(tasks);
  const toReschedule = sortOverflowForReschedule(
    (overflowTasks != null
      ? overflowTasks.filter((task) => task.id != null)
      : initialLayout.overdueTasks
    ).map((task) => ({ ...task })),
  );
  if (toReschedule.length === 0) return empty;

  let working = tasks.map((task) => ({ ...task }));
  const today = toStartOfDay(now);
  const tomorrowKey = dayKey(addDays(today, 1));
  const movedThisPass = new Set<string>();
  const releaseBaselineIds: string[] = [];
  let changed = false;

  const findSoftFitDate = (
    taskId: string,
    current: ComposerDraft,
    startOffset: number,
  ): string | null => {
    for (let offset = startOffset; offset < AUTO_RESCHEDULE_LOOKAHEAD_DAYS; offset += 1) {
      const candidateDate = dayKey(addDays(today, offset));
      const candidateTasks = withTaskDate(working, taskId, candidateDate, current);
      const candidateLayout = layoutTasks(candidateTasks);
      if (!stillCountsAsOverflow(candidateLayout, taskId, now)) {
        return candidateDate;
      }
    }
    return null;
  };

  /** Re-home date-only tasks moved earlier this pass that fell back into overflow. */
  const rehomeMovedDateOnlyInOverflow = () => {
    let guard = 0;
    while (guard < toReschedule.length + 8) {
      guard += 1;
      const layout = layoutTasks(working);
      const displaced = [...movedThisPass].filter((id) => {
        const task = working.find((entry) => entry.id === id);
        if (!task) return false;
        if (parseRecurring(task.recurring) != null) return false;
        if (classifyTask(task) === "timed") return false;
        if (classifyTask(task) === "undated") return false;
        return stillCountsAsOverflow(layout, id, now);
      });
      if (displaced.length === 0) break;

      let progressed = false;
      for (const id of displaced) {
        const current = working.find((entry) => entry.id === id);
        if (!current) continue;
        const scheduled = parseTaskDate(current.date);
        const startOffset =
          scheduled != null
            ? Math.max(
                0,
                Math.round(
                  (scheduled.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
                ) + 1,
              )
            : 0;
        const nextDate = findSoftFitDate(id, current, startOffset);
        if (nextDate == null || nextDate === current.date) continue;
        working = withTaskDate(working, id, nextDate, current);
        movedThisPass.add(id);
        changed = true;
        progressed = true;
      }
      if (!progressed) break;
    }
  };

  for (const overflowTask of toReschedule) {
    if (!overflowTask.id) continue;
    const current = working.find((task) => task.id === overflowTask.id);
    if (!current) continue;
    const taskId = overflowTask.id;

    const forcedDate = forcedRecurringDateKey(current, now);
    if (forcedDate != null) {
      if (forcedDate !== current.date) {
        working = withTaskDate(working, taskId, forcedDate, current);
        movedThisPass.add(taskId);
        changed = true;
        rehomeMovedDateOnlyInOverflow();
      }
      continue;
    }

    const kind = classifyTask(current);
    if (kind === "timed") {
      if (tomorrowKey !== current.date) {
        working = withTaskDate(working, taskId, tomorrowKey, current);
        movedThisPass.add(taskId);
        changed = true;
        rehomeMovedDateOnlyInOverflow();
      }
      continue;
    }

    if (kind === "undated") {
      // No date / urgency changes — App releases baseline so packer spills by priority.
      releaseBaselineIds.push(taskId);
      continue;
    }

    // Date-only: earliest day that leaves overflow. Already dated today → start tomorrow.
    const softStartOffset =
      current.date != null && current.date === dayKey(today) ? 1 : 0;
    const nextDate = findSoftFitDate(taskId, current, softStartOffset);
    if (nextDate == null || nextDate === current.date) continue;
    working = withTaskDate(working, taskId, nextDate, current);
    movedThisPass.add(taskId);
    changed = true;
    rehomeMovedDateOnlyInOverflow();
  }

  return {
    tasks: changed ? working : tasks,
    releaseBaselineIds,
  };
}

function buildHourMarkers(visibleStartMin: number): CalendarDayLayout["hourMarkers"] {
  const markers: CalendarDayLayout["hourMarkers"] = [];
  const firstHour = Math.ceil(visibleStartMin / 60);
  for (let hour = firstHour; hour < 24; hour += 1) {
    const absTop = hour * 60;
    if (absTop < visibleStartMin) continue;
    markers.push({
      hour,
      label: formatHourLabel(hour),
      topPx: (absTop - visibleStartMin) * PX_PER_MINUTE,
    });
  }
  return markers;
}

export type SoftPackPlacement = {
  taskId: string;
  startMin: number;
  endMin: number;
};

export type CalendarTasksLayout = {
  days: CalendarDayLayout[];
  /** Dated/timed tasks that need rescheduling (Overflow → Rescheduling). */
  overdueTasks: ComposerDraft[];
  /** Undated softs that no longer fit today (Overflow → Deferring). */
  deferredTasks: ComposerDraft[];
  /** Soft placements on today after this pack (for persistence / freeze). */
  todaySoftPlacements: SoftPackPlacement[];
  /** Minutes of free time after the last packed block before today's pack window end. */
  todayEndSlackMin: number;
  /** Soft with latest pack end when end slack is zero; otherwise null. */
  atRiskTask: ComposerDraft | null;
};

/**
 * Soft (untimed) task ids currently placed on `day`.
 */
export function collectSoftTaskIdsOnDay(
  days: CalendarDayLayout[],
  day: Date,
): Set<string> {
  const key = dayKey(toStartOfDay(day));
  const ids = new Set<string>();
  const dayLayout = days.find((entry) => entry.dayKey === key);
  if (!dayLayout) return ids;

  for (const block of dayLayout.scheduleBlocks.length > 0
    ? dayLayout.scheduleBlocks
    : dayLayout.blocks) {
    const id = block.task.id;
    if (!id) continue;
    if (
      parseTimeOfDay(block.task.starts_at) != null ||
      parseTimeOfDay(block.task.due_at) != null
    ) {
      continue;
    }
    ids.add(id);
  }
  return ids;
}

/**
 * Soft tasks that previously lived in today's window (baseline) and have since
 * been pushed entirely onto a later day. Future-dated tasks are never included.
 */
export function collectPushedFromTodayWindowTasks(
  days: CalendarDayLayout[],
  today: Date,
  baselineIds: ReadonlySet<string>,
): ComposerDraft[] {
  const todayStart = toStartOfDay(today);
  const todayKey = dayKey(todayStart);
  const todayIds = collectSoftTaskIdsOnDay(days, todayStart);
  const seen = new Set<string>();
  const overflow: ComposerDraft[] = [];

  for (const day of days) {
    if (day.date.getTime() <= todayStart.getTime()) continue;
    for (const block of day.blocks) {
      const task = block.task;
      const id = task.id;
      if (!id || seen.has(id)) continue;
      if (!baselineIds.has(id)) continue;
      if (todayIds.has(id)) continue;

      if (parseTimeOfDay(task.starts_at) != null || parseTimeOfDay(task.due_at) != null) {
        continue;
      }

      const scheduled = parseTaskDate(task.date);
      if (scheduled != null && dayKey(scheduled) !== todayKey) continue;

      seen.add(id);
      overflow.push(task);
    }
  }

  return overflow;
}

/** Pin the current-focus task using a frozen placement or first-fit from window start. */
function pinFocusTaskOnToday(
  byDay: Map<string, PackBlock[]>,
  task: ComposerDraft,
  now: Date,
  getPackEnd: (day: Date) => number,
  getWindowStart: (day: Date) => number,
  frozen: SoftPackPlacement | null,
  gapMinutes: number,
) {
  const today = toStartOfDay(now);
  const packEnd = getPackEnd(today);
  const windowStart = getWindowStart(today);
  const minutes = Math.max(1, taskDurationMinutes(task));
  const key = dayKey(today);

  if (
    frozen != null &&
    frozen.endMin - frozen.startMin === minutes &&
    frozen.startMin >= windowStart &&
    frozen.endMin <= packEnd
  ) {
    pushBlock(byDay, today, task, frozen.startMin, frozen.endMin, 0, false);
    return;
  }

  const packStart = softPackStartForDay(today, now, packEnd, windowStart);
  if (packStart >= packEnd) {
    pushBlock(byDay, today, task, windowStart, windowStart + minutes, 0, false);
    return;
  }
  const occupied = inflateOccupied(
    occupiedIntervalsForDay(byDay, key),
    gapMinutes,
    packStart,
    packEnd,
  );
  const free = freeIntervals(packStart, packEnd, occupied);
  const range = firstFitRange(free, minutes);
  if (range) {
    pushBlock(byDay, today, task, range.start, range.end, 0, false);
    return;
  }
  pushBlock(byDay, today, task, packStart, packStart + minutes, 0, false);
}

export function layoutCalendarTasks(
  tasks: ComposerDraft[],
  now: Date,
  getTargetTimeForDay: (day: Date) => string,
  taskGapMinutes: number = DEFAULT_TASK_GAP_MINUTES,
  getWindowStartTimeForDay: (day: Date) => string = () => "06:00",
  /** Softs that started in today's window; leftovers that no longer fit → Deferring. */
  todaySoftBaselineIds: ReadonlySet<string> = new Set(),
  /** Soft/date-only task pinned first on today until cleared. */
  focusTaskId: string | null = null,
  /** Frozen soft placements for today (absolute minutes); stops sliding with now. */
  frozenSoftPlacements: readonly SoftPackPlacement[] = [],
): CalendarTasksLayout {
  const getWindowStart = (day: Date) => packWindowStartMinutes(getWindowStartTimeForDay(day));
  const getPackEnd = (day: Date) =>
    packWindowEndMinutes(getTargetTimeForDay(day), getWindowStart(day));
  const gapMinutes =
    Number.isFinite(taskGapMinutes) && taskGapMinutes >= 0
      ? Math.round(taskGapMinutes)
      : DEFAULT_TASK_GAP_MINUTES;
  const todayStart = toStartOfDay(now);
  const nowMin = minutesFromMidnight(now);
  const byDay = new Map<string, PackBlock[]>();
  const overdueTasks: ComposerDraft[] = [];
  const deferredTasks: ComposerDraft[] = [];
  const frozenById = new Map<string, SoftPackPlacement>();
  for (const placement of frozenSoftPlacements) {
    if (!placement.taskId || placement.endMin <= placement.startMin) continue;
    frozenById.set(placement.taskId, placement);
  }

  const timed: ComposerDraft[] = [];
  const dateOnlyByDay = new Map<string, ComposerDraft[]>();
  const undated: ComposerDraft[] = [];
  let focusTask: ComposerDraft | null = null;

  for (const task of tasks) {
    if (focusTaskId != null && task.id === focusTaskId) {
      focusTask = task;
      continue;
    }
    const kind = classifyTask(task);
    if (kind === "undated") {
      undated.push(task);
      continue;
    }
    const scheduled = parseTaskDate(task.date)!;
    if (kind === "timed") {
      timed.push(task);
      continue;
    }
    // Past calendar days → Rescheduling. Today/future softs stay packable (frozen).
    if (scheduled.getTime() < todayStart.getTime()) {
      overdueTasks.push(task);
    } else {
      const key = dayKey(scheduled);
      const list = dateOnlyByDay.get(key) ?? [];
      list.push(task);
      dateOnlyByDay.set(key, list);
    }
  }

  timed.sort((a, b) => {
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    const startA =
      parseTimeOfDay(a.starts_at) ??
      (parseTimeOfDay(a.due_at) != null
        ? (parseTimeOfDay(a.due_at) as number) - taskDurationMinutes(a)
        : 0);
    const startB =
      parseTimeOfDay(b.starts_at) ??
      (parseTimeOfDay(b.due_at) != null
        ? (parseTimeOfDay(b.due_at) as number) - taskDurationMinutes(b)
        : 0);
    return startA - startB;
  });

  for (const task of timed) {
    placeTimedTask(byDay, task, now, getPackEnd, getWindowStart, overdueTasks);
  }

  if (focusTask) {
    const frozen =
      focusTask.id != null ? (frozenById.get(focusTask.id) ?? null) : null;
    pinFocusTaskOnToday(
      byDay,
      focusTask,
      now,
      getPackEnd,
      getWindowStart,
      frozen,
      gapMinutes,
    );
    if (focusTask.id) frozenById.delete(focusTask.id);
  }

  packSoftTasks(
    byDay,
    dateOnlyByDay,
    undated,
    now,
    getPackEnd,
    getWindowStart,
    overdueTasks,
    deferredTasks,
    gapMinutes,
    todaySoftBaselineIds,
    frozenById,
  );

  const keys = [...byDay.keys()].sort();
  const lastKey = keys.length > 0 ? keys[keys.length - 1] : dayKey(todayStart);
  const end = toStartOfDay(new Date(`${lastKey}T00:00:00`));
  const layouts: CalendarDayLayout[] = [];

  for (let d = todayStart; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const key = dayKey(d);
    const isToday = d.getTime() === todayStart.getTime();
    const visibleStartMin = isToday ? nowMin : 0;
    const visibleMinutes = Math.max(1, MINUTES_PER_DAY - visibleStartMin);
    const rawBlocks = byDay.get(key) ?? [];
    const blocks: CalendarTaskBlock[] = [];
    const scheduleBlocks: CalendarTaskBlock[] = [];
    const packEnd = getPackEnd(d);

    for (const block of rawBlocks) {
      const packStartMin = block.packStartMin ?? block.startMin;
      const packEndMin = block.packEndMin ?? block.endMin;
      if (!block.overdue && packEndMin > packStartMin) {
        scheduleBlocks.push({
          ...block,
          startMin: packStartMin,
          endMin: packEndMin,
          packStartMin,
          packEndMin,
          topPx: (packStartMin - visibleStartMin) * PX_PER_MINUTE,
          heightPx: Math.max(
            MIN_BLOCK_HEIGHT_PX,
            (packEndMin - packStartMin) * PX_PER_MINUTE,
          ),
        });
      }
      if (block.endMin <= visibleStartMin) continue;
      const startMin = Math.max(block.startMin, visibleStartMin);
      const endMin = block.endMin;
      if (endMin <= startMin) continue;
      blocks.push({
        ...block,
        startMin,
        endMin,
        packStartMin,
        packEndMin,
        topPx: (startMin - visibleStartMin) * PX_PER_MINUTE,
        heightPx: Math.max(MIN_BLOCK_HEIGHT_PX, (endMin - startMin) * PX_PER_MINUTE),
      });
    }

    const byTaskKey = (
      a: CalendarTaskBlock,
      b: CalendarTaskBlock,
    ) =>
      a.startMin - b.startMin ||
      a.endMin - b.endMin ||
      (a.taskId ?? a.key).localeCompare(b.taskId ?? b.key);
    blocks.sort(byTaskKey);
    scheduleBlocks.sort(byTaskKey);

    layouts.push({
      date: d,
      dayKey: key,
      visibleStartMin,
      visibleMinutes,
      ...buildPackWindowMarkers(d, now, packEnd, visibleStartMin, getWindowStart(d)),
      blocks,
      scheduleBlocks,
      hourMarkers: buildHourMarkers(visibleStartMin),
    });
  }

  if (layouts.length === 0) {
    const visibleStartMin = nowMin;
    layouts.push({
      date: todayStart,
      dayKey: dayKey(todayStart),
      visibleStartMin,
      visibleMinutes: Math.max(1, MINUTES_PER_DAY - visibleStartMin),
      ...buildPackWindowMarkers(todayStart, now, getPackEnd(todayStart), visibleStartMin, getWindowStart(todayStart)),
      blocks: [],
      scheduleBlocks: [],
      hourMarkers: buildHourMarkers(visibleStartMin),
    });
  }

  // Safety: missed/unplaced tasks still belong in the right Overflow bucket.
  const placedIds = new Set<string>();
  for (const blocks of byDay.values()) {
    for (const block of blocks) {
      if (block.taskId) placedIds.add(block.taskId);
    }
  }
  const overdueIds = new Set(
    overdueTasks.map((task) => task.id).filter((id): id is string => !!id),
  );
  const deferredIds = new Set(
    deferredTasks.map((task) => task.id).filter((id): id is string => !!id),
  );
  for (const task of tasks) {
    if (!task.id || placedIds.has(task.id)) continue;
    if (overdueIds.has(task.id) || deferredIds.has(task.id)) continue;
    if (isAnchoredTaskMissed(task, now, getPackEnd(todayStart), getWindowStart(todayStart))) {
      overdueTasks.push(task);
      overdueIds.add(task.id);
      continue;
    }
    const kind = classifyTask(task);
    // Date-only today-or-earlier that the soft packer never placed → Rescheduling.
    if (kind === "dateOnly") {
      const scheduled = parseTaskDate(task.date);
      if (scheduled && scheduled.getTime() <= todayStart.getTime()) {
        overdueTasks.push(task);
        overdueIds.add(task.id);
      }
      continue;
    }
    // Unplaced undated soft that started in today's window → Deferring.
    if (kind === "undated" && todaySoftBaselineIds.has(task.id)) {
      deferredTasks.push(task);
      deferredIds.add(task.id);
    }
  }

  const todayKey = dayKey(todayStart);
  const todaySoftPlacements: SoftPackPlacement[] = [];
  const todayRawBlocks = byDay.get(todayKey) ?? [];
  let todayLastBlockEnd = 0;
  let atRiskSoft: { task: ComposerDraft; endMin: number } | null = null;
  for (const block of todayRawBlocks) {
    if (block.overdue) continue;
    const endMin = block.packEndMin ?? block.endMin;
    if (endMin > todayLastBlockEnd) todayLastBlockEnd = endMin;
    if (!block.taskId) continue;
    const isTimed =
      parseTimeOfDay(block.task.starts_at) != null ||
      parseTimeOfDay(block.task.due_at) != null;
    if (isTimed) continue;
    todaySoftPlacements.push({
      taskId: block.taskId,
      startMin: block.packStartMin ?? block.startMin,
      endMin,
    });
    if (atRiskSoft == null || endMin >= atRiskSoft.endMin) {
      atRiskSoft = { task: block.task, endMin };
    }
  }
  todaySoftPlacements.sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.taskId.localeCompare(b.taskId),
  );

  const todayPackEnd = getPackEnd(todayStart);
  const todayEndSlackMin = Math.max(0, todayPackEnd - todayLastBlockEnd);
  const atRiskTask =
    todayEndSlackMin === 0 && atRiskSoft != null ? atRiskSoft.task : null;

  return {
    days: layouts,
    overdueTasks: sortOverdueTasks(overdueTasks),
    deferredTasks: [...deferredTasks].sort(compareSoftPriority),
    todaySoftPlacements,
    todayEndSlackMin,
    atRiskTask,
  };
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${period}`;
}

export function formatMinutesLabel(totalMinutes: number): string {
  const mins =
    ((Math.round(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  if (minute === 0) return `${hour} ${period}`;
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function buildPackWindowMarkers(
  day: Date,
  now: Date,
  packEnd: number,
  visibleStartMin: number,
  windowStartMinutes: number = PACK_START_MINUTES,
): Pick<
  CalendarDayLayout,
  | "packStartMin"
  | "packEndMin"
  | "packStartLabel"
  | "packEndLabel"
  | "packStartTopPx"
  | "packEndTopPx"
  | "packBandTopPx"
  | "packBandHeightPx"
> {
  const markerStart = windowStartMinutes;
  const packStart = packStartForDay(day, now, packEnd, windowStartMinutes);
  const visibleEnd = MINUTES_PER_DAY;
  const windowOpen = packStart < packEnd || markerStart < packEnd;

  const toTop = (absMin: number): number | null => {
    if (absMin < visibleStartMin || absMin > visibleEnd) return null;
    return (absMin - visibleStartMin) * PX_PER_MINUTE;
  };

  return {
    packStartMin: markerStart,
    packEndMin: packEnd,
    packStartLabel: formatMinutesLabel(markerStart),
    packEndLabel: formatMinutesLabel(packEnd),
    packStartTopPx: windowOpen ? toTop(markerStart) : null,
    packEndTopPx: windowOpen ? toTop(packEnd) : null,
    packBandTopPx: null,
    packBandHeightPx: null,
  };
}

/** @deprecated Prefer per-day hourMarkers from layout. */
export const HOUR_MARKERS = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  label: formatHourLabel(hour),
  topPx: hour * 60 * PX_PER_MINUTE,
}));

/** Fixed height for a collapsed before/after stub in expanded timeline view. */
export const OUTSIDE_COLLAPSE_STUB_PX = 32;
/** Height of the collapse control shown on an expanded outside region edge. */
export const OUTSIDE_COLLAPSE_CONTROL_PX = 24;

export type OutsideRegionId = "before" | "after";

export type OutsideExpandedFlags = {
  before?: boolean;
  after?: boolean;
};

export type OutsideCollapseStub = {
  region: OutsideRegionId;
  /** True when the outside region is collapsed into a stub. */
  collapsed: boolean;
  startMin: number;
  endMin: number;
  collapsedMinutes: number;
  topPx: number;
  heightPx: number;
  label: string;
};

export type OutsideCollapsedDayView = {
  visibleDisplayPx: number;
  blocks: CalendarTaskBlock[];
  hourMarkers: Array<{ hour: number; label: string; topPx: number }>;
  packStartTopPx: number | null;
  packEndTopPx: number | null;
  stubs: OutsideCollapseStub[];
};

type DisplaySegment = {
  region: "before" | "window" | "after";
  start: number;
  end: number;
  open: boolean;
  /** Anchored task forces this outside region open (no user collapse). */
  forcedOpen: boolean;
};

function isAnchoredTaskBlock(block: CalendarTaskBlock): boolean {
  return (
    parseTimeOfDay(block.task.starts_at) != null ||
    parseTimeOfDay(block.task.due_at) != null
  );
}

function regionOverlapsAnchored(
  blocks: CalendarTaskBlock[],
  start: number,
  end: number,
): boolean {
  if (end <= start) return false;
  return blocks.some(
    (block) =>
      isAnchoredTaskBlock(block) && block.startMin < end && block.endMin > start,
  );
}

function formatCollapsedDurationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function segmentDisplayHeight(seg: DisplaySegment): number {
  if (seg.end <= seg.start) return 0;
  if (seg.open) return (seg.end - seg.start) * PX_PER_MINUTE;
  return OUTSIDE_COLLAPSE_STUB_PX;
}

function mapAbsMinToTop(absMin: number, segments: DisplaySegment[]): number {
  let y = 0;
  for (const seg of segments) {
    if (seg.end <= seg.start) continue;
    if (absMin <= seg.start) return y;
    if (absMin >= seg.end) {
      y += segmentDisplayHeight(seg);
      continue;
    }
    if (seg.open) {
      return y + (absMin - seg.start) * PX_PER_MINUTE;
    }
    return y;
  }
  return y;
}

function mapAbsRangeToDisplay(
  startMin: number,
  endMin: number,
  segments: DisplaySegment[],
): { topPx: number; heightPx: number } | null {
  if (endMin <= startMin) return null;
  let topPx: number | null = null;
  let bottomPx = 0;
  let y = 0;

  for (const seg of segments) {
    if (seg.end <= seg.start) continue;
    const segHeight = segmentDisplayHeight(seg);
    const overlapStart = Math.max(startMin, seg.start);
    const overlapEnd = Math.min(endMin, seg.end);
    if (overlapEnd > overlapStart && seg.open) {
      const localTop = y + (overlapStart - seg.start) * PX_PER_MINUTE;
      const localBottom = y + (overlapEnd - seg.start) * PX_PER_MINUTE;
      if (topPx == null) topPx = localTop;
      bottomPx = localBottom;
    }
    y += segHeight;
  }

  if (topPx == null || bottomPx <= topPx) return null;
  return {
    topPx,
    heightPx: Math.max(MIN_BLOCK_HEIGHT_PX, bottomPx - topPx),
  };
}

/**
 * Remap a day layout so time outside the task window is collapsed into stubs,
 * unless the user expanded that region or an anchored task overlaps it.
 */
export function buildOutsideCollapsedDayView(
  day: CalendarDayLayout,
  expanded: OutsideExpandedFlags = {},
): OutsideCollapsedDayView {
  const visibleStart = day.visibleStartMin;
  const visibleEnd = visibleStart + day.visibleMinutes;
  const windowStart = day.packStartMin;
  const windowEnd = day.packEndMin;
  const windowOpen = windowStart < windowEnd;

  if (!windowOpen || visibleEnd <= visibleStart) {
    return {
      visibleDisplayPx: Math.max(PX_PER_MINUTE, day.visibleMinutes * PX_PER_MINUTE),
      blocks: day.blocks,
      hourMarkers: day.hourMarkers,
      packStartTopPx: day.packStartTopPx,
      packEndTopPx: day.packEndTopPx,
      stubs: [],
    };
  }

  const beforeStart = visibleStart;
  const beforeEnd = Math.min(Math.max(windowStart, visibleStart), visibleEnd);
  const midStart = Math.min(Math.max(windowStart, visibleStart), visibleEnd);
  const midEnd = Math.min(Math.max(windowEnd, visibleStart), visibleEnd);
  const afterStart = Math.min(Math.max(windowEnd, visibleStart), visibleEnd);
  const afterEnd = visibleEnd;

  const beforeForced = regionOverlapsAnchored(day.blocks, beforeStart, beforeEnd);
  const afterForced = regionOverlapsAnchored(day.blocks, afterStart, afterEnd);
  const beforeOpen = beforeEnd > beforeStart && (expanded.before === true || beforeForced);
  const afterOpen = afterEnd > afterStart && (expanded.after === true || afterForced);

  const segments: DisplaySegment[] = [];
  if (beforeEnd > beforeStart) {
    segments.push({
      region: "before",
      start: beforeStart,
      end: beforeEnd,
      open: beforeOpen,
      forcedOpen: beforeForced,
    });
  }
  if (midEnd > midStart) {
    segments.push({
      region: "window",
      start: midStart,
      end: midEnd,
      open: true,
      forcedOpen: false,
    });
  }
  if (afterEnd > afterStart) {
    segments.push({
      region: "after",
      start: afterStart,
      end: afterEnd,
      open: afterOpen,
      forcedOpen: afterForced,
    });
  }

  let visibleDisplayPx = 0;
  for (const seg of segments) {
    visibleDisplayPx += segmentDisplayHeight(seg);
  }
  visibleDisplayPx = Math.max(PX_PER_MINUTE, visibleDisplayPx);

  const blocks: CalendarTaskBlock[] = [];
  for (const block of day.blocks) {
    const mapped = mapAbsRangeToDisplay(block.startMin, block.endMin, segments);
    if (!mapped) continue;
    blocks.push({
      ...block,
      topPx: mapped.topPx,
      heightPx: mapped.heightPx,
    });
  }

  const hourMarkers: OutsideCollapsedDayView["hourMarkers"] = [];
  const firstHour = Math.ceil(visibleStart / 60);
  for (let hour = firstHour; hour < 24; hour += 1) {
    const absTop = hour * 60;
    if (absTop < visibleStart || absTop > visibleEnd) continue;
    const host = segments.find((seg) => absTop >= seg.start && absTop < seg.end);
    if (host && !host.open) continue;
    // Allow hour exactly at visibleEnd only if needed — skip (= end of day).
    if (absTop === visibleEnd) continue;
    hourMarkers.push({
      hour,
      label: formatHourLabel(hour),
      topPx: mapAbsMinToTop(absTop, segments),
    });
  }

  const packStartTopPx =
    windowStart >= visibleStart && windowStart <= visibleEnd
      ? mapAbsMinToTop(windowStart, segments)
      : null;
  const packEndTopPx =
    windowEnd >= visibleStart && windowEnd <= visibleEnd
      ? mapAbsMinToTop(windowEnd, segments)
      : null;

  const stubs: OutsideCollapseStub[] = [];
  for (const seg of segments) {
    if (seg.region === "window") continue;
    const minutes = seg.end - seg.start;
    if (minutes <= 0) continue;

    if (!seg.open) {
      const topPx = mapAbsMinToTop(seg.start, segments);
      stubs.push({
        region: seg.region,
        collapsed: true,
        startMin: seg.start,
        endMin: seg.end,
        collapsedMinutes: minutes,
        topPx,
        heightPx: OUTSIDE_COLLAPSE_STUB_PX,
        label:
          seg.region === "before"
            ? `↑ ${formatCollapsedDurationLabel(minutes)}`
            : `↓ ${formatCollapsedDurationLabel(minutes)}`,
      });
      continue;
    }

    // Expanded by user (not forced by anchored task): show collapse control at edge.
    if (seg.forcedOpen || !(seg.region === "before" ? expanded.before : expanded.after)) {
      continue;
    }

    const edgeAbs = seg.region === "before" ? seg.end : seg.start;
    const edgeTop = mapAbsMinToTop(edgeAbs, segments);
    const topPx =
      seg.region === "before"
        ? Math.max(0, edgeTop - OUTSIDE_COLLAPSE_CONTROL_PX)
        : edgeTop;
    stubs.push({
      region: seg.region,
      collapsed: false,
      startMin: seg.start,
      endMin: seg.end,
      collapsedMinutes: minutes,
      topPx,
      heightPx: OUTSIDE_COLLAPSE_CONTROL_PX,
      label: "Collapse",
    });
  }

  return {
    visibleDisplayPx,
    blocks,
    hourMarkers,
    packStartTopPx,
    packEndTopPx,
    stubs,
  };
}