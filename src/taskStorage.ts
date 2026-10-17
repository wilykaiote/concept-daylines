import {
  formatMetaAuto,
  type ComposerDraft,
  type MetaAutoKey,
} from "./composer";

const TASKS_STORAGE_KEY = "twineline.tasks";
const TARGET_TIME_STORAGE_KEY = "twineline.targetTime";
const TARGET_TIME_OVERRIDES_STORAGE_KEY = "twineline.targetTimeOverrides";
const WINDOW_START_STORAGE_KEY = "twineline.windowStartTime";
const WINDOW_START_OVERRIDES_STORAGE_KEY = "twineline.windowStartOverrides";
const DAY_SNOOZE_STORAGE_KEY = "twineline.daySnooze";
const TASK_GAP_STORAGE_KEY = "twineline.taskGapMinutes";
const LAST_AUTO_RESCHEDULE_DAY_KEY = "twineline.lastAutoRescheduleDay";
const TODAY_WINDOW_BASELINE_KEY = "twineline.todayWindowBaseline";
const TODAY_SOFT_PACK_PLAN_KEY = "twineline.todaySoftPackPlan";
const CURRENT_FOCUS_KEY = "twineline.currentFocus";
const PLAN_COMPLETED_COUNTS_KEY = "twineline.planCompletedCounts";
const RECENT_LINK_IDS_KEY = "twineline.recentLinkIds";
const UI_SESSION_KEY = "twineline.uiSession";
const MAX_RECENT_LINK_IDS = 40;
const DEFAULT_TIMELINE_DAY_COUNT = 31;
const MIN_TIMELINE_DAY_COUNT = 14;
const MAX_TIMELINE_DAY_COUNT = 366;

/** Valid tray / more-menu view ids (must match App NAV_ITEMS). */
export const UI_SESSION_VIEW_IDS = [
  "dayline",
  "home",
  "discover",
  "notes",
  "collections",
  "plans",
  "tasks",
  "lists",
  "groceries",
  "nutrition",
  "fitness",
  "recipes",
  "logs",
  "profile",
  "settings",
] as const;

export type UiSessionViewId = (typeof UI_SESSION_VIEW_IDS)[number];

export type UiSession = {
  activeView: UiSessionViewId;
  scrollByView: Partial<Record<UiSessionViewId, number>>;
  timelineDayCount?: number;
  /** Timeline overflow section expanded. */
  overdueSectionOpen?: boolean;
  /** Home overflow section expanded. */
  homeOverdueSectionOpen?: boolean;
};

function isUiSessionViewId(value: unknown): value is UiSessionViewId {
  return (
    typeof value === "string" &&
    (UI_SESSION_VIEW_IDS as readonly string[]).includes(value)
  );
}

function clampTimelineDayCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TIMELINE_DAY_COUNT;
  return Math.min(
    MAX_TIMELINE_DAY_COUNT,
    Math.max(MIN_TIMELINE_DAY_COUNT, Math.floor(value)),
  );
}
const DEFAULT_TARGET_TIME = "17:00";
const DEFAULT_WINDOW_START_TIME = "06:00";
const DEFAULT_TASK_GAP_MINUTES = 15;
const MIN_TASK_GAP_MINUTES = 0;
const MAX_TASK_GAP_MINUTES = 180;

function isComposerDraft(value: unknown): value is ComposerDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return typeof draft.title === "string";
}

function migrateUrgencyNowToAsap(drafts: ComposerDraft[]): {
  drafts: ComposerDraft[];
  changed: boolean;
} {
  let changed = false;
  const next = drafts.map((draft) => {
    if (draft.urgency !== "Now") return draft;
    changed = true;
    return { ...draft, urgency: "ASAP" };
  });
  return { drafts: next, changed };
}

/** One-time: mark pre-meta_auto fields as unverified defaults. */
function migrateLegacyMetaAuto(
  drafts: ComposerDraft[],
  rawItems: unknown[],
): { drafts: ComposerDraft[]; changed: boolean } {
  let changed = false;
  const next = drafts.map((draft, index) => {
    const raw = rawItems[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return draft;
    if ("meta_auto" in (raw as Record<string, unknown>)) return draft;
    const keys = new Set<MetaAutoKey>();
    if (draft.type != null) keys.add("type");
    if (draft.est_duration != null) keys.add("duration");
    if (draft.urgency != null) keys.add("urgency");
    if (draft.impact != null) keys.add("impact");
    if (draft.auto_rescheduled === true) keys.add("schedule");
    changed = true;
    return { ...draft, meta_auto: formatMetaAuto(keys) };
  });
  return { drafts: next, changed };
}

function normalizePlanDraft(draft: ComposerDraft): ComposerDraft {
  const withSeries: ComposerDraft = {
    ...draft,
    series_id: draft.series_id ?? null,
  };
  if (
    withSeries.type === "project" ||
    withSeries.type === "program" ||
    withSeries.type === "plan"
  ) {
    return { ...withSeries, type: "plan" };
  }
  return withSeries;
}

export function loadTasks(): ComposerDraft[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const filteredRaw = parsed.filter(isComposerDraft);
    const urgencyMigrated = migrateUrgencyNowToAsap(filteredRaw);
    const metaMigrated = migrateLegacyMetaAuto(urgencyMigrated.drafts, filteredRaw);
    const drafts = metaMigrated.drafts;
    const changed = urgencyMigrated.changed || metaMigrated.changed;
    const normalized = drafts.map(normalizePlanDraft);
    const typeChanged = normalized.some((draft, index) => draft.type !== drafts[index]?.type);
    if (changed || typeChanged) saveTasks(normalized);
    return normalized;
  } catch {
    return [];
  }
}

export function saveTasks(tasks: ComposerDraft[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks.map(normalizePlanDraft)));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

const COLLECTIONS_STORAGE_KEY = "twineline.collections";
const LEGACY_ROUTINES_STORAGE_KEY = "twineline.routines";

function normalizeCollectionDraft(draft: ComposerDraft): ComposerDraft {
  if (draft.type === "routine" || draft.type === "grouping" || draft.type === "collection") {
    return { ...draft, type: "collection" };
  }
  return draft;
}

export function loadCollections(): ComposerDraft[] {
  try {
    const raw =
      localStorage.getItem(COLLECTIONS_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_ROUTINES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const { drafts, changed } = migrateUrgencyNowToAsap(parsed.filter(isComposerDraft));
    const normalized = drafts.map(normalizeCollectionDraft);
    const typeChanged = normalized.some((draft, index) => draft.type !== drafts[index]?.type);
    if (changed || typeChanged || localStorage.getItem(COLLECTIONS_STORAGE_KEY) == null) {
      saveCollections(normalized);
      localStorage.removeItem(LEGACY_ROUTINES_STORAGE_KEY);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function saveCollections(collections: ComposerDraft[]): void {
  try {
    localStorage.setItem(
      COLLECTIONS_STORAGE_KEY,
      JSON.stringify(collections.map(normalizeCollectionDraft)),
    );
    localStorage.removeItem(LEGACY_ROUTINES_STORAGE_KEY);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function isTargetTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function loadTargetTime(): string {
  try {
    const raw = localStorage.getItem(TARGET_TIME_STORAGE_KEY);
    if (raw && isTargetTime(raw)) return raw;
  } catch {
    // Ignore read failures.
  }
  return DEFAULT_TARGET_TIME;
}

export function saveTargetTime(time: string): void {
  if (!isTargetTime(time)) return;
  try {
    localStorage.setItem(TARGET_TIME_STORAGE_KEY, time);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function loadTargetTimeOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TARGET_TIME_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const overrides: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && isTargetTime(value)) overrides[key] = value;
    }
    return overrides;
  } catch {
    return {};
  }
}

export function saveTargetTimeOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(TARGET_TIME_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function loadWindowStartTime(): string {
  try {
    const raw = localStorage.getItem(WINDOW_START_STORAGE_KEY);
    if (raw && isTargetTime(raw)) return raw;
  } catch {
    // Ignore read failures.
  }
  return DEFAULT_WINDOW_START_TIME;
}

export function saveWindowStartTime(time: string): void {
  if (!isTargetTime(time)) return;
  try {
    localStorage.setItem(WINDOW_START_STORAGE_KEY, time);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function loadWindowStartOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(WINDOW_START_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const overrides: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && isTargetTime(value)) overrides[key] = value;
    }
    return overrides;
  } catch {
    return {};
  }
}

export function saveWindowStartOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(WINDOW_START_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function resolveWindowStartTime(
  day: Date,
  defaultTime: string,
  overrides: Record<string, string>,
): string {
  return overrides[targetTimeDayKey(day)] ?? defaultTime;
}

/** True when `dayKey` (YYYY-MM-DD) is currently snoozed. */
export function loadDaySnooze(dayKey: string): boolean {
  try {
    const raw = localStorage.getItem(DAY_SNOOZE_STORAGE_KEY);
    return raw === dayKey;
  } catch {
    return false;
  }
}

export function saveDaySnooze(dayKey: string, snoozed: boolean): void {
  try {
    if (snoozed) localStorage.setItem(DAY_SNOOZE_STORAGE_KEY, dayKey);
    else if (localStorage.getItem(DAY_SNOOZE_STORAGE_KEY) === dayKey) {
      localStorage.removeItem(DAY_SNOOZE_STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function clampTaskGapMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TASK_GAP_MINUTES;
  return Math.min(MAX_TASK_GAP_MINUTES, Math.max(MIN_TASK_GAP_MINUTES, Math.round(value)));
}

/** Master soft-pack gap between tasks, in minutes. */
export function loadTaskGapMinutes(): number {
  try {
    const raw = localStorage.getItem(TASK_GAP_STORAGE_KEY);
    if (raw == null) return DEFAULT_TASK_GAP_MINUTES;
    return clampTaskGapMinutes(Number(raw));
  } catch {
    return DEFAULT_TASK_GAP_MINUTES;
  }
}

export function saveTaskGapMinutes(minutes: number): void {
  try {
    localStorage.setItem(TASK_GAP_STORAGE_KEY, String(clampTaskGapMinutes(minutes)));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

/** YYYY-MM-DD of the last day midnight auto-reschedule already ran. */
export function loadLastAutoRescheduleDay(): string | null {
  try {
    const raw = localStorage.getItem(LAST_AUTO_RESCHEDULE_DAY_KEY);
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  } catch {
    // Ignore read failures.
  }
  return null;
}

export function saveLastAutoRescheduleDay(dayKey: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return;
  try {
    localStorage.setItem(LAST_AUTO_RESCHEDULE_DAY_KEY, dayKey);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export type TodayWindowBaseline = {
  /** Calendar day the baseline belongs to. */
  dayKey: string;
  /** Applied window signature: `${begins}|${ends}`. */
  windowSig: string;
  /** Soft task ids that have been residents of today's window. */
  taskIds: string[];
};

export function loadTodayWindowBaseline(): TodayWindowBaseline | null {
  try {
    const raw = localStorage.getItem(TODAY_WINDOW_BASELINE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.dayKey)) {
      return null;
    }
    if (typeof value.windowSig !== "string") return null;
    if (!Array.isArray(value.taskIds)) return null;
    const taskIds = value.taskIds.filter((id): id is string => typeof id === "string");
    return { dayKey: value.dayKey, windowSig: value.windowSig, taskIds };
  } catch {
    return null;
  }
}

export function saveTodayWindowBaseline(baseline: TodayWindowBaseline): void {
  try {
    localStorage.setItem(TODAY_WINDOW_BASELINE_KEY, JSON.stringify(baseline));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export type SoftPackPlacement = {
  taskId: string;
  startMin: number;
  endMin: number;
};

/** Frozen soft-pack geometry for a calendar day + applied window. */
export type TodaySoftPackPlan = {
  dayKey: string;
  windowSig: string;
  placements: SoftPackPlacement[];
};

export function loadTodaySoftPackPlan(): TodaySoftPackPlan | null {
  try {
    const raw = localStorage.getItem(TODAY_SOFT_PACK_PLAN_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.dayKey)) {
      return null;
    }
    if (typeof value.windowSig !== "string") return null;
    if (!Array.isArray(value.placements)) return null;
    const placements: SoftPackPlacement[] = [];
    for (const entry of value.placements) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const row = entry as Record<string, unknown>;
      if (typeof row.taskId !== "string" || row.taskId.length === 0) continue;
      if (typeof row.startMin !== "number" || !Number.isFinite(row.startMin)) continue;
      if (typeof row.endMin !== "number" || !Number.isFinite(row.endMin)) continue;
      if (row.endMin <= row.startMin) continue;
      placements.push({
        taskId: row.taskId,
        startMin: Math.round(row.startMin),
        endMin: Math.round(row.endMin),
      });
    }
    return { dayKey: value.dayKey, windowSig: value.windowSig, placements };
  } catch {
    return null;
  }
}

export function saveTodaySoftPackPlan(plan: TodaySoftPackPlan): void {
  try {
    localStorage.setItem(TODAY_SOFT_PACK_PLAN_KEY, JSON.stringify(plan));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export type CurrentFocusOverflowBucket = "overdue" | "deferred";

export type CurrentFocus = {
  dayKey: string;
  taskId: string;
  /** When true, focus stays pinned on today and is not pushed to overflow. */
  locked: boolean;
  /** When pinned from overflow, task still belongs conceptually to Overflow. */
  overflowBucket?: CurrentFocusOverflowBucket | null;
};

export function loadCurrentFocus(): CurrentFocus | null {
  try {
    const raw = localStorage.getItem(CURRENT_FOCUS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.dayKey)) {
      return null;
    }
    if (typeof value.taskId !== "string" || value.taskId.length === 0) return null;
    const overflowBucket =
      value.overflowBucket === "overdue" || value.overflowBucket === "deferred"
        ? value.overflowBucket
        : null;
    return {
      dayKey: value.dayKey,
      taskId: value.taskId,
      // Only explicitly locked focus stays pinned out of overflow.
      locked: value.locked === true,
      overflowBucket,
    };
  } catch {
    return null;
  }
}

export function saveCurrentFocus(focus: CurrentFocus): void {
  try {
    localStorage.setItem(CURRENT_FOCUS_KEY, JSON.stringify(focus));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function clearCurrentFocusStorage(): void {
  try {
    localStorage.removeItem(CURRENT_FOCUS_KEY);
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

/** Completed child-task counts per plan id (open tasks live in the tasks list). */
export function loadPlanCompletedCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PLAN_COMPLETED_COUNTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        out[key] = Math.floor(value);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function savePlanCompletedCounts(counts: Record<string, number>): void {
  try {
    localStorage.setItem(PLAN_COMPLETED_COUNTS_KEY, JSON.stringify(counts));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function incrementPlanCompletedCount(planId: string): Record<string, number> {
  const counts = loadPlanCompletedCounts();
  counts[planId] = (counts[planId] ?? 0) + 1;
  savePlanCompletedCounts(counts);
  return counts;
}

export function loadUiSession(): UiSession | null {
  try {
    const raw = localStorage.getItem(UI_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (!isUiSessionViewId(value.activeView)) return null;
    const scrollByView: Partial<Record<UiSessionViewId, number>> = {};
    if (value.scrollByView && typeof value.scrollByView === "object" && !Array.isArray(value.scrollByView)) {
      for (const [key, scrollTop] of Object.entries(
        value.scrollByView as Record<string, unknown>,
      )) {
        if (
          isUiSessionViewId(key) &&
          typeof scrollTop === "number" &&
          Number.isFinite(scrollTop) &&
          scrollTop >= 0
        ) {
          scrollByView[key] = Math.floor(scrollTop);
        }
      }
    }
    const timelineDayCount =
      typeof value.timelineDayCount === "number" && Number.isFinite(value.timelineDayCount)
        ? clampTimelineDayCount(value.timelineDayCount)
        : undefined;
    return {
      activeView: value.activeView,
      scrollByView,
      timelineDayCount,
      overdueSectionOpen:
        typeof value.overdueSectionOpen === "boolean"
          ? value.overdueSectionOpen
          : undefined,
      homeOverdueSectionOpen:
        typeof value.homeOverdueSectionOpen === "boolean"
          ? value.homeOverdueSectionOpen
          : undefined,
    };
  } catch {
    return null;
  }
}

export function saveUiSession(session: UiSession): void {
  try {
    const scrollByView: Partial<Record<UiSessionViewId, number>> = {};
    for (const [key, scrollTop] of Object.entries(session.scrollByView)) {
      if (
        isUiSessionViewId(key) &&
        typeof scrollTop === "number" &&
        Number.isFinite(scrollTop) &&
        scrollTop >= 0
      ) {
        scrollByView[key] = Math.floor(scrollTop);
      }
    }
    const payload: UiSession = {
      activeView: isUiSessionViewId(session.activeView) ? session.activeView : "home",
      scrollByView,
    };
    if (
      typeof session.timelineDayCount === "number" &&
      Number.isFinite(session.timelineDayCount)
    ) {
      payload.timelineDayCount = clampTimelineDayCount(session.timelineDayCount);
    }
    if (typeof session.overdueSectionOpen === "boolean") {
      payload.overdueSectionOpen = session.overdueSectionOpen;
    }
    if (typeof session.homeOverdueSectionOpen === "boolean") {
      payload.homeOverdueSectionOpen = session.homeOverdueSectionOpen;
    }
    localStorage.setItem(UI_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export {
  DEFAULT_TIMELINE_DAY_COUNT,
  MIN_TIMELINE_DAY_COUNT,
  MAX_TIMELINE_DAY_COUNT,
};

/** Most-recently linked target ids (newest first). */
export function loadRecentLinkIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_LINK_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function rememberRecentLinkId(id: string, current: string[] = loadRecentLinkIds()): string[] {
  const next = [id, ...current.filter((existing) => existing !== id)].slice(
    0,
    MAX_RECENT_LINK_IDS,
  );
  try {
    localStorage.setItem(RECENT_LINK_IDS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode write failures.
  }
  return next;
}

export function todayWindowSignature(begins: string, ends: string): string {
  return `${begins}|${ends}`;
}

export { DEFAULT_TASK_GAP_MINUTES, MIN_TASK_GAP_MINUTES, MAX_TASK_GAP_MINUTES };

/** YYYY-MM-DD key for per-day target time overrides. */
export function targetTimeDayKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function resolveTargetTime(
  day: Date,
  defaultTime: string,
  overrides: Record<string, string>,
): string {
  return overrides[targetTimeDayKey(day)] ?? defaultTime;
}

export function msUntilTargetTime(hhmm: string, now = new Date()): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export function formatCountdown(
  ms: number,
  options?: { hideZeroHours?: boolean },
): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts =
    options?.hideZeroHours && hours === 0
      ? [minutes, seconds]
      : [hours, minutes, seconds];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatTargetTimeLabel(hhmm: string): string {
  const parts = parseTargetTimeParts(hhmm);
  return `${parts.hour}:${String(parts.minute).padStart(2, "0")} ${parts.period}`;
}

export type TargetTimePeriod = "AM" | "PM";

export type TargetTimeParts = {
  hour: number;
  minute: number;
  period: TargetTimePeriod;
};

export function parseTargetTimeParts(hhmm: string): TargetTimeParts {
  const [hoursRaw, minutesRaw] = hhmm.split(":").map(Number);
  const hours = Number.isFinite(hoursRaw) ? hoursRaw : 17;
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const period: TargetTimePeriod = hours >= 12 ? "PM" : "AM";
  return {
    hour: hours % 12 || 12,
    minute: Math.min(59, Math.max(0, minutes)),
    period,
  };
}

export function buildTargetTime({ hour, minute, period }: TargetTimeParts): string {
  const clampedHour = Math.min(12, Math.max(1, Math.round(hour)));
  const clampedMinute = Math.min(59, Math.max(0, Math.round(minute)));
  let hours24 = clampedHour % 12;
  if (period === "PM") hours24 += 12;
  return `${String(hours24).padStart(2, "0")}:${String(clampedMinute).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export const WEEKDAY_BUTTONS = [
  { id: 0, label: "S", name: "Sunday" },
  { id: 1, label: "M", name: "Monday" },
  { id: 2, label: "T", name: "Tuesday" },
  { id: 3, label: "W", name: "Wednesday" },
  { id: 4, label: "T", name: "Thursday" },
  { id: 5, label: "F", name: "Friday" },
  { id: 6, label: "S", name: "Saturday" },
] as const;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toStartOfDay(date: Date): Date {
  return startOfDay(date);
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateForWeekday(weekday: number, now = new Date()): Date {
  const today = startOfDay(now);
  const delta = (weekday - today.getDay() + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + delta);
  return next;
}

export function weekdaysFromToday(now = new Date()) {
  const start = now.getDay();
  return [...WEEKDAY_BUTTONS.slice(start), ...WEEKDAY_BUTTONS.slice(0, start)];
}

export function formatMonthYearLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function shiftMonth(date: Date, delta: number): Date {
  const next = startOfDay(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + delta);
  return next;
}

export function buildMonthCalendarDays(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export type TwinelineDateLabelParts = {
  /** e.g. "Today" before the stamp */
  prefix?: string;
  stamp: string;
  /** e.g. "Tomorrow" / "Yesterday" after the stamp */
  relative?: string;
  weekday?: string;
};

export function formatTwinelineDateLabelParts(
  date: Date,
  now = new Date(),
  options?: { weekday?: boolean; omitTodayWord?: boolean },
): TwinelineDateLabelParts {
  const selected = startOfDay(date);
  const today = startOfDay(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((selected.getTime() - today.getTime()) / dayMs);
  const stamp = `${MONTH_LABELS[selected.getMonth()]} ${selected.getDate()}`;
  const parts: TwinelineDateLabelParts = { stamp };
  if (diffDays === 0) {
    if (!options?.omitTodayWord) parts.prefix = "Today";
  } else if (diffDays === -1) {
    parts.relative = "Yesterday";
  } else if (diffDays === 1) {
    parts.relative = "Tomorrow";
  }
  if (options?.weekday) {
    parts.weekday = WEEKDAY_BUTTONS[selected.getDay()]!.name.slice(0, 3).toUpperCase();
  }
  return parts;
}

export function formatTwinelineDateLabel(
  date: Date,
  now = new Date(),
  options?: { weekday?: boolean; omitTodayWord?: boolean },
): string {
  const { prefix, stamp, relative, weekday } = formatTwinelineDateLabelParts(
    date,
    now,
    options,
  );
  let label = stamp;
  if (prefix) label = `${prefix} - ${stamp}`;
  if (relative) label = `${stamp} - ${relative}`;
  if (weekday) label = `${label} - ${weekday}`;
  return label;
}
