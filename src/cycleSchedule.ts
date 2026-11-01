import { dayKey, parseTaskDate } from "./calendarTimeline";
import { withMetaAuto, type ComposerDraft } from "./composer";
import {
  parseRecurring,
  shiftRecurringInterval,
  type RecurringSchedule,
} from "./recurring";

export type CycleSide = "before" | "after";

export function isCycleSide(value: string | null | undefined): value is CycleSide {
  return value === "before" || value === "after";
}

export function isCycleLinked(
  task: Pick<ComposerDraft, "after_id" | "after">,
): boolean {
  return task.after_id != null && isCycleSide(task.after);
}

export function isCycleScheduled(
  task: Pick<ComposerDraft, "after_id" | "after" | "recurring">,
): boolean {
  return isCycleLinked(task) && parseRecurring(task.recurring) != null;
}

export function offsetCycleDateKey(
  anchorKey: string,
  schedule: RecurringSchedule,
  side: CycleSide,
): string | null {
  const anchor = parseTaskDate(anchorKey);
  if (!anchor) return null;
  return dayKey(shiftRecurringInterval(anchor, schedule, side === "before" ? -1 : 1));
}

function taskIdOf(task: ComposerDraft): string | null {
  return task.id != null && task.id.length > 0 ? task.id : null;
}

/** True when following `after_id` among cycle-scheduled tasks returns to `id`. */
export function isInCycleLoop(
  tasks: readonly ComposerDraft[],
  id: string,
): boolean {
  const byId = new Map<string, ComposerDraft>();
  for (const task of tasks) {
    const idValue = taskIdOf(task);
    if (idValue) byId.set(idValue, task);
  }
  const start = byId.get(id);
  if (!start || !isCycleScheduled(start)) return false;
  const seen = new Set<string>();
  let current: string | null = start.after_id;
  while (current != null) {
    if (current === id) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    const node = byId.get(current);
    if (!node || !isCycleScheduled(node)) return false;
    current = node.after_id;
  }
  return false;
}

export type ResolveCycleDatesOptions = {
  /** Cycle-scheduled ids to assign last (just-completed loop members). */
  inactiveIds?: ReadonlySet<string>;
};

/**
 * Rewrite cycle-scheduled dates so each follower sits N units before/after
 * its linked task. Loops freeze the earliest-date active member as the root
 * and skip the back-edge; `inactiveIds` are placed after the remaining chain.
 */
export function resolveCycleDates(
  tasks: ComposerDraft[],
  options?: ResolveCycleDatesOptions,
): ComposerDraft[] {
  const inactive = options?.inactiveIds ?? new Set<string>();
  const byId = new Map<string, ComposerDraft>();
  for (const task of tasks) {
    const id = taskIdOf(task);
    if (id) byId.set(id, task);
  }

  const cycleTasks = tasks.filter(
    (task): task is ComposerDraft & { id: string } =>
      taskIdOf(task) != null && isCycleScheduled(task),
  );
  if (cycleTasks.length === 0) return tasks;

  const dateById = new Map<string, string | null>();
  const freezeRoots = new Set<string>();

  const visited = new Set<string>();
  for (const task of cycleTasks) {
    if (inactive.has(task.id) || visited.has(task.id)) continue;
    const path: string[] = [];
    const indexById = new Map<string, number>();
    let current: string | null = task.id;
    while (current != null) {
      if (indexById.has(current)) {
        const cycle = path.slice(indexById.get(current));
        let root = cycle[0]!;
        for (const candidate of cycle) {
          const currentRoot = byId.get(root);
          const other = byId.get(candidate);
          const rootDate = currentRoot?.date ?? "\uffff";
          const otherDate = other?.date ?? "\uffff";
          if (otherDate < rootDate || (otherDate === rootDate && candidate < root)) {
            root = candidate;
          }
        }
        freezeRoots.add(root);
        break;
      }
      const node = byId.get(current);
      if (!node || !isCycleScheduled(node) || inactive.has(current)) break;
      indexById.set(current, path.length);
      path.push(current);
      visited.add(current);
      current = node.after_id;
    }
  }

  for (const completedId of inactive) {
    for (const task of cycleTasks) {
      if (task.after_id === completedId && !inactive.has(task.id)) {
        freezeRoots.add(task.id);
      }
    }
  }

  for (const task of tasks) {
    const id = taskIdOf(task);
    if (!id) continue;
    if (!isCycleScheduled(task) || freezeRoots.has(id)) {
      dateById.set(id, task.date);
    }
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < tasks.length + 4) {
    changed = false;
    guard += 1;
    for (const task of cycleTasks) {
      if (dateById.has(task.id) || inactive.has(task.id)) continue;
      const predId = task.after_id;
      if (predId == null || !dateById.has(predId)) continue;
      const predDate = dateById.get(predId) ?? null;
      const schedule = parseRecurring(task.recurring);
      if (predDate == null || schedule == null || !isCycleSide(task.after)) {
        dateById.set(task.id, task.date);
      } else {
        dateById.set(
          task.id,
          offsetCycleDateKey(predDate, schedule, task.after) ?? task.date,
        );
      }
      changed = true;
    }
  }

  for (const id of inactive) {
    const task = byId.get(id);
    if (!task || !isCycleScheduled(task) || !isCycleSide(task.after)) continue;
    const predDate =
      task.after_id != null ? (dateById.get(task.after_id) ?? null) : null;
    const schedule = parseRecurring(task.recurring);
    if (predDate == null || schedule == null) {
      dateById.set(id, task.date);
      continue;
    }
    dateById.set(
      id,
      offsetCycleDateKey(predDate, schedule, task.after) ?? task.date,
    );
  }

  let mutated = false;
  const next = tasks.map((task) => {
    const id = taskIdOf(task);
    if (!id || !dateById.has(id)) return task;
    const nextDate = dateById.get(id) ?? null;
    if (nextDate === task.date) return task;
    mutated = true;
    const updated = { ...task, date: nextDate };
    return nextDate != null ? withMetaAuto(updated, "schedule") : updated;
  });
  return mutated ? next : tasks;
}

export function rotateCompletedCycleTask(
  tasks: ComposerDraft[],
  completedId: string,
): ComposerDraft[] | null {
  if (!isInCycleLoop(tasks, completedId)) return null;
  return resolveCycleDates(tasks, { inactiveIds: new Set([completedId]) });
}
