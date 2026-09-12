import type { ComposerDraft } from "./composer";

export type ScheduleSegment =
  | { type: "gap"; minutes: number }
  | { type: "task"; minutes: number; task: ComposerDraft };

export function buildScheduleSegments(
  tasks: ComposerDraft[],
  remainingMs: number,
): ScheduleSegment[] {
  const remainingMinutes = Math.max(remainingMs / 60_000, 0.001);
  if (tasks.length === 0) {
    return [{ type: "gap", minutes: remainingMinutes }];
  }

  const durations = tasks.map((task) => Math.max(0, task.est_duration ?? 0));
  const totalTaskMinutes = durations.reduce((sum, minutes) => sum + minutes, 0);
  const slack = Math.max(0, remainingMinutes - totalTaskMinutes);
  const gapCount = tasks.length + 1;
  const gapMinutes = slack / gapCount;

  const segments: ScheduleSegment[] = [];
  for (let i = 0; i < tasks.length; i += 1) {
    if (gapMinutes > 0) {
      segments.push({ type: "gap", minutes: gapMinutes });
    }
    const minutes = totalTaskMinutes > 0 ? durations[i] : 1;
    segments.push({ type: "task", minutes, task: tasks[i] });
  }
  if (gapMinutes > 0) {
    segments.push({ type: "gap", minutes: gapMinutes });
  }

  return segments;
}
