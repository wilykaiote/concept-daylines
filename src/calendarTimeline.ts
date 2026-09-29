import type { ComposerDraft } from "./composer";
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
  /** Minutes from midnight on this day. */
  startMin: number;
  endMin: number;
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
  Now: 0,
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

function taskDurationMinutes(task: ComposerDraft): number {
  const raw = task.est_duration;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return DEFAULT_TASK_MINUTES;
  return Math.max(1, Math.round(raw));
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
    overdue,
  });
  byDay.set(key, list);
}

function isPlacementOverdue(task: ComposerDraft, placementDay: Date): boolean {
  const scheduled = parseTaskDate(task.date);
  if (!scheduled) return false;
  return toStartOfDay(placementDay).getTime() > scheduled.getTime();
}

function placeDuration(
  byDay: Map<string, PackBlock[]>,
  task: ComposerDraft,
  startDay: Date,
  startMin: number,
  duration: number,
  getPackEnd: (day: Date) => number,
  getWindowStart: (day: Date) => number,
  now: Date,
  forceOverdue = false,
  allowSpill = true,
) {
  let remaining = duration;
  let day = toStartOfDay(startDay);
  let cursor = startMin;
  let segment = 0;
  const today = toStartOfDay(now);

  while (remaining > 0) {
    if (day.getTime() < today.getTime()) {
      day = addDays(day, 1);
      cursor = getWindowStart(day);
      continue;
    }
    const packEnd = getPackEnd(day);
    const packStart = packStartForDay(day, now, packEnd, getWindowStart(day));
    cursor = Math.max(cursor, packStart);
    if (cursor >= packEnd) {
      if (!allowSpill) break;
      day = addDays(day, 1);
      cursor = getWindowStart(day);
      continue;
    }
    const room = packEnd - cursor;
    const take = Math.min(remaining, room);
    const overdue = forceOverdue || isPlacementOverdue(task, day);
    pushBlock(byDay, day, task, cursor, cursor + take, segment, overdue);
    segment += 1;
    remaining -= take;
    cursor += take;
    if (remaining > 0) {
      if (!allowSpill) break;
      day = addDays(day, 1);
      cursor = getWindowStart(day);
    }
  }
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
 * Place a timed task on its scheduled day, or collect it as overdue when missed.
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

  if (isAnchoredTaskMissed(task, now, getPackEnd(scheduled), getWindowStart(scheduled))) {
    overdueTasks.push(task);
    return;
  }

  const packEnd = getPackEnd(scheduled);
  const packStart = packStartForDay(scheduled, now, packEnd, getWindowStart(scheduled));
  const startMin = resolveTimedStartMin(task, packStart);
  pushBlock(byDay, scheduled, task, startMin, startMin + taskDurationMinutes(task), 0, false);
}

function occupiedIntervalsForDay(byDay: Map<string, PackBlock[]>, key: string): Interval[] {
  const blocks = byDay.get(key) ?? [];
  return blocks
    .map((block) => ({ start: block.startMin, end: block.endMin }))
    .sort((a, b) => a.start - b.start);
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

/** Map a position along concatenated free intervals back to a real time range. */
function realRangeFromVirtual(
  free: Interval[],
  virtualStart: number,
  length: number,
): Interval | null {
  let virtualCursor = 0;
  for (let i = 0; i < free.length; i += 1) {
    const len = free[i].end - free[i].start;
    if (virtualStart <= virtualCursor + len) {
      const offset = Math.max(0, virtualStart - virtualCursor);
      const start = free[i].start + offset;
      if (start + length <= free[i].end) {
        return { start, end: start + length };
      }
      for (let j = i + 1; j < free.length; j += 1) {
        if (free[j].end - free[j].start >= length) {
          return { start: free[j].start, end: free[j].start + length };
        }
      }
      return null;
    }
    virtualCursor += len;
  }
  return null;
}

function placeSoftBatchWithGap(
  byDay: Map<string, PackBlock[]>,
  day: Date,
  fitted: Array<{ task: ComposerDraft; minutes: number; forceOverdue: boolean }>,
  free: Interval[],
  packStart: number,
  getPackEnd: (day: Date) => number,
  getWindowStart: (day: Date) => number,
  now: Date,
  gapMinutes: number,
) {
  const gap = Math.max(0, gapMinutes);
  let virtualCursor = 0;

  for (const item of fitted) {
    const overdue = item.forceOverdue || isPlacementOverdue(item.task, day);
    const range = realRangeFromVirtual(free, virtualCursor, item.minutes);
    if (range) {
      pushBlock(byDay, day, item.task, range.start, range.end, 0, overdue);
    } else {
      placeDuration(
        byDay,
        item.task,
        day,
        packStart,
        item.minutes,
        getPackEnd,
        getWindowStart,
        now,
        overdue,
        false,
      );
    }
    virtualCursor += item.minutes + gap;
  }
}

function packSoftTasks(
  byDay: Map<string, PackBlock[]>,
  dateOnlyByDay: Map<string, ComposerDraft[]>,
  undated: ComposerDraft[],
  now: Date,
  getPackEnd: (day: Date) => number,
  getWindowStart: (day: Date) => number,
  overdueTasks: ComposerDraft[],
  gapMinutes: number,
) {
  const undatedQueue = [...undated].sort(compareSoftPriority);
  const dateOnlyQueues = new Map<string, ComposerDraft[]>();
  for (const [key, list] of dateOnlyByDay) {
    dateOnlyQueues.set(key, [...list].sort(compareSoftPriority));
  }

  let day = toStartOfDay(now);
  let guard = 0;
  const gap = Math.max(0, gapMinutes);

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

  while (hasRemaining() && guard < 1000) {
    guard += 1;
    const key = dayKey(day);
    const packEnd = getPackEnd(day);
    const packStart = packStartForDay(day, now, packEnd, getWindowStart(day));
    if (packStart >= packEnd) {
      // Pack window closed for this day — date-only tasks cannot be placed.
      drainDateOnlyToOverdue(key);
      day = addDays(day, 1);
      continue;
    }

    const free = freeIntervals(packStart, packEnd, occupiedIntervalsForDay(byDay, key));
    const freeTotal = free.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
    if (freeTotal <= 0) {
      drainDateOnlyToOverdue(key);
      day = addDays(day, 1);
      continue;
    }

    const sameDayQueue = dateOnlyQueues.get(key) ?? [];
    const fitted: Array<{ task: ComposerDraft; minutes: number; forceOverdue: boolean }> = [];
    let used = 0;

    const takeFitting = (queue: ComposerDraft[], forceOverdue: boolean) => {
      while (queue.length > 0) {
        const minutes = taskDurationMinutes(queue[0]);
        const nextUsed = used + minutes + (fitted.length > 0 ? gap : 0);
        if (nextUsed <= freeTotal) {
          fitted.push({ task: queue.shift()!, minutes, forceOverdue });
          used = nextUsed;
        } else {
          break;
        }
      }
    };

    // Prefer date-only for D, then undated — spaced by master gap.
    takeFitting(sameDayQueue, false);
    takeFitting(undatedQueue, false);

    if (fitted.length === 0) {
      // Nothing fits whole; undated may force-place / spill days. Date-only → overdue.
      if (sameDayQueue.length > 0) {
        overdueTasks.push(sameDayQueue.shift()!);
        dateOnlyQueues.set(key, sameDayQueue);
        continue;
      }
      if (undatedQueue.length > 0) {
        const task = undatedQueue.shift()!;
        const minutes = taskDurationMinutes(task);
        if (free[0]) {
          placeDuration(
            byDay,
            task,
            day,
            free[0].start,
            minutes,
            getPackEnd,
            getWindowStart,
            now,
            false,
            false,
          );
        } else {
          const nextDay = addDays(day, 1);
          placeDuration(
            byDay,
            task,
            nextDay,
            getWindowStart(nextDay),
            minutes,
            getPackEnd,
            getWindowStart,
            now,
            false,
          );
        }
      }
      dateOnlyQueues.set(key, sameDayQueue);
      day = addDays(day, 1);
      continue;
    }

    placeSoftBatchWithGap(
      byDay,
      day,
      fitted,
      free,
      packStart,
      getPackEnd,
      getWindowStart,
      now,
      gap,
    );

    // Remaining same-day date-only could not fit → overdue group (do not reschedule).
    while (sameDayQueue.length > 0) {
      overdueTasks.push(sameDayQueue.shift()!);
    }

    dateOnlyQueues.set(key, sameDayQueue);
    day = addDays(day, 1);
  }

  // Anything still queued for today-or-earlier could not be placed.
  const todayKey = dayKey(toStartOfDay(now));
  for (const [key, list] of dateOnlyQueues) {
    if (list.length === 0) continue;
    if (key <= todayKey) {
      while (list.length > 0) overdueTasks.push(list.shift()!);
      dateOnlyQueues.set(key, list);
    }
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

/**
 * After midnight, move overdue tasks (top → bottom) to the earliest future day
 * they can fit. Only `date` changes; `starts_at` / `due_at` stay the same.
 * Marks moved tasks with `auto_rescheduled: true`.
 */
export function rescheduleOverdueTasksForNewDay(
  tasks: ComposerDraft[],
  now: Date,
  getTargetTimeForDay: (day: Date) => string,
  taskGapMinutes: number = DEFAULT_TASK_GAP_MINUTES,
  getWindowStartTimeForDay: (day: Date) => string = () => "06:00",
): ComposerDraft[] {
  const layout = layoutCalendarTasks(
    tasks,
    now,
    getTargetTimeForDay,
    taskGapMinutes,
    getWindowStartTimeForDay,
  );
  const overdue = layout.overdueTasks;
  if (overdue.length === 0) return tasks;

  let working = tasks.map((task) => ({ ...task }));
  const today = toStartOfDay(now);
  let changed = false;

  for (const overdueTask of overdue) {
    if (!overdueTask.id) continue;
    const current = working.find((task) => task.id === overdueTask.id);
    if (!current) continue;

    let nextDate: string | null = null;
    for (let offset = 0; offset < AUTO_RESCHEDULE_LOOKAHEAD_DAYS; offset += 1) {
      const candidateDate = dayKey(addDays(today, offset));
      const candidateTasks = working.map((task) =>
        task.id === overdueTask.id
          ? {
              ...task,
              date: candidateDate,
              // Keep original times; only the date moves.
              starts_at: current.starts_at,
              due_at: current.due_at,
            }
          : task,
      );
      const candidateLayout = layoutCalendarTasks(
        candidateTasks,
        now,
        getTargetTimeForDay,
        taskGapMinutes,
        getWindowStartTimeForDay,
      );
      const stillOverdue = candidateLayout.overdueTasks.some(
        (task) => task.id === overdueTask.id,
      );
      if (!stillOverdue) {
        nextDate = candidateDate;
        break;
      }
    }

    if (nextDate == null || nextDate === current.date) continue;

    working = working.map((task) =>
      task.id === overdueTask.id
        ? {
            ...task,
            date: nextDate,
            starts_at: current.starts_at,
            due_at: current.due_at,
            auto_rescheduled: true,
          }
        : task,
    );
    changed = true;
  }

  return changed ? working : tasks;
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

export type CalendarTasksLayout = {
  days: CalendarDayLayout[];
  overdueTasks: ComposerDraft[];
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

  for (const block of dayLayout.blocks) {
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

export function layoutCalendarTasks(
  tasks: ComposerDraft[],
  now: Date,
  getTargetTimeForDay: (day: Date) => string,
  taskGapMinutes: number = DEFAULT_TASK_GAP_MINUTES,
  getWindowStartTimeForDay: (day: Date) => string = () => "06:00",
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

  const timed: ComposerDraft[] = [];
  const dateOnlyByDay = new Map<string, ComposerDraft[]>();
  const undated: ComposerDraft[] = [];

  for (const task of tasks) {
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
    const dayPackEnd = getPackEnd(scheduled);
    const dayWindowStart = getWindowStart(scheduled);
    if (
      scheduled.getTime() < todayStart.getTime() ||
      (scheduled.getTime() === todayStart.getTime() &&
        packStartForDay(scheduled, now, dayPackEnd, dayWindowStart) >= dayPackEnd)
    ) {
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

  packSoftTasks(
    byDay,
    dateOnlyByDay,
    undated,
    now,
    getPackEnd,
    getWindowStart,
    overdueTasks,
    gapMinutes,
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
    const packEnd = getPackEnd(d);

    for (const block of rawBlocks) {
      if (block.endMin <= visibleStartMin) continue;
      const startMin = Math.max(block.startMin, visibleStartMin);
      const endMin = block.endMin;
      if (endMin <= startMin) continue;
      blocks.push({
        ...block,
        startMin,
        endMin,
        topPx: (startMin - visibleStartMin) * PX_PER_MINUTE,
        heightPx: Math.max(MIN_BLOCK_HEIGHT_PX, (endMin - startMin) * PX_PER_MINUTE),
      });
    }

    blocks.sort(
      (a, b) =>
        a.startMin - b.startMin ||
        a.endMin - b.endMin ||
        (a.taskId ?? a.key).localeCompare(b.taskId ?? b.key),
    );

    layouts.push({
      date: d,
      dayKey: key,
      visibleStartMin,
      visibleMinutes,
      ...buildPackWindowMarkers(d, now, packEnd, visibleStartMin, getWindowStart(d)),
      blocks,
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
      hourMarkers: buildHourMarkers(visibleStartMin),
    });
  }

  // Safety: any missed dated task that never got a block still belongs in Overdue.
  const placedIds = new Set<string>();
  for (const blocks of byDay.values()) {
    for (const block of blocks) {
      if (block.taskId) placedIds.add(block.taskId);
    }
  }
  const overdueIds = new Set(
    overdueTasks.map((task) => task.id).filter((id): id is string => !!id),
  );
  for (const task of tasks) {
    if (!task.id || placedIds.has(task.id) || overdueIds.has(task.id)) continue;
    if (isAnchoredTaskMissed(task, now, getPackEnd(todayStart), getWindowStart(todayStart))) {
      overdueTasks.push(task);
      overdueIds.add(task.id);
      continue;
    }
    // Date-only today-or-earlier that the soft packer never placed still belongs
    // in Overdue rather than vanishing.
    if (classifyTask(task) === "dateOnly") {
      const scheduled = parseTaskDate(task.date);
      if (scheduled && scheduled.getTime() <= todayStart.getTime()) {
        overdueTasks.push(task);
        overdueIds.add(task.id);
      }
    }
  }

  return {
    days: layouts,
    overdueTasks: sortOverdueTasks(overdueTasks),
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
