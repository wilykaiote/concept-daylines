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

function taskDurationMinutes(task: ComposerDraft): number {
  const raw = task.est_duration;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return DEFAULT_TASK_MINUTES;
  return Math.max(1, Math.round(raw));
}

function pushBlock(
  byDay: Map<string, Array<Omit<CalendarTaskBlock, "topPx" | "heightPx"> & { startMin: number; endMin: number }>>,
  day: Date,
  task: ComposerDraft,
  startMin: number,
  endMin: number,
  segmentIndex: number,
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
  });
  byDay.set(key, list);
}

function placeDuration(
  byDay: Map<string, Array<Omit<CalendarTaskBlock, "topPx" | "heightPx"> & { startMin: number; endMin: number }>>,
  task: ComposerDraft,
  startDay: Date,
  startMin: number,
  duration: number,
  getPackEnd: (day: Date) => number,
  now: Date,
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
    pushBlock(byDay, day, task, cursor, cursor + take, segment);
    segment += 1;
    remaining -= take;
    cursor += take;
    if (remaining > 0) {
      day = addDays(day, 1);
      cursor = PACK_START_MINUTES;
    }
  }
}

function occupiedIntervalsForDay(
  byDay: Map<string, Array<{ startMin: number; endMin: number }>>,
  key: string,
): Interval[] {
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

function packUndatedEvenly(
  byDay: Map<string, Array<Omit<CalendarTaskBlock, "topPx" | "heightPx"> & { startMin: number; endMin: number }>>,
  undated: ComposerDraft[],
  now: Date,
  getPackEnd: (day: Date) => number,
) {
  const queue = [...undated];
  let day = toStartOfDay(now);
  let guard = 0;

  while (queue.length > 0 && guard < 1000) {
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

    const fitted: Array<{ task: ComposerDraft; minutes: number }> = [];
    let used = 0;
    while (queue.length > 0) {
      const minutes = taskDurationMinutes(queue[0]);
      if (used + minutes <= freeTotal) {
        fitted.push({ task: queue.shift()!, minutes });
        used += minutes;
      } else {
        break;
      }
    }

    if (fitted.length === 0) {
      const task = queue.shift()!;
      const minutes = taskDurationMinutes(task);
      if (free[0]) {
        placeDuration(byDay, task, day, free[0].start, minutes, getPackEnd, now);
      } else {
        placeDuration(byDay, task, addDays(day, 1), PACK_START_MINUTES, minutes, getPackEnd, now);
      }
      day = addDays(day, 1);
      continue;
    }

    const slack = Math.max(0, freeTotal - used);
    const gap = slack / (fitted.length + 1);
    let virtualCursor = gap;

    for (const item of fitted) {
      const range = realRangeFromVirtual(free, virtualCursor, item.minutes);
      if (range) {
        pushBlock(byDay, day, item.task, range.start, range.end, 0);
        virtualCursor += item.minutes + gap;
      } else {
        placeDuration(byDay, item.task, day, packStart, item.minutes, getPackEnd, now);
        virtualCursor += item.minutes + gap;
      }
    }

    day = addDays(day, 1);
  }
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

export function layoutCalendarTasks(
  tasks: ComposerDraft[],
  now: Date,
  getTargetTimeForDay: (day: Date) => string,
): CalendarDayLayout[] {
  const getPackEnd = (day: Date) => packWindowEndMinutes(getTargetTimeForDay(day));
  const todayStart = toStartOfDay(now);
  const nowMin = minutesFromMidnight(now);
  const byDay = new Map<
    string,
    Array<Omit<CalendarTaskBlock, "topPx" | "heightPx"> & { startMin: number; endMin: number }>
  >();

  const dated: ComposerDraft[] = [];
  const undated: ComposerDraft[] = [];
  for (const task of tasks) {
    if (parseTaskDateTime(task.date_time)) dated.push(task);
    else undated.push(task);
  }

  for (const task of dated) {
    const when = parseTaskDateTime(task.date_time)!;
    const day = toStartOfDay(when);
    if (day.getTime() < todayStart.getTime()) continue;

    let minutes = when.getHours() * 60 + when.getMinutes();
    let startDay = day;
    const duration = taskDurationMinutes(task);

    if (day.getTime() === todayStart.getTime()) {
      if (minutes + duration <= nowMin) continue;
      if (minutes < nowMin) minutes = nowMin;
    }

    const packEnd = getPackEnd(startDay);
    const packStart = packStartForDay(startDay, now, packEnd);
    let startMin = minutes;
    if (startMin < packStart) startMin = packStart;
    if (startMin >= packEnd) {
      startDay = addDays(day, 1);
      startMin = PACK_START_MINUTES;
    }
    placeDuration(byDay, task, startDay, startMin, duration, getPackEnd, now);
  }

  packUndatedEvenly(byDay, undated, now, getPackEnd);

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

  return layouts;
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
