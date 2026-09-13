import type { ComposerDraft } from "./composer";

export type ScheduleSegment =
  | { type: "gap"; minutes: number }
  | { type: "task"; minutes: number; task: ComposerDraft };

export type ScheduleLayout = {
  /** Minutes the visible lane represents (countdown remaining / day window). */
  timelineMinutes: number;
  segments: ScheduleSegment[];
  /** Tasks that did not fit in the remaining time. */
  overflowTasks: ComposerDraft[];
};

export type ScheduleDayBlock = {
  startMin: number;
  endMin: number;
  task: ComposerDraft;
};

export function timelineMinutesFromRemainingMs(remainingMs: number): number {
  return Math.max(remainingMs / 60_000, 0.001);
}

/**
 * Build a schedule lane from absolute day blocks inside a time window.
 * Gaps preserve free time so the track matches the selected day's packing.
 */
export function buildScheduleLayoutForWindow(
  blocks: ScheduleDayBlock[],
  windowStartMin: number,
  windowEndMin: number,
  overflowTasks: ComposerDraft[] = [],
): ScheduleLayout {
  const timelineMinutes = Math.max(windowEndMin - windowStartMin, 0.001);
  if (windowEndMin <= windowStartMin) {
    return {
      timelineMinutes: 0.001,
      segments: [{ type: "gap", minutes: 0.001 }],
      overflowTasks,
    };
  }

  const clipped = blocks
    .map((block) => ({
      start: Math.max(block.startMin, windowStartMin),
      end: Math.min(block.endMin, windowEndMin),
      task: block.task,
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const segments: ScheduleSegment[] = [];
  let cursor = windowStartMin;

  for (const block of clipped) {
    if (block.start > cursor) {
      segments.push({ type: "gap", minutes: block.start - cursor });
    }
    segments.push({ type: "task", minutes: block.end - block.start, task: block.task });
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < windowEndMin) {
    segments.push({ type: "gap", minutes: windowEndMin - cursor });
  }

  if (segments.length === 0) {
    segments.push({ type: "gap", minutes: timelineMinutes });
  }

  return { timelineMinutes, segments, overflowTasks };
}

/**
 * Pack tasks into a timeline whose length is the countdown remaining.
 * Fitted tasks keep true durations and are evenly spaced with free time.
 * Tasks that cannot fully fit are pushed to overflow (no scaling/scroll).
 */
export function buildScheduleLayout(
  tasks: ComposerDraft[],
  remainingMs: number,
): ScheduleLayout {
  const timelineMinutes = timelineMinutesFromRemainingMs(remainingMs);
  if (tasks.length === 0) {
    return {
      timelineMinutes,
      segments: [{ type: "gap", minutes: timelineMinutes }],
      overflowTasks: [],
    };
  }

  const fitted: Array<{ minutes: number; task: ComposerDraft }> = [];
  const overflowTasks: ComposerDraft[] = [];
  let usedMinutes = 0;

  for (const task of tasks) {
    const minutes = Math.max(0, task.est_duration ?? 0);

    if (usedMinutes + minutes <= timelineMinutes) {
      fitted.push({ minutes, task });
      usedMinutes += minutes;
      continue;
    }

    // First task alone longer than remaining: show it capped to the lane.
    if (fitted.length === 0 && minutes > 0) {
      fitted.push({ minutes: timelineMinutes, task });
      usedMinutes = timelineMinutes;
      continue;
    }

    overflowTasks.push(task);
  }

  if (fitted.length === 0) {
    return {
      timelineMinutes,
      segments: [{ type: "gap", minutes: timelineMinutes }],
      overflowTasks,
    };
  }

  const slack = Math.max(0, timelineMinutes - usedMinutes);
  const gapMinutes = slack / (fitted.length + 1);
  const segments: ScheduleSegment[] = [];

  for (const item of fitted) {
    if (gapMinutes > 0) {
      segments.push({ type: "gap", minutes: gapMinutes });
    }
    segments.push({ type: "task", minutes: item.minutes, task: item.task });
  }
  if (gapMinutes > 0) {
    segments.push({ type: "gap", minutes: gapMinutes });
  }

  return { timelineMinutes, segments, overflowTasks };
}
