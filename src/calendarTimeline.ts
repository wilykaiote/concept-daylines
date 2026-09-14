import type { ComposerDraft } from "./composer";
import { toStartOfDay } from "./taskStorage";

export const PACK_START_MINUTES = 6 * 60;
export const PX_PER_MINUTE = 1;
export const MINUTES_PER_DAY = 24 * 60;
export const DAY_HEIGHT_PX = MINUTES_PER_DAY * PX_PER_MINUTE;
export const DEFAULT_TASK_MINUTES = 15;
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

export function packWindowEndMinutes(targetTime: string): number {
  const [hoursRaw, minutesRaw] = targetTime.split(":").map(Number);
  const hours = Number.isFinite(hoursRaw) ? hoursRaw : 17;
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const end = Math.min(MINUTES_PER_DAY, Math.max(0, hours * 60 + minutes));
  if (end <= PACK_START_MINUTES) return MINUTES_PER_DAY;
  return end;
}

/** Packing window start for a day: now on today (at least 6:00), else 6:00. */
export function packStartForDay(day: Date, now: Date, packEnd: number): number {
  const dayStart = toStartOfDay(day);
  const today = toStartOfDay(now);
  if (dayStart.getTime() < today.getTime()) return packEnd;
  if (dayStart.getTime() === today.getTime()) {
    const nowMin = minutesFromMidnight(now);
    return Math.min(packEnd, Math.max(PACK_START_MINUTES, nowMin));
  }
  return PACK_START_MINUTES;
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

/** Parse `HH:mm` into minutes from midnight. */
export function parseTimeOfDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
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
  if (task.starts_at || task.due_at) return "timed";
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
  now: Date,
  forceOverdue = false,
) {
  let remaining = duration;
  let day = toStartOfDay(startDay);
  let cursor = startMin;
  let segment = 0;
  const today = toStartOfDay(now);

  while (remaining > 0) {
    if (day.getTime() < today.getTime()) {
      day = addDays(day, 1);
      cursor = PACK_START_MINUTES;
      continue;
    }
    const packEnd = getPackEnd(day);
    const packStart = packStartForDay(day, now, packEnd);
    cursor = Math.max(cursor, packStart);
    if (cursor >= packEnd) {
      day = addDays(day, 1);
      cursor = PACK_START_MINUTES;
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
      day = addDays(day, 1);
      cursor = PACK_START_MINUTES;
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
  overdueTasks: ComposerDraft[],
) {
  const scheduled = parseTaskDate(task.date);
  if (!scheduled) return;
  const today = toStartOfDay(now);
  const duration = taskDurationMinutes(task);
  const nowMin = minutesFromMidnight(now);

  if (scheduled.getTime() < today.getTime()) {
    overdueTasks.push(task);
    return;
  }

  const packEnd = getPackEnd(scheduled);
  const packStart = packStartForDay(scheduled, now, packEnd);
  let startMin = resolveTimedStartMin(task, packStart);
  const endMin = startMin + duration;

  if (scheduled.getTime() === today.getTime() && endMin <= nowMin) {
    overdueTasks.push(task);
    return;
  }

  if (scheduled.getTime() === today.getTime() && startMin < nowMin) {
    startMin = nowMin;
  }

  pushBlock(byDay, scheduled, task, startMin, startMin + duration, 0, false);
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

function placeSoftBatchEvenly(
  byDay: Map<string, PackBlock[]>,
  day: Date,
  fitted: Array<{ task: ComposerDraft; minutes: number; forceOverdue: boolean }>,
  free: Interval[],
  freeTotal: number,
  packStart: number,
  getPackEnd: (day: Date) => number,
  now: Date,
) {
  const used = fitted.reduce((sum, item) => sum + item.minutes, 0);
  const slack = Math.max(0, freeTotal - used);
  const gap = slack / (fitted.length + 1);
  let virtualCursor = gap;

  for (const item of fitted) {
    const overdue = item.forceOverdue || isPlacementOverdue(item.task, day);
    const range = realRangeFromVirtual(free, virtualCursor, item.minutes);
    if (range) {
      pushBlock(byDay, day, item.task, range.start, range.end, 0, overdue);
    } else {
      placeDuration(byDay, item.task, day, packStart, item.minutes, getPackEnd, now, overdue);
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
  overdueTasks: ComposerDraft[],
) {
  const undatedQueue = [...undated].sort(compareSoftPriority);
  const dateOnlyQueues = new Map<string, ComposerDraft[]>();
  for (const [key, list] of dateOnlyByDay) {
    dateOnlyQueues.set(key, [...list].sort(compareSoftPriority));
  }

  let day = toStartOfDay(now);
  let guard = 0;

  const hasRemaining = () =>
    undatedQueue.length > 0 ||
    [...dateOnlyQueues.values()].some((list) => list.length > 0);

  while (hasRemaining() && guard < 1000) {
    guard += 1;
    const key = dayKey(day);
    const packEnd = getPackEnd(day);
    const packStart = packStartForDay(day, now, packEnd);
    if (packStart >= packEnd) {
      day = addDays(day, 1);
      continue;
    }

    const free = freeIntervals(packStart, packEnd, occupiedIntervalsForDay(byDay, key));
    const freeTotal = free.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
    if (freeTotal <= 0) {
      day = addDays(day, 1);
      continue;
    }

    const sameDayQueue = dateOnlyQueues.get(key) ?? [];
    const fitted: Array<{ task: ComposerDraft; minutes: number; forceOverdue: boolean }> = [];
    let used = 0;

    const takeFitting = (queue: ComposerDraft[], forceOverdue: boolean) => {
      while (queue.length > 0) {
        const minutes = taskDurationMinutes(queue[0]);
        if (used + minutes <= freeTotal) {
          fitted.push({ task: queue.shift()!, minutes, forceOverdue });
          used += minutes;
        } else {
          break;
        }
      }
    };

    // Prefer date-only for D, then undated — then spread evenly.
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
          placeDuration(byDay, task, day, free[0].start, minutes, getPackEnd, now, false);
        } else {
          placeDuration(
            byDay,
            task,
            addDays(day, 1),
            PACK_START_MINUTES,
            minutes,
            getPackEnd,
            now,
            false,
          );
        }
      }
      dateOnlyQueues.set(key, sameDayQueue);
      day = addDays(day, 1);
      continue;
    }

    placeSoftBatchEvenly(byDay, day, fitted, free, freeTotal, packStart, getPackEnd, now);

    // Remaining same-day date-only could not fit → overdue group (do not reschedule).
    while (sameDayQueue.length > 0) {
      overdueTasks.push(sameDayQueue.shift()!);
    }

    dateOnlyQueues.set(key, sameDayQueue);
    day = addDays(day, 1);
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

export function layoutCalendarTasks(
  tasks: ComposerDraft[],
  now: Date,
  getTargetTimeForDay: (day: Date) => string,
): CalendarTasksLayout {
  const getPackEnd = (day: Date) => packWindowEndMinutes(getTargetTimeForDay(day));
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
    placeTimedTask(byDay, task, now, getPackEnd, overdueTasks);
  }

  packSoftTasks(byDay, dateOnlyByDay, undated, now, getPackEnd, overdueTasks);

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

    layouts.push({
      date: d,
      dayKey: key,
      visibleStartMin,
      visibleMinutes,
      ...buildPackWindowMarkers(d, now, packEnd, visibleStartMin),
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
      ...buildPackWindowMarkers(todayStart, now, getPackEnd(todayStart), visibleStartMin),
      blocks: [],
      hourMarkers: buildHourMarkers(visibleStartMin),
    });
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
  // Visual start is always 6:00 — stays at absolute time and scrolls away once past.
  const markerStart = PACK_START_MINUTES;
  const packStart = packStartForDay(day, now, packEnd);
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
