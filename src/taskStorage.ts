import type { ComposerDraft } from "./composer";

const TASKS_STORAGE_KEY = "twineline.tasks";

function isComposerDraft(value: unknown): value is ComposerDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return typeof draft.title === "string";
}

export function loadTasks(): ComposerDraft[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isComposerDraft);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: ComposerDraft[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}
