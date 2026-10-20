import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { HomeView } from "./HomeView";
import { DiscoverView } from "./DiscoverView";
import { SettingsView } from "./SettingsView";
import { CollectionsView } from "./CollectionsView";
import { PlansView } from "./PlansView";
import { ListsView } from "./ListsView";
import { NotebooksView } from "./NotebooksView";
import { CalendarsView } from "./CalendarsView";
import { TypedKindView } from "./TypedKindView";
import { DayScheduleTrack } from "./DayScheduleTrack";
import { type DayWheelSlice } from "./DayWheelChart";
import { daySkyColorAtMinutes } from "./daySky";
import { TwinelineCountdownButton } from "./TwinelineCountdownButton";
import {
  buildComposerDraft,
  formatMetaAuto,
  hasMetaAuto,
  parseMetaAuto,
  withoutMetaAuto,
  type ComposerDraft,
  type MetaAutoKey,
} from "./composer";
import {
  clampMonthDay,
  clampRecurringCount,
  completeRecurringOccurrence,
  DEFAULT_RECURRING_COUNT,
  DEFAULT_RECURRING_UNIT,
  dedupeSeriesClosestToNow,
  formatRecurring,
  formatRecurringSchedule,
  materializeRecurringSeries,
  MIN_MONTH_DAY,
  normalizeWeekdays,
  parseRecurring,
  pruneRecurringSeriesBeyondHorizon,
  recurringHorizonEnd,
  recurringMaterializeHorizonDays,
  removeFutureSeriesMembers,
  topUpRecurringSeries,
  type RecurringUnit,
} from "./recurring";
import {
  buildMonthCalendarDays,
  formatCountdown,
  formatMonthYearLabel,
  formatTargetTimeLabel,
  formatTwinelineDateLabel,
  formatTwinelineDateLabelParts,
  loadDaySnooze,
  loadLastAutoRescheduleDay,
  loadRecentLinkIds,
  loadTargetTime,
  loadTargetTimeOverrides,
  loadTaskGapMinutes,
  loadTasks,
  loadCollections,
  loadCurrentFocus,
  loadPlanCompletedCounts,
  incrementPlanCompletedCount,
  loadTodayWindowBaseline,
  loadTodaySoftPackPlan,
  loadUiSession,
  loadWindowStartOverrides,
  loadWindowStartTime,
  clearCurrentFocusStorage,
  saveCurrentFocus,
  saveUiSession,
  DEFAULT_TIMELINE_DAY_COUNT,
  MAX_TIMELINE_DAY_COUNT,
  MAX_TASK_GAP_MINUTES,
  MIN_TASK_GAP_MINUTES,
  msUntilTargetTime,
  rememberRecentLinkId,
  resolveTargetTime,
  resolveWindowStartTime,
  sameCalendarDay,
  saveDaySnooze,
  saveLastAutoRescheduleDay,
  saveTargetTime,
  saveTargetTimeOverrides,
  saveTaskGapMinutes,
  saveTasks,
  saveCollections,
  saveTodayWindowBaseline,
  saveTodaySoftPackPlan,
  saveWindowStartOverrides,
  saveWindowStartTime,
  shiftMonth,
  targetTimeDayKey,
  todayWindowSignature,
  toStartOfDay,
  WEEKDAY_BUTTONS,
  type CurrentFocus,
  type TodaySoftPackPlan,
  type TodayWindowBaseline,
  type UiSession,
  type UiSessionViewId,
} from "./taskStorage";
import { buildScheduleLayoutForWindow } from "./schedule";
import { formatTaskScheduleMetaLabel } from "./taskRowMeta";
import {
  addDays,
  buildDayRange,
  buildOutsideCollapsedDayView,
  compareSoftPriority,
  dayKey,
  formatHourLabel,
  formatMinutesLabel,
  layoutCalendarTasks,
  taskDurationMinutes,
  minutesFromMidnight,
  MINUTES_PER_DAY,
  packWindowEndMinutes,
  packWindowStartMinutes,
  parseTaskDate,
  parseTimeOfDay,
  PX_PER_MINUTE,
  isAnchoredTaskMissed,
  rescheduleOverdueTasksForNewDay,
  collectSoftTaskIdsOnDay,
  collectPushedFromTodayWindowTasks,
  type OutsideExpandedFlags,
  type OutsideRegionId,
} from "./calendarTimeline";

/** Soft tasks with no calendar day — hidden while the day is snoozed. */
function isUndatedTask(task: ComposerDraft): boolean {
  return parseTaskDate(task.date) == null;
}

/** Timed = has clock time; soft = date-only; undated = no date/time. */
function isTimedTask(task: ComposerDraft): boolean {
  return (
    parseTimeOfDay(task.starts_at) != null || parseTimeOfDay(task.due_at) != null
  );
}

type TaskScheduleKind = "anchored" | "soft" | "undated";

/** Visual schedule kind: timed → red, date-only → purple, undated → grey. */
function taskScheduleKind(task: ComposerDraft): TaskScheduleKind {
  if (isTimedTask(task)) return "anchored";
  if (parseTaskDate(task.date) != null) return "soft";
  return "undated";
}

function buildDayWheelSlices(
  blocks: Array<{
    key: string;
    title: string;
    startMin: number;
    endMin: number;
    overdue: boolean;
    task: ComposerDraft;
    taskId: string | null;
  }>,
): DayWheelSlice[] {
  const slices: DayWheelSlice[] = [];

  for (const block of blocks) {
    if (block.overdue) continue;
    slices.push({
      key: block.key,
      title: block.title,
      startMin: block.startMin,
      endMin: block.endMin,
      kind: taskScheduleKind(block.task),
      overdue: false,
    });
  }

  return slices;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7l10 10M17 7 7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PremiumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 16h14l-1.2 4.5H6.2L5 16Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m5 16 2.5-8 4.5 4 4.5-4 2.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
      <path
        d="m21 15-4.5-4.5L7 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 19V5M6 11l6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 5.5 18.5 9.5 9 19H5v-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5 16.5 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8v4.5L15 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15" r="2.1" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5 10 17.5 19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Square checkbox with check — list item. */
function ListItemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 12.2 10.8 15 16.2 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12H6M18 12h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 9v3.2L14.2 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 9h6M9 13h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 4.5h11.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 18V6A1.5 1.5 0 0 1 6.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 4.5v15M12 9h4M12 13h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 9h6M9 13h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TasksListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8.4 12.2 2.3 2.3 4.9-5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 6.5H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="3.95" y="10.95" width="3.1" height="3.1" rx="0.4" fill="currentColor" />
      <path
        d="M11.5 12.5H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="3.95" y="16.95" width="3.1" height="3.1" rx="0.4" fill="currentColor" />
      <path
        d="M11.5 18.5H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M14.7 9.3 13.1 13.1 9.3 14.7 10.9 10.9 14.7 9.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CycleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 3v5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16h5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlansIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 6.5H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="5.5" cy="12.5" r="1.55" fill="currentColor" />
      <path
        d="M11.5 12.5H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="5.5" cy="18.5" r="1.55" fill="currentColor" />
      <path
        d="M11.5 18.5H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CollectionOrbitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        transform="rotate(-28 12 12)"
      />
      <circle cx="19.1" cy="8.6" r="1.55" fill="currentColor" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L11.2 5.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54L4.54 12.4a5 5 0 0 0 7.07 7.07L12.8 18.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UrgencyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.5v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19" r="1.35" fill="currentColor" />
    </svg>
  );
}

function ImpactIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <text
        x="12"
        y="20"
        textAnchor="middle"
        fill="currentColor"
        fontSize="25"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        !
      </text>
    </svg>
  );
}

function PinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3.5h6l-.6 6.2 2.8 2.3V14H6.8v-2l2.8-2.3L9 3.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 14v6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopwatchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13.5" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 13.5V10M9.5 3.5h5M12 3.5v2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlarmIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.2 1.5 5.5 1.5 5.5H5s1.5-1.3 1.5-5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 18.2a1.8 1.8 0 0 0 3.6 0M12 4V2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9h12l-.8 11.2A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.8L6 9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V7.5a3 3 0 0 1 6 0V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.5 13h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 7.2c0-1.6.9-3.2 2.4-3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 7.5c-1.4 0-2.6.4-3.5 1.2C7.2 9.8 6.5 11.4 6.5 13.5c0 3.2 1.8 6.5 5.5 6.5 1.2 0 2.1-.4 2.8-1 .7.6 1.6 1 2.8 1 3.7 0 5.5-3.3 5.5-6.5 0-2.1-.7-3.7-2-4.8-.9-.8-2.1-1.2-3.5-1.2-.9 0-1.7.2-2.3.6-.6-.4-1.4-.6-2.3-.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FitnessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 9.5v5M7 8v8M17 8v8M19.5 9.5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 12h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RecipeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15 3v4h4M9 12h6M9 16h6M9 8h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="6" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="18" r="1.7" fill="currentColor" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 19.2c1.4-3.1 3.6-4.7 6.5-4.7s5.1 1.6 6.5 4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1.1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1.1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1.1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TaskViewExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2 17 10.2H7Z" fill="currentColor" />
      <path d="M12 20.8 7 13.8h10Z" fill="currentColor" />
    </svg>
  );
}

function TaskViewCollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.8h10L12 10.8Z" fill="currentColor" />
      <path d="M7 20.2h10L12 13.2Z" fill="currentColor" />
    </svg>
  );
}

function IntelligenceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 13.1 8.4 18 9.5l-4.9 1.1L12 15.5l-1.1-4.9L6 9.5l4.9-1.1L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m17.5 14.2.7 2.6 2.6.7-2.6.7-.7 2.6-.7-2.6-2.6-.7 2.6-.7.7-2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m5.8 13.8.55 2.05 2.05.55-2.05.55-.55 2.05-.55-2.05-2.05-.55 2.05-.55.55-2.05Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ComposeAddIcon({
  Icon,
  badge = "plus",
}: {
  Icon: () => ReactElement;
  badge?: "plus" | "edit" | "check" | "none";
}) {
  return (
    <span className="app-compose-add-icon">
      <Icon />
      {badge !== "none" && (
        <span
          className={`app-compose-add-plus${
            badge === "edit" ? " is-edit" : badge === "check" ? " is-check" : ""
          }`}
          aria-hidden="true"
        >
          {badge === "edit" ? <EditIcon /> : badge === "check" ? <CheckIcon /> : "+"}
        </span>
      )}
    </span>
  );
}

const COMPOSE_KINDS = [
  {
    id: "collection",
    label: "Collection",
    placeholder: "Name this collection...",
    Icon: CollectionOrbitIcon,
  },
  {
    id: "notebook",
    label: "Notebook",
    placeholder: "Name this notebook...",
    Icon: NotebookIcon,
  },
  {
    id: "plan",
    label: "Plan",
    placeholder: "Name this plan...",
    Icon: PlansIcon,
  },
  {
    id: "list",
    label: "List",
    placeholder: "Name this list...",
    Icon: MenuBarsIcon,
  },
  {
    id: "calendar",
    label: "Calendar",
    placeholder: "Name this calendar...",
    Icon: CalendarIcon,
  },
  {
    id: "event",
    label: "Event",
    placeholder: "What's the event?",
    Icon: EventIcon,
  },
  { id: "note", label: "Note", placeholder: "Type away...", Icon: NotesIcon },
  { id: "item", label: "Item", placeholder: "What item(s) should I add to your list?", Icon: ListItemIcon },
  { id: "task", label: "Task", placeholder: "Describe your task(s)...", Icon: TasksListIcon },
  { id: "log", label: "Entry", placeholder: "What happened?", Icon: LogIcon },
  {
    id: "assistant",
    label: "AI Assistant",
    placeholder: "Ask the AI assistant...",
    Icon: IntelligenceIcon,
  },
] as const;

/** Kept for view-specific compose; hidden from the compose-type menu. */
const CONTAINER_QUICK_ADD_KIND_IDS = [
  "plan",
  "collection",
  "list",
  "notebook",
  "calendar",
] as const;
type ContainerQuickAddKind = (typeof CONTAINER_QUICK_ADD_KIND_IDS)[number];

/** Named containers — not scheduled like tasks. */
const CONTAINER_COMPOSE_KIND_IDS = [
  "collection",
  "notebook",
  "plan",
  "list",
  "calendar",
] as const;
type ContainerComposeKind = (typeof CONTAINER_COMPOSE_KIND_IDS)[number];

function isContainerComposeKind(kind: string): kind is ContainerComposeKind {
  return (CONTAINER_COMPOSE_KIND_IDS as readonly string[]).includes(kind);
}

function isCollectionTaskType(type: string | null | undefined): boolean {
  return type === "collection" || type === "routine" || type === "grouping";
}

function isPlanTaskType(type: string | null | undefined): boolean {
  return type === "plan" || type === "project" || type === "program";
}

function isContainerTaskType(type: string | null | undefined): boolean {
  return (
    type === "list" ||
    type === "notebook" ||
    type === "calendar" ||
    isPlanTaskType(type) ||
    isCollectionTaskType(type)
  );
}

const LINK_ALL_TYPE_ITEM = {
  id: "all",
  label: "All",
  Icon: MoreIcon,
} as const;

const LINK_ITEM_TYPE_ITEMS = [
  { id: "task", label: "Tasks", Icon: TasksListIcon },
  { id: "note", label: "Notes", Icon: NotesIcon },
  { id: "event", label: "Events", Icon: EventIcon },
  { id: "item", label: "Items", Icon: ListItemIcon },
] as const;

const LINK_CONTAINER_TYPE_ITEMS = [
  { id: "collection", label: "Collections", Icon: CollectionOrbitIcon },
  { id: "list", label: "Lists", Icon: MenuBarsIcon },
  { id: "plan", label: "Plans", Icon: PlansIcon },
] as const;

const COMPOSE_CONTAINER_TYPE_ITEMS = [
  { id: "collection", label: "Collection", Icon: CollectionOrbitIcon },
  { id: "calendar", label: "Calendar", Icon: CalendarIcon },
  { id: "notebook", label: "Notebook", Icon: NotebookIcon },
  { id: "plan", label: "Plan", Icon: PlansIcon },
  { id: "list", label: "List", Icon: MenuBarsIcon },
] as const;

const LINK_TYPE_PICKER_ITEMS = [
  ...LINK_ITEM_TYPE_ITEMS,
  ...LINK_CONTAINER_TYPE_ITEMS,
  LINK_ALL_TYPE_ITEM,
] as const;
type LinkPickerType = (typeof LINK_TYPE_PICKER_ITEMS)[number]["id"];

function isLinkPickerType(kind: string): kind is LinkPickerType {
  return LINK_TYPE_PICKER_ITEMS.some((item) => item.id === kind);
}

function defaultLinkPickerType(composeKind: string): LinkPickerType {
  if (composeKind === "task") return "all";
  return isLinkPickerType(composeKind) ? composeKind : "all";
}

/** Compose-type menu: Collection (top) · left/right columns · Entry · AI Assistant (bottom). */
const COMPOSE_KIND_MENU_TOP = COMPOSE_KINDS.find((kind) => kind.id === "collection")!;
/** Left column top→bottom: Calendar, Notebook, List, Plan (Plan nearest the composer). */
const COMPOSE_KIND_MENU_LEFT_IDS = ["calendar", "notebook", "list", "plan"] as const;
const COMPOSE_KIND_MENU_RIGHT_IDS = ["event", "note", "item", "task"] as const;
const COMPOSE_KIND_MENU_LEFT = COMPOSE_KIND_MENU_LEFT_IDS.map(
  (id) => COMPOSE_KINDS.find((kind) => kind.id === id)!,
);
const COMPOSE_KIND_MENU_RIGHT = COMPOSE_KIND_MENU_RIGHT_IDS.map(
  (id) => COMPOSE_KINDS.find((kind) => kind.id === id)!,
);
const LOG_COMPOSE_KIND = COMPOSE_KINDS.find((kind) => kind.id === "log")!;
const ASSISTANT_COMPOSE_KIND = COMPOSE_KINDS.find((kind) => kind.id === "assistant")!;

type ComposeKind = (typeof COMPOSE_KINDS)[number]["id"];
type LinkRelation = "parent" | "child" | "cycle";
type LinkPrecedence = "before" | "after";
const LINK_RELATIONS: LinkRelation[] = ["parent", "child", "cycle"];
const LINK_RELATION_LABEL: Record<LinkRelation, string> = {
  parent: "Parent",
  child: "Child",
  cycle: "Cycle",
};

function composeKindFromTaskType(type: string | null | undefined): ComposeKind {
  if (isCollectionTaskType(type)) return "collection";
  if (isPlanTaskType(type)) return "plan";
  if (type != null && COMPOSE_KINDS.some((kind) => kind.id === type)) {
    return type as ComposeKind;
  }
  return "task";
}

/** Linking tool — available on every non-assistant compose type. */
const LINKING_TOOL_COMPOSE_KINDS = COMPOSE_KINDS.filter((kind) => kind.id !== "assistant").map(
  (kind) => kind.id,
);
type LinkingToolComposeKind = (typeof LINKING_TOOL_COMPOSE_KINDS)[number];

function isLinkingToolComposeKind(kind: ComposeKind): kind is LinkingToolComposeKind {
  return (LINKING_TOOL_COMPOSE_KINDS as readonly string[]).includes(kind);
}

const LINKING_TOOL_HINT = "Linking";
/** Row balloon first, short pause, then schedule green hold + balloon. */
const TASK_ROW_POP_MS = 420;
const SCHEDULE_POP_GAP_MS = 160;
const SCHEDULE_POP_MS = 560;
const TASK_POP_MS = TASK_ROW_POP_MS + SCHEDULE_POP_GAP_MS + SCHEDULE_POP_MS;

const DAYLINE_TAB = { id: "dayline", label: "Timeline", Icon: TimelineIcon } as const;
const HOME_TAB = { id: "home", label: "Home", Icon: LogIcon } as const;
const DISCOVER_TAB = { id: "discover", label: "Discover", Icon: DiscoverIcon } as const;
const NOTES_TAB = { id: "notes", label: "Notes", Icon: NotesIcon } as const;
const COLLECTIONS_TAB = { id: "collections", label: "Collections", Icon: CollectionOrbitIcon } as const;
const PLANS_TAB = { id: "plans", label: "Plans", Icon: PlansIcon } as const;

const TRAY_TABS = [HOME_TAB, DISCOVER_TAB] as const;
/** Left→right tray order for horizontal swipe navigation. */
const MAIN_SWIPE_VIEWS = ["dayline", "home", "discover"] as const;
type MainSwipeView = (typeof MAIN_SWIPE_VIEWS)[number];
const MAIN_SWIPE_THRESHOLD_PX = 56;
const MAIN_SWIPE_MAX_SLOPE = 0.75;

const MORE_OPTIONS = [
  { id: "tasks", label: "Tasks", Icon: TasksListIcon },
  { id: "lists", label: "Lists", Icon: MenuBarsIcon },
  { id: "events", label: "Events", Icon: EventIcon },
  { id: "items", label: "Items", Icon: ListItemIcon },
  { id: "notebooks", label: "Notebooks", Icon: NotebookIcon },
  { id: "calendars", label: "Calendars", Icon: CalendarIcon },
  { id: "groceries", label: "Groceries", Icon: FoodIcon },
  { id: "nutrition", label: "Nutrition", Icon: AppleIcon },
  { id: "fitness", label: "Fitness", Icon: FitnessIcon },
  { id: "recipes", label: "Recipes", Icon: RecipeIcon },
  { id: "logs", label: "Entries", Icon: LogIcon },
  { id: "profile", label: "Profile", Icon: ProfileIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
] as const;

/** More menu mirrors compose-kind layout; only these views are wired. */
const TEND_MENU_TOP = COLLECTIONS_TAB;
const TEND_MENU_LISTS = { id: "lists", label: "Lists", Icon: MenuBarsIcon } as const;
const TEND_MENU_TASKS = { id: "tasks", label: "Tasks", Icon: TasksListIcon } as const;
/** Left column (compose layout): Calendars · Notebooks · Lists · Plans. */
const TEND_MENU_LEFT = [
  { id: "calendar", label: "Calendars", Icon: CalendarIcon, view: "calendars" as const },
  { id: "notebook", label: "Notebooks", Icon: NotebookIcon, view: "notebooks" as const },
  { id: "lists", label: "Lists", Icon: MenuBarsIcon, view: "lists" as const },
  { id: "plans", label: "Plans", Icon: PlansIcon, view: "plans" as const },
] as const;
/** Right column (compose layout): Events · Notes · Items · Tasks. */
const TEND_MENU_RIGHT = [
  { id: "event", label: "Events", Icon: EventIcon, view: "events" as const },
  { id: "notes", label: "Notes", Icon: NotesIcon, view: "notes" as const },
  { id: "item", label: "Items", Icon: ListItemIcon, view: "items" as const },
  { id: "tasks", label: "Tasks", Icon: TasksListIcon, view: "tasks" as const },
] as const;
const TEND_MENU_ITEMS = [
  TEND_MENU_TOP,
  NOTES_TAB,
  TEND_MENU_LISTS,
  PLANS_TAB,
  TEND_MENU_TASKS,
] as const;

const PROFILE_MENU_NAME = "Pivot User";

const URGENCY_OPTIONS = ["Future", "Later", "Soon", "ASAP"] as const;
type UrgencyOption = (typeof URGENCY_OPTIONS)[number];
const DEFAULT_URGENCY: UrgencyOption = "Soon";
const DEFAULT_IMPACT = 10;
const IMPACT_MIN = 0;
const IMPACT_MAX = 50;

function clampImpact(value: number): number {
  return Math.min(IMPACT_MAX, Math.max(IMPACT_MIN, Math.round(value)));
}

function isUrgencyOption(value: string | null | undefined): value is UrgencyOption {
  return URGENCY_OPTIONS.includes(value as UrgencyOption);
}

function formatTaskDurationLabel(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return null;
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function normalizeOptionalField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function TwinelineDayScrollLabel({
  date,
  now,
}: {
  date: Date;
  now: Date;
}) {
  const { stamp, relative } = formatTwinelineDateLabelParts(date, now);
  return (
    <>
      {stamp}
      {relative != null && (
        <>
          {" - "}
          <span className="task-day-label-relative">{relative}</span>
        </>
      )}
    </>
  );
}

function CompactTaskRow({
  task,
  overdue,
  editing,
  highlighted,
  popping,
  now,
  parentTitle,
  isCurrentFocus = false,
  countdownProgress = null,
  countdownBarColor = null,
  countdownElapsedFill = false,
  onComplete,
  onEdit,
  onSetFocus,
}: {
  task: ComposerDraft;
  overdue: boolean;
  editing: boolean;
  highlighted: boolean;
  popping?: boolean;
  now: Date;
  parentTitle?: string | null;
  isCurrentFocus?: boolean;
  countdownProgress?: number | null;
  countdownBarColor?: string | null;
  /** When true, progress is elapsed (fill grows from left) — At Risk bars. */
  countdownElapsedFill?: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onSetFocus?: () => void;
}) {
  const urgencyLabel = isUrgencyOption(task.urgency) ? task.urgency : null;
  const hasDateOrTime =
    parseTaskDate(task.date) != null ||
    parseTimeOfDay(task.starts_at) != null ||
    parseTimeOfDay(task.due_at) != null;
  const showUrgency = urgencyLabel != null && !hasDateOrTime;
  const impactValue =
    typeof task.impact === "number" && Number.isFinite(task.impact)
      ? Math.round(task.impact)
      : null;
  const impactPercent =
    impactValue != null ? Math.min(100, Math.max(0, (impactValue / IMPACT_MAX) * 100)) : null;
  const durationLabel = formatTaskDurationLabel(task.est_duration);
  const scheduleLabel = formatTaskScheduleMetaLabel(task, now);
  const resolvedParentTitle = normalizeOptionalField(parentTitle);
  const hasImpact = impactValue != null && impactPercent != null;
  const hasParent = resolvedParentTitle != null;
  const topMetaLabel = scheduleLabel ?? (showUrgency ? urgencyLabel : null);
  const hasTopMeta = topMetaLabel != null;
  const isRecurring = parseRecurring(task.recurring) != null;
  const typeLabel =
    task.type === "event"
      ? "EVENT"
      : task.type === "item"
        ? "ITEM"
        : task.type === "note"
          ? "NOTE"
          : task.type === "log"
            ? "ENTRY"
            : "TASK";
  const scheduleKind = taskScheduleKind(task);
  const isItem = task.type === "item";
  const itemCompleted = isItem && task.completed_at != null;
  const completeChecked = Boolean(popping) || itemCompleted;
  // Repeat tasks keep grey schedule text even when completion/Automatic moved the date.
  const scheduleAuto = hasMetaAuto(task, "schedule") && !isRecurring;
  const urgencyAuto = hasMetaAuto(task, "urgency");
  const durationAuto = hasMetaAuto(task, "duration");
  const impactAuto = hasMetaAuto(task, "impact");
  const typeAuto = hasMetaAuto(task, "type");
  const parentAuto = hasMetaAuto(task, "parent");
  const recurringAuto = hasMetaAuto(task, "recurring");

  const showCountdownBar =
    typeof countdownProgress === "number" && Number.isFinite(countdownProgress);

  return (
    <li data-task-id={task.id ?? undefined} className="task-row-shell">
      <div
        className={`task-row is-${scheduleKind}${editing ? " is-editing" : ""}${highlighted ? " is-highlighted" : ""}${overdue ? " is-overdue" : ""}${popping ? " is-popping" : ""}${itemCompleted ? " is-item-done" : ""}${showCountdownBar ? " has-countdown" : ""}`}
      >
        {showCountdownBar && (
          <div
            className={`task-row-countdown${countdownElapsedFill ? " is-elapsed-fill" : ""}`}
            aria-hidden="true"
            style={
              countdownBarColor != null
                ? { background: countdownBarColor }
                : undefined
            }
          >
            <div
              className="task-row-countdown-fill"
              style={{
                width: `${Math.min(1, Math.max(0, countdownProgress)) * 100}%`,
              }}
            />
          </div>
        )}
        <div
          className="task-row-primary"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("button")) return;
            onEdit();
          }}
        >
          {(hasTopMeta || hasImpact) && (
            <div className="task-row-top">
              <span className="task-row-top-meta">
                {scheduleLabel != null ? (
                  <span
                    className={`task-row-schedule${scheduleAuto ? " is-auto" : ""}`}
                  >
                    {scheduleLabel}
                  </span>
                ) : showUrgency ? (
                  <span
                    className={`task-row-urgency${urgencyAuto ? " is-auto" : ""}`}
                  >
                    {urgencyLabel}
                  </span>
                ) : null}
                {isRecurring && (
                  <span
                    className={`task-row-recurring${recurringAuto ? " is-auto" : ""}`}
                    aria-label="Repeats"
                    title="Repeats"
                  >
                    <CycleIcon />
                  </span>
                )}
              </span>
              {hasImpact && (
                <span
                  className={`task-row-impact${impactAuto ? " is-auto" : ""}`}
                  role="img"
                  aria-label={`Impact ${impactValue} of ${IMPACT_MAX}`}
                  title={`Impact ${impactValue}`}
                >
                  <span className="task-row-impact-track" aria-hidden="true">
                    <span
                      className="task-row-impact-fill"
                      style={{ width: `${impactPercent}%` }}
                    />
                  </span>
                </span>
              )}
            </div>
          )}
          <div className="task-row-content">
            <div className="task-row-content-main">
              <div className="task-row-main">
                <button
                  type="button"
                  className={`task-complete is-${scheduleKind}${
                    isItem ? " is-item" : ""
                  }${completeChecked ? " is-checked" : ""}`}
                  aria-label={
                    isItem
                      ? itemCompleted
                        ? "Mark incomplete"
                        : "Mark complete"
                      : "Mark complete"
                  }
                  aria-pressed={isItem ? itemCompleted : undefined}
                  disabled={popping}
                  onClick={onComplete}
                >
                  <span className="task-complete-check" aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3.2 8.2 6.4 11.4 12.8 4.6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength="1"
                      />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  className="task-row-body"
                  aria-label={`Edit task ${task.title}`}
                  onClick={onEdit}
                >
                  <p className="task-row-title">{task.title}</p>
                </button>
              </div>
            </div>
          </div>
          {hasParent && (
            <div className="task-row-bottom">
              <div className={`task-row-parent${parentAuto ? " is-auto" : ""}`}>
                <span className="task-row-parent-name">{resolvedParentTitle}</span>
                <LinkIcon />
              </div>
            </div>
          )}
        </div>
        <div className="task-row-rail">
          <span className={`task-row-type-label${typeAuto ? " is-auto" : ""}`}>
            {typeLabel}
          </span>
          {durationLabel != null ? (
            <span className="task-row-duration-slot">
              <span
                className={`task-row-duration${durationAuto ? " is-auto" : ""}`}
              >
                {durationLabel}
              </span>
            </span>
          ) : (
            <span className="task-row-rail-spacer" aria-hidden="true" />
          )}
        </div>
      </div>
      {!isCurrentFocus && onSetFocus != null ? (
        <button
          type="button"
          className="task-row-focus"
          aria-label={`Pin ${task.title} as current focus`}
          onClick={(event) => {
            event.stopPropagation();
            onSetFocus();
          }}
        >
          <PinIcon />
        </button>
      ) : null}
    </li>
  );
}

const NAV_ITEMS = [DAYLINE_TAB, ...TRAY_TABS, NOTES_TAB, COLLECTIONS_TAB, PLANS_TAB, ...MORE_OPTIONS] as const;

type ActiveView = (typeof NAV_ITEMS)[number]["id"];

const INITIAL_UI_SESSION = loadUiSession();

function isActiveView(value: string | null | undefined): value is ActiveView {
  return (
    typeof value === "string" &&
    NAV_ITEMS.some((item) => item.id === value)
  );
}

const COMPOSE_KIND_BY_VIEW: Record<ActiveView, ComposeKind> = {
  dayline: "task",
  home: "task",
  discover: "collection",
  tasks: "task",
  notes: "note",
  plans: "plan",
  lists: "list",
  collections: "collection",
  events: "event",
  items: "item",
  notebooks: "notebook",
  calendars: "calendar",
  groceries: "item",
  nutrition: "item",
  fitness: "task",
  recipes: "task",
  logs: "log",
  profile: "task",
  settings: "task",
};


type OverlayMenuAlign = "start" | "center" | "end";

function ComposerOverlayMenu({
  open,
  anchorRef,
  menuRef,
  align = "start",
  className = "",
  role = "menu",
  "aria-label": ariaLabel,
  matchWidthRef,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  align?: OverlayMenuAlign;
  className?: string;
  role?: "menu" | "dialog";
  "aria-label": string;
  matchWidthRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width?: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;

      const rect = anchor.getBoundingClientRect();
      const vv = window.visualViewport;
      const viewTop = vv?.offsetTop ?? 0;
      const viewLeft = vv?.offsetLeft ?? 0;
      const viewWidth = vv?.width ?? window.innerWidth;
      const viewHeight = vv?.height ?? window.innerHeight;
      const viewBottom = viewTop + viewHeight;
      const viewRight = viewLeft + viewWidth;
      const gap = 10;
      const pad = 8;
      const availableWidth = Math.max(0, viewWidth - pad * 2);
      const match = matchWidthRef?.current;
      const matchRect = match?.getBoundingClientRect();
      const menuWidth = Math.min(
        matchRect?.width ?? menu.offsetWidth,
        availableWidth,
      );
      const menuHeight = menu.offsetHeight;

      let left = matchRect
        ? matchRect.left
        : align === "end"
          ? rect.right - menuWidth
          : align === "center"
            ? rect.left + rect.width / 2 - menuWidth / 2
            : rect.left;
      left = Math.min(Math.max(left, viewLeft + pad), viewRight - menuWidth - pad);

      // Prefer opening above the anchor, pinned by `bottom` so height changes
      // (e.g. expanding date/time fields) grow upward without bouncing the panel.
      const spaceAbove = rect.top - viewTop - pad - gap;
      const openAbove = menuHeight <= spaceAbove || spaceAbove >= viewBottom - rect.bottom - pad;
      if (openAbove) {
        const bottom = window.innerHeight - rect.top + gap;
        setCoords(
          matchRect
            ? { bottom, left, width: menuWidth }
            : { bottom, left },
        );
        return;
      }

      let top = rect.bottom + gap;
      top = Math.min(Math.max(top, viewTop + pad), Math.max(viewTop + pad, viewBottom - menuHeight - pad));
      setCoords(matchRect ? { top, left, width: menuWidth } : { top, left });
    };

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    const menu = menuRef.current;
    const match = matchWidthRef?.current;
    const resizeObserver = new ResizeObserver(updatePosition);
    if (menu) resizeObserver.observe(menu);
    if (match) resizeObserver.observe(match);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", updatePosition);
    vv?.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      vv?.removeEventListener("resize", updatePosition);
      vv?.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, menuRef, align, matchWidthRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`app-attach-menu app-overlay-menu${className ? ` ${className}` : ""}`}
      role={role}
      aria-label={ariaLabel}
      style={
        coords
          ? {
              top: coords.top ?? "auto",
              bottom: coords.bottom ?? "auto",
              left: coords.left,
              ...(coords.width != null ? { width: coords.width } : {}),
            }
          : { top: 0, left: 0, visibility: "hidden" }
      }
    >
      {children}
    </div>,
    document.body,
  );
}

function App() {
  const [content, setContent] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [composeKindMenuOpen, setComposeKindMenuOpen] = useState(false);
  const [assistProPromptOpen, setAssistProPromptOpen] = useState(false);
  const [durationMenuOpen, setDurationMenuOpen] = useState(false);
  const [durationActivated, setDurationActivated] = useState(false);
  const [recurringMenuOpen, setRecurringMenuOpen] = useState(false);
  const [recurringActivated, setRecurringActivated] = useState(false);
  const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>(DEFAULT_RECURRING_UNIT);
  const [recurringCount, setRecurringCount] = useState(DEFAULT_RECURRING_COUNT);
  const [recurringInput, setRecurringInput] = useState(String(DEFAULT_RECURRING_COUNT));
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([]);
  const [recurringMonthDay, setRecurringMonthDay] = useState(MIN_MONTH_DAY);
  const [urgencyActivated, setUrgencyActivated] = useState(true);
  const [urgency, setUrgency] = useState<UrgencyOption>(DEFAULT_URGENCY);
  const [impactMenuOpen, setImpactMenuOpen] = useState(false);
  const [impactActivated, setImpactActivated] = useState(false);
  const [impact, setImpact] = useState(DEFAULT_IMPACT);
  const [taskDate, setTaskDate] = useState("");
  const [taskStartsAt, setTaskStartsAt] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskTimeMode, setTaskTimeMode] = useState<"starts_at" | "due_at">("starts_at");
  const [composerAutoRescheduled, setComposerAutoRescheduled] = useState(false);
  /** True after the user opens Date & Time; keeps the schedule icon green after the menu closes. */
  const [scheduleToolActivated, setScheduleToolActivated] = useState(false);
  /** Meta keys still auto/default until the user opens the matching composer tool. */
  const [composerMetaAuto, setComposerMetaAuto] = useState<Set<MetaAutoKey>>(
    () => new Set(["type", "duration", "urgency", "impact"]),
  );
  const [taskToolHint, setTaskToolHint] = useState<string | null>(null);
  const [linkRelation, setLinkRelation] = useState<LinkRelation>("parent");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkContainerType, setLinkContainerType] = useState<LinkPickerType>("all");
  const [linkContainerTypeMenuOpen, setLinkContainerTypeMenuOpen] = useState(false);
  const [recentLinkIds, setRecentLinkIds] = useState<string[]>(() => loadRecentLinkIds());
  const [linkQuickAddOpen, setLinkQuickAddOpen] = useState(false);
  const [linkQuickAddTitle, setLinkQuickAddTitle] = useState("");
  const [linkQuickAddKind, setLinkQuickAddKind] = useState<ContainerQuickAddKind>("collection");
  const [linkQuickAddKindMenuOpen, setLinkQuickAddKindMenuOpen] = useState(false);
  const [linkQaUrgencyMenuOpen, setLinkQaUrgencyMenuOpen] = useState(false);
  const [linkQaUrgencyActivated, setLinkQaUrgencyActivated] = useState(false);
  const [linkQaUrgency, setLinkQaUrgency] = useState<UrgencyOption>(DEFAULT_URGENCY);
  const [linkQaImpactMenuOpen, setLinkQaImpactMenuOpen] = useState(false);
  const [linkQaImpactActivated, setLinkQaImpactActivated] = useState(false);
  const [linkQaImpact, setLinkQaImpact] = useState(DEFAULT_IMPACT);
  const [linkQaScheduleMenuOpen, setLinkQaScheduleMenuOpen] = useState(false);
  const [linkQaDate, setLinkQaDate] = useState("");
  const [linkQaStartsAt, setLinkQaStartsAt] = useState("");
  const [linkQaDueAt, setLinkQaDueAt] = useState("");
  const [linkQaTimeMode, setLinkQaTimeMode] = useState<"starts_at" | "due_at">("starts_at");
  const [linkPrecedence, setLinkPrecedence] = useState<LinkPrecedence | null>(null);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [pendingChildId, setPendingChildId] = useState<string | null>(null);
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const [estDurationMinutes, setEstDurationMinutes] = useState<number | null>(15);
  const [durationInput, setDurationInput] = useState("15");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [timelineMenuOpen, setTimelineMenuOpen] = useState(false);
  const [taskGapMinutes, setTaskGapMinutes] = useState(() => loadTaskGapMinutes());
  const [taskGapInput, setTaskGapInput] = useState(() => String(loadTaskGapMinutes()));
  const [composeKind, setComposeKind] = useState<ComposeKind>("task");
  const aiEnabled = false;
  const [activeView, setActiveView] = useState<ActiveView>(() =>
    isActiveView(INITIAL_UI_SESSION?.activeView)
      ? INITIAL_UI_SESSION.activeView
      : "home",
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<ComposerDraft[]>(() => {
    const loaded = loadTasks();
    const migrated = loaded
      .filter((task) => isCollectionTaskType(task.type))
      .map((task) => ({ ...task, type: "collection" as const }));
    let rest = loaded.filter((task) => !isCollectionTaskType(task.type));
    if (migrated.length > 0) {
      saveCollections([...loadCollections(), ...migrated]);
    }
    // Materialize / prune series to the fixed horizon (not scroll window).
    const now = new Date();
    const through = recurringHorizonEnd(now, recurringMaterializeHorizonDays());
    let changed = migrated.length > 0;
    const SERIES_MIGRATE_KEY = "twineline.recurringSeriesMigrated";
    const needsLegacyMigrate = localStorage.getItem(SERIES_MIGRATE_KEY) !== "1";
    if (needsLegacyMigrate) {
      // One-time: legacy single recurring rows → assign series_id and materialize futures.
      const legacyRecurring = rest.filter(
        (task) =>
          task.series_id == null &&
          parseRecurring(task.recurring) != null &&
          task.date != null &&
          task.completed_at == null,
      );
      for (const task of legacyRecurring) {
        const schedule = parseRecurring(task.recurring);
        if (!schedule || task.date == null) continue;
        const seriesId = crypto.randomUUID();
        const anchored = { ...task, series_id: seriesId };
        rest = rest.map((entry) => (entry.id === task.id ? anchored : entry));
        const futures = materializeRecurringSeries(anchored, schedule, through, {
          seriesId,
          includeAnchor: false,
        });
        rest = futures.length > 0 ? [...futures, ...rest] : rest;
        changed = true;
      }
      try {
        localStorage.setItem(SERIES_MIGRATE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    // Drop bloated 90-day materializations from earlier builds.
    const pruned = pruneRecurringSeriesBeyondHorizon(rest, through);
    if (pruned.length !== rest.length) {
      rest = pruned;
      changed = true;
    }
    const seriesIds = new Set(
      rest
        .map((task) => task.series_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    for (const seriesId of seriesIds) {
      const before = rest.length;
      rest = topUpRecurringSeries(rest, seriesId, through);
      if (rest.length !== before) changed = true;
    }
    if (changed) saveTasks(rest);
    return rest;
  });
  const [collections, setCollections] = useState<ComposerDraft[]>(() => loadCollections());
  const [poppingTaskIds, setPoppingTaskIds] = useState<string[]>([]);
  const [deletePrompt, setDeletePrompt] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  editingTaskIdRef.current = editingTaskId;
  const [editTaskBaseline, setEditTaskBaseline] = useState<{
    title: string;
    est_duration: number | null;
    urgency: UrgencyOption;
    impact: number;
    date: string | null;
    starts_at: string | null;
    due_at: string | null;
    recurring: string | null;
    meta_auto: string | null;
    durationActivated: boolean;
    impactActivated: boolean;
    scheduleToolActivated: boolean;
    recurringActivated: boolean;
    urgencyActivated: boolean;
    auto_rescheduled: boolean;
  } | null>(null);
  const editTaskBaselineRef = useRef(editTaskBaseline);
  editTaskBaselineRef.current = editTaskBaseline;
  const [composerSavePromptOpen, setComposerSavePromptOpen] = useState(false);
  const [overflowReschedulePromptDayKey, setOverflowReschedulePromptDayKey] =
    useState<string | null>(null);
  const [recurringSchedulePromptOpen, setRecurringSchedulePromptOpen] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [focusedOverflowTaskIds, setFocusedOverflowTaskIds] = useState<string[] | null>(null);
  const [currentFocus, setCurrentFocus] = useState<CurrentFocus | null>(() => loadCurrentFocus());
  const [timelineMultiSelect, setTimelineMultiSelect] = useState(false);
  const [selectedTimelineTaskIds, setSelectedTimelineTaskIds] = useState<string[]>([]);
  const [defaultTargetTime, setDefaultTargetTime] = useState(() => loadTargetTime());
  const [targetTimeOverrides, setTargetTimeOverrides] = useState(() => loadTargetTimeOverrides());
  const [targetTime, setTargetTime] = useState(() =>
    resolveTargetTime(toStartOfDay(new Date()), loadTargetTime(), loadTargetTimeOverrides()),
  );
  const [defaultWindowStartTime, setDefaultWindowStartTime] = useState(() => loadWindowStartTime());
  const [windowStartOverrides, setWindowStartOverrides] = useState(() => loadWindowStartOverrides());
  const [windowStartTime, setWindowStartTime] = useState(() =>
    resolveWindowStartTime(toStartOfDay(new Date()), loadWindowStartTime(), loadWindowStartOverrides()),
  );
  const [selectedDay, setSelectedDay] = useState(() => toStartOfDay(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [overdueSectionOpenByDay, setOverdueSectionOpenByDay] = useState<
    Record<string, boolean>
  >(() => {
    const today = dayKey(toStartOfDay(new Date()));
    return { [today]: INITIAL_UI_SESSION?.overdueSectionOpen ?? true };
  });
  const [homeOverdueSectionOpen] = useState(
    () => INITIAL_UI_SESSION?.homeOverdueSectionOpen ?? false,
  );
  const [planCompletedCounts, setPlanCompletedCounts] = useState(loadPlanCompletedCounts);
  const overdueSectionOpenByDayRef = useRef(overdueSectionOpenByDay);
  overdueSectionOpenByDayRef.current = overdueSectionOpenByDay;
  const homeOverdueSectionOpenRef = useRef(homeOverdueSectionOpen);
  homeOverdueSectionOpenRef.current = homeOverdueSectionOpen;
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerDay, setTimePickerDay] = useState(() => toStartOfDay(new Date()));
  const [timePickerBaseline, setTimePickerBaseline] = useState<{
    target: string;
    windowStart: string;
  } | null>(null);
  const [timeSavePromptOpen, setTimeSavePromptOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => toStartOfDay(new Date()));
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [daySnoozed, setDaySnoozed] = useState(() =>
    loadDaySnooze(dayKey(toStartOfDay(new Date()))),
  );
  const [todayWindowBaseline, setTodayWindowBaseline] = useState<TodayWindowBaseline | null>(() =>
    loadTodayWindowBaseline(),
  );
  const [todaySoftPackPlan, setTodaySoftPackPlan] = useState<TodaySoftPackPlan | null>(() =>
    loadTodaySoftPackPlan(),
  );
  /** Softs whose At Risk countdown expired — stay in Overflow until rescheduled. */
  const [forcedOverflowIds, setForcedOverflowIds] = useState<Set<string>>(() => new Set());
  type TimelineNotice = {
    id: string;
    kind: "overflow" | "recovered" | "at-risk" | "deferred";
    count: number;
    /** Epoch ms — oldest first in the list, newest at the bottom. */
    at: number;
    /** Destination day for deferred notices. */
    dayKey?: string;
    /** Tasks moved in a deferred notice (scroll targets first id). */
    taskIds?: string[];
  };
  const [timelineNotices, setTimelineNotices] = useState<TimelineNotice[]>([]);
  const prevOverflowIdsRef = useRef<Set<string> | null>(null);
  const prevAtRiskIdRef = useRef<string | null | undefined>(undefined);
  /** Undated ids released by Automatic this calendar day — baseline merge must not re-add. */
  const autoReleasedBaselineIdsRef = useRef<{ dayKey: string; ids: Set<string> }>({
    dayKey: "",
    ids: new Set(),
  });
  /** Undated softs already notified as deferred for this calendar day (no date write). */
  const deferredNoticeIdsRef = useRef<{ dayKey: string; ids: Set<string> }>({
    dayKey: "",
    ids: new Set(),
  });
  const composerRef = useRef<HTMLFormElement>(null);
  const composerFieldRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const overdueSectionRef = useRef<HTMLElement>(null);
  const overdueScrollBlockRef = useRef<HTMLDivElement>(null);
  const overflowToggleRef = useRef<HTMLButtonElement>(null);
  const twinelineChromeRef = useRef<HTMLDivElement>(null);
  const twinelineSlotRef = useRef<HTMLDivElement>(null);
  const twinelineHeaderRef = useRef<HTMLElement>(null);
  const twinelineSlideRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const viewScrollTopRef = useRef<Partial<Record<ActiveView, number>>>(
    (() => {
      const scrollByView: Partial<Record<ActiveView, number>> = {};
      if (!INITIAL_UI_SESSION?.scrollByView) return scrollByView;
      for (const [key, scrollTop] of Object.entries(INITIAL_UI_SESSION.scrollByView)) {
        if (isActiveView(key) && typeof scrollTop === "number") {
          scrollByView[key] = scrollTop;
        }
      }
      return scrollByView;
    })(),
  );
  const initialViewScrollTop =
    viewScrollTopRef.current[
      isActiveView(INITIAL_UI_SESSION?.activeView)
        ? INITIAL_UI_SESSION.activeView
        : "home"
    ] ?? 0;
  const pendingViewScrollTopRef = useRef<number | null>(
    initialViewScrollTop > 0 ? initialViewScrollTop : null,
  );
  const sessionScrollRestoreRef = useRef<number | null>(
    initialViewScrollTop > 0 ? initialViewScrollTop : null,
  );
  const uiSessionSaveTimerRef = useRef<number | null>(null);
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const searchOpenRef = useRef(searchOpen);
  searchOpenRef.current = searchOpen;
  const moreMenuOpenRef = useRef(moreMenuOpen);
  moreMenuOpenRef.current = moreMenuOpen;
  const mainSwipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    armed: boolean;
  } | null>(null);
  const chromeHiddenRef = useRef(false);
  const chromeLockRef = useRef(false);
  const chromeCooldownUntilRef = useRef(0);
  const selectedDayRef = useRef(selectedDay);
  selectedDayRef.current = selectedDay;
  const countdownNowRef = useRef(countdownNow);
  countdownNowRef.current = countdownNow;
  /** Snapshot remaining ms when Rest / Break begins so the bar can drain. */
  const focusStatusCountdownTotalRef = useRef<{
    mode: "rest" | "pivot" | "break" | null;
    totalMs: number;
  }>({ mode: null, totalMs: 0 });
  /** Frozen pack/focus start for active timed Current focus countdown. */
  const focusTaskCountdownAnchorRef = useRef<{
    taskId: string;
    startedAtMs: number;
    durationMs: number;
  } | null>(null);
  const [tasksCompact, setTasksCompact] = useState(true);
  const [outsideExpandedByDay, setOutsideExpandedByDay] = useState<
    Record<string, OutsideExpandedFlags>
  >({});
  const [timelineRangeStart, setTimelineRangeStart] = useState(() => toStartOfDay(new Date()));
  const [timelineDayCount, setTimelineDayCount] = useState(() => {
    const saved = INITIAL_UI_SESSION?.timelineDayCount;
    return typeof saved === "number" && Number.isFinite(saved)
      ? saved
      : DEFAULT_TIMELINE_DAY_COUNT;
  });
  const timelineDayCountRef = useRef(timelineDayCount);
  timelineDayCountRef.current = timelineDayCount;
  const timelineGrowAtRef = useRef(0);
  const TIMELINE_GROW_STEP = 14;
  const TIMELINE_GROW_COALESCE_MS = 150;
  const TIMELINE_PREFETCH_RATIO = 0.7;
  const TIMELINE_PREFETCH_PX = 1200;
  /** Grow the UI day window (not materialize horizon). Coalesce flings unless forced. */
  const growTimelineDayCount = (step: number = TIMELINE_GROW_STEP, force = false) => {
    if (!force) {
      const now = performance.now();
      if (now - timelineGrowAtRef.current < TIMELINE_GROW_COALESCE_MS) return;
      timelineGrowAtRef.current = now;
    }
    setTimelineDayCount((count) => {
      if (count >= MAX_TIMELINE_DAY_COUNT) return count;
      const add = Math.max(1, Math.round(step));
      return Math.min(MAX_TIMELINE_DAY_COUNT, count + add);
    });
  };
  const [showTimelineScrollTop, setShowTimelineScrollTop] = useState(false);
  const timelineScrollSyncLockRef = useRef(false);
  const timelineScrollTopBtnVisibleRef = useRef(false);
  const pendingTimelineScrollDayRef = useRef<Date | null>(null);
  const pendingViewScrollTaskIdRef = useRef<string | null>(null);
  const pendingViewPreserveChromeRef = useRef(false);
  const pendingViewChromeHiddenRef = useRef(false);
  const trayRef = useRef<HTMLElement>(null);
  const searchFieldRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const composeKindMenuRef = useRef<HTMLDivElement>(null);
  const composeKindButtonRef = useRef<HTMLButtonElement>(null);
  const assistProPromptMenuRef = useRef<HTMLDivElement>(null);
  const composeAddButtonRef = useRef<HTMLButtonElement>(null);
  const durationMenuRef = useRef<HTMLDivElement>(null);
  const durationButtonRef = useRef<HTMLButtonElement>(null);
  const recurringMenuRef = useRef<HTMLDivElement>(null);
  const impactMenuRef = useRef<HTMLDivElement>(null);
  const taskToolHintMenuRef = useRef<HTMLDivElement>(null);
  const taskToolHintAnchorRef = useRef<HTMLElement | null>(null);
  const dueDateButtonRef = useRef<HTMLButtonElement>(null);
  const taskDateInputRef = useRef<HTMLInputElement>(null);
  const taskTimeInputRef = useRef<HTMLInputElement>(null);
  const datePickerOpenRef = useRef(false);
  const timePickerOpenRef = useRef(false);
  const datePickerClosingRef = useRef(false);
  const timePickerClosingRef = useRef(false);
  const targetTimeInputRef = useRef<HTMLInputElement>(null);
  const windowStartInputRef = useRef<HTMLInputElement>(null);
  const homeCountdownButtonRef = useRef<HTMLSpanElement>(null);
  const daylineCountdownButtonRef = useRef<HTMLSpanElement>(null);
  const timeFramesMenuRef = useRef<HTMLDivElement>(null);
  const [timePickerSource, setTimePickerSource] = useState<"home" | "dayline">("dayline");
  const timePickerAnchorRef =
    timePickerSource === "home" ? homeCountdownButtonRef : daylineCountdownButtonRef;
  const scheduleDraftRef = useRef<{
    date: string | null;
    starts_at: string | null;
    due_at: string | null;
    mode: "starts_at" | "due_at";
  }>({ date: null, starts_at: null, due_at: null, mode: "starts_at" });
  const parentTaskButtonRef = useRef<HTMLButtonElement>(null);
  const linkContainerTypeButtonRef = useRef<HTMLButtonElement>(null);
  const linkContainerTypeMenuRef = useRef<HTMLDivElement>(null);
  const linkQuickAddKindButtonRef = useRef<HTMLButtonElement>(null);
  const linkQuickAddKindMenuRef = useRef<HTMLDivElement>(null);
  const linkQaUrgencyButtonRef = useRef<HTMLButtonElement>(null);
  const linkQaUrgencyMenuRef = useRef<HTMLDivElement>(null);
  const linkQaImpactButtonRef = useRef<HTMLButtonElement>(null);
  const linkQaImpactMenuRef = useRef<HTMLDivElement>(null);
  const linkQaScheduleButtonRef = useRef<HTMLButtonElement>(null);
  const linkQaScheduleMenuRef = useRef<HTMLDivElement>(null);
  const linkQuickAddInputRef = useRef<HTMLInputElement>(null);
  const impactButtonRef = useRef<HTMLButtonElement>(null);
  const cycleButtonRef = useRef<HTMLButtonElement>(null);
  const toolsCenterRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const timelineMenuButtonRef = useRef<HTMLButtonElement>(null);
  const timelineMenuRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const composeInputRef = useRef<HTMLTextAreaElement>(null);
  const hasText = content.trim().length > 0;
  const selectedComposeKind =
    COMPOSE_KINDS.find((kind) => kind.id === composeKind) ?? COMPOSE_KINDS[0];
  const SelectedComposeIcon = selectedComposeKind.Icon;
  const composePlaceholder = selectedComposeKind.placeholder;
  const selectedLinkContainerType =
    LINK_TYPE_PICKER_ITEMS.find((item) => item.id === linkContainerType) ??
    LINK_TYPE_PICKER_ITEMS[0];
  const SelectedLinkContainerIcon = selectedLinkContainerType.Icon;
  const selectedLinkQuickAddType =
    COMPOSE_CONTAINER_TYPE_ITEMS.find((item) => item.id === linkQuickAddKind) ??
    COMPOSE_CONTAINER_TYPE_ITEMS[0];
  const SelectedLinkQuickAddIcon = selectedLinkQuickAddType.Icon;
  const selectedLinkId =
    linkRelation === "child" ? pendingChildId : pendingParentId;
  const fabComposeKind =
    COMPOSE_KINDS.find((kind) => kind.id === COMPOSE_KIND_BY_VIEW[activeView]) ?? COMPOSE_KINDS[0];
  const FabComposeIcon = fabComposeKind.Icon;

  const DaylineIcon = DAYLINE_TAB.Icon;
  const moreMenuViewIds = new Set<ActiveView>([
    ...TEND_MENU_ITEMS.map((item) => item.id),
    "events",
    "items",
    "notebooks",
    "calendars",
    "logs",
  ]);
  const moreMenuViewSelected = moreMenuViewIds.has(activeView);
  const moreButtonActive = moreMenuOpen || moreMenuViewSelected;
  const todayStart = toStartOfDay(new Date(countdownNow));
  const getTargetTimeForDay = (day: Date) => {
    if (timePickerOpen && sameCalendarDay(day, selectedDay)) return targetTime;
    return resolveTargetTime(day, defaultTargetTime, targetTimeOverrides);
  };
  const getWindowStartTimeForDay = (day: Date) => {
    if (timePickerOpen && sameCalendarDay(day, selectedDay)) return windowStartTime;
    return resolveWindowStartTime(day, defaultWindowStartTime, windowStartOverrides);
  };
  const todayTargetTime = getTargetTimeForDay(todayStart);
  const todayWindowStartTime = getWindowStartTimeForDay(todayStart);
  const todayWindowStartMinutes = packWindowStartMinutes(todayWindowStartTime);
  const countdownMs = msUntilTargetTime(todayTargetTime, new Date(countdownNow));
  const countdownRemaining = formatCountdown(countdownMs);
  const nowMinutes = minutesFromMidnight(new Date(countdownNow));
  const todayPackEnd = packWindowEndMinutes(todayTargetTime, todayWindowStartMinutes);
  const outsideTaskWindow =
    nowMinutes < todayWindowStartMinutes || nowMinutes >= todayPackEnd;
  const targetTimeLabel = formatTargetTimeLabel(timePickerOpen ? targetTime : todayTargetTime);
  const nonContainerTasks = useMemo(
    () => tasks.filter((task) => !isContainerTaskType(task.type)),
    [tasks],
  );
  const tasksForCalendar = useMemo(() => {
    const list = daySnoozed
      ? nonContainerTasks.filter((task) => !isUndatedTask(task))
      : nonContainerTasks;
    return list.filter(
      (task) =>
        (task.id == null || !forcedOverflowIds.has(task.id)) &&
        !(task.type === "item" && task.completed_at != null),
    );
  }, [nonContainerTasks, daySnoozed, forcedOverflowIds]);
  const calendarDays = buildMonthCalendarDays(calendarMonth);
  const calendarMonthLabel = formatMonthYearLabel(calendarMonth);
  const appliedTodayBegins = resolveWindowStartTime(
    todayStart,
    defaultWindowStartTime,
    windowStartOverrides,
  );
  const appliedTodayEnds = resolveTargetTime(todayStart, defaultTargetTime, targetTimeOverrides);
  const appliedTodayWindowSig = todayWindowSignature(appliedTodayBegins, appliedTodayEnds);
  const todayKeyStr = dayKey(todayStart);
  const baselineKey =
    todayWindowBaseline?.dayKey === todayKeyStr &&
    todayWindowBaseline.windowSig === appliedTodayWindowSig
      ? todayWindowBaseline.taskIds.join("\0")
      : "";
  const baselineIds = useMemo(
    () => new Set(baselineKey ? baselineKey.split("\0") : []),
    [baselineKey],
  );
  const todayFocusId =
    currentFocus?.dayKey === todayKeyStr ? currentFocus.taskId : null;
  const focusLocked = currentFocus?.dayKey === todayKeyStr && currentFocus.locked === true;
  /** Only a locked focus is force-pinned so packing cannot push it to overflow. */
  const pinnedFocusId = focusLocked ? todayFocusId : null;
  // Pack once per minute — second-level countdownNow ticks must not re-layout.
  const layoutNowFloorMs = Math.floor(countdownNow / 60_000) * 60_000;
  const LAYOUT_THROUGH_BUFFER_DAYS = 7;
  const calendarTasksLayout = useMemo(() => {
    const layoutGetTarget = (day: Date) => {
      if (timePickerOpen && sameCalendarDay(day, selectedDay)) return targetTime;
      return resolveTargetTime(day, defaultTargetTime, targetTimeOverrides);
    };
    const layoutGetWindowStart = (day: Date) => {
      if (timePickerOpen && sameCalendarDay(day, selectedDay)) return windowStartTime;
      return resolveWindowStartTime(day, defaultWindowStartTime, windowStartOverrides);
    };
    const layoutThroughDate = addDays(
      timelineRangeStart,
      timelineDayCount - 1 + LAYOUT_THROUGH_BUFFER_DAYS,
    );
    return layoutCalendarTasks(
      tasksForCalendar,
      new Date(layoutNowFloorMs),
      layoutGetTarget,
      taskGapMinutes,
      layoutGetWindowStart,
      baselineIds,
      pinnedFocusId,
      [],
      layoutThroughDate,
    );
  }, [
    tasksForCalendar,
    layoutNowFloorMs,
    taskGapMinutes,
    baselineIds,
    pinnedFocusId,
    timePickerOpen,
    selectedDay,
    targetTime,
    windowStartTime,
    defaultTargetTime,
    targetTimeOverrides,
    defaultWindowStartTime,
    windowStartOverrides,
    timelineRangeStart,
    timelineDayCount,
  ]);
  const calendarTaskLayout = calendarTasksLayout.days;
  const todayLayoutForOverflow = calendarTaskLayout.find(
    (day) => day.dayKey === todayKeyStr,
  );
  const todayEndSlackMin = calendarTasksLayout.todayEndSlackMin;
  const layoutAtRiskTask = calendarTasksLayout.atRiskTask;
  const forcedOverflowTasks = nonContainerTasks.filter(
    (task) => task.id != null && forcedOverflowIds.has(task.id),
  );
  /** Earliest-overtaken first; most recently overtaken last (matches timeline). */
  const overflowPackEndById = new Map<string, number>();
  for (const block of todayLayoutForOverflow?.scheduleBlocks ?? []) {
    const end = block.packEndMin ?? block.endMin;
    if (end > nowMinutes) continue;
    if (block.task.id) overflowPackEndById.set(block.task.id, end);
  }
  const compareOverflowTimelineOrder = (a: ComposerDraft, b: ComposerDraft) => {
    const endA = a.id != null ? overflowPackEndById.get(a.id) : undefined;
    const endB = b.id != null ? overflowPackEndById.get(b.id) : undefined;
    if (endA != null && endB != null && endA !== endB) return endA - endB;
    if (endA != null && endB == null) return 1;
    if (endA == null && endB != null) return -1;
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    const timeA =
      parseTimeOfDay(a.starts_at) ??
      parseTimeOfDay(a.due_at) ??
      Number.POSITIVE_INFINITY;
    const timeB =
      parseTimeOfDay(b.starts_at) ??
      parseTimeOfDay(b.due_at) ??
      Number.POSITIVE_INFINITY;
    if (timeA !== timeB) return timeA - timeB;
    return (a.title ?? "").localeCompare(b.title ?? "");
  };
  const overflowForDay = (dayLayout: (typeof calendarTaskLayout)[number] | undefined) => {
    const dayOverdue = dayLayout?.overdueTasks ?? [];
    // Overflow is dated/timed misses only — undated softs defer to future days.
    const layoutOverdueIds = new Set(
      dayOverdue.map((task) => task.id).filter((id): id is string => id != null),
    );
    const isToday = dayLayout?.dayKey === todayKeyStr;
    const overdue = isToday
      ? [
          ...dayOverdue,
          ...forcedOverflowTasks.filter(
            (task) => task.id != null && !layoutOverdueIds.has(task.id),
          ),
        ]
      : dayOverdue;
    const overdueIdSet = new Set(
      overdue.map((task) => task.id).filter((id): id is string => id != null),
    );
    const rows = [...overdue]
      .sort(compareOverflowTimelineOrder)
      .map((task) => ({
        task,
        overdue: task.id != null && overdueIdSet.has(task.id),
      }));
    return {
      rows,
      tasks: rows.map((row) => row.task),
      count: rows.length,
      deferOnly: false,
    };
  };
  const todayOverflow = overflowForDay(todayLayoutForOverflow);
  const overflowTasks = todayOverflow.tasks;
  const overflowTaskCount = todayOverflow.count;
  const overflowDeferOnly = todayOverflow.deferOnly;
  const unlockedFocusInOverflow =
    currentFocus != null &&
    currentFocus.dayKey === todayKeyStr &&
    currentFocus.locked !== true &&
    overflowTasks.some((task) => task.id === currentFocus.taskId);
  const parentTitleById = (() => {
    const map = new Map<string, string>();
    for (const collection of collections) {
      if (collection.id) map.set(collection.id, collection.title);
    }
    for (const task of tasks) {
      if (task.id) map.set(task.id, task.title);
    }
    return map;
  })();
  const parentTitleFor = (parentId: string | null | undefined) =>
    parentId != null ? (parentTitleById.get(parentId) ?? null) : null;
  const calendarLayoutSpanKey =
    calendarTaskLayout.length > 0
      ? `${calendarTaskLayout[0].dayKey}:${calendarTaskLayout[calendarTaskLayout.length - 1].dayKey}`
      : "";
  const calendarLayoutByKey = new Map(calendarTaskLayout.map((day) => [day.dayKey, day]));
  const selectedDayKey = dayKey(selectedDay);
  const selectedDayLayout = calendarLayoutByKey.get(selectedDayKey);
  const selectedDayTargetTime = getTargetTimeForDay(selectedDay);
  const selectedDayWindowStartMinutes = packWindowStartMinutes(
    getWindowStartTimeForDay(selectedDay),
  );
  const selectedDayPackEnd =
    selectedDayLayout?.packEndMin ??
    packWindowEndMinutes(selectedDayTargetTime, selectedDayWindowStartMinutes);
  const selectedIsToday = sameCalendarDay(selectedDay, todayStart);
  // Keep overtaken day tasks on the twineline; Overflow list is separate.
  const selectedScheduleBlocks = (
    selectedDayLayout?.scheduleBlocks ?? selectedDayLayout?.blocks ?? []
  )
    .filter((block) => !block.overdue)
    .map((block) => ({
      startMin: block.packStartMin ?? block.startMin,
      endMin: block.packEndMin ?? block.endMin,
      task: block.task,
      overdue: false as const,
    }));
  const todayLayout = calendarLayoutByKey.get(dayKey(todayStart));
  const todayPlanBlocks = [...(todayLayout?.scheduleBlocks ?? [])]
    .filter((block) => !block.overdue)
    .sort(
      (a, b) =>
        (a.packStartMin ?? a.startMin) - (b.packStartMin ?? b.startMin) ||
        (a.packEndMin ?? a.endMin) - (b.packEndMin ?? b.endMin),
    );
  // Overtaken = plan window contains now (not day-history of past ends).
  const overtakenPlanBlocks = todayPlanBlocks.filter((block) => {
    const start = block.packStartMin ?? block.startMin;
    const end = block.packEndMin ?? block.endMin;
    return start <= nowMinutes && end > nowMinutes;
  });
  const overtakenFocusBlock = overtakenPlanBlocks[0] ?? null;
  const upNextPlanBlocksAll = todayPlanBlocks.filter((block) => {
    const start = block.packStartMin ?? block.startMin;
    return start > nowMinutes;
  });
  const firstUpcomingSoftBlock =
    upNextPlanBlocksAll.find((block) => !isTimedTask(block.task)) ?? null;
  const firstUpcomingSoft = firstUpcomingSoftBlock?.task ?? null;
  const spillCandidateTask =
    layoutAtRiskTask != null &&
    layoutAtRiskTask.id != null &&
    !forcedOverflowIds.has(layoutAtRiskTask.id)
      ? layoutAtRiskTask
      : null;
  const pastWindowMin = Math.max(0, nowMinutes - todayPackEnd);
  const spillDurationMin =
    spillCandidateTask != null
      ? Math.max(1, taskDurationMinutes(spillCandidateTask))
      : 0;
  const spillRemainingMin =
    spillCandidateTask != null
      ? Math.max(0, spillDurationMin - pastWindowMin)
      : 0;
  /** OVERFLOWING: packed flush soft with time past the pack window and remaining duration. */
  const atRiskTask =
    spillCandidateTask != null && pastWindowMin > 0 && spillRemainingMin > 0
      ? spillCandidateTask
      : null;
  const atRiskCountdownMs =
    atRiskTask != null ? spillRemainingMin * 60_000 : null;
  const atRiskCountdownProgress =
    atRiskTask != null && spillDurationMin > 0
      ? Math.min(1, Math.max(0, spillRemainingMin / spillDurationMin))
      : null;
  /** Packed spill soft that has entirely passed the window → Overflow. */
  const spillReadyForOverflowIds =
    spillCandidateTask?.id != null &&
    !forcedOverflowIds.has(spillCandidateTask.id) &&
    pastWindowMin >= spillDurationMin
      ? [spillCandidateTask.id]
      : [];
  const pinnedFocusTask =
    todayFocusId != null
      ? (tasks.find((task) => task.id === todayFocusId) ?? null)
      : null;
  const nothingCurrentlyOvertaken = overtakenPlanBlocks.length === 0;
  // Focus: overtaken task, else next soft while end-of-day slack remains.
  const todayFocusTask =
    overtakenFocusBlock?.task ??
    (nothingCurrentlyOvertaken && todayEndSlackMin > 0
      ? firstUpcomingSoft
      : null) ??
    pinnedFocusTask ??
    null;
  const focusPackedStartMin =
    upNextPlanBlocksAll.length > 0
      ? (upNextPlanBlocksAll[0].packStartMin ?? upNextPlanBlocksAll[0].startMin)
      : null;
  // Up next excludes At Risk soft and the soft already shown as Current focus.
  const upNextPlanBlocks = upNextPlanBlocksAll.filter((block) => {
    const id = block.task.id;
    if (id == null) return true;
    if (atRiskTask?.id === id) return false;
    if (
      nothingCurrentlyOvertaken &&
      todayEndSlackMin > 0 &&
      firstUpcomingSoft?.id === id
    ) {
      return false;
    }
    return true;
  });
  // Rest is the first mode of every day until today's task window begins.
  const beforeTaskWindow = nowMinutes < todayWindowStartMinutes;
  // After the window: no Up next → Pivot Overflow if Overflow has work, else Rest.
  const focusRescheduleOverflowMode =
    !beforeTaskWindow &&
    nothingCurrentlyOvertaken &&
    upNextPlanBlocksAll.length === 0 &&
    overflowTaskCount > 0;
  const focusRestMode =
    beforeTaskWindow ||
    (nothingCurrentlyOvertaken &&
      upNextPlanBlocksAll.length === 0 &&
      overflowTaskCount === 0);
  // Break: end slack gone and nothing overtaken (gap before next / idle flush day).
  const focusBreakMode =
    !beforeTaskWindow &&
    nothingCurrentlyOvertaken &&
    todayEndSlackMin === 0 &&
    !focusRescheduleOverflowMode &&
    !focusRestMode;
  const tomorrowStart = addDays(todayStart, 1);
  const nextDayWindowStartMin = packWindowStartMinutes(
    getWindowStartTimeForDay(tomorrowStart),
  );
  const nextDayWindowStartMs =
    tomorrowStart.getTime() + nextDayWindowStartMin * 60_000;
  // Morning Rest (before today's window): count to today's window start.
  // Evening / in-window Rest: count to next day's window start.
  const restCountdownTargetMs =
    nowMinutes < todayWindowStartMinutes
      ? todayStart.getTime() + todayWindowStartMinutes * 60_000
      : nextDayWindowStartMs;
  // Soft focus: countdown only when end-of-day slack is gone. Timed: always when overtaken.
  const focusTaskIsTimed =
    todayFocusTask != null && isTimedTask(todayFocusTask);
  const focusTaskCountdownActive =
    overtakenFocusBlock != null &&
    todayFocusTask?.id != null &&
    !focusLocked &&
    (focusTaskIsTimed || todayEndSlackMin === 0);
  if (focusTaskCountdownActive && todayFocusTask.id != null) {
    const durationMs = Math.max(1, taskDurationMinutes(todayFocusTask) * 60_000);
    const packStartMin =
      overtakenFocusBlock.packStartMin ?? overtakenFocusBlock.startMin;
    const packStartMs = todayStart.getTime() + packStartMin * 60_000;
    const anchor = focusTaskCountdownAnchorRef.current;
    if (anchor == null || anchor.taskId !== todayFocusTask.id) {
      focusTaskCountdownAnchorRef.current = {
        taskId: todayFocusTask.id,
        startedAtMs: Math.min(packStartMs, countdownNow),
        durationMs,
      };
    } else if (anchor.durationMs !== durationMs) {
      focusTaskCountdownAnchorRef.current = { ...anchor, durationMs };
    }
  } else if (focusTaskCountdownAnchorRef.current != null) {
    focusTaskCountdownAnchorRef.current = null;
  }
  const focusTaskCountdownMs = (() => {
    const anchor = focusTaskCountdownAnchorRef.current;
    if (!focusTaskCountdownActive || anchor == null) return null;
    return Math.max(0, anchor.durationMs - (countdownNow - anchor.startedAtMs));
  })();
  const focusCountdownMs =
    focusRestMode || focusRescheduleOverflowMode
      ? restCountdownTargetMs - countdownNow
      : focusBreakMode && focusPackedStartMin != null
        ? todayStart.getTime() + focusPackedStartMin * 60_000 - countdownNow
        : focusBreakMode
          ? restCountdownTargetMs - countdownNow
          : focusTaskCountdownMs;
  const focusCountdownLabel =
    !focusLocked && focusCountdownMs != null
      ? `- ${formatCountdown(focusCountdownMs, { hideZeroHours: true })}`
      : null;
  const focusStatusMode = focusRestMode
    ? ("rest" as const)
    : focusRescheduleOverflowMode
      ? ("pivot" as const)
      : focusBreakMode
        ? ("break" as const)
        : null;
  if (focusStatusMode != null && focusCountdownMs != null && focusCountdownMs > 0) {
    if (focusStatusCountdownTotalRef.current.mode !== focusStatusMode) {
      focusStatusCountdownTotalRef.current = {
        mode: focusStatusMode,
        totalMs: Math.max(1, focusCountdownMs),
      };
    }
  } else if (focusStatusCountdownTotalRef.current.mode != null) {
    focusStatusCountdownTotalRef.current = { mode: null, totalMs: 0 };
  }
  // Timed task: duration. Rest / Break: remaining when that mode began.
  const focusCountdownTotalMs =
    focusStatusMode != null
      ? focusStatusCountdownTotalRef.current.totalMs
      : focusTaskCountdownAnchorRef.current != null
        ? focusTaskCountdownAnchorRef.current.durationMs
        : null;
  const focusCountdownProgress =
    !focusLocked &&
    focusCountdownMs != null &&
    focusCountdownTotalMs != null
      ? Math.min(1, Math.max(0, focusCountdownMs / focusCountdownTotalMs))
      : null;
  // Overtaken bars: timed always; softs when end-of-day slack is zero.
  const overtakenCountdownByTaskId = new Map<string, number>();
  if (!focusLocked) {
    for (const block of overtakenPlanBlocks) {
      if (!isTimedTask(block.task) && todayEndSlackMin > 0) continue;
      const taskId = block.task.id;
      if (taskId == null) continue;
      const durationMs = Math.max(1, taskDurationMinutes(block.task) * 60_000);
      const startMin = block.packStartMin ?? block.startMin;
      const elapsedMs = countdownNow - (todayStart.getTime() + startMin * 60_000);
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      overtakenCountdownByTaskId.set(
        taskId,
        Math.min(1, Math.max(0, remainingMs / durationMs)),
      );
    }
  }

  const nowSkyColor = daySkyColorAtMinutes(nowMinutes);

  const upNextCountdownTaskId: string | null = null;
  const upNextCountdownProgress: number | null = null;
  const upNextCountdownLabel: string | null = null;
  const showFocusCountdownOnCurrent = focusCountdownLabel != null;
  const showFocusCountdownBarOnCurrent = focusCountdownProgress != null;
  const showUpcomingSoftAsFocus =
    nothingCurrentlyOvertaken &&
    todayEndSlackMin > 0 &&
    firstUpcomingSoft != null &&
    todayFocusTask?.id === firstUpcomingSoft.id;
  const dayElapsedPct = Math.min(
    100,
    Math.max(0, (nowMinutes / MINUTES_PER_DAY) * 100),
  );
  const selectedDayElapsedPct = selectedIsToday
    ? dayElapsedPct
    : selectedDay.getTime() < todayStart.getTime()
      ? 100
      : 0;
  const todayWheelSlices: DayWheelSlice[] = buildDayWheelSlices(
    todayLayout?.blocks ?? [],
  );
  const todaySoftResidentIds = collectSoftTaskIdsOnDay(calendarTaskLayout, todayStart);
  const todaySoftResidentKey = [...todaySoftResidentIds].sort().join(",");
  // Only tasks that lived in today's applied window and were later pushed off today.
  const scheduleOverflowTasks =
    selectedIsToday && !outsideTaskWindow
      ? collectPushedFromTodayWindowTasks(calendarTaskLayout, todayStart, baselineIds)
      : [];
  const scheduleLayout = buildScheduleLayoutForWindow(
    selectedScheduleBlocks,
    0,
    MINUTES_PER_DAY,
    scheduleOverflowTasks,
  );
  const { timelineMinutes: scheduleTimelineMinutes, segments: scheduleSegments } = scheduleLayout;
  const isTaskHighlighted = (id: string | null | undefined) => {
    if (!id) return false;
    if (selectedTimelineTaskIds.includes(id)) return true;
    if (focusedTaskId === id) return true;
    return focusedOverflowTaskIds?.includes(id) ?? false;
  };

  const selectTimelineTask = (id: string, options?: { scroll?: boolean }) => {
    if (timelineMultiSelect) {
      setFocusedOverflowTaskIds(null);
      setFocusedTaskId(null);
      setSelectedTimelineTaskIds((current) =>
        current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
      );
      return;
    }
    setFocusedOverflowTaskIds(null);
    setFocusedTaskId(id);
    if (options?.scroll !== false) scrollTaskIntoView(id);
  };
  const nowDate = new Date(countdownNow);
  const timelineDays = buildDayRange(timelineRangeStart, timelineDayCount)
    .filter((date) => date.getTime() >= todayStart.getTime())
    .map((date) => {
      const key = dayKey(date);
      const existing = calendarLayoutByKey.get(key);
      if (existing) return existing;
      const isToday = sameCalendarDay(date, todayStart);
      const visibleStartMin = isToday ? minutesFromMidnight(nowDate) : 0;
      const windowStart = packWindowStartMinutes(getWindowStartTimeForDay(date));
      const packEnd = packWindowEndMinutes(getTargetTimeForDay(date), windowStart);
      const markerStart = windowStart;
      const windowOpen = markerStart < packEnd;
      const toTop = (absMin: number) => {
        if (absMin < visibleStartMin || absMin > MINUTES_PER_DAY) return null;
        return (absMin - visibleStartMin) * PX_PER_MINUTE;
      };
      const hourMarkers = [];
      for (let hour = Math.ceil(visibleStartMin / 60); hour < 24; hour += 1) {
        const absTop = hour * 60;
        if (absTop < visibleStartMin) continue;
        hourMarkers.push({
          hour,
          label: formatHourLabel(hour),
          topPx: (absTop - visibleStartMin) * PX_PER_MINUTE,
        });
      }
      return {
        date,
        dayKey: key,
        visibleStartMin,
        visibleMinutes: Math.max(1, MINUTES_PER_DAY - visibleStartMin),
        packStartMin: markerStart,
        packEndMin: packEnd,
        packStartLabel: formatMinutesLabel(markerStart),
        packEndLabel: formatMinutesLabel(packEnd),
        packStartTopPx: windowOpen ? toTop(markerStart) : null,
        packEndTopPx: windowOpen ? toTop(packEnd) : null,
        packBandTopPx: null,
        packBandHeightPx: null,
        blocks: [],
        scheduleBlocks: [],
        hourMarkers,
        overdueTasks: [],
        deferredTasks: [],
      };
    });

  const scrollTimelineToDay = (day: Date, behavior: ScrollBehavior = "smooth") => {
    const main = mainRef.current;
    if (!main) return;
    const today = toStartOfDay(new Date(countdownNow));
    const target = toStartOfDay(day);
    // Never scroll into the past — clamp to today.
    const clamped = target.getTime() < today.getTime() ? today : target;
    const key = dayKey(clamped);
    const section = main.querySelector(`[data-calendar-day="${CSS.escape(key)}"]`);
    // Do not queue Timeline scroll or grow the range from other tabs.
    if (activeViewRef.current !== "dayline") {
      return;
    }

    if (!(section instanceof HTMLElement)) {
      pendingTimelineScrollDayRef.current = clamped;
      const start = timelineRangeStart;
      const end = addDays(start, timelineDayCount - 1);
      if (clamped.getTime() < start.getTime()) {
        setTimelineRangeStart(today);
      } else if (clamped.getTime() > end.getTime()) {
        const extra = Math.ceil((clamped.getTime() - end.getTime()) / 86_400_000) + 1;
        growTimelineDayCount(extra, true);
      }
      return;
    }

    pendingTimelineScrollDayRef.current = null;
    timelineScrollSyncLockRef.current = true;
    const chromeHeight = twinelineChromeRef.current?.offsetHeight ?? 0;
    const mainRect = main.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const top = main.scrollTop + (sectionRect.top - mainRect.top) - chromeHeight;
    main.scrollTo({ top: Math.max(0, top), behavior });

    window.setTimeout(() => {
      timelineScrollSyncLockRef.current = false;
      lastScrollTopRef.current = main.scrollTop;
    }, behavior === "auto" ? 0 : 450);
  };

  const selectDayFromUi = (day: Date) => {
    const next = toStartOfDay(day);
    setSelectedDay(next);
    scrollTimelineToDay(next);
  };

  const openCalendar = () => {
    setTimePickerOpen(false);
    setCalendarMonth(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1));
    setCalendarOpen(true);
  };

  const closeCalendar = () => setCalendarOpen(false);

  const selectCalendarDay = (day: Date) => {
    selectDayFromUi(day);
  };

  const openTimePicker = (
    day: Date = selectedDayRef.current,
    source: "home" | "dayline" = "dayline",
  ) => {
    const dayStart = toStartOfDay(day);
    setCalendarOpen(false);
    setTimeSavePromptOpen(false);
    setTimePickerSource(source);
    setTimePickerDay(dayStart);
    // Home must not move Timeline's selectedDay; Dayline may update it.
    if (source === "dayline") {
      setSelectedDay(dayStart);
    }
    const resolvedTarget = resolveTargetTime(dayStart, defaultTargetTime, targetTimeOverrides);
    const resolvedWindowStart = resolveWindowStartTime(
      dayStart,
      defaultWindowStartTime,
      windowStartOverrides,
    );
    setTargetTime(resolvedTarget);
    setWindowStartTime(resolvedWindowStart);
    setTimePickerBaseline({ target: resolvedTarget, windowStart: resolvedWindowStart });
    setTimePickerOpen(true);
  };

  const toggleTimePicker = (source: "home" | "dayline", day?: Date) => {
    if (timePickerOpen && timePickerSource === source) {
      requestCloseTimePicker();
      return;
    }
    openTimePicker(day ?? selectedDayRef.current, source);
  };

  const finishCloseTimePicker = () => {
    setTimeSavePromptOpen(false);
    setTimePickerOpen(false);
    setTimePickerBaseline(null);
  };

  const openOverflowForActiveView = () => {
    if (activeViewRef.current === "home") {
      selectView("dayline");
    }
    const key = dayKey(toStartOfDay(new Date(countdownNowRef.current)));
    setOverdueSectionOpenByDay((current) => {
      const next = { ...current, [key]: true };
      overdueSectionOpenByDayRef.current = next;
      return next;
    });
    persistUiSession();
  };

  const timePickerIsDirty =
    timePickerBaseline != null &&
    (targetTime !== timePickerBaseline.target ||
      windowStartTime !== timePickerBaseline.windowStart);

  const requestCloseTimePicker = () => {
    if (timePickerIsDirty) {
      setTimeSavePromptOpen(true);
      return;
    }
    finishCloseTimePicker();
  };

  const discardTimeChanges = () => {
    if (timePickerBaseline != null) {
      setTargetTime(timePickerBaseline.target);
      setWindowStartTime(timePickerBaseline.windowStart);
    }
    finishCloseTimePicker();
  };

  const applyTargetTimeThisDay = () => {
    const key = targetTimeDayKey(timePickerDay);
    setTargetTimeOverrides((prev) => ({ ...prev, [key]: targetTime }));
    setWindowStartOverrides((prev) => ({ ...prev, [key]: windowStartTime }));
    finishCloseTimePicker();
  };

  const applyTargetTimeAllFutureDays = () => {
    setDefaultTargetTime(targetTime);
    setDefaultWindowStartTime(windowStartTime);
    finishCloseTimePicker();
  };

  const setTargetTimeValue = (value: string) => {
    const next = value.trim().slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(next)) return;
    setTargetTime(next);
  };

  const setWindowStartTimeValue = (value: string) => {
    const next = value.trim().slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(next)) return;
    setWindowStartTime(next);
  };

  const scrollTaskIntoView = (
    taskId: string,
    behavior: ScrollBehavior = "smooth",
    options?: { preserveChrome?: boolean },
  ) => {
    if (activeViewRef.current !== "dayline") return false;
    const main = mainRef.current;
    const row = main?.querySelector(`[data-task-id="${CSS.escape(taskId)}"]`);
    if (!main || !(row instanceof HTMLElement)) return false;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const preserveChrome = options?.preserveChrome === true;
    chromeLockRef.current = true;
    timelineScrollSyncLockRef.current = true;
    if (!preserveChrome) {
      setChromeHidden(false);
    }

    const headerHeight =
      twinelineSlotRef.current?.offsetHeight ||
      twinelineSlideRef.current?.offsetHeight ||
      twinelineHeaderRef.current?.offsetHeight ||
      0;
    const mainRect = main.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const targetTop = main.scrollTop + (rowRect.top - mainRect.top) - headerHeight - 12;
    main.scrollTo({ top: Math.max(0, targetTop), behavior });

    let finished = false;
    let settledFrames = 0;
    let lastTop = main.scrollTop;
    let rafId = 0;
    let fallbackId = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      chromeLockRef.current = false;
      timelineScrollSyncLockRef.current = false;
      lastScrollTopRef.current = main.scrollTop;
      if (!preserveChrome) {
        setChromeHidden(false);
      }
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(fallbackId);
      main.removeEventListener("scrollend", finish);
    };

    if (behavior === "auto") {
      finish();
      return true;
    }

    main.addEventListener("scrollend", finish, { once: true });
    fallbackId = window.setTimeout(finish, 1500);

    const watch = () => {
      if (finished) return;
      const top = main.scrollTop;
      if (Math.abs(top - lastTop) < 0.5) {
        settledFrames += 1;
        if (settledFrames >= 8) {
          finish();
          return;
        }
      } else {
        settledFrames = 0;
        lastTop = top;
      }
      rafId = window.requestAnimationFrame(watch);
    };
    rafId = window.requestAnimationFrame(watch);
    return true;
  };

  const findNearestToScheduleTrack = ():
    | { type: "task"; taskId: string }
    | { type: "day"; day: Date }
    | null => {
    const main = mainRef.current;
    if (!main) return null;
    const track = twinelineSlideRef.current?.querySelector(".twineline-schedule-track");
    const chrome = twinelineChromeRef.current;
    const mainRect = main.getBoundingClientRect();
    const anchorY =
      track instanceof HTMLElement
        ? track.getBoundingClientRect().bottom + 8
        : (chrome?.getBoundingClientRect().bottom ?? mainRect.top) + 8;

    let best:
      | { type: "task"; taskId: string; dist: number }
      | { type: "day"; day: Date; dist: number }
      | null = null;

    const consider = (
      candidate: { type: "task"; taskId: string } | { type: "day"; day: Date },
      top: number,
      bottom: number,
    ) => {
      if (bottom < anchorY - 40 || top > mainRect.bottom) return;
      const dist = Math.abs(top - anchorY);
      if (!best || dist < best.dist) {
        best = { ...candidate, dist };
      }
    };

    for (const el of main.querySelectorAll<HTMLElement>("[data-task-id]")) {
      const id = el.dataset.taskId;
      if (!id) continue;
      const rect = el.getBoundingClientRect();
      consider({ type: "task", taskId: id }, rect.top, rect.bottom);
    }

    for (const section of main.querySelectorAll<HTMLElement>("[data-calendar-day]")) {
      const key = section.dataset.calendarDay;
      if (!key) continue;
      const [y, m, d] = key.split("-").map(Number);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) continue;
      const label =
        section.querySelector<HTMLElement>(".task-day-label, .calendar-timeline-day-label") ??
        section;
      const rect = label.getBoundingClientRect();
      consider(
        { type: "day", day: toStartOfDay(new Date(y, m - 1, d)) },
        rect.top,
        rect.bottom,
      );
    }

    if (!best) {
      // Fall back to any closest task/day on the page.
      for (const el of main.querySelectorAll<HTMLElement>("[data-task-id]")) {
        const id = el.dataset.taskId;
        if (!id) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - anchorY);
        if (!best || dist < best.dist) best = { type: "task", taskId: id, dist };
      }
      for (const section of main.querySelectorAll<HTMLElement>("[data-calendar-day]")) {
        const key = section.dataset.calendarDay;
        if (!key) continue;
        const [y, m, d] = key.split("-").map(Number);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) continue;
        const label =
          section.querySelector<HTMLElement>(".task-day-label, .calendar-timeline-day-label") ??
          section;
        const dist = Math.abs(label.getBoundingClientRect().top - anchorY);
        if (!best || dist < best.dist) {
          best = { type: "day", day: toStartOfDay(new Date(y, m - 1, d)), dist };
        }
      }
    }

    if (!best) return null;
    return best.type === "task"
      ? { type: "task", taskId: best.taskId }
      : { type: "day", day: best.day };
  };

  const applyLinkFields = (draft: ComposerDraft): ComposerDraft => {
    const withParent = { ...draft, parent_id: pendingParentId };
    if (linkPrecedence && selectedLinkId) {
      return {
        ...withParent,
        after_id: selectedLinkId,
        after: linkPrecedence,
      };
    }
    return {
      ...withParent,
      after_id: null,
      after: null,
    };
  };

  const applyParentLinkToEditingTask = (
    parentId: string | null,
    precedence: LinkPrecedence | null = linkPrecedence,
  ) => {
    if (!editingTaskId) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              parent_id: parentId,
              after_id: parentId != null && precedence != null ? parentId : null,
              after: parentId != null && precedence != null ? precedence : null,
            }
          : task,
      ),
    );
  };

  const applyChildLinkToEditingTask = (
    childId: string | null,
    previousChildId: string | null,
  ) => {
    if (!editingTaskId) return;
    setTasks((current) =>
      current.map((task) => {
        if (childId != null && task.id === childId) {
          return { ...task, parent_id: editingTaskId };
        }
        if (
          previousChildId != null &&
          previousChildId !== childId &&
          task.id === previousChildId &&
          task.parent_id === editingTaskId
        ) {
          return { ...task, parent_id: null };
        }
        return task;
      }),
    );
  };

  const resolveComposerEditId = (editId?: string | null) => {
    const resolved = editId !== undefined ? editId : editingTaskIdRef.current;
    // While an edit session exists (id or baseline), never fall through to create.
    if (resolved == null && editTaskBaselineRef.current != null) return undefined;
    return resolved;
  };

  const upsertTaskDraft = (
    draft: ComposerDraft,
    editId?: string | null,
    options?: { materializeSeries?: boolean },
  ) => {
    const resolvedEditId = resolveComposerEditId(editId);
    if (resolvedEditId === undefined) return;
    const withLinks = applyLinkFields(draft);
    const parentIdForChild = resolvedEditId ?? withLinks.id;
    const schedule = parseRecurring(withLinks.recurring);
    const shouldMaterialize =
      options?.materializeSeries === true &&
      schedule != null &&
      withLinks.date != null &&
      resolvedEditId == null;
    const seriesId =
      withLinks.series_id ??
      (shouldMaterialize || schedule != null ? crypto.randomUUID() : null);
    const anchored: ComposerDraft = {
      ...withLinks,
      series_id: shouldMaterialize || withLinks.series_id != null ? seriesId : withLinks.series_id,
    };
    setTasks((current) => {
      let next = current;
      if (resolvedEditId == null) {
        next = [anchored, ...current];
        if (shouldMaterialize && schedule != null && seriesId != null) {
          const futures = materializeRecurringSeries(
            anchored,
            schedule,
            recurringHorizonEnd(
              new Date(countdownNowRef.current),
              recurringMaterializeHorizonDays(),
            ),
            { seriesId, includeAnchor: false },
          );
          if (futures.length > 0) next = [...futures, ...next];
        }
      } else {
        next = current.map((task) => {
          if (task.id !== resolvedEditId) return task;
          return {
            ...task,
            title: withLinks.title,
            type: withLinks.type,
            est_duration: withLinks.est_duration,
            urgency: withLinks.urgency,
            impact: withLinks.impact,
            date: withLinks.date,
            starts_at: withLinks.starts_at,
            due_at: withLinks.due_at,
            recurring: withLinks.recurring,
            series_id:
              withLinks.series_id !== undefined ? withLinks.series_id : task.series_id,
            parent_id: withLinks.parent_id,
            after_id: withLinks.after_id,
            after: withLinks.after,
            auto_rescheduled: withLinks.auto_rescheduled === true,
            meta_auto: withLinks.meta_auto ?? null,
          };
        });
      }
      if (pendingChildId && parentIdForChild) {
        next = next.map((task) =>
          task.id === pendingChildId ? { ...task, parent_id: parentIdForChild } : task,
        );
      }
      return next;
    });
    if (
      resolvedEditId != null &&
      currentFocus?.taskId === resolvedEditId &&
      withLinks.date !== dayKey(toStartOfDay(new Date(countdownNowRef.current)))
    ) {
      setCurrentFocus(null);
      clearCurrentFocusStorage();
    }
  };

  /** Plan / list — name + type only for now. */
  const upsertContainerDraft = (draft: ComposerDraft, editId?: string | null) => {
    const resolvedEditId = resolveComposerEditId(editId);
    if (resolvedEditId === undefined) return;
    const isPlan = draft.type === "plan";
    const containerDraft: ComposerDraft = isPlan
      ? {
          ...draft,
          est_duration: null,
          recurring: null,
          series_id: null,
        }
      : {
          ...draft,
          est_duration: null,
          urgency: null,
          impact: null,
          date: null,
          starts_at: null,
          due_at: null,
          recurring: null,
          series_id: null,
          auto_rescheduled: null,
        };
    const withLinks = applyLinkFields(containerDraft);
    const parentIdForChild = resolvedEditId ?? withLinks.id;
    setTasks((current) => {
      let next = current;
      if (resolvedEditId == null) {
        next = [withLinks, ...current];
      } else {
        next = current.map((task) => {
          if (task.id !== resolvedEditId) return task;
          if (isPlan) {
            return {
              ...task,
              title: withLinks.title,
              type: withLinks.type,
              est_duration: null,
              urgency: withLinks.urgency,
              impact: withLinks.impact,
              date: withLinks.date,
              starts_at: withLinks.starts_at,
              due_at: withLinks.due_at,
              recurring: null,
              parent_id: withLinks.parent_id,
              after_id: withLinks.after_id,
              after: withLinks.after,
              auto_rescheduled: withLinks.auto_rescheduled === true,
              meta_auto: withLinks.meta_auto ?? null,
            };
          }
          return {
            ...task,
            title: withLinks.title,
            type: withLinks.type,
            est_duration: null,
            urgency: null,
            impact: null,
            date: null,
            starts_at: null,
            due_at: null,
            recurring: null,
            parent_id: withLinks.parent_id,
            after_id: withLinks.after_id,
            after: withLinks.after,
            auto_rescheduled: null,
          };
        });
      }
      if (pendingChildId && parentIdForChild) {
        next = next.map((task) =>
          task.id === pendingChildId ? { ...task, parent_id: parentIdForChild } : task,
        );
      }
      return next;
    });
  };

  const upsertCollectionDraft = (draft: ComposerDraft, editId?: string | null) => {
    const resolvedEditId = resolveComposerEditId(editId);
    if (resolvedEditId === undefined) return;
    const withLinks = applyLinkFields({
      ...draft,
      type: "collection",
      est_duration: null,
      urgency: null,
      impact: null,
      date: null,
      starts_at: null,
      due_at: null,
      recurring: null,
      auto_rescheduled: null,
    });
    const collectionDraft: ComposerDraft = {
      ...withLinks,
      type: "collection",
    };
    const parentIdForChild = resolvedEditId ?? collectionDraft.id;
    setCollections((current) => {
      if (resolvedEditId == null) return [collectionDraft, ...current];
      return current.map((collection) => {
        if (collection.id !== resolvedEditId) return collection;
        return {
          ...collection,
          title: collectionDraft.title,
          type: "collection",
          parent_id: collectionDraft.parent_id,
          after_id: collectionDraft.after_id,
          after: collectionDraft.after,
        };
      });
    });
    if (pendingChildId && parentIdForChild) {
      setTasks((current) =>
        current.map((task) =>
          task.id === pendingChildId ? { ...task, parent_id: parentIdForChild } : task,
        ),
      );
    }
  };

  /** Plan / list — full schedule/impact/recurring, never estimated duration. */
  const upsertRichContainerDraft = (
    draft: ComposerDraft,
    editId?: string | null,
  ) => {
    upsertTaskDraft({ ...draft, est_duration: null }, editId);
  };

  const submitComposerDraft: Record<
    ComposeKind,
    (draft: ComposerDraft, editId?: string | null) => void
  > = {
    task: upsertTaskDraft,
    plan: upsertRichContainerDraft,
    collection: upsertCollectionDraft,
    notebook: upsertContainerDraft,
    calendar: upsertContainerDraft,
    event: (_draft) => {},
    list: upsertRichContainerDraft,
    note: (_draft) => {},
    item: upsertTaskDraft,
    log: (_draft) => {},
    assistant: (_draft) => {},
  };

  const resetLinkQuickAddFields = () => {
    setLinkQuickAddTitle("");
    setLinkQuickAddKind("collection");
    setLinkQuickAddKindMenuOpen(false);
    setLinkQaUrgencyMenuOpen(false);
    setLinkQaUrgencyActivated(false);
    setLinkQaUrgency(DEFAULT_URGENCY);
    setLinkQaImpactMenuOpen(false);
    setLinkQaImpactActivated(false);
    setLinkQaImpact(DEFAULT_IMPACT);
    setLinkQaScheduleMenuOpen(false);
    setLinkQaDate("");
    setLinkQaStartsAt("");
    setLinkQaDueAt("");
    setLinkQaTimeMode("starts_at");
  };

  const submitLinkQuickAdd = () => {
    const isContainerQuickAdd = isContainerComposeKind(linkQuickAddKind);
    const date = isContainerQuickAdd ? null : normalizeOptionalField(linkQaDate);
    const time = isContainerQuickAdd
      ? null
      : linkQaTimeMode === "starts_at"
        ? normalizeOptionalField(linkQaStartsAt)
        : normalizeOptionalField(linkQaDueAt);
    const draft = buildComposerDraft({
      title: linkQuickAddTitle,
      type: linkQuickAddKind,
      urgency: isContainerQuickAdd || !linkQaUrgencyActivated ? null : linkQaUrgency,
      impact: isContainerQuickAdd || !linkQaImpactActivated ? null : linkQaImpact,
      date,
      starts_at: !isContainerQuickAdd && linkQaTimeMode === "starts_at" ? time : null,
      due_at: !isContainerQuickAdd && linkQaTimeMode === "due_at" ? time : null,
    });
    if (!draft || !draft.id) return;
    if (linkQuickAddKind === "collection") {
      setCollections((current) => [{ ...draft, type: "collection" }, ...current]);
    } else {
      setTasks((current) => [draft, ...current]);
    }
    if (isLinkPickerType(linkQuickAddKind)) {
      setLinkContainerType(linkQuickAddKind);
    }
    if (linkRelation === "child") {
      const previousChildId = pendingChildId;
      setPendingChildId(draft.id);
      applyChildLinkToEditingTask(draft.id, previousChildId);
      setLinkPrecedence(null);
    } else {
      const precedence =
        linkRelation === "cycle" ? (linkPrecedence ?? "before") : null;
      setPendingParentId(draft.id);
      setPendingChildId(null);
      if (linkRelation === "cycle") {
        setLinkPrecedence(precedence);
      } else {
        setLinkPrecedence(null);
      }
      applyParentLinkToEditingTask(draft.id, precedence);
    }
    setRecentLinkIds((current) => rememberRecentLinkId(draft.id!, current));
    setLinkQuickAddOpen(false);
    resetLinkQuickAddFields();
    closeTaskToolHint();
  };

  const resetComposerFields = () => {
    setContent("");
    setEstDurationMinutes(15);
    setDurationInput("15");
    setDurationUnit("minutes");
    setDurationMenuOpen(false);
    setDurationActivated(false);
    setRecurringMenuOpen(false);
    setRecurringActivated(false);
    setRecurringUnit(DEFAULT_RECURRING_UNIT);
    setRecurringCount(DEFAULT_RECURRING_COUNT);
    setRecurringInput(String(DEFAULT_RECURRING_COUNT));
    setRecurringWeekdays([]);
    setRecurringMonthDay(MIN_MONTH_DAY);
    setUrgencyActivated(true);
    setUrgency(DEFAULT_URGENCY);
    setImpactMenuOpen(false);
    setImpactActivated(false);
    setImpact(DEFAULT_IMPACT);
    setTaskDate("");
    setTaskStartsAt("");
    setTaskDueAt("");
    setTaskTimeMode("starts_at");
    setComposerAutoRescheduled(false);
    setScheduleToolActivated(false);
    setComposerMetaAuto(new Set(["type", "duration", "urgency", "impact"]));
    syncScheduleDraftRef({
      date: null,
      starts_at: null,
      due_at: null,
      mode: "starts_at",
    });
    setTaskToolHint(null);
    setPendingParentId(null);
    setPendingChildId(null);
    setLinkRelation("parent");
    setLinkSearchQuery("");
    setLinkQuickAddOpen(false);
    resetLinkQuickAddFields();
    setLinkPrecedence(null);
    setEditingTaskId(null);
    setEditTaskBaseline(null);
    setComposerSavePromptOpen(false);
    setRecurringSchedulePromptOpen(false);
  };

  const syncScheduleDraftRef = (
    next: Partial<{
      date: string | null;
      starts_at: string | null;
      due_at: string | null;
      mode: "starts_at" | "due_at";
    }>,
  ) => {
    scheduleDraftRef.current = { ...scheduleDraftRef.current, ...next };
  };

  /** Prefer live input values so native date/time pickers commit even if React state lags. */
  const resolveComposerSchedule = () => {
    const draft = scheduleDraftRef.current;
    const mode = draft.mode;
    const dateInput = taskDateInputRef.current;
    const timeInput = taskTimeInputRef.current;
    // Trust mounted inputs while Date & Time is open (fields stay mounted there).
    const trustInputs = dateInput != null || timeInput != null;

    let date = trustInputs
      ? normalizeOptionalField(dateInput?.value ?? "")
      : normalizeOptionalField(draft.date) ?? normalizeOptionalField(taskDate);

    let time = trustInputs
      ? normalizeOptionalField(timeInput?.value ?? "")?.slice(0, 5) ?? null
      : mode === "starts_at"
        ? normalizeOptionalField(draft.starts_at) ?? normalizeOptionalField(taskStartsAt)
        : normalizeOptionalField(draft.due_at) ?? normalizeOptionalField(taskDueAt);

    if (time && !date) {
      date = dayKey(new Date(countdownNow));
    }
    if (!date) {
      time = null;
    }

    const starts_at = mode === "starts_at" ? time : null;
    const due_at = mode === "due_at" ? time : null;
    syncScheduleDraftRef({ date, starts_at, due_at, mode });
    return { date, starts_at, due_at };
  };

  const clearComposerMetaAuto = (...keys: MetaAutoKey[]) => {
    setComposerMetaAuto((current) => {
      let changed = false;
      const next = new Set(current);
      for (const key of keys) {
        if (next.delete(key)) changed = true;
      }
      return changed ? next : current;
    });
  };

  const closeTaskToolHint = () => {
    // Flush native date/time values before unmounting the Date & Time popover.
    if (taskDateInputRef.current || taskTimeInputRef.current) {
      const schedule = resolveComposerSchedule();
      setTaskDate(schedule.date ?? "");
      setTaskStartsAt(schedule.starts_at ?? "");
      setTaskDueAt(schedule.due_at ?? "");
    }
    setLinkContainerTypeMenuOpen(false);
    setTaskToolHint(null);
  };

  const openTaskToolHint = (anchor: HTMLElement | null, title: string) => {
    if (!anchor) return;
    // Flush schedule fields if Date & Time is currently mounted (toggle/switch tip).
    if (taskDateInputRef.current || taskTimeInputRef.current) {
      const schedule = resolveComposerSchedule();
      setTaskDate(schedule.date ?? "");
      setTaskStartsAt(schedule.starts_at ?? "");
      setTaskDueAt(schedule.due_at ?? "");
    }
    // Confirming via the calendar icon turns orange into green and keeps it green.
    if (title === "Date & Time") {
      setComposerAutoRescheduled(false);
      setScheduleToolActivated(true);
      clearComposerMetaAuto("schedule", "urgency");
    }
    if (title === LINKING_TOOL_HINT) {
      clearComposerMetaAuto("parent");
    }
    taskToolHintAnchorRef.current = anchor;
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
        setImpactMenuOpen(false);
    setTaskToolHint((current) => {
      const next = current === title ? null : title;
      if (next === LINKING_TOOL_HINT) {
        // Default to parent so picking a Collection/Plan attaches to the subject.
        setLinkRelation("parent");
        setLinkSearchQuery("");
        setLinkContainerTypeMenuOpen(false);
        setLinkContainerType(defaultLinkPickerType(composeKind));
        setLinkQuickAddOpen(false);
        resetLinkQuickAddFields();
        if (!(editingTaskId != null && pendingParentId != null && linkRelation === "cycle")) {
          setLinkPrecedence(null);
        }
      }
      return next;
    });
  };

  const composerDate = normalizeOptionalField(taskDate);
  const composerStartsAt = normalizeOptionalField(taskStartsAt);
  const composerDueAt = normalizeOptionalField(taskDueAt);
  const composerScheduleKind: TaskScheduleKind =
    composerStartsAt != null || composerDueAt != null
      ? "anchored"
      : composerDate != null
        ? "soft"
        : "undated";
  const dueDateActivated = composerDate != null;
  // Repeat tasks: green schedule icon + no orange auto chip (completion / Automatic).
  const scheduleIsGreen =
    scheduleToolActivated ||
    (dueDateActivated && (!composerAutoRescheduled || recurringActivated));
  const scheduleIsOrange =
    !scheduleIsGreen &&
    !recurringActivated &&
    (composerAutoRescheduled || dueDateActivated);
  const dueDateButtonClassName = [
    "app-composer-tool",
    "app-composer-tool-accent",
    "app-composer-tool-schedule",
    scheduleIsGreen ? "is-activated" : "",
    scheduleIsOrange ? "is-auto-rescheduled" : "",
    taskToolHint === "Date & Time" ? "is-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const composerRecurring = recurringActivated
    ? formatRecurring(recurringCount, recurringUnit, {
        weekdays: recurringUnit === "week" ? recurringWeekdays : undefined,
        monthDay: recurringUnit === "month" ? recurringMonthDay : undefined,
      })
    : null;

  const isRichContainerCompose =
    composeKind === "plan" || composeKind === "list";
  const showComposerTaskRowChrome =
    !isContainerComposeKind(composeKind) || isRichContainerCompose;
  const composerHasScheduleImpactTools =
    composeKind === "task" ||
    composeKind === "plan" ||
    composeKind === "list" ||
    composeKind === "item";
  const composerHasRecurringTool =
    composeKind === "task" ||
    composeKind === "plan" ||
    composeKind === "list" ||
    composeKind === "item";
  const composerHasDurationTool =
    composeKind === "task" || composeKind === "item";
  const composerSupportsRecurringSeries =
    !isContainerComposeKind(composeKind) || isRichContainerCompose;
  const composerPreviewNow = new Date(countdownNow);
  const composerPreviewScheduleLabel = formatTaskScheduleMetaLabel(
    {
      date: composerDate,
      starts_at: composerStartsAt,
      due_at: composerDueAt,
    },
    composerPreviewNow,
  );
  const composerHasDateOrTime =
    composerDate != null || composerStartsAt != null || composerDueAt != null;
  const composerUrgencyLabel =
    urgencyActivated && isUrgencyOption(urgency) ? urgency : null;
  const composerShowUrgency =
    composerUrgencyLabel != null && !composerHasDateOrTime;
  const composerTopMetaLabel =
    composerPreviewScheduleLabel ?? (composerShowUrgency ? composerUrgencyLabel : null);
  const composerHasTopMeta = composerTopMetaLabel != null;
  const composerImpactValue =
    impactActivated || composerMetaAuto.has("impact")
      ? clampImpact(impact)
      : null;
  const composerImpactPercent =
    composerImpactValue != null
      ? Math.min(100, Math.max(0, (composerImpactValue / IMPACT_MAX) * 100))
      : null;
  const composerHasImpact =
    composerImpactValue != null && composerImpactPercent != null;
  const composerDurationLabel = formatTaskDurationLabel(estDurationMinutes);
  const composerParentTitle = parentTitleFor(pendingParentId);
  const composerHasParent = normalizeOptionalField(composerParentTitle) != null;
  const composerIsRecurring = composerRecurring != null;
  const composerTypeLabel =
    composeKind === "event"
      ? "EVENT"
      : composeKind === "item"
        ? "ITEM"
        : composeKind === "note"
          ? "NOTE"
          : composeKind === "log"
            ? "ENTRY"
            : "TASK";
  const composerScheduleAuto =
    !composerIsRecurring &&
    (composerMetaAuto.has("schedule") || composerAutoRescheduled);
  const composerUrgencyAuto = composerMetaAuto.has("urgency");
  const composerDurationAuto = composerMetaAuto.has("duration");
  const composerImpactAuto = composerMetaAuto.has("impact");
  const composerTypeAuto = composerMetaAuto.has("type");
  const composerParentAuto = composerMetaAuto.has("parent");
  const composerRecurringAuto = composerMetaAuto.has("recurring");

  const openComposerScheduleTool = () => {
    if (composeKind !== "task" || dueDateButtonRef.current == null) return;
    openTaskToolHint(dueDateButtonRef.current, "Date & Time");
  };
  const openComposerLinkingTool = () => {
    if (!isLinkingToolComposeKind(composeKind) || parentTaskButtonRef.current == null) {
      return;
    }
    openTaskToolHint(parentTaskButtonRef.current, LINKING_TOOL_HINT);
  };
  const openComposerDurationTool = () => {
    if (composeKind !== "task") return;
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setRecurringMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    clearComposerMetaAuto("duration");
    setDurationActivated(true);
    setDurationMenuOpen((open) => !open);
  };
  const openComposerImpactTool = () => {
    if (composeKind !== "task") return;
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
    closeTaskToolHint();
    clearComposerMetaAuto("impact");
    setImpactActivated(true);
    setImpactMenuOpen((open) => !open);
  };
  const openComposerRecurringTool = () => {
    if (composeKind !== "task") return;
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    clearComposerMetaAuto("recurring");
    setRecurringMenuOpen((open) => !open);
  };
  const openComposerTypeTool = () => {
    setAttachMenuOpen(false);
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    clearComposerMetaAuto("type");
    setComposeKindMenuOpen((open) => !open);
  };

  const isEditDirty =
    editingTaskId != null &&
    editTaskBaseline != null &&
    (content !== editTaskBaseline.title ||
      (estDurationMinutes ?? null) !== (editTaskBaseline.est_duration ?? null) ||
      urgency !== editTaskBaseline.urgency ||
      impact !== editTaskBaseline.impact ||
      composerDate !== editTaskBaseline.date ||
      composerStartsAt !== editTaskBaseline.starts_at ||
      composerDueAt !== editTaskBaseline.due_at ||
      composerRecurring !== editTaskBaseline.recurring ||
      formatMetaAuto(composerMetaAuto) !== editTaskBaseline.meta_auto ||
      durationActivated !== editTaskBaseline.durationActivated ||
      impactActivated !== editTaskBaseline.impactActivated ||
      scheduleToolActivated !== editTaskBaseline.scheduleToolActivated ||
      recurringActivated !== editTaskBaseline.recurringActivated ||
      urgencyActivated !== editTaskBaseline.urgencyActivated ||
      composerAutoRescheduled !== editTaskBaseline.auto_rescheduled);
  const isCreateDirty = editingTaskId == null && content.trim() !== "";
  const isComposerDirty = isEditDirty || isCreateDirty;
  // Assist never becomes a real Send action; gold ready opens the Pro upsell instead.
  const assistActionReady = composeKind === "assistant" && hasText;
  const composeActionReady =
    composeKind === "assistant"
      ? false
      : editingTaskId != null
        ? isEditDirty
        : hasText;

  const completeTask = (id: string | null) => {
    if (!id) return;
    const completing = tasks.find((task) => task.id === id);
    if (completing?.parent_id) {
      const parent = tasks.find((task) => task.id === completing.parent_id);
      if (parent != null && isPlanTaskType(parent.type)) {
        setPlanCompletedCounts(incrementPlanCompletedCount(completing.parent_id));
      }
    }
    setTasks((current) => {
      const completed = current.find((task) => task.id === id);
      if (!completed) return current;
      // Series: drop this occurrence and top up the horizon. Legacy: spawn next.
      return completeRecurringOccurrence(
        current,
        completed,
        new Date(countdownNowRef.current),
        recurringMaterializeHorizonDays(),
      );
    });
    if (editingTaskId === id) {
      resetComposerFields();
      setCollapsed(true);
    }
    if (focusedTaskId === id) setFocusedTaskId(null);
    if (focusedOverflowTaskIds?.includes(id)) {
      setFocusedOverflowTaskIds((ids) => {
        if (!ids) return null;
        const next = ids.filter((taskId) => taskId !== id);
        return next.length > 0 ? next : null;
      });
    }
    if (currentFocus?.taskId === id) {
      setCurrentFocus(null);
      clearCurrentFocusStorage();
    }
  };

  /** Items stay in the list and toggle checked / unchecked. */
  const toggleItemComplete = (id: string) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id || task.type !== "item") return task;
        const isDone = task.completed_at != null;
        return {
          ...task,
          completed_at: isDone ? null : new Date().toISOString(),
          status: isDone ? null : "completed",
        };
      }),
    );
  };

  const requestCompleteTask = (id: string | null) => {
    if (!id) return;
    const target = tasks.find((task) => task.id === id);
    if (target?.type === "item") {
      toggleItemComplete(id);
      return;
    }
    setPoppingTaskIds((current) => {
      if (current.includes(id)) return current;
      return [...current, id];
    });
    window.setTimeout(() => {
      completeTask(id);
      setPoppingTaskIds((current) => current.filter((taskId) => taskId !== id));
    }, TASK_POP_MS);
  };

  const requestDeleteTask = (id: string | null) => {
    if (!id) return;
    const target =
      tasks.find((task) => task.id === id) ??
      collections.find((collection) => collection.id === id);
    const title = target?.title?.trim() || "this";
    setDeletePrompt({ id, title });
  };

  const cancelDeletePrompt = () => setDeletePrompt(null);

  const confirmDeleteTask = () => {
    const id = deletePrompt?.id;
    if (id == null) return;
    setDeletePrompt(null);
    setTasks((current) => current.filter((task) => task.id !== id));
    setCollections((current) =>
      current.filter((collection) => collection.id !== id),
    );
    if (editingTaskId === id) {
      resetComposerFields();
      setCollapsed(true);
    }
    if (focusedTaskId === id) setFocusedTaskId(null);
    if (focusedOverflowTaskIds?.includes(id)) {
      setFocusedOverflowTaskIds((ids) => {
        if (!ids) return null;
        const next = ids.filter((taskId) => taskId !== id);
        return next.length > 0 ? next : null;
      });
    }
    if (currentFocus?.taskId === id) {
      setCurrentFocus(null);
      clearCurrentFocusStorage();
    }
  };

  const isTaskPopping = (id: string | null | undefined) =>
    id != null && poppingTaskIds.includes(id);

  const editTask = (task: ComposerDraft) => {
    if (!task.id) return;
    const minutes = task.est_duration ?? 15;
    const nextUrgency = isUrgencyOption(task.urgency) ? task.urgency : DEFAULT_URGENCY;
    const nextImpact =
      typeof task.impact === "number" && Number.isFinite(task.impact)
        ? clampImpact(task.impact)
        : DEFAULT_IMPACT;
    const nextDate = normalizeOptionalField(task.date);
    const nextStartsAt = normalizeOptionalField(task.starts_at);
    const nextDueAt = normalizeOptionalField(task.due_at);
    const nextRecurring = parseRecurring(task.recurring);
    setEditingTaskId(task.id);
    const hasSchedule =
      nextDate != null || nextStartsAt != null || nextDueAt != null;
    const loadedMetaAuto = parseMetaAuto(task.meta_auto);
    if (task.auto_rescheduled === true) loadedMetaAuto.add("schedule");
    const nextDurationActivated =
      task.est_duration != null &&
      task.est_duration > 0 &&
      !loadedMetaAuto.has("duration");
    const nextImpactActivated = task.impact != null && !loadedMetaAuto.has("impact");
    const nextScheduleToolActivated =
      hasSchedule && !loadedMetaAuto.has("schedule");
    const nextRecurringActivated = nextRecurring != null;
    const nextUrgencyActivated = task.urgency != null || !hasSchedule;
    const nextAutoRescheduled = task.auto_rescheduled === true;
    setEditTaskBaseline({
      title: task.title,
      est_duration: minutes,
      urgency: nextUrgency,
      impact: nextImpact,
      date: nextDate,
      starts_at: nextStartsAt,
      due_at: nextDueAt,
      recurring: nextRecurring ? formatRecurringSchedule(nextRecurring) : null,
      meta_auto: formatMetaAuto(loadedMetaAuto),
      durationActivated: nextDurationActivated,
      impactActivated: nextImpactActivated,
      scheduleToolActivated: nextScheduleToolActivated,
      recurringActivated: nextRecurringActivated,
      urgencyActivated: nextUrgencyActivated,
      auto_rescheduled: nextAutoRescheduled,
    });
    setComposerSavePromptOpen(false);
    setComposeKind(composeKindFromTaskType(task.type));
    setContent(task.title);
    setEstDurationMinutes(minutes);
    setDurationUnit("minutes");
    setDurationInput(String(Math.round(minutes)));
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
    if (nextRecurring) {
      setRecurringActivated(true);
      setRecurringUnit(nextRecurring.unit);
      setRecurringCount(nextRecurring.count);
      setRecurringInput(String(nextRecurring.count));
      setRecurringWeekdays(
        nextRecurring.weekdays ??
          (nextRecurring.unit === "week"
            ? [toStartOfDay(new Date(countdownNowRef.current)).getDay()]
            : []),
      );
      setRecurringMonthDay(
        nextRecurring.monthDay ??
          parseTaskDate(nextDate)?.getDate() ??
          toStartOfDay(new Date(countdownNowRef.current)).getDate(),
      );
    } else {
      setRecurringActivated(false);
      setRecurringUnit(DEFAULT_RECURRING_UNIT);
      setRecurringCount(DEFAULT_RECURRING_COUNT);
      setRecurringInput(String(DEFAULT_RECURRING_COUNT));
      setRecurringWeekdays([]);
      setRecurringMonthDay(MIN_MONTH_DAY);
    }
    setUrgency(nextUrgency);
    setUrgencyActivated(nextUrgencyActivated);
    setImpact(nextImpact);
    setImpactMenuOpen(false);
    setTaskDate(nextDate ?? "");
    setTaskStartsAt(nextStartsAt ?? "");
    setTaskDueAt(nextDueAt ?? "");
    setComposerAutoRescheduled(nextAutoRescheduled);
    setComposerMetaAuto(loadedMetaAuto);
    setScheduleToolActivated(nextScheduleToolActivated);
    setDurationActivated(nextDurationActivated);
    setImpactActivated(nextImpactActivated);
    const nextMode = nextDueAt && !nextStartsAt ? "due_at" : "starts_at";
    setTaskTimeMode(nextMode);
    syncScheduleDraftRef({
      date: nextDate,
      starts_at: nextStartsAt,
      due_at: nextDueAt,
      mode: nextMode,
    });
    setTaskToolHint(null);
    setPendingParentId(task.after_id ?? task.parent_id);
    setPendingChildId(null);
    const cyclePrecedence: LinkPrecedence | null =
      task.after === "before" || task.after === "after" ? task.after : null;
    setLinkRelation(cyclePrecedence != null ? "cycle" : "parent");
    setLinkSearchQuery("");
    setLinkQuickAddOpen(false);
    resetLinkQuickAddFields();
    setLinkPrecedence(cyclePrecedence);
    setLinkContainerType(defaultLinkPickerType(composeKindFromTaskType(task.type)));
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setCollapsed(false);
  };

  const clearTaskDueDate = () => {
    setTaskDate("");
    setTaskStartsAt("");
    setTaskDueAt("");
    setComposerAutoRescheduled(false);
    clearComposerMetaAuto("schedule");
    syncScheduleDraftRef({ date: null, starts_at: null, due_at: null });
  };

  const clearEditingTaskSchedule = () => {
    if (!editingTaskId) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === editingTaskId
          ? withoutMetaAuto(
              {
                ...task,
                date: null,
                starts_at: null,
                due_at: null,
              },
              "schedule",
            )
          : task,
      ),
    );
    setEditTaskBaseline((baseline) =>
      baseline
        ? { ...baseline, date: null, starts_at: null, due_at: null }
        : baseline,
    );
  };

  const setTaskDateValue = (value: string) => {
    const next = value.trim();
    setTaskDate(next);
    setComposerAutoRescheduled(false);
    if (!next) {
      setTaskStartsAt("");
      setTaskDueAt("");
      syncScheduleDraftRef({ date: null, starts_at: null, due_at: null });
      return;
    }
    setUrgencyActivated(false);
    syncScheduleDraftRef({ date: next });
  };

  const setTaskTimeValue = (value: string) => {
    // Browsers may emit HH:mm:ss; packing accepts that, but keep inputs as HH:mm.
    const next = value.trim().slice(0, 5);
    let nextDate = taskDate.trim();
    setComposerAutoRescheduled(false);
    const hadTime = Boolean(
      (taskTimeMode === "starts_at" ? taskStartsAt : taskDueAt).trim(),
    );
    // First time a value is entered, force the toggle default (Starts on).
    const mode = !hadTime && next ? "starts_at" : taskTimeMode;
    if (mode !== taskTimeMode) {
      setTaskTimeMode(mode);
    }
    if (mode === "starts_at") {
      setTaskStartsAt(next);
      setTaskDueAt("");
      syncScheduleDraftRef({
        mode: "starts_at",
        starts_at: next || null,
        due_at: null,
        date: next && !nextDate ? dayKey(new Date(countdownNow)) : normalizeOptionalField(nextDate),
      });
    } else {
      setTaskDueAt(next);
      setTaskStartsAt("");
      syncScheduleDraftRef({
        mode: "due_at",
        due_at: next || null,
        starts_at: null,
        date: next && !nextDate ? dayKey(new Date(countdownNow)) : normalizeOptionalField(nextDate),
      });
    }
    if (next) {
      setUrgencyActivated(false);
      if (!nextDate) {
        setTaskDate(dayKey(new Date(countdownNow)));
      }
    }
  };

  const openNativeDateTimePicker = (input: HTMLInputElement) => {
    try {
      input.showPicker?.();
    } catch {
      // Unsupported browsers fall back to the native control.
    }
  };

  const bindNativeDateTimePicker = (
    openRef: { current: boolean },
    closingRef: { current: boolean },
  ) => ({
    onPointerDown: (event: {
      preventDefault: () => void;
      stopPropagation: () => void;
      currentTarget: HTMLInputElement;
    }) => {
      // Blur often fires before click when dismissing the native picker, which
      // used to clear openRef too early and make the same click reopen it.
      if (!openRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
      openRef.current = false;
      closingRef.current = true;
    },
    onClick: (event: {
      preventDefault: () => void;
      stopPropagation: () => void;
      currentTarget: HTMLInputElement;
    }) => {
      if (closingRef.current || openRef.current) {
        closingRef.current = false;
        openRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.blur();
        return;
      }
      openNativeDateTimePicker(event.currentTarget);
      openRef.current = true;
    },
    onBlur: () => {
      // Defer so the closing click still sees openRef as true.
      window.setTimeout(() => {
        if (!closingRef.current) openRef.current = false;
      }, 0);
    },
  });

  const setTaskTimeModeValue = (mode: "starts_at" | "due_at") => {
    if (mode === taskTimeMode) return;
    const currentTime = taskTimeMode === "starts_at" ? taskStartsAt : taskDueAt;
    setTaskTimeMode(mode);
    if (mode === "starts_at") {
      setTaskStartsAt(currentTime);
      setTaskDueAt("");
      syncScheduleDraftRef({
        mode,
        starts_at: normalizeOptionalField(currentTime),
        due_at: null,
      });
    } else {
      setTaskDueAt(currentTime);
      setTaskStartsAt("");
      syncScheduleDraftRef({
        mode,
        due_at: normalizeOptionalField(currentTime),
        starts_at: null,
      });
    }
  };

  const taskTimeValue = taskTimeMode === "starts_at" ? taskStartsAt : taskDueAt;

  const persistUiSession = (view: ActiveView = activeViewRef.current) => {
    const scrollByView = { ...viewScrollTopRef.current } as Partial<
      Record<UiSessionViewId, number>
    >;
    const todayOpenKey = dayKey(toStartOfDay(new Date(countdownNowRef.current)));
    const session: UiSession = {
      activeView: view as UiSessionViewId,
      scrollByView,
      overdueSectionOpen: overdueSectionOpenByDayRef.current[todayOpenKey] ?? true,
      homeOverdueSectionOpen: homeOverdueSectionOpenRef.current,
    };
    if (view === "dayline" || timelineDayCountRef.current !== DEFAULT_TIMELINE_DAY_COUNT) {
      session.timelineDayCount = timelineDayCountRef.current;
    }
    saveUiSession(session);
  };

  const schedulePersistUiSession = (view: ActiveView = activeViewRef.current) => {
    if (uiSessionSaveTimerRef.current != null) {
      window.clearTimeout(uiSessionSaveTimerRef.current);
    }
    uiSessionSaveTimerRef.current = window.setTimeout(() => {
      uiSessionSaveTimerRef.current = null;
      persistUiSession(view);
    }, 200);
  };

  const switchActiveView = (id: ActiveView) => {
    const previous = activeViewRef.current;
    if (id !== previous) {
      const main = mainRef.current;
      if (main) {
        viewScrollTopRef.current[previous] = main.scrollTop;
      }
      pendingViewScrollTopRef.current = viewScrollTopRef.current[id] ?? 0;
      sessionScrollRestoreRef.current = null;
      // Drop Timeline scroll queues on tab change so restore uses saved scrollTop.
      pendingTimelineScrollDayRef.current = null;
      pendingViewScrollTaskIdRef.current = null;
      pendingViewPreserveChromeRef.current = false;
      setFocusedTaskId(null);
      setFocusedOverflowTaskIds(null);
      persistUiSession(id);
    }
    setActiveView(id);
  };

  const selectView = (id: ActiveView) => {
    switchActiveView(id);
    if (!content.trim()) {
      setComposeKind(COMPOSE_KIND_BY_VIEW[id]);
    }
    setMoreMenuOpen(false);
  };
  const selectViewRef = useRef(selectView);
  selectViewRef.current = selectView;

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openSearch = () => {
    setMoreMenuOpen(false);
    setSearchOpen(true);
  };

  const closeComposer = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCollapsed(true);
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    setComposerSavePromptOpen(false);
    setFocusedTaskId(null);
    setFocusedOverflowTaskIds(null);
    if (editingTaskId) {
      resetComposerFields();
    } else {
      setEditTaskBaseline(null);
    }
  };

  const requestCloseComposer = () => {
    if (isComposerDirty) {
      setAttachMenuOpen(false);
      setComposeKindMenuOpen(false);
      setDurationMenuOpen(false);
      setRecurringMenuOpen(false);
      setImpactMenuOpen(false);
      closeTaskToolHint();
      setComposerSavePromptOpen(true);
      return;
    }
    closeComposer();
  };

  const discardComposerChanges = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    resetComposerFields();
    setCollapsed(true);
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    setComposerSavePromptOpen(false);
    setRecurringSchedulePromptOpen(false);
    setFocusedTaskId(null);
    setFocusedOverflowTaskIds(null);
  };

  const buildDraftFromComposer = () => {
    if (isContainerComposeKind(composeKind) && !isRichContainerCompose) {
      return buildComposerDraft({
        title: content,
        type: composeKind === "collection" ? "collection" : composeKind,
      });
    }
    const schedule = resolveComposerSchedule();
    setTaskDate(schedule.date ?? "");
    setTaskStartsAt(schedule.starts_at ?? "");
    setTaskDueAt(schedule.due_at ?? "");
    const hasSchedule =
      schedule.date != null || schedule.starts_at != null || schedule.due_at != null;
    const metaKeys = new Set(composerMetaAuto);
    if (hasSchedule) {
      metaKeys.delete("urgency");
      if (composerAutoRescheduled || !scheduleToolActivated) metaKeys.add("schedule");
      else metaKeys.delete("schedule");
    } else {
      metaKeys.delete("schedule");
      if (!(urgencyActivated && urgency != null)) metaKeys.delete("urgency");
    }
    if (isRichContainerCompose || estDurationMinutes == null) metaKeys.delete("duration");
    if (impact == null) metaKeys.delete("impact");
    if (composerRecurring == null) metaKeys.delete("recurring");
    if (pendingParentId == null && pendingChildId == null) metaKeys.delete("parent");
    return buildComposerDraft({
      title: content,
      type: composeKind,
      est_duration: isRichContainerCompose ? null : estDurationMinutes,
      urgency: hasSchedule ? null : urgencyActivated ? urgency : null,
      impact,
      date: schedule.date,
      starts_at: schedule.starts_at,
      due_at: schedule.due_at,
      recurring: composerRecurring,
      auto_rescheduled: hasSchedule && metaKeys.has("schedule") ? true : false,
      meta_auto: formatMetaAuto(metaKeys),
    });
  };

  const repeatSettingsChangedVsBaseline = () => {
    const baseline = editTaskBaselineRef.current;
    if (baseline == null) return false;
    return (
      composerRecurring !== baseline.recurring ||
      recurringActivated !== baseline.recurringActivated
    );
  };

  const finishComposerSaveSession = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    resetComposerFields();
    setCollapsed(true);
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setRecurringMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    setComposerSavePromptOpen(false);
    setRecurringSchedulePromptOpen(false);
    setFocusedTaskId(null);
    setFocusedOverflowTaskIds(null);
  };

  const applyRecurringScheduleJustThisOnce = () => {
    const editId = editingTaskIdRef.current;
    if (editId == null) return;
    const draft = buildDraftFromComposer();
    if (!draft) return;
    const existing = tasks.find((task) => task.id === editId);
    // Detach from series; siblings keep their prior schedule. Leaving a series
    // just this once makes this occurrence a one-off (no recurring token).
    const detached: ComposerDraft = {
      ...draft,
      series_id: null,
      recurring: existing?.series_id != null ? null : draft.recurring,
    };
    upsertTaskDraft(detached, editId);
    if (
      !isContainerComposeKind(composeKind) &&
      isAnchoredTaskMissed(detached, new Date(countdownNow), todayPackEnd, todayWindowStartMinutes)
    ) {
      openOverflowForActiveView();
    }
    finishComposerSaveSession();
  };

  const applyRecurringScheduleAllFuture = () => {
    const editId = editingTaskIdRef.current;
    if (editId == null) return;
    const draft = buildDraftFromComposer();
    if (!draft) return;
    const existing = tasks.find((task) => task.id === editId);
    const schedule = parseRecurring(draft.recurring);
    const anchorDate = draft.date;
    const seriesId =
      existing?.series_id ??
      draft.series_id ??
      (schedule != null ? crypto.randomUUID() : null);
    const updated: ComposerDraft = {
      ...draft,
      id: editId,
      series_id: schedule != null ? seriesId : null,
    };
    setTasks((current) => {
      let next = current.map((task) => {
        if (task.id !== editId) return task;
        return {
          ...task,
          title: updated.title,
          type: updated.type,
          est_duration: updated.est_duration,
          urgency: updated.urgency,
          impact: updated.impact,
          date: updated.date,
          starts_at: updated.starts_at,
          due_at: updated.due_at,
          recurring: updated.recurring,
          series_id: updated.series_id,
          parent_id: updated.parent_id,
          after_id: updated.after_id,
          after: updated.after,
          auto_rescheduled: updated.auto_rescheduled === true,
          meta_auto: updated.meta_auto ?? null,
        };
      });
      if (seriesId != null && anchorDate != null) {
        // Drop later siblings, then rematerialize when still repeating.
        next = removeFutureSeriesMembers(next, seriesId, anchorDate, editId);
        if (schedule != null) {
          const futures = materializeRecurringSeries(
            { ...updated, series_id: seriesId },
            schedule,
            recurringHorizonEnd(
              new Date(countdownNowRef.current),
              recurringMaterializeHorizonDays(),
            ),
            { seriesId, includeAnchor: false },
          );
          if (futures.length > 0) next = [...futures, ...next];
        } else {
          // Repeat turned off for all future — clear series on the kept row.
          next = next.map((task) =>
            task.id === editId ? { ...task, series_id: null, recurring: null } : task,
          );
        }
      }
      return next;
    });
    if (
      !isContainerComposeKind(composeKind) &&
      isAnchoredTaskMissed(updated, new Date(countdownNow), todayPackEnd, todayWindowStartMinutes)
    ) {
      openOverflowForActiveView();
    }
    finishComposerSaveSession();
  };

  const saveComposerChanges = () => {
    const editId = editingTaskIdRef.current;
    if (editId == null) return;
    // Repeat settings changed → ask Just This Once vs All Future before saving.
    if (
      composerSupportsRecurringSeries &&
      repeatSettingsChangedVsBaseline()
    ) {
      setComposerSavePromptOpen(false);
      setRecurringSchedulePromptOpen(true);
      return;
    }
    const draft = buildDraftFromComposer();
    if (draft) {
      // Preserve series_id on ordinary edits.
      const existing = tasks.find((task) => task.id === editId);
      submitComposerDraft[composeKind](
        { ...draft, series_id: existing?.series_id ?? draft.series_id },
        editId,
      );
      if (
        !isContainerComposeKind(composeKind) &&
        isAnchoredTaskMissed(draft, new Date(countdownNow), todayPackEnd, todayWindowStartMinutes)
      ) {
        openOverflowForActiveView();
      }
    }
    finishComposerSaveSession();
  };

  const submitCreate = () => {
    if (searchOpen) return;
    if (editingTaskIdRef.current != null || editTaskBaselineRef.current != null) return;
    const draft = buildDraftFromComposer();
    if (!draft) return;
    if (
      composerSupportsRecurringSeries &&
      parseRecurring(draft.recurring) != null
    ) {
      const toSave = isRichContainerCompose
        ? { ...draft, est_duration: null }
        : draft;
      upsertTaskDraft(toSave, null, { materializeSeries: true });
    } else {
      submitComposerDraft[composeKind](draft, null);
    }
    if (
      !isContainerComposeKind(composeKind) &&
      isAnchoredTaskMissed(draft, new Date(countdownNow), todayPackEnd, todayWindowStartMinutes)
    ) {
      openOverflowForActiveView();
    }
    resetComposerFields();
  };

  /** Save from the leave-composer prompt — edit update or create, then close. */
  const confirmComposerSavePrompt = () => {
    if (editingTaskIdRef.current != null) {
      saveComposerChanges();
      return;
    }
    submitCreate();
    finishComposerSaveSession();
  };

  const syncDurationInput = (minutes: number | null, unit: "minutes" | "hours" = durationUnit) => {
    const value = minutes ?? 0;
    if (unit === "hours") {
      const hours = value / 60;
      setDurationInput(Number.isInteger(hours) ? String(hours) : hours.toFixed(1));
      return;
    }
    setDurationInput(String(Math.round(value)));
  };

  const commitDurationInput = (raw: string, unit: "minutes" | "hours" = durationUnit) => {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      syncDurationInput(estDurationMinutes, unit);
      return;
    }
    const minutes =
      unit === "hours" ? Math.round(parsed * 60) : Math.max(0, Math.round(parsed));
    setEstDurationMinutes(minutes);
    syncDurationInput(minutes, unit);
  };

  const stepDuration = (direction: 1 | -1) => {
    const step = durationUnit === "hours" ? 6 : 5;
    const next = Math.max(0, (estDurationMinutes ?? 0) + direction * step);
    setEstDurationMinutes(next);
    syncDurationInput(next);
  };

  const switchDurationUnit = (unit: "minutes" | "hours") => {
    if (unit === durationUnit) return;
    setDurationUnit(unit);
    syncDurationInput(estDurationMinutes, unit);
  };

  const syncRecurringInput = (count: number) => {
    setRecurringInput(String(clampRecurringCount(count)));
  };

  const commitRecurringInput = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      syncRecurringInput(recurringCount);
      return;
    }
    const next = clampRecurringCount(parsed);
    setRecurringCount(next);
    syncRecurringInput(next);
  };

  const stepRecurring = (direction: 1 | -1) => {
    const next = clampRecurringCount(recurringCount + direction);
    setRecurringCount(next);
    syncRecurringInput(next);
  };

  const recurringAnchorDate = () => {
    const fromTask = parseTaskDate(composerDate);
    if (fromTask) return fromTask;
    return toStartOfDay(new Date(countdownNowRef.current));
  };

  const setRecurringUnitValue = (unit: RecurringUnit) => {
    setRecurringUnit(unit);
    const anchor = recurringAnchorDate();
    if (unit === "week") {
      setRecurringWeekdays((current) =>
        current.length > 0 ? current : [anchor.getDay()],
      );
    } else if (unit === "month") {
      setRecurringMonthDay(clampMonthDay(anchor.getDate()));
    }
  };

  const toggleRecurringWeekday = (weekday: number) => {
    setRecurringWeekdays((current) => {
      const set = new Set(current);
      if (set.has(weekday)) {
        if (set.size <= 1) return normalizeWeekdays(current);
        set.delete(weekday);
      } else {
        set.add(weekday);
      }
      return normalizeWeekdays(set);
    });
  };

  const stepRecurringMonthDay = (direction: 1 | -1) => {
    setRecurringMonthDay((value) => clampMonthDay(value + direction));
  };

  const setRecurringEnabled = (enabled: boolean) => {
    setRecurringActivated(enabled);
    if (!enabled) return;
    setRecurringCount((count) => clampRecurringCount(count));
    syncRecurringInput(clampRecurringCount(recurringCount));
    const anchor = recurringAnchorDate();
    if (recurringUnit === "week") {
      setRecurringWeekdays((current) =>
        current.length > 0 ? current : [anchor.getDay()],
      );
    } else if (recurringUnit === "month") {
      setRecurringMonthDay(clampMonthDay(anchor.getDate()));
    }
  };

  const stepImpact = (direction: 1 | -1) => {
    setImpact((value) => clampImpact(value + direction));
  };

  const seedNewComposerDateFromSelectedDay = (options?: { wasEditing?: boolean }) => {
    const today = toStartOfDay(new Date(countdownNow));
    const day = toStartOfDay(selectedDay);
    if (day.getTime() > today.getTime()) {
      const key = dayKey(day);
      setTaskDate(key);
      setComposerAutoRescheduled(true);
      setComposerMetaAuto((current) => new Set(current).add("schedule"));
      syncScheduleDraftRef({ date: key });
      return;
    }
    // Opening on today/past: drop a previous future-day auto-seed.
    if (composerAutoRescheduled && !options?.wasEditing) {
      setTaskDate("");
      setTaskStartsAt("");
      setTaskDueAt("");
      syncScheduleDraftRef({ date: null, starts_at: null, due_at: null });
    }
    setComposerAutoRescheduled(false);
    setComposerMetaAuto((current) => {
      if (!current.has("schedule")) return current;
      const next = new Set(current);
      next.delete("schedule");
      return next;
    });
  };

  const toggleCurrentFocusLock = () => {
    const taskId = todayFocusTask?.id;
    if (!taskId) return;
    const focusDayKey = dayKey(toStartOfDay(new Date(countdownNowRef.current)));
    setCurrentFocus((current) => {
      // Fallback "current focus" has no stored entry — lock creates one for that task.
      if (
        current == null ||
        current.dayKey !== focusDayKey ||
        current.taskId !== taskId
      ) {
        const next: CurrentFocus = {
          dayKey: focusDayKey,
          taskId,
          locked: true,
          overflowBucket: null,
        };
        saveCurrentFocus(next);
        return next;
      }
      const next: CurrentFocus = {
        ...current,
        locked: !current.locked,
        overflowBucket: !current.locked ? current.overflowBucket : null,
      };
      saveCurrentFocus(next);
      return next;
    });
  };

  const renderCurrentFocusLockButton = (taskTitle?: string | null) => {
    const title = normalizeOptionalField(taskTitle) ?? "focus task";
    return (
      <button
        type="button"
        className={`task-row-focus-lock${focusLocked ? " is-locked" : " is-unlocked"}`}
        aria-label={
          focusLocked
            ? `Unpin ${title} — allow moving to overflow`
            : `Pin ${title} — keep out of overflow`
        }
        aria-pressed={focusLocked}
        title={focusLocked ? "Pinned — stays out of overflow" : "Unpinned — can move to overflow"}
        onClick={toggleCurrentFocusLock}
      >
        <PinIcon filled={focusLocked} />
      </button>
    );
  };

  const renderCurrentFocusControls = (taskTitle?: string | null) => (
    <div className="task-current-focus-controls">
      <button
        type="button"
        className="task-current-focus-tool"
        aria-label="Stopwatch"
        title="Stopwatch"
      >
        <StopwatchIcon />
      </button>
      <button
        type="button"
        className="task-current-focus-tool"
        aria-label="Alarm"
        title="Alarm"
      >
        <AlarmIcon />
      </button>
      {renderCurrentFocusLockButton(taskTitle)}
    </div>
  );

  const runAutomaticOverflowReschedule = (sourceDayKey: string = todayKeyStr) => {
    const sourceLayout = calendarTaskLayout.find((day) => day.dayKey === sourceDayKey);
    const sourceOverflow = overflowForDay(sourceLayout);
    const overflowToReschedule = sourceOverflow.tasks;
    const overflowIds = new Set(
      overflowToReschedule
        .map((task) => task.id)
        .filter((id): id is string => id != null),
    );
    const dayKeyForRelease = todayKeyStr;
    const sourceDay = sourceLayout?.date ?? todayStart;
    setTasks((current) => {
      const { tasks: next, releaseBaselineIds } = rescheduleOverdueTasksForNewDay(
        current,
        new Date(countdownNowRef.current),
        getTargetTimeForDay,
        taskGapMinutes,
        getWindowStartTimeForDay,
        overflowToReschedule,
        sourceDay,
      );
      const movedIds = new Set<string>();
      for (const id of overflowIds) {
        const before = current.find((task) => task.id === id);
        const after = next.find((task) => task.id === id);
        if (before && after && before.date !== after.date) movedIds.add(id);
      }
      const dropFreezeIds = new Set([...movedIds, ...releaseBaselineIds]);
      if (dropFreezeIds.size > 0) {
        setTodaySoftPackPlan((plan) => {
          if (plan == null) return plan;
          const placements = plan.placements.filter(
            (row) => !dropFreezeIds.has(row.taskId),
          );
          if (placements.length === plan.placements.length) return plan;
          const nextPlan: TodaySoftPackPlan = { ...plan, placements };
          saveTodaySoftPackPlan(nextPlan);
          return nextPlan;
        });
      }
      if (releaseBaselineIds.length > 0) {
        if (autoReleasedBaselineIdsRef.current.dayKey !== dayKeyForRelease) {
          autoReleasedBaselineIdsRef.current = {
            dayKey: dayKeyForRelease,
            ids: new Set(),
          };
        }
        for (const id of releaseBaselineIds) {
          autoReleasedBaselineIdsRef.current.ids.add(id);
        }
        const released = autoReleasedBaselineIdsRef.current.ids;
        setTodayWindowBaseline((plan) => {
          if (plan == null || plan.dayKey !== dayKeyForRelease) return plan;
          const taskIds = plan.taskIds.filter((id) => !released.has(id));
          if (taskIds.length === plan.taskIds.length) return plan;
          const nextPlan: TodayWindowBaseline = { ...plan, taskIds };
          saveTodayWindowBaseline(nextPlan);
          return nextPlan;
        });
      }
      if (overflowIds.size > 0) {
        setForcedOverflowIds((prev) => {
          if (prev.size === 0) return prev;
          let changed = false;
          const nextSet = new Set(prev);
          for (const id of overflowIds) {
            if (nextSet.delete(id)) changed = true;
          }
          return changed ? nextSet : prev;
        });
      }
      return next;
    });
  };

  const renderFocusStatusBox = (title: "Rest" | "Break") => {
    const showBar =
      showFocusCountdownBarOnCurrent &&
      typeof focusCountdownProgress === "number" &&
      Number.isFinite(focusCountdownProgress);
    return (
      <div
        className={`task-current-focus-free-time${showBar ? " has-countdown" : ""}`}
        aria-label={title}
      >
        {showBar && (
          <div
            className="task-row-countdown"
            aria-hidden="true"
            style={
              nowSkyColor != null ? { background: nowSkyColor } : undefined
            }
          >
            <div
              className="task-row-countdown-fill"
              style={{
                width: `${Math.min(1, Math.max(0, focusCountdownProgress)) * 100}%`,
              }}
            />
          </div>
        )}
        <p className="task-current-focus-free-time-title">{title}</p>
      </div>
    );
  };

  const renderFocusRescheduleOverflowBox = () => {
    const showBar =
      showFocusCountdownBarOnCurrent &&
      typeof focusCountdownProgress === "number" &&
      Number.isFinite(focusCountdownProgress);
    return (
      <div
        className={`task-current-focus-free-time task-current-focus-reschedule${showBar ? " has-countdown" : ""}`}
        aria-label="Pivot Overflow"
      >
        {showBar && (
          <div
            className="task-row-countdown"
            aria-hidden="true"
            style={
              nowSkyColor != null ? { background: nowSkyColor } : undefined
            }
          >
            <div
              className="task-row-countdown-fill"
              style={{
                width: `${Math.min(1, Math.max(0, focusCountdownProgress)) * 100}%`,
              }}
            />
          </div>
        )}
        <p className="task-current-focus-free-time-title">Pivot Overflow</p>
      </div>
    );
  };

  const renderCurrentFocus = () => {
    if (focusRescheduleOverflowMode) {
      return (
        <div className="task-current-focus">
          <div className="task-current-focus-label-row">
            <p className="task-current-focus-label">
              Current focus
              {showFocusCountdownOnCurrent && (
                <span className="task-current-focus-countdown" aria-live="polite">
                  {focusCountdownLabel}
                </span>
              )}
            </p>
          </div>
          {renderFocusRescheduleOverflowBox()}
        </div>
      );
    }
    if (focusRestMode) {
      return (
        <div className="task-current-focus">
          <div className="task-current-focus-label-row">
            <p className="task-current-focus-label">
              Current focus
              {showFocusCountdownOnCurrent && (
                <span className="task-current-focus-countdown" aria-live="polite">
                  {focusCountdownLabel}
                </span>
              )}
            </p>
          </div>
          {renderFocusStatusBox("Rest")}
        </div>
      );
    }
    if (focusBreakMode) {
      return (
        <div className="task-current-focus">
          <div className="task-current-focus-label-row">
            <p className="task-current-focus-label">
              Current focus
              {showFocusCountdownOnCurrent && (
                <span className="task-current-focus-countdown" aria-live="polite">
                  {focusCountdownLabel}
                </span>
              )}
            </p>
          </div>
          {renderFocusStatusBox("Break")}
        </div>
      );
    }
    const focusBlocks =
      overtakenPlanBlocks.length > 0
        ? overtakenPlanBlocks
        : showUpcomingSoftAsFocus && firstUpcomingSoftBlock != null
          ? [firstUpcomingSoftBlock]
          : [];
    if (focusBlocks.length === 0) return null;
    return (
      <div className="task-current-focus">
        <div className="task-current-focus-label-row">
          <p className="task-current-focus-label">
            Current focus
            {showFocusCountdownOnCurrent && (
              <span className="task-current-focus-countdown" aria-live="polite">
                {focusCountdownLabel}
              </span>
            )}
          </p>
          {todayFocusTask != null &&
            renderCurrentFocusControls(todayFocusTask.title)}
        </div>
        <ul className="task-day-tasks task-current-focus-tasks">
          {focusBlocks.map((block) => {
            const task = block.task;
            const taskId = task.id;
            if (taskId == null) return null;
            const showTaskCountdown =
              isTimedTask(task) || todayEndSlackMin === 0;
            const rowProgress = showTaskCountdown
              ? (overtakenCountdownByTaskId.get(taskId) ?? null)
              : null;
            return (
              <CompactTaskRow
                key={taskId}
                task={task}
                overdue={false}
                editing={editingTaskId === taskId}
                highlighted={isTaskHighlighted(taskId)}
                popping={isTaskPopping(taskId)}
                now={new Date(countdownNow)}
                parentTitle={parentTitleFor(task.parent_id)}
                isCurrentFocus
                countdownProgress={rowProgress}
                countdownBarColor={rowProgress != null ? nowSkyColor : null}
                onComplete={() => requestCompleteTask(taskId)}
                onEdit={() => {
                  setFocusedOverflowTaskIds(null);
                  setFocusedTaskId(taskId);
                  editTask(task);
                }}
              />
            );
          })}
        </ul>
      </div>
    );
  };

  const renderAtRiskSection = () => {
    if (atRiskTask?.id == null || atRiskCountdownProgress == null) return null;
    const taskId = atRiskTask.id;
    const atRiskCountdownLabel =
      atRiskCountdownMs != null
        ? `- ${formatCountdown(atRiskCountdownMs, { hideZeroHours: true })}`
        : null;
    return (
      <div className="task-day-next task-day-at-risk">
        <p className="task-current-focus-label">
          OVERFLOWING...
          {atRiskCountdownLabel != null && (
            <span className="task-current-focus-countdown" aria-live="polite">
              {atRiskCountdownLabel}
            </span>
          )}
        </p>
        <ul className="task-day-tasks">
          <CompactTaskRow
            key={taskId}
            task={atRiskTask}
            overdue={false}
            editing={editingTaskId === taskId}
            highlighted={isTaskHighlighted(taskId)}
            popping={isTaskPopping(taskId)}
            now={new Date(countdownNow)}
            parentTitle={parentTitleFor(atRiskTask.parent_id)}
            isCurrentFocus={false}
            countdownProgress={atRiskCountdownProgress}
            countdownBarColor="var(--day-kind-soft)"
            onComplete={() => requestCompleteTask(taskId)}
            onEdit={() => {
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(taskId);
              editTask(atRiskTask);
            }}
          />
        </ul>
      </div>
    );
  };

  const dismissTimelineNotice = (noticeId: string) => {
    setTimelineNotices((current) => current.filter((notice) => notice.id !== noticeId));
  };

  const deferredNoticeDayLabel = (key: string) => {
    const date = parseTaskDate(key);
    if (!date) return key;
    const today = toStartOfDay(new Date(countdownNow));
    if (sameCalendarDay(date, today)) return "Today";
    if (sameCalendarDay(date, addDays(today, 1))) return "Tomorrow";
    return formatTwinelineDateLabel(date, new Date(countdownNow));
  };

  const openDeferredNoticeTarget = (notice: TimelineNotice) => {
    const targetDay = notice.dayKey != null ? parseTaskDate(notice.dayKey) : null;
    const taskId = notice.taskIds?.[0] ?? null;
    if (targetDay != null) {
      selectDayFromUi(targetDay);
      scrollTimelineToDay(targetDay, "smooth");
    }
    if (taskId != null) {
      window.setTimeout(() => {
        scrollTaskIntoView(taskId, "smooth");
      }, targetDay != null ? 120 : 0);
    }
  };

  const renderTimelineNotices = () => {
    if (timelineNotices.length === 0) return null;
    const orderedNotices = [...timelineNotices].sort((a, b) => a.at - b.at);
    return (
      <div className="task-day-label-row task-day-overflow-row task-day-notice-row">
        {orderedNotices.map((notice) => {
          const noun = notice.count === 1 ? "task" : "tasks";
          const verb = notice.count === 1 ? "has" : "have";
          return (
            <div
              key={notice.id}
              className={`task-timeline-notice is-${notice.kind}${
                overflowDeferOnly && notice.kind === "overflow" ? " is-defer-only" : ""
              }`}
              role="status"
            >
              <p className="task-timeline-notice-body">
                <span className="task-timeline-notice-count">{notice.count}</span>
                {notice.kind === "overflow" ? (
                  <>
                    {" "}
                    {noun} moved to{" "}
                    <span className="task-overflow-notice-overflow">Overflow</span>.
                  </>
                ) : notice.kind === "at-risk" ? (
                  <>
                    {" "}
                    {noun} {notice.count === 1 ? "is" : "are"} currently{" "}
                    <span className="task-overflow-notice-overflow">OVERFLOWING</span>.
                  </>
                ) : notice.kind === "deferred" && notice.dayKey != null ? (
                  <>
                    {" "}
                    {noun} {verb} deferred to{" "}
                    <button
                      type="button"
                      className="task-timeline-notice-day-link"
                      onClick={() => openDeferredNoticeTarget(notice)}
                    >
                      {deferredNoticeDayLabel(notice.dayKey)}
                    </button>
                    .
                  </>
                ) : (
                  <> {noun} recovered.</>
                )}
              </p>
              <button
                type="button"
                className="task-timeline-notice-dismiss"
                aria-label="Dismiss"
                onClick={() => dismissTimelineNotice(notice.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOverflowSection = (dayLayout: (typeof calendarTaskLayout)[number]) => {
    const dayOverflow = overflowForDay(dayLayout);
    if (dayOverflow.count <= 0) return null;
    const isToday = dayLayout.dayKey === todayKeyStr;
    const sectionOpen = overdueSectionOpenByDay[dayLayout.dayKey] ?? false;
    const listId = `task-overdue-list-${dayLayout.dayKey}`;
    return (
      <>
        <div className="task-day-label-row task-day-overflow-row">
          <button
            ref={isToday ? overflowToggleRef : undefined}
            type="button"
            className={`task-overdue-toggle${sectionOpen ? " is-open" : ""}${dayOverflow.deferOnly ? " is-defer-only" : ""}`}
            aria-expanded={sectionOpen}
            aria-controls={listId}
            aria-label="Overflow tasks"
            onClick={() => {
              setOverdueSectionOpenByDay((current) => {
                const next = {
                  ...current,
                  [dayLayout.dayKey]: !(current[dayLayout.dayKey] ?? false),
                };
                overdueSectionOpenByDayRef.current = next;
                persistUiSession();
                return next;
              });
            }}
          >
            <span className="task-overdue-toggle-action">
              <span className="task-overdue-toggle-reschedule">
                <span className="task-overdue-toggle-count">{dayOverflow.count}</span>
                OVERFLOW
              </span>
              <span className="task-overdue-toggle-chevron" aria-hidden="true">
                {sectionOpen ? "∨" : ">"}
              </span>
            </span>
          </button>
          {isToday && sectionOpen && (
            <button
              type="button"
              className="task-current-focus-reschedule-btn is-automatic task-overflow-pivot-btn"
              onClick={() => setOverflowReschedulePromptDayKey(dayLayout.dayKey)}
            >
              Reschedule All
            </button>
          )}
        </div>
        {sectionOpen && (
          <div
            className="task-overdue-scroll-block"
            ref={isToday ? overdueScrollBlockRef : undefined}
          >
            <section
              ref={isToday ? overdueSectionRef : undefined}
              id={listId}
              className={`task-overdue-section${dayOverflow.deferOnly ? " is-defer-only" : ""}`}
              aria-label="Overflow tasks"
            >
              <div className="task-overflow-bucket">
                <ul className="task-day-tasks task-overdue-tasks">
                  {dayOverflow.rows.map(({ task, overdue }) => (
                    <CompactTaskRow
                      key={task.id ?? task.title}
                      task={task}
                      overdue={overdue}
                      editing={editingTaskId === task.id}
                      highlighted={isTaskHighlighted(task.id)}
                      popping={isTaskPopping(task.id)}
                      now={new Date(countdownNow)}
                      parentTitle={parentTitleFor(task.parent_id)}
                      onComplete={() => requestCompleteTask(task.id)}
                      onEdit={() => {
                        if (task.id) {
                          setFocusedOverflowTaskIds(null);
                          setFocusedTaskId(task.id);
                        }
                        editTask(task);
                      }}
                      isCurrentFocus={todayFocusTask?.id === task.id}
                    />
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}
      </>
    );
  };

  const openComposer = () => {
    const wasEditing = editingTaskId != null;
    if (wasEditing && isEditDirty) {
      setComposerSavePromptOpen(true);
      return;
    }
    if (wasEditing) {
      resetComposerFields();
    }
    if (wasEditing || !content.trim()) {
      setComposeKind(COMPOSE_KIND_BY_VIEW[activeView]);
    }
    setSearchOpen(false);
    setSearchQuery("");
    fabRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCollapsed(false);
    seedNewComposerDateFromSelectedDay({ wasEditing });
  };

  useEffect(() => {
    if (!currentFocus) return;
    if (currentFocus.dayKey !== todayKeyStr) {
      setCurrentFocus(null);
      clearCurrentFocusStorage();
      return;
    }
    if (!tasks.some((task) => task.id === currentFocus.taskId)) {
      setCurrentFocus(null);
      clearCurrentFocusStorage();
      return;
    }
    // Unlocked focus that no longer fits today → release so it returns to overflow.
    if (unlockedFocusInOverflow) {
      setCurrentFocus(null);
      clearCurrentFocusStorage();
    }
  }, [currentFocus, todayKeyStr, tasks, unlockedFocusInOverflow]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveTasks(tasks);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [tasks]);

  useEffect(() => {
    saveCollections(collections);
  }, [collections]);

  useEffect(() => {
    saveTaskGapMinutes(taskGapMinutes);
  }, [taskGapMinutes]);

  useEffect(() => {
    saveTargetTime(defaultTargetTime);
  }, [defaultTargetTime]);

  useEffect(() => {
    saveTargetTimeOverrides(targetTimeOverrides);
  }, [targetTimeOverrides]);

  useEffect(() => {
    saveWindowStartTime(defaultWindowStartTime);
  }, [defaultWindowStartTime]);

  useEffect(() => {
    saveWindowStartOverrides(windowStartOverrides);
  }, [windowStartOverrides]);

  useEffect(() => {
    if (autoReleasedBaselineIdsRef.current.dayKey !== todayKeyStr) {
      autoReleasedBaselineIdsRef.current = { dayKey: todayKeyStr, ids: new Set() };
    }
    const released = autoReleasedBaselineIdsRef.current.ids;

    const livingIds = new Set(
      tasks.map((task) => task.id).filter((id): id is string => typeof id === "string"),
    );
    // Baseline tracks dated-today softs and undated softs currently packed on today.
    const datedTodayIds = new Set(
      tasks
        .filter(
          (task) =>
            typeof task.id === "string" &&
            task.date === todayKeyStr &&
            parseTimeOfDay(task.starts_at) == null &&
            parseTimeOfDay(task.due_at) == null,
        )
        .map((task) => task.id as string),
    );
    const undatedSoftIds = new Set(
      tasks
        .filter(
          (task) =>
            typeof task.id === "string" &&
            parseTaskDate(task.date) == null &&
            parseTimeOfDay(task.starts_at) == null &&
            parseTimeOfDay(task.due_at) == null,
        )
        .map((task) => task.id as string),
    );
    const todaySoftIds = (todaySoftResidentKey
      ? todaySoftResidentKey.split(",").filter(Boolean)
      : []
    ).filter((id) => datedTodayIds.has(id) || undatedSoftIds.has(id));

    if (
      todayWindowBaseline == null ||
      todayWindowBaseline.dayKey !== todayKeyStr ||
      todayWindowBaseline.windowSig !== appliedTodayWindowSig
    ) {
      // New day or new applied task window — snapshot current window residents and reset overflow.
      const next: TodayWindowBaseline = {
        dayKey: todayKeyStr,
        windowSig: appliedTodayWindowSig,
        taskIds: todaySoftIds.filter(
          (id) => livingIds.has(id) && !released.has(id),
        ),
      };
      setTodayWindowBaseline(next);
      saveTodayWindowBaseline(next);
      return;
    }

    const merged = new Set(
      todayWindowBaseline.taskIds.filter(
        (id) =>
          livingIds.has(id) &&
          !released.has(id) &&
          (datedTodayIds.has(id) || undatedSoftIds.has(id)),
      ),
    );
    let changed = merged.size !== todayWindowBaseline.taskIds.length;
    for (const id of todaySoftIds) {
      if (!livingIds.has(id) || merged.has(id) || released.has(id)) continue;
      merged.add(id);
      changed = true;
    }
    if (!changed) return;

    const next: TodayWindowBaseline = {
      ...todayWindowBaseline,
      taskIds: [...merged],
    };
    setTodayWindowBaseline(next);
    saveTodayWindowBaseline(next);
  }, [
    todayKeyStr,
    appliedTodayWindowSig,
    todaySoftResidentKey,
    tasks,
    todayWindowBaseline,
  ]);

  // After day started: undated softs that left today's window → notice only (stay undated).
  useEffect(() => {
    if (nowMinutes < todayWindowStartMinutes) return;
    if (todayWindowBaseline == null || todayWindowBaseline.dayKey !== todayKeyStr) return;
    if (deferredNoticeIdsRef.current.dayKey !== todayKeyStr) {
      deferredNoticeIdsRef.current = { dayKey: todayKeyStr, ids: new Set() };
    }
    const notified = deferredNoticeIdsRef.current.ids;
    const baselineIds = new Set(todayWindowBaseline.taskIds);
    if (baselineIds.size === 0) return;

    const packDayByTaskId = new Map<string, string>();
    for (const day of calendarTaskLayout) {
      for (const block of day.blocks) {
        const id = block.taskId ?? block.task.id;
        if (id == null || packDayByTaskId.has(id)) continue;
        packDayByTaskId.set(id, day.dayKey);
      }
    }

    const byDay = new Map<string, string[]>();
    for (const task of tasks) {
      const id = task.id;
      if (id == null || !baselineIds.has(id) || notified.has(id)) continue;
      if (todaySoftResidentIds.has(id)) continue;
      if (parseTaskDate(task.date) != null) continue;
      if (
        parseTimeOfDay(task.starts_at) != null ||
        parseTimeOfDay(task.due_at) != null
      ) {
        continue;
      }
      const packDay = packDayByTaskId.get(id);
      if (packDay == null || packDay === todayKeyStr) continue;
      const list = byDay.get(packDay) ?? [];
      list.push(id);
      byDay.set(packDay, list);
    }
    if (byDay.size === 0) return;

    for (const ids of byDay.values()) {
      for (const id of ids) notified.add(id);
    }
    const at = Date.now();
    setTimelineNotices((current) => [
      ...current,
      ...[...byDay.entries()].map(([toDayKey, taskIds]) => ({
        id: `deferred-${toDayKey}-${at}-${taskIds[0]}`,
        kind: "deferred" as const,
        count: taskIds.length,
        at,
        dayKey: toDayKey,
        taskIds,
      })),
    ]);
  }, [
    nowMinutes,
    todayWindowStartMinutes,
    todayWindowBaseline,
    todayKeyStr,
    todaySoftResidentIds,
    tasks,
    calendarTaskLayout,
  ]);

  // Persist frozen soft-pack geometry for today (invalidates with day / window).
  useEffect(() => {
    const nextPlacements = calendarTasksLayout.todaySoftPlacements;
    const livingIds = new Set(
      tasks.map((task) => task.id).filter((id): id is string => typeof id === "string"),
    );
    const placements = nextPlacements.filter((row) => livingIds.has(row.taskId));
    if (
      todaySoftPackPlan == null ||
      todaySoftPackPlan.dayKey !== todayKeyStr ||
      todaySoftPackPlan.windowSig !== appliedTodayWindowSig
    ) {
      const next: TodaySoftPackPlan = {
        dayKey: todayKeyStr,
        windowSig: appliedTodayWindowSig,
        placements,
      };
      setTodaySoftPackPlan(next);
      saveTodaySoftPackPlan(next);
      return;
    }
    const prevKey = todaySoftPackPlan.placements
      .map((row) => `${row.taskId}:${row.startMin}-${row.endMin}`)
      .join("|");
    const nextKey = placements
      .map((row) => `${row.taskId}:${row.startMin}-${row.endMin}`)
      .join("|");
    if (prevKey === nextKey) return;
    const next: TodaySoftPackPlan = {
      dayKey: todayKeyStr,
      windowSig: appliedTodayWindowSig,
      placements,
    };
    setTodaySoftPackPlan(next);
    saveTodaySoftPackPlan(next);
  }, [
    todayKeyStr,
    appliedTodayWindowSig,
    calendarTasksLayout.todaySoftPlacements,
    tasks,
    todaySoftPackPlan,
  ]);

  const todayKey = dayKey(todayStart);
  useEffect(() => {
    setDaySnoozed(loadDaySnooze(todayKey));
  }, [todayKey]);

  const setDaySnoozedPreference = (snoozed: boolean) => {
    setDaySnoozed(snoozed);
    saveDaySnooze(todayKey, snoozed);
  };

  const commitTaskGapInput = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setTaskGapInput(String(taskGapMinutes));
      return;
    }
    const next = Math.min(MAX_TASK_GAP_MINUTES, Math.max(MIN_TASK_GAP_MINUTES, parsed));
    setTaskGapMinutes(next);
    setTaskGapInput(String(next));
  };

  const stepTaskGap = (direction: 1 | -1) => {
    const next = Math.min(
      MAX_TASK_GAP_MINUTES,
      Math.max(MIN_TASK_GAP_MINUTES, taskGapMinutes + direction * 5),
    );
    setTaskGapMinutes(next);
    setTaskGapInput(String(next));
  };

  const packingConfigRef = useRef({
    getTargetTimeForDay,
    getWindowStartTimeForDay,
    taskGapMinutes,
  });
  packingConfigRef.current = {
    getTargetTimeForDay,
    getWindowStartTimeForDay,
    taskGapMinutes,
  };
  const lastAutoRescheduleDayRef = useRef<string | null>(loadLastAutoRescheduleDay());

  useEffect(() => {
    if (activeView !== "dayline" && activeView !== "home") return;

    const tick = () => {
      const nowMs = Date.now();
      setCountdownNow(nowMs);
      const todayKey = dayKey(toStartOfDay(new Date(nowMs)));
      const lastKey = lastAutoRescheduleDayRef.current;
      if (lastKey === todayKey) return;

      // Calendar day advanced (midnight) or first run after a prior day.
      lastAutoRescheduleDayRef.current = todayKey;
      saveLastAutoRescheduleDay(todayKey);
      const config = packingConfigRef.current;
      const through = recurringHorizonEnd(
        new Date(nowMs),
        recurringMaterializeHorizonDays(),
      );
      setTasks((current) => {
        const { tasks: next } = rescheduleOverdueTasksForNewDay(
          current,
          new Date(nowMs),
          config.getTargetTimeForDay,
          config.taskGapMinutes,
          config.getWindowStartTimeForDay,
          undefined,
          toStartOfDay(new Date(nowMs)),
        );
        // Refresh fixed-horizon series for the new calendar day.
        let refreshed = pruneRecurringSeriesBeyondHorizon(next, through);
        const seriesIds = new Set(
          refreshed
            .map((task) => task.series_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        );
        for (const seriesId of seriesIds) {
          refreshed = topUpRecurringSeries(refreshed, seriesId, through);
        }
        return refreshed;
      });
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeView]);

  // Clear forced At Risk → Overflow ids on calendar day change.
  useEffect(() => {
    setForcedOverflowIds((prev) => (prev.size === 0 ? prev : new Set()));
    prevOverflowIdsRef.current = null;
    prevAtRiskIdRef.current = undefined;
    setTimelineNotices([]);
  }, [todayKeyStr]);

  // Spill softs that entirely passed the pack window → Overflow.
  useEffect(() => {
    if (spillReadyForOverflowIds.length === 0) return;
    setForcedOverflowIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of spillReadyForOverflowIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [spillReadyForOverflowIds.join("|")]);

  // Notify when a soft becomes OVERFLOWING (past window, still has remaining).
  useEffect(() => {
    const currentId = atRiskTask?.id ?? null;
    const prev = prevAtRiskIdRef.current;
    prevAtRiskIdRef.current = currentId;
    if (prev === undefined) return;
    if (currentId == null || currentId === prev) return;
    const at = Date.now();
    setTimelineNotices((current) => [
      ...current,
      {
        id: `at-risk-${at}-${currentId}`,
        kind: "at-risk",
        count: 1,
        at,
      },
    ]);
  }, [atRiskTask?.id]);

  // Emit dismissible notices when tasks enter or leave Overflow (still living = recovered).
  useEffect(() => {
    const currentIds = new Set(
      overflowTasks
        .map((task) => task.id)
        .filter((id): id is string => id != null),
    );
    const prev = prevOverflowIdsRef.current;
    prevOverflowIdsRef.current = currentIds;
    if (prev == null) return;

    let movedIn = 0;
    let recovered = 0;
    for (const id of currentIds) {
      if (!prev.has(id)) movedIn += 1;
    }
    const livingIds = new Set(
      tasks.map((task) => task.id).filter((id): id is string => id != null),
    );
    for (const id of prev) {
      if (currentIds.has(id)) continue;
      if (livingIds.has(id)) recovered += 1;
    }

    const nextNotices: TimelineNotice[] = [];
    const stamp = Date.now();
    if (movedIn > 0) {
      nextNotices.push({
        id: `overflow-${stamp}-${movedIn}`,
        kind: "overflow",
        count: movedIn,
        at: stamp,
      });
    }
    if (recovered > 0) {
      nextNotices.push({
        id: `recovered-${stamp + 1}-${recovered}`,
        kind: "recovered",
        count: recovered,
        // Slightly later so recovered stacks under overflow in the same tick.
        at: stamp + 1,
      });
    }
    if (nextNotices.length === 0) return;
    setTimelineNotices((current) => [...current, ...nextNotices]);
  }, [overflowTasks, tasks]);

  const applyChromeHiddenClass = (hidden: boolean) => {
    const hideChrome = hidden && collapsedRef.current && !searchOpenRef.current;
    composerRef.current?.classList.toggle("is-chrome-hidden", hideChrome);
    trayRef.current?.classList.toggle("is-chrome-hidden", hideChrome);
  };

  const setChromeHidden = (hidden: boolean) => {
    if (chromeHiddenRef.current === hidden) return;
    chromeHiddenRef.current = hidden;
    chromeCooldownUntilRef.current = performance.now() + 280;

    // Keep the twineline countdown chrome visible; only hide the collapsed tray.
    twinelineChromeRef.current?.classList.remove("is-chrome-hidden");
    applyChromeHiddenClass(hidden);
  };

  useEffect(() => {
    if (activeView !== "dayline") {
      setChromeHidden(false);
    }
  }, [activeView]);

  useLayoutEffect(() => {
    const top = pendingViewScrollTopRef.current;
    if (top === null) return;
    pendingViewScrollTopRef.current = null;
    const main = mainRef.current;
    if (!main) return;
    main.scrollTop = top;
    lastScrollTopRef.current = top;
    if (activeView === "dayline" && top > 0) {
      sessionScrollRestoreRef.current = top;
    }
  }, [activeView]);

  // Re-apply session scroll after Timeline content grows tall enough.
  useLayoutEffect(() => {
    if (activeView !== "dayline") return;
    const target = sessionScrollRestoreRef.current;
    if (target == null || target <= 0) return;
    const main = mainRef.current;
    if (!main) return;
    const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight);
    if (maxScroll + 1 < target) {
      // Content still too short — grow range so deep restore can land.
      if (timelineDayCount >= MAX_TIMELINE_DAY_COUNT) {
        main.scrollTop = maxScroll;
        lastScrollTopRef.current = maxScroll;
        viewScrollTopRef.current.dayline = maxScroll;
        sessionScrollRestoreRef.current = null;
        return;
      }
      growTimelineDayCount(TIMELINE_GROW_STEP, true);
      return;
    }
    main.scrollTop = target;
    lastScrollTopRef.current = target;
    viewScrollTopRef.current.dayline = target;
    if (Math.abs(main.scrollTop - target) <= 2) {
      sessionScrollRestoreRef.current = null;
    }
  }, [
    activeView,
    tasksCompact,
    timelineDayCount,
    timelineDays.length,
    calendarLayoutSpanKey,
    overflowTaskCount,
  ]);

  useEffect(() => {
    return () => {
      if (uiSessionSaveTimerRef.current != null) {
        window.clearTimeout(uiSessionSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeViewRef.current !== "dayline") return;
    schedulePersistUiSession("dayline");
  }, [timelineDayCount]);

  // Tray/FAB sit above app-main; forward wheel so page scroll still works over them.
  useEffect(() => {
    const composer = composerRef.current;
    const tray = trayRef.current;
    const main = mainRef.current;
    if (!main) return;

    const onWheel = (event: WheelEvent) => {
      if (composer != null && !composer.classList.contains("is-collapsed")) return;
      let dy = event.deltaY;
      let dx = event.deltaX;
      if (event.deltaMode === 1) {
        dy *= 16;
        dx *= 16;
      } else if (event.deltaMode === 2) {
        dy *= main.clientHeight;
        dx *= main.clientWidth;
      }
      if (dy === 0 && dx === 0) return;
      main.scrollBy({ top: dy, left: dx });
    };

    composer?.addEventListener("wheel", onWheel, { passive: true });
    tray?.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      composer?.removeEventListener("wheel", onWheel);
      tray?.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Horizontal swipe on main content cycles Home ↔ Timeline ↔ Discover.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const isMainSwipeView = (id: string): id is MainSwipeView =>
      (MAIN_SWIPE_VIEWS as readonly string[]).includes(id);

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!collapsedRef.current || searchOpenRef.current || moreMenuOpenRef.current) return;
      if (!isMainSwipeView(activeViewRef.current)) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, [contenteditable='true'], .app-overlay-menu, .app-attach-menu",
        )
      ) {
        return;
      }
      mainSwipeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        armed: true,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const gesture = mainSwipeRef.current;
      if (gesture == null || gesture.pointerId !== event.pointerId) return;
      mainSwipeRef.current = null;
      if (!gesture.armed) return;
      if (!collapsedRef.current || searchOpenRef.current || moreMenuOpenRef.current) return;
      const current = activeViewRef.current;
      if (!isMainSwipeView(current)) return;

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.abs(dx) < MAIN_SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dy) > Math.abs(dx) * MAIN_SWIPE_MAX_SLOPE) return;

      const index = MAIN_SWIPE_VIEWS.indexOf(current);
      if (index < 0) return;
      // Swipe left → next tab; swipe right → previous tab.
      const nextIndex = dx < 0 ? index + 1 : index - 1;
      if (nextIndex < 0 || nextIndex >= MAIN_SWIPE_VIEWS.length) return;
      selectViewRef.current(MAIN_SWIPE_VIEWS[nextIndex]);
    };

    const onPointerCancel = (event: PointerEvent) => {
      const gesture = mainSwipeRef.current;
      if (gesture == null || gesture.pointerId !== event.pointerId) return;
      mainSwipeRef.current = null;
    };

    main.addEventListener("pointerdown", onPointerDown, { passive: true });
    main.addEventListener("pointerup", onPointerUp, { passive: true });
    main.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      main.removeEventListener("pointerdown", onPointerDown);
      main.removeEventListener("pointerup", onPointerUp);
      main.removeEventListener("pointercancel", onPointerCancel);
    };
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    lastScrollTopRef.current = main.scrollTop;

    const onScroll = () => {
      const top = main.scrollTop;
      const delta = top - lastScrollTopRef.current;
      lastScrollTopRef.current = top;
      viewScrollTopRef.current[activeViewRef.current] = top;
      schedulePersistUiSession(activeViewRef.current);

      if (activeView === "dayline") {
        const today = toStartOfDay(new Date(countdownNowRef.current));
        const awayFromToday =
          top > 80 || !sameCalendarDay(selectedDayRef.current, today);
        if (awayFromToday !== timelineScrollTopBtnVisibleRef.current) {
          timelineScrollTopBtnVisibleRef.current = awayFromToday;
          setShowTimelineScrollTop(awayFromToday);
        }

        if (!timelineScrollSyncLockRef.current) {
          const chromeBottom =
            twinelineChromeRef.current?.getBoundingClientRect().bottom ??
            main.getBoundingClientRect().top;
          const sections = main.querySelectorAll<HTMLElement>("[data-calendar-day]");
          let matched: HTMLElement | null = sections[0] ?? null;
          for (const section of sections) {
            const label =
              section.querySelector<HTMLElement>(
                ".task-day-label-row, .calendar-timeline-day-label, .task-day-label",
              ) ?? section;
            // Advance once the sticky header bottom has passed this day's title bottom.
            if (label.getBoundingClientRect().bottom <= chromeBottom) {
              matched = section;
            }
          }
          const key = matched?.dataset.calendarDay;
          if (key) {
            const [y, m, d] = key.split("-").map(Number);
            if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
              const next = toStartOfDay(new Date(y, m - 1, d));
              setSelectedDay((prev) => (sameCalendarDay(prev, next) ? prev : next));
            }
          }

          const maxScroll = Math.max(1, main.scrollHeight - main.clientHeight);
          const nearEndPx = maxScroll - top <= TIMELINE_PREFETCH_PX;
          const nearEndRatio = top / maxScroll > TIMELINE_PREFETCH_RATIO;
          if (nearEndPx || nearEndRatio) {
            growTimelineDayCount(TIMELINE_GROW_STEP);
          }
        }
      }

      // Tray chrome hide-on-scroll is Dayline-only so Home scroll does not
      // fight Timeline chrome state.
      if (activeView !== "dayline") {
        return;
      }

      if (chromeLockRef.current) {
        return;
      }

      if (!collapsed || searchOpen || moreMenuOpen) {
        setChromeHidden(false);
        return;
      }

      // Ignore scroll noise while the hide/show transition runs so layout
      // feedback cannot flip the chrome rapidly.
      if (performance.now() < chromeCooldownUntilRef.current) return;

      if (top < 12) {
        setChromeHidden(false);
        return;
      }

      if (delta > 6) setChromeHidden(true);
      else if (delta < -6) setChromeHidden(false);
    };

    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, [collapsed, searchOpen, moreMenuOpen, tasksCompact, activeView]);

  useEffect(() => {
    if (activeView !== "dayline") {
      setShowTimelineScrollTop(false);
      timelineScrollTopBtnVisibleRef.current = false;
      return;
    }
    const main = mainRef.current;
    if (!main) return;
    const today = toStartOfDay(new Date(countdownNow));
    const awayFromToday =
      main.scrollTop > 80 || !sameCalendarDay(selectedDay, today);
    if (awayFromToday !== timelineScrollTopBtnVisibleRef.current) {
      timelineScrollTopBtnVisibleRef.current = awayFromToday;
      setShowTimelineScrollTop(awayFromToday);
    }
  }, [activeView, tasksCompact, selectedDay, countdownNow]);

  useEffect(() => {
    if (activeView !== "dayline") return;
    // Timeline only starts at today — never keep a past range start.
    const today = toStartOfDay(new Date(countdownNow));
    if (timelineRangeStart.getTime() !== today.getTime()) {
      setTimelineRangeStart(today);
    }
  }, [activeView, countdownNow, timelineRangeStart]);

  // Layout is capped to the UI range + buffer, so far series dates must not
  // force timelineDayCount growth. Jump-to-day / session restore grow explicitly.

  useLayoutEffect(() => {
    // Keep pending targets queued off-Dayline; never move main for Home/etc.
    if (activeViewRef.current !== "dayline") return;

    const preserveChrome = pendingViewPreserveChromeRef.current;
    const chromeHiddenSnapshot = pendingViewChromeHiddenRef.current;
    const taskId = pendingViewScrollTaskIdRef.current;
    if (taskId) {
      const main = mainRef.current;
      const el = main?.querySelector(`[data-task-id="${CSS.escape(taskId)}"]`);
      if (!(el instanceof HTMLElement)) {
        const dayWithTask = calendarTaskLayout.find((day) =>
          day.blocks.some((block) => block.taskId === taskId),
        );
        if (dayWithTask) {
          const end = addDays(timelineRangeStart, timelineDayCount - 1);
          if (dayWithTask.date.getTime() > end.getTime()) {
            const extra =
              Math.ceil((dayWithTask.date.getTime() - end.getTime()) / 86_400_000) + 1;
            growTimelineDayCount(extra, true);
            return;
          }
        }
        pendingViewScrollTaskIdRef.current = null;
        pendingViewPreserveChromeRef.current = false;
        chromeLockRef.current = false;
        } else {
        pendingViewScrollTaskIdRef.current = null;
        pendingTimelineScrollDayRef.current = null;
        pendingViewPreserveChromeRef.current = false;
        scrollTaskIntoView(taskId, "auto", { preserveChrome });
        if (preserveChrome) {
          setChromeHidden(chromeHiddenSnapshot);
        }
        return;
      }
    }

    if (!pendingTimelineScrollDayRef.current) {
      if (preserveChrome) {
        setChromeHidden(chromeHiddenSnapshot);
        chromeLockRef.current = false;
      }
      pendingViewPreserveChromeRef.current = false;
      return;
    }
    pendingViewPreserveChromeRef.current = false;
    if (preserveChrome) {
      chromeLockRef.current = true;
    }
    scrollTimelineToDay(
      pendingTimelineScrollDayRef.current,
      preserveChrome ? "auto" : "smooth",
    );
    if (preserveChrome) {
      setChromeHidden(chromeHiddenSnapshot);
      window.setTimeout(() => {
        chromeLockRef.current = false;
      }, 0);
    }
  }, [
    activeView,
    tasksCompact,
    timelineRangeStart,
    timelineDayCount,
    timelineDays.length,
    calendarLayoutSpanKey,
  ]);

  useLayoutEffect(() => {
    if (activeView !== "dayline") return;
    const main = mainRef.current;
    if (!main) return;
    if (timelineDayCount >= MAX_TIMELINE_DAY_COUNT) return;
    // Compact day groups are short — grow the range until the list can scroll.
    if (main.scrollHeight <= main.clientHeight + 48) {
      growTimelineDayCount(TIMELINE_GROW_STEP);
    }
  }, [activeView, tasksCompact, timelineDayCount, timelineDays.length, tasks.length]);

  useEffect(() => {
    if (!collapsed || searchOpen || moreMenuOpen) {
      setChromeHidden(false);
    } else {
      applyChromeHiddenClass(chromeHiddenRef.current && activeView === "dayline");
    }
  }, [collapsed, searchOpen, moreMenuOpen, activeView]);

  useLayoutEffect(() => {
    const header = twinelineHeaderRef.current;
    const slot = twinelineSlotRef.current;
    if (!header || !slot || activeView !== "dayline") return;

    // Slot must match full sticky header (focus + bar + schedule), not only the slide.
    const syncSlotHeight = () => {
      const height = header.offsetHeight;
      slot.style.height = `${height}px`;
      mainRef.current?.style.setProperty("--twineline-chrome-height", `${height}px`);
    };
    syncSlotHeight();

    const observer = new ResizeObserver(syncSlotHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [activeView, calendarOpen, timePickerOpen, overflowTaskCount]);

  useLayoutEffect(() => {
    const el = composeInputRef.current;
    if (!el) return;

    const MIN_TEXTAREA_HEIGHT = 46;
    const FOCUSED_MIN_HEIGHT = 160;
    const COLLAPSE_CLEARANCE = 28;

    const syncHeight = () => {
      if (collapsed) {
        el.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
        el.style.maxHeight = "";
        return;
      }

      const vv = window.visualViewport;
      const vvTop = vv?.offsetTop ?? 0;
      const vvBottom = vvTop + (vv?.height ?? window.innerHeight);
      const field = composerFieldRef.current;
      const tools = field?.querySelector<HTMLElement>(".app-composer-tools");
      const savePrompt = field?.querySelector<HTMLElement>(".twineline-save-prompt");
      const fieldRow = el.closest<HTMLElement>(".app-composer-field-row");

      let maxTextarea = FOCUSED_MIN_HEIGHT;
      if (field) {
        const fieldRect = field.getBoundingClientRect();
        const fieldStyles = getComputedStyle(field);
        const fieldPadY =
          (Number.parseFloat(fieldStyles.paddingTop) || 0) +
          (Number.parseFloat(fieldStyles.paddingBottom) || 0);
        const toolsH = tools?.offsetHeight ?? 0;
        const savePromptH = savePrompt?.offsetHeight ?? 0;
        const rowExtras = fieldRow ? Math.max(0, fieldRow.offsetHeight - el.offsetHeight) : 0;
        const visibleBottom = Math.min(fieldRect.bottom, vvBottom);
        const maxFieldHeight = Math.max(
          MIN_TEXTAREA_HEIGHT,
          visibleBottom - (vvTop + COLLAPSE_CLEARANCE),
        );
        maxTextarea = Math.max(
          MIN_TEXTAREA_HEIGHT,
          Math.floor(maxFieldHeight - fieldPadY - toolsH - savePromptH - rowExtras),
        );
      }

      if (document.activeElement === el) {
        maxTextarea = Math.max(maxTextarea, FOCUSED_MIN_HEIGHT);
      }

      el.style.maxHeight = `${maxTextarea}px`;
      // Measure from the min height so empty/short text doesn't inflate scrollHeight.
      el.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
      const next = Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), maxTextarea);
      el.style.height = `${next}px`;
    };

    syncHeight();
    const frame = requestAnimationFrame(() => {
      syncHeight();
      requestAnimationFrame(syncHeight);
    });
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    if (composerFieldRef.current) observer.observe(composerFieldRef.current);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncHeight);
    vv?.addEventListener("scroll", syncHeight);
    window.addEventListener("resize", syncHeight);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      vv?.removeEventListener("resize", syncHeight);
      vv?.removeEventListener("scroll", syncHeight);
      window.removeEventListener("resize", syncHeight);
    };
  }, [content, collapsed, composeKind, editingTaskId, composerSavePromptOpen]);

  useEffect(() => {
    if (collapsed) return;
    const frame = requestAnimationFrame(() => {
      composeInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [collapsed]);

  useEffect(() => {
    if (taskToolHint === LINKING_TOOL_HINT && !isLinkingToolComposeKind(composeKind)) {
      setTaskToolHint(null);
    }
  }, [composeKind, taskToolHint]);

  useLayoutEffect(() => {
    if (collapsed) return;
    const el = toolsCenterRef.current;
    if (!el) return;

    const scrollToEnd = () => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    };

    scrollToEnd();
    const frame = requestAnimationFrame(() => {
      scrollToEnd();
      requestAnimationFrame(scrollToEnd);
    });
    // Composer expand transition is ~0.34s; re-pin after layout settles.
    const timers = [50, 120, 360].map((ms) => window.setTimeout(scrollToEnd, ms));

    const inner = el.querySelector(".app-composer-tools-center-inner");
    const observer = new ResizeObserver(scrollToEnd);
    observer.observe(el);
    if (inner instanceof HTMLElement) observer.observe(inner);

    return () => {
      cancelAnimationFrame(frame);
      for (const id of timers) window.clearTimeout(id);
      observer.disconnect();
    };
  }, [collapsed, composeKind, editingTaskId]);

  useEffect(() => {
    if (!searchOpen) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (searchFieldRef.current?.contains(target)) return;
      if (searchButtonRef.current?.contains(target)) return;
      closeSearch();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (collapsed) return;

    const suppressGesture = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // Only the composer field (and its portaled menus) count as "inside".
      if (composerFieldRef.current?.contains(target)) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (composeKindMenuRef.current?.contains(target)) return;
      if (durationMenuRef.current?.contains(target)) return;
      if (recurringMenuRef.current?.contains(target)) return;
      if (impactMenuRef.current?.contains(target)) return;
      if (taskToolHintMenuRef.current?.contains(target)) return;
      if (linkContainerTypeMenuRef.current?.contains(target)) return;
      if (linkQuickAddKindMenuRef.current?.contains(target)) return;
      if (linkQaScheduleMenuRef.current?.contains(target)) return;
      if (linkQaImpactMenuRef.current?.contains(target)) return;
      if (linkQaUrgencyMenuRef.current?.contains(target)) return;
      // Portaled confirm dialogs live on document.body — don't treat as outside.
      if (target instanceof Element && target.closest(".task-delete-prompt")) return;

      // Native date/time pickers render outside the popover; keep Date & Time open
      // while those inputs are focused so the selection can commit.
      if (taskToolHint === "Date & Time") {
        const active = document.activeElement;
        if (
          active === taskDateInputRef.current ||
          active === taskTimeInputRef.current ||
          target === taskDateInputRef.current ||
          target === taskTimeInputRef.current
        ) {
          return;
        }
      }

      // Swallow the outside click so it only dismisses the composer and does not
      // also activate tasks/controls underneath (which would reopen the editor).
      suppressGesture(event);

      let timeoutId = 0;
      const onClick = (clickEvent: MouseEvent) => {
        suppressGesture(clickEvent);
        cleanup();
      };
      const cleanup = () => {
        document.removeEventListener("click", onClick, true);
        window.clearTimeout(timeoutId);
      };
      document.addEventListener("click", onClick, true);
      timeoutId = window.setTimeout(cleanup, 500);

      if (
        attachMenuOpen ||
        composeKindMenuOpen ||
        assistProPromptOpen ||
        durationMenuOpen ||
        recurringMenuOpen ||
        impactMenuOpen ||
        taskToolHint != null
      ) {
        setAttachMenuOpen(false);
        setComposeKindMenuOpen(false);
        setAssistProPromptOpen(false);
        setDurationMenuOpen(false);
        setRecurringMenuOpen(false);
        setImpactMenuOpen(false);
        closeTaskToolHint();
        return;
      }

      requestCloseComposer();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [
    collapsed,
    attachMenuOpen,
    composeKindMenuOpen,
    assistProPromptOpen,
    durationMenuOpen,
    recurringMenuOpen,
    impactMenuOpen,
    taskToolHint,
    isComposerDirty,
  ]);

  useEffect(() => {
    if (!assistProPromptOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (assistProPromptMenuRef.current?.contains(target)) return;
      if (composeAddButtonRef.current?.contains(target)) return;
      setAssistProPromptOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [assistProPromptOpen]);

  useEffect(() => {
    if (composeKind === "assistant" && hasText) return;
    setAssistProPromptOpen(false);
  }, [composeKind, hasText]);

  useEffect(() => {
    if (!attachMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      setAttachMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [attachMenuOpen]);

  useEffect(() => {
    if (!composeKindMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest(".app-composer-meta-chip")) return;
      if (composeKindMenuRef.current?.contains(target)) return;
      if (composeKindButtonRef.current?.contains(target)) return;
      if (composeAddButtonRef.current?.contains(target)) return;
      setComposeKindMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [composeKindMenuOpen]);

  useEffect(() => {
    if (!linkContainerTypeMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (linkContainerTypeMenuRef.current?.contains(target)) return;
      if (linkContainerTypeButtonRef.current?.contains(target)) return;
      setLinkContainerTypeMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [linkContainerTypeMenuOpen]);

  useEffect(() => {
    if (!linkQuickAddKindMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (linkQuickAddKindMenuRef.current?.contains(target)) return;
      if (linkQuickAddKindButtonRef.current?.contains(target)) return;
      setLinkQuickAddKindMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [linkQuickAddKindMenuOpen]);

  useEffect(() => {
    if (!linkQaScheduleMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (linkQaScheduleMenuRef.current?.contains(target)) return;
      if (linkQaScheduleButtonRef.current?.contains(target)) return;
      setLinkQaScheduleMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [linkQaScheduleMenuOpen]);

  useEffect(() => {
    if (!linkQaImpactMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (linkQaImpactMenuRef.current?.contains(target)) return;
      if (linkQaImpactButtonRef.current?.contains(target)) return;
      setLinkQaImpactMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [linkQaImpactMenuOpen]);

  useEffect(() => {
    if (!linkQaUrgencyMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (linkQaUrgencyMenuRef.current?.contains(target)) return;
      if (linkQaUrgencyButtonRef.current?.contains(target)) return;
      setLinkQaUrgencyMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [linkQaUrgencyMenuOpen]);

  useEffect(() => {
    if (!durationMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest(".app-composer-meta-chip")) return;
      if (durationMenuRef.current?.contains(target)) return;
      if (durationButtonRef.current?.contains(target)) return;
      setDurationMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [durationMenuOpen]);

  useEffect(() => {
    if (!recurringMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest(".app-composer-meta-chip")) return;
      if (recurringMenuRef.current?.contains(target)) return;
      if (cycleButtonRef.current?.contains(target)) return;
      setRecurringMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [recurringMenuOpen]);


  useEffect(() => {
    if (!impactMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest(".app-composer-meta-chip")) return;
      if (impactMenuRef.current?.contains(target)) return;
      if (impactButtonRef.current?.contains(target)) return;
      setImpactMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [impactMenuOpen]);

  useEffect(() => {
    if (taskToolHint == null) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest(".app-composer-meta-chip")) return;
      if (taskToolHintMenuRef.current?.contains(target)) return;
      if (taskToolHintAnchorRef.current?.contains(target)) return;
      if (linkContainerTypeMenuRef.current?.contains(target)) return;
      if (linkContainerTypeButtonRef.current?.contains(target)) return;
      if (linkQuickAddKindMenuRef.current?.contains(target)) return;
      if (linkQuickAddKindButtonRef.current?.contains(target)) return;
      if (linkQaScheduleMenuRef.current?.contains(target)) return;
      if (linkQaScheduleButtonRef.current?.contains(target)) return;
      if (linkQaImpactMenuRef.current?.contains(target)) return;
      if (linkQaImpactButtonRef.current?.contains(target)) return;
      if (linkQaUrgencyMenuRef.current?.contains(target)) return;
      if (linkQaUrgencyButtonRef.current?.contains(target)) return;
      if (taskToolHint === "Date & Time") {
        const active = document.activeElement;
        if (
          active === taskDateInputRef.current ||
          active === taskTimeInputRef.current ||
          target === taskDateInputRef.current ||
          target === taskTimeInputRef.current
        ) {
          return;
        }
      }
      closeTaskToolHint();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [taskToolHint]);

  useEffect(() => {
    if (!moreMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moreMenuRef.current?.contains(target)) return;
      if (moreButtonRef.current?.contains(target)) return;
      setMoreMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!timelineMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTimelineMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [timelineMenuOpen]);

  useEffect(() => {
    if (!focusedTaskId && !focusedOverflowTaskIds?.length) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setFocusedTaskId(null);
        setFocusedOverflowTaskIds(null);
        return;
      }
      if (target.closest("[data-schedule-task-id]")) return;
      if (target.closest("[data-task-id]")) return;
      setFocusedTaskId(null);
      setFocusedOverflowTaskIds(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [focusedTaskId, focusedOverflowTaskIds]);

  useEffect(() => {
    if (!timePickerOpen) return;
    const sourceView = timePickerSource === "home" ? "home" : "dayline";
    if (activeView !== sourceView) finishCloseTimePicker();
  }, [activeView, timePickerOpen, timePickerSource]);

  useEffect(() => {
    if (!timePickerOpen || timeSavePromptOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (timeFramesMenuRef.current?.contains(target)) return;
      if (homeCountdownButtonRef.current?.contains(target)) return;
      if (daylineCountdownButtonRef.current?.contains(target)) return;
      // Native time pickers render outside the header; keep the panel open while focused.
      const active = document.activeElement;
      if (
        active === targetTimeInputRef.current ||
        target === targetTimeInputRef.current ||
        active === windowStartInputRef.current ||
        target === windowStartInputRef.current
      ) {
        return;
      }
      requestCloseTimePicker();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [timePickerOpen, timeSavePromptOpen, targetTime, windowStartTime, timePickerBaseline]);

  const closeProfileMenu = () => setTimelineMenuOpen(false);

  return (
    <div className="app">
      {deletePrompt != null &&
        createPortal(
          <div className="task-delete-prompt is-danger" role="presentation">
            <button
              type="button"
              className="task-delete-prompt-scrim"
              aria-label="Cancel delete"
              onClick={cancelDeletePrompt}
            />
            <div
              className="task-delete-prompt-panel twineline-save-prompt"
              role="dialog"
              aria-modal="true"
              aria-label="Delete confirmation"
            >
              <button
                type="button"
                className="twineline-save-prompt-dismiss"
                onClick={cancelDeletePrompt}
                aria-label="Cancel delete"
              >
                <CloseIcon />
              </button>
              <p className="twineline-save-prompt-title">
                Delete “{deletePrompt.title}”?
              </p>
              <p className="task-delete-prompt-body">This cannot be undone.</p>
              <div className="twineline-save-prompt-actions">
                <button
                  type="button"
                  className="twineline-save-prompt-secondary"
                  onClick={cancelDeletePrompt}
                >
                  Don&apos;t delete
                </button>
                <button
                  type="button"
                  className="twineline-save-prompt-primary"
                  onClick={confirmDeleteTask}
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {composerSavePromptOpen &&
        createPortal(
          <div className="task-delete-prompt" role="presentation">
            <button
              type="button"
              className="task-delete-prompt-scrim"
              aria-label="Cancel and keep editing"
              onClick={() => setComposerSavePromptOpen(false)}
            />
            <div
              className="task-delete-prompt-panel twineline-save-prompt"
              role="dialog"
              aria-modal="true"
              aria-label="Save Changes?"
            >
              <button
                type="button"
                className="twineline-save-prompt-dismiss"
                onClick={() => setComposerSavePromptOpen(false)}
                aria-label="Cancel and keep editing"
              >
                <CloseIcon />
              </button>
              <p className="twineline-save-prompt-title">Save Changes?</p>
              <div className="twineline-save-prompt-actions">
                <button
                  type="button"
                  className="twineline-save-prompt-secondary"
                  onClick={discardComposerChanges}
                >
                  No Thanks
                </button>
                <button
                  type="button"
                  className="twineline-save-prompt-primary"
                  onClick={confirmComposerSavePrompt}
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {overflowReschedulePromptDayKey != null &&
        createPortal(
          <div className="task-delete-prompt" role="presentation">
            <button
              type="button"
              className="task-delete-prompt-scrim"
              aria-label="Cancel reschedule"
              onClick={() => setOverflowReschedulePromptDayKey(null)}
            />
            <div
              className="task-delete-prompt-panel twineline-save-prompt"
              role="dialog"
              aria-modal="true"
              aria-label="Reschedule all overflow tasks?"
            >
              <button
                type="button"
                className="twineline-save-prompt-dismiss"
                onClick={() => setOverflowReschedulePromptDayKey(null)}
                aria-label="Cancel reschedule"
              >
                <CloseIcon />
              </button>
              <p className="twineline-save-prompt-title">
                Automatically reschedule all overflow tasks?
              </p>
              <div className="twineline-save-prompt-actions">
                <button
                  type="button"
                  className="twineline-save-prompt-secondary"
                  onClick={() => setOverflowReschedulePromptDayKey(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="twineline-save-prompt-primary"
                  onClick={() => {
                    const dayKeyToReschedule = overflowReschedulePromptDayKey;
                    setOverflowReschedulePromptDayKey(null);
                    runAutomaticOverflowReschedule(dayKeyToReschedule);
                  }}
                >
                  Reschedule All
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {timelineMenuOpen &&
        createPortal(
          <div className="profile-drawer" role="presentation">
            <button
              type="button"
              className="profile-drawer-scrim"
              aria-label="Close profile menu"
              onClick={closeProfileMenu}
            />
            <div
              ref={timelineMenuRef}
              className="profile-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Profile menu"
            >
              <div className="profile-drawer-header">
                <span className="profile-drawer-avatar" aria-hidden="true">
                  {PROFILE_MENU_NAME.slice(0, 1)}
                </span>
                <span className="profile-drawer-name">{PROFILE_MENU_NAME}</span>
              </div>
              <div className="profile-drawer-divider" role="separator" />
              <div className="profile-drawer-items" role="menu">
                <button
                  type="button"
                  className="app-attach-menu-item"
                  role="menuitem"
                  onClick={() => {
                    closeProfileMenu();
                    toggleTimePicker("dayline");
                  }}
                >
                  <span>Set task window</span>
                </button>
                <button
                  type="button"
                  className="app-attach-menu-item"
                  role="menuitem"
                  onClick={closeProfileMenu}
                >
                  <span>Set aggression</span>
                </button>
                <button
                  type="button"
                  className="app-attach-menu-item"
                  role="menuitem"
                  onClick={closeProfileMenu}
                >
                  <span>Metrics</span>
                </button>
                <button
                  type="button"
                  className={`app-attach-menu-item${timelineMultiSelect ? " is-selected" : ""}`}
                  role="menuitemcheckbox"
                  aria-checked={timelineMultiSelect}
                  onClick={() => {
                    if (timelineMultiSelect) {
                      setTimelineMultiSelect(false);
                      setSelectedTimelineTaskIds([]);
                    } else {
                      setTimelineMultiSelect(true);
                      setSelectedTimelineTaskIds(
                        focusedTaskId != null ? [focusedTaskId] : [],
                      );
                      setFocusedTaskId(null);
                      setFocusedOverflowTaskIds(null);
                    }
                    closeProfileMenu();
                  }}
                >
                  <span>Select multiple</span>
                </button>
                <button
                  type="button"
                  className={`app-attach-menu-item${activeView === "settings" ? " is-selected" : ""}`}
                  role="menuitem"
                  onClick={() => {
                    closeProfileMenu();
                    selectView("settings");
                  }}
                >
                  <SettingsIcon />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className={`app-attach-menu-item${activeView === "profile" ? " is-selected" : ""}`}
                  role="menuitem"
                  onClick={() => {
                    closeProfileMenu();
                    selectView("profile");
                  }}
                >
                  <ProfileIcon />
                  <span>Profile</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <main className="app-main" ref={mainRef}>
        <ComposerOverlayMenu
          open={timePickerOpen}
          anchorRef={timePickerAnchorRef}
          menuRef={timeFramesMenuRef}
          align="center"
          role="dialog"
          className="home-time-picker-menu time-frames-menu"
          aria-label="Choose time frames"
        >
          <div className="twineline-time-picker">
            <div className="twineline-time-picker-heading">Time Frames</div>
            <div className="twineline-time-picker-divider" role="presentation" />
            <div className="twineline-time-picker-controls">
              <div className="twineline-time-picker-row">
                <span className="twineline-time-picker-label">Begins:</span>
                <div className="app-due-date-field twineline-time-picker-field">
                  <input
                    ref={windowStartInputRef}
                    type="time"
                    value={windowStartTime}
                    onChange={(event) => setWindowStartTimeValue(event.target.value)}
                    onInput={(event) => setWindowStartTimeValue(event.currentTarget.value)}
                    aria-label="Task window start time"
                  />
                </div>
              </div>
              <div className="twineline-time-picker-row">
                <span className="twineline-time-picker-label">Ends:</span>
                <div className="app-due-date-field twineline-time-picker-field">
                  <input
                    ref={targetTimeInputRef}
                    type="time"
                    value={targetTime}
                    onChange={(event) => setTargetTimeValue(event.target.value)}
                    onInput={(event) => setTargetTimeValue(event.currentTarget.value)}
                    aria-label="Task window end time"
                  />
                </div>
              </div>
              <button
                type="button"
                className={`twineline-snooze-toggle${daySnoozed ? " is-on" : ""}`}
                aria-pressed={daySnoozed}
                aria-label={daySnoozed ? "Turn off day snooze" : "Snooze the day"}
                onClick={() => setDaySnoozedPreference(!daySnoozed)}
              >
                Snooze
              </button>
            </div>
            {timeSavePromptOpen && (
              <div
                className="twineline-save-prompt"
                role="dialog"
                aria-label="Apply these changes to this day or all future days?"
              >
                <p className="twineline-save-prompt-title">
                  Apply these changes to this day or all future days?
                </p>
                <div className="twineline-save-prompt-actions">
                  <button
                    type="button"
                    className="twineline-save-prompt-secondary"
                    onClick={discardTimeChanges}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="twineline-save-prompt-secondary"
                    onClick={applyTargetTimeThisDay}
                  >
                    This Day
                  </button>
                  <button
                    type="button"
                    className="twineline-save-prompt-primary"
                    onClick={applyTargetTimeAllFutureDays}
                  >
                    All Future Days
                  </button>
                </div>
              </div>
            )}
          </div>
        </ComposerOverlayMenu>
        {activeView === "home" && (
          <HomeView
            wheelLabel={formatTwinelineDateLabel(todayStart, new Date(countdownNow), {
              weekday: true,
            })}
            wheelSlices={todayWheelSlices}
            wheelElapsedEndMin={nowMinutes}
            windowStartMin={todayWindowStartMinutes}
            windowEndMin={todayPackEnd}
            wheelCountdown={
              <span ref={homeCountdownButtonRef} className="day-wheel-hub-countdown-anchor">
                <TwinelineCountdownButton
                  className="is-home-wheel"
                  countdownRemaining={countdownRemaining}
                  targetTimeLabel={targetTimeLabel}
                  windowStartLabel={formatMinutesLabel(todayWindowStartMinutes)}
                  timePickerOpen={timePickerOpen && timePickerSource === "home"}
                  daySnoozed={daySnoozed}
                  outsideTaskWindow={outsideTaskWindow}
                  onClick={() => toggleTimePicker("home", todayStart)}
                />
              </span>
            }
            focusPlanId={
              todayFocusTask?.parent_id != null &&
              tasks.some(
                (task) =>
                  task.id === todayFocusTask.parent_id &&
                  isPlanTaskType(task.type),
              )
                ? todayFocusTask.parent_id
                : null
            }
            plans={tasks
              .filter((task) => isPlanTaskType(task.type) && task.id != null)
              .sort(compareSoftPriority)
              .map((plan) => {
                const planId = plan.id as string;
                const nowForDedupe = new Date(countdownNow);
                const openChildren = dedupeSeriesClosestToNow(
                  tasks.filter(
                    (task) =>
                      task.parent_id === planId &&
                      task.id != null &&
                      task.id !== planId &&
                      !isPlanTaskType(task.type) &&
                      !isContainerTaskType(task.type),
                  ),
                  nowForDedupe,
                );
                const completedCount = planCompletedCounts[planId] ?? 0;
                const toPlanTask = (task: ComposerDraft) => ({
                  id: task.id as string,
                  title: task.title,
                  scheduleKind: taskScheduleKind(task),
                  popping: isTaskPopping(task.id),
                });
                const todayCandidates = dedupeSeriesClosestToNow(
                  (todayLayout?.blocks ?? [])
                    .filter(
                      (block) =>
                        !block.overdue &&
                        block.task.parent_id === planId &&
                        block.task.id != null &&
                        block.task.id !== planId &&
                        !isPlanTaskType(block.task.type) &&
                        !isContainerTaskType(block.task.type),
                    )
                    .map((block) => block.task),
                  nowForDedupe,
                );
                const todayNext = todayCandidates[0] ?? null;
                const nextUpSource = todayNext ?? openChildren[0] ?? null;
                const nextUpTask =
                  nextUpSource?.id != null ? toPlanTask(nextUpSource) : null;
                const nextUpId = nextUpTask?.id ?? null;
                return {
                  id: planId,
                  title: plan.title,
                  completedCount,
                  taskCount: completedCount + openChildren.length,
                  nextUpTask,
                  tasks: openChildren
                    .filter((task) => task.id !== nextUpId)
                    .map(toPlanTask),
                };
              })}
            onSelectPlan={(planId) => {
              const plan = tasks.find(
                (task) => task.id === planId && isPlanTaskType(task.type),
              );
              if (!plan) return;
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(null);
              editTask(plan);
            }}
            onCompletePlanTask={(taskId) => requestCompleteTask(taskId)}
            onEditPlanTask={(taskId) => {
              const task = tasks.find((item) => item.id === taskId);
              if (!task) return;
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(taskId);
              editTask(task);
            }}
          />
        )}
        {activeView === "discover" && <DiscoverView />}
        {activeView === "settings" && (
          <SettingsView
            taskGapInput={taskGapInput}
            onTaskGapInputChange={setTaskGapInput}
            onTaskGapCommit={commitTaskGapInput}
            onTaskGapStep={stepTaskGap}
          />
        )}
        {activeView === "collections" && (
          <CollectionsView
            collections={collections}
            tasks={tasks}
            renderChild={(task, collection) => (
              <CompactTaskRow
                key={task.id ?? task.title}
                task={task}
                overdue={false}
                editing={editingTaskId === task.id}
                highlighted={isTaskHighlighted(task.id)}
                popping={isTaskPopping(task.id)}
                now={new Date(countdownNow)}
                parentTitle={collection.title}
                onComplete={() => requestCompleteTask(task.id)}
                onEdit={() => {
                  if (task.id) {
                    setFocusedOverflowTaskIds(null);
                    setFocusedTaskId(task.id);
                  }
                  editTask(task);
                }}
                isCurrentFocus={todayFocusTask?.id === task.id}
              />
            )}
          />
        )}
        {activeView === "plans" && (
          <PlansView
            plans={tasks
              .filter((task) => isPlanTaskType(task.type))
              .sort(compareSoftPriority)}
            tasks={tasks}
            now={new Date(countdownNow)}
            onEditPlan={(plan) => {
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(null);
              editTask(plan);
            }}
            getCompletedCount={(plan) =>
              plan.id != null ? (planCompletedCounts[plan.id] ?? 0) : 0
            }
            renderChild={(task, plan) => (
              <CompactTaskRow
                key={task.id ?? task.title}
                task={task}
                overdue={false}
                editing={editingTaskId === task.id}
                highlighted={isTaskHighlighted(task.id)}
                popping={isTaskPopping(task.id)}
                now={new Date(countdownNow)}
                parentTitle={plan.title}
                onComplete={() => requestCompleteTask(task.id)}
                onEdit={() => {
                  if (task.id) {
                    setFocusedOverflowTaskIds(null);
                    setFocusedTaskId(task.id);
                  }
                  editTask(task);
                }}
                isCurrentFocus={todayFocusTask?.id === task.id}
              />
            )}
          />
        )}
        {activeView === "lists" && (
          <ListsView
            lists={tasks.filter((task) => task.type === "list")}
            tasks={tasks}
            onEditList={(list) => {
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(null);
              editTask(list);
            }}
            renderChild={(task, list) => (
              <CompactTaskRow
                key={task.id ?? task.title}
                task={task}
                overdue={false}
                editing={editingTaskId === task.id}
                highlighted={isTaskHighlighted(task.id)}
                popping={isTaskPopping(task.id)}
                now={new Date(countdownNow)}
                parentTitle={list.title}
                onComplete={() => requestCompleteTask(task.id)}
                onEdit={() => {
                  if (task.id) {
                    setFocusedOverflowTaskIds(null);
                    setFocusedTaskId(task.id);
                  }
                  editTask(task);
                }}
                isCurrentFocus={todayFocusTask?.id === task.id}
              />
            )}
          />
        )}
        {activeView === "notebooks" && (
          <NotebooksView
            notebooks={tasks.filter((task) => task.type === "notebook")}
            tasks={tasks}
            onEditNotebook={(notebook) => {
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(null);
              editTask(notebook);
            }}
            renderChild={(task, notebook) => (
              <CompactTaskRow
                key={task.id ?? task.title}
                task={task}
                overdue={false}
                editing={editingTaskId === task.id}
                highlighted={isTaskHighlighted(task.id)}
                popping={isTaskPopping(task.id)}
                now={new Date(countdownNow)}
                parentTitle={notebook.title}
                onComplete={() => requestCompleteTask(task.id)}
                onEdit={() => {
                  if (task.id) {
                    setFocusedOverflowTaskIds(null);
                    setFocusedTaskId(task.id);
                  }
                  editTask(task);
                }}
                isCurrentFocus={todayFocusTask?.id === task.id}
              />
            )}
          />
        )}
        {activeView === "calendars" && (
          <CalendarsView
            calendars={tasks.filter((task) => task.type === "calendar")}
            tasks={tasks}
            onEditCalendar={(calendar) => {
              setFocusedOverflowTaskIds(null);
              setFocusedTaskId(null);
              editTask(calendar);
            }}
            renderChild={(task, calendar) => (
              <CompactTaskRow
                key={task.id ?? task.title}
                task={task}
                overdue={false}
                editing={editingTaskId === task.id}
                highlighted={isTaskHighlighted(task.id)}
                popping={isTaskPopping(task.id)}
                now={new Date(countdownNow)}
                parentTitle={calendar.title}
                onComplete={() => requestCompleteTask(task.id)}
                onEdit={() => {
                  if (task.id) {
                    setFocusedOverflowTaskIds(null);
                    setFocusedTaskId(task.id);
                  }
                  editTask(task);
                }}
                isCurrentFocus={todayFocusTask?.id === task.id}
              />
            )}
          />
        )}
        {(activeView === "notes" ||
          activeView === "tasks" ||
          activeView === "events" ||
          activeView === "items" ||
          activeView === "logs") &&
          (() => {
            const kindConfig = {
              notes: {
                type: "note" as const,
                title: "Notes",
                emptyText: "No notes yet. Name one in the composer.",
              },
              tasks: {
                type: "task" as const,
                title: "Tasks",
                emptyText: "No tasks yet. Describe one in the composer.",
              },
              events: {
                type: "event" as const,
                title: "Events",
                emptyText: "No events yet. Add one in the composer.",
              },
              items: {
                type: "item" as const,
                title: "Items",
                emptyText: "No items yet. Add one in the composer.",
              },
              logs: {
                type: "log" as const,
                title: "Entries",
                emptyText: "No entries yet. Log one in the composer.",
              },
            }[activeView];
            const kindItems = tasks
              .filter((task) => task.type === kindConfig.type)
              .sort(compareSoftPriority);
            return (
              <TypedKindView
                title={kindConfig.title}
                emptyText={kindConfig.emptyText}
                items={kindItems}
                renderRow={(task) => (
                  <CompactTaskRow
                    key={task.id ?? task.title}
                    task={task}
                    overdue={false}
                    editing={editingTaskId === task.id}
                    highlighted={isTaskHighlighted(task.id)}
                    popping={isTaskPopping(task.id)}
                    now={new Date(countdownNow)}
                    parentTitle={parentTitleFor(task.parent_id)}
                    onComplete={() => requestCompleteTask(task.id)}
                    onEdit={() => {
                      if (task.id) {
                        setFocusedOverflowTaskIds(null);
                        setFocusedTaskId(task.id);
                      }
                      editTask(task);
                    }}
                    isCurrentFocus={todayFocusTask?.id === task.id}
                  />
                )}
              />
            );
          })()}
        {activeView === "dayline" && (
          <div className="twineline-chrome" ref={twinelineChromeRef}>
            <div className="twineline-chrome-slot" ref={twinelineSlotRef} aria-hidden="true" />
            <header
              className={`twineline-countdown${calendarOpen ? " is-calendar-open" : ""}`}
              ref={twinelineHeaderRef}
            >
              {!calendarOpen && (
                <div className="twineline-countdown-bar">
                  <div className="twineline-menu-wrap">
                    <button
                      ref={timelineMenuButtonRef}
                      type="button"
                      className={`twineline-profile-button${timelineMenuOpen ? " is-open" : ""}`}
                      aria-label="Open profile menu"
                      aria-expanded={timelineMenuOpen}
                      aria-haspopup="dialog"
                      onClick={() => setTimelineMenuOpen((open) => !open)}
                    >
                      <span className="twineline-profile-avatar" aria-hidden="true">
                        {PROFILE_MENU_NAME.slice(0, 1)}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="twineline-date"
                    aria-label="Open calendar"
                    aria-expanded={false}
                    onClick={openCalendar}
                  >
                    <span className="twineline-date-label">
                      {selectedIsToday && (
                        <span className="date-title-calendar-icon" aria-hidden="true">
                          <CalendarIcon />
                        </span>
                      )}
                      {formatTwinelineDateLabel(selectedDay, new Date(countdownNow), {
                        weekday: true,
                        omitTodayWord: true,
                      })}
                    </span>
                  </button>
                  <span
                    ref={daylineCountdownButtonRef}
                    className="twineline-countdown-button-anchor"
                  >
                    <TwinelineCountdownButton
                      className="is-dayline-chrome"
                      countdownRemaining={countdownRemaining}
                      targetTimeLabel={targetTimeLabel}
                      windowStartLabel={formatMinutesLabel(todayWindowStartMinutes)}
                      timePickerOpen={timePickerOpen && timePickerSource === "dayline"}
                      daySnoozed={daySnoozed}
                      outsideTaskWindow={outsideTaskWindow}
                      onClick={() => toggleTimePicker("dayline")}
                    />
                  </span>
                </div>
              )}
              <div className="twineline-countdown-slide" ref={twinelineSlideRef}>
                {calendarOpen && (
                  <div className="twineline-calendar" aria-label="Choose a day">
                    <div className="twineline-calendar-header">
                      <button
                        type="button"
                        className="twineline-calendar-nav"
                        aria-label="Previous month"
                        onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="twineline-calendar-month"
                        aria-label="Close calendar"
                        onClick={closeCalendar}
                      >
                        <span>{calendarMonthLabel}</span>
                        <span className="twineline-date-chevron" aria-hidden="true">
                          ∧
                        </span>
                      </button>
                      <button
                        type="button"
                        className="twineline-calendar-nav"
                        aria-label="Next month"
                        onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}
                      >
                        ›
                      </button>
                    </div>
                    <div className="twineline-calendar-weekdays" aria-hidden="true">
                      {WEEKDAY_BUTTONS.map(({ id, label, name }) => (
                        <span key={`${id}-${name}`}>{label}</span>
                      ))}
                    </div>
                    <div className="twineline-calendar-grid">
                      {calendarDays.map((day, index) =>
                        day ? (
                          <button
                            key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                            type="button"
                            className={`twineline-calendar-day${sameCalendarDay(day, selectedDay) ? " is-selected" : ""}${sameCalendarDay(day, new Date(countdownNow)) ? " is-today" : ""}`}
                            aria-label={day.toDateString()}
                            aria-pressed={sameCalendarDay(day, selectedDay)}
                            onClick={() => selectCalendarDay(day)}
                          >
                            {day.getDate()}
                          </button>
                        ) : (
                          <span key={`empty-${index}`} className="twineline-calendar-day is-empty" />
                        ),
                      )}
                    </div>
                  </div>
                )}
                <div
                  className="twineline-schedule"
                  aria-label={`Timeline until ${formatTargetTimeLabel(selectedDayTargetTime)}`}
                >
                  <div className="twineline-schedule-track-wrap">
                    <DayScheduleTrack
                      segments={scheduleSegments}
                      timelineMinutes={scheduleTimelineMinutes}
                      elapsedPct={selectedDayElapsedPct}
                      nowMin={selectedIsToday ? nowMinutes : undefined}
                      windowStartMin={selectedDayWindowStartMinutes}
                      windowEndMin={selectedDayPackEnd}
                      focusedTaskId={focusedTaskId}
                      isTaskHighlighted={isTaskHighlighted}
                      isTaskPopping={isTaskPopping}
                      onTaskSelect={(task) => {
                        if (!task.id || isTaskPopping(task.id)) return;
                        selectTimelineTask(task.id);
                      }}
                    />
                  </div>
                </div>
              </div>
              {showTimelineScrollTop && (
                <div className="twineline-scroll-top-row">
                  <button
                    type="button"
                    className="task-view-scroll-top"
                    onClick={() => {
                      const today = toStartOfDay(new Date(countdownNow));
                      setSelectedDay(today);
                      setChromeHidden(false);
                      pendingTimelineScrollDayRef.current = null;

                      const main = mainRef.current;
                      if (main) {
                        timelineScrollSyncLockRef.current = true;
                        // Today is the first day group — scroll to the absolute top
                        // (notice / tasks), not the Overflow row at the bottom.
                        main.scrollTo({ top: 0, behavior: "smooth" });
                        window.setTimeout(() => {
                          timelineScrollSyncLockRef.current = false;
                          lastScrollTopRef.current = main.scrollTop;
                        }, 450);
                      }

                    }}
                    aria-label="Back to top"
                  >
                    Back To Top
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 19V5M6 11l6-6 6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </header>
          </div>
        )}
        {activeView !== "home" &&
          activeView !== "discover" &&
          activeView !== "settings" &&
          activeView !== "collections" &&
          activeView !== "plans" &&
          activeView !== "lists" &&
          activeView !== "notebooks" &&
          activeView !== "calendars" &&
          activeView !== "notes" &&
          activeView !== "tasks" &&
          activeView !== "events" &&
          activeView !== "items" &&
          activeView !== "logs" &&
          (tasks.length === 0 ? (
          <p className="task-list-empty">No tasks yet. Add one below.</p>
        ) : tasksCompact ? (
          <div className="task-list is-compact">
            {timelineDays.map((day) => {
              const seenTaskIds = new Set<string>();
              const isTodayGroup = day.dayKey === todayKey;
              const dayTasks = (
                isTodayGroup ? upNextPlanBlocks : day.blocks
              ).filter((block) => {
                const id = block.taskId ?? block.key;
                if (seenTaskIds.has(id)) return false;
                seenTaskIds.add(id);
                return true;
              });
              const dayOverflow = overflowForDay(day);
              const showOverdueToggle =
                activeView === "dayline" &&
                !calendarOpen &&
                dayOverflow.count > 0;
              return (
                <section
                  key={day.dayKey}
                  className="task-day-group"
                  data-calendar-day={day.dayKey}
                >
                  {!isTodayGroup && (
                    <div className="task-day-label-row">
                      <button
                        type="button"
                        className="task-day-label"
                        onClick={() => selectDayFromUi(day.date)}
                      >
                        <TwinelineDayScrollLabel
                          date={day.date}
                          now={new Date(countdownNow)}
                        />
                      </button>
                    </div>
                  )}
                  {isTodayGroup &&
                    activeView === "dayline" &&
                    !calendarOpen &&
                    renderTimelineNotices()}
                  {isTodayGroup &&
                    activeView === "dayline" &&
                    !calendarOpen &&
                    renderCurrentFocus()}
                  {isTodayGroup &&
                    showOverdueToggle &&
                    renderOverflowSection(day)}
                  {dayTasks.length > 0 && (
                    <div className="task-day-next">
                      {isTodayGroup && activeView === "dayline" && !calendarOpen && (
                        <p className="task-current-focus-label">
                          Up next
                          {upNextCountdownLabel != null && (
                            <span
                              className="task-current-focus-countdown"
                              aria-live="polite"
                            >
                              {upNextCountdownLabel}
                            </span>
                          )}
                        </p>
                      )}
                      <ul className="task-day-tasks">
                        {dayTasks.map((block) => (
                          <CompactTaskRow
                            key={block.key}
                            task={block.task}
                            overdue={block.overdue}
                            editing={editingTaskId === block.taskId}
                            highlighted={isTaskHighlighted(block.taskId)}
                            popping={isTaskPopping(block.taskId)}
                            now={new Date(countdownNow)}
                            parentTitle={parentTitleFor(block.task.parent_id)}
                            onComplete={() => requestCompleteTask(block.taskId)}
                            onEdit={() => {
                              if (block.taskId) {
                                setFocusedOverflowTaskIds(null);
                                setFocusedTaskId(block.taskId);
                              }
                              editTask(block.task);
                            }}
                            isCurrentFocus={todayFocusTask?.id === block.taskId}
                            countdownProgress={
                              block.taskId != null &&
                              overtakenCountdownByTaskId.has(block.taskId)
                                ? (overtakenCountdownByTaskId.get(block.taskId) ??
                                  null)
                                : block.taskId != null &&
                                    block.taskId === upNextCountdownTaskId
                                  ? upNextCountdownProgress
                                  : null
                            }
                            countdownBarColor={
                              block.taskId != null &&
                              (overtakenCountdownByTaskId.has(block.taskId) ||
                                (block.taskId === upNextCountdownTaskId &&
                                  upNextCountdownProgress != null))
                                ? nowSkyColor
                                : null
                            }
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                  {isTodayGroup &&
                    activeView === "dayline" &&
                    !calendarOpen &&
                    renderAtRiskSection()}
                  {!isTodayGroup &&
                    showOverdueToggle &&
                    renderOverflowSection(day)}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="calendar-timeline">
            {timelineDays.map((day) => {
              const view = buildOutsideCollapsedDayView(
                day,
                outsideExpandedByDay[day.dayKey] ?? {},
              );
              const isTodayGroup = day.dayKey === todayKey;
              const dayOverflow = overflowForDay(day);
              const showOverdueToggle =
                activeView === "dayline" &&
                !calendarOpen &&
                dayOverflow.count > 0;
              const toggleOutsideRegion = (region: OutsideRegionId) => {
                setOutsideExpandedByDay((current) => {
                  const prev = current[day.dayKey] ?? {};
                  const nextOpen = !prev[region];
                  return {
                    ...current,
                    [day.dayKey]: {
                      ...prev,
                      [region]: nextOpen,
                    },
                  };
                });
              };
              return (
              <section
                key={day.dayKey}
                className="calendar-timeline-day"
                data-calendar-day={day.dayKey}
              >
                {!isTodayGroup && (
                  <div className="task-day-label-row">
                    <button
                      type="button"
                      className="calendar-timeline-day-label"
                      onClick={() => selectDayFromUi(day.date)}
                    >
                      <TwinelineDayScrollLabel
                        date={day.date}
                        now={new Date(countdownNow)}
                      />
                    </button>
                  </div>
                )}
                {isTodayGroup &&
                  activeView === "dayline" &&
                  !calendarOpen &&
                  renderTimelineNotices()}
                {isTodayGroup &&
                  activeView === "dayline" &&
                  !calendarOpen &&
                  renderCurrentFocus()}
                {isTodayGroup &&
                  showOverdueToggle &&
                  renderOverflowSection(day)}
                <div
                  className="calendar-timeline-body"
                  style={{ height: Math.max(PX_PER_MINUTE, view.visibleDisplayPx) }}
                >
                  <div className="calendar-timeline-hours" aria-hidden="true">
                    {view.hourMarkers.map(({ hour, label, topPx }) => (
                      <div key={hour} className="calendar-timeline-hour" style={{ top: topPx }}>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="calendar-timeline-track">
                    {view.hourMarkers.map(({ hour, topPx }) => (
                      <div
                        key={`line-${hour}`}
                        className="calendar-timeline-hour-line"
                        style={{ top: topPx }}
                      />
                    ))}
                    {view.packStartTopPx != null && (
                      <div
                        className="calendar-timeline-pack-marker is-start"
                        style={{ top: view.packStartTopPx }}
                        aria-hidden="true"
                      />
                    )}
                    {view.packEndTopPx != null && (
                      <div
                        className="calendar-timeline-pack-marker is-end"
                        style={{ top: view.packEndTopPx }}
                        aria-hidden="true"
                      />
                    )}
                    {view.stubs.map((stub) => (
                  <button
                        key={`${stub.region}-${stub.collapsed ? "expand" : "collapse"}`}
                    type="button"
                        className={`calendar-timeline-outside-stub${stub.collapsed ? " is-collapsed" : " is-expanded"} is-${stub.region}`}
                        style={{ top: stub.topPx, height: stub.heightPx }}
                        aria-expanded={!stub.collapsed}
                        aria-label={
                          stub.collapsed
                            ? stub.region === "before"
                              ? `Expand time before task window (${stub.label})`
                              : `Expand time after task window (${stub.label})`
                            : stub.region === "before"
                              ? "Collapse time before task window"
                              : "Collapse time after task window"
                        }
                        onClick={() => toggleOutsideRegion(stub.region)}
                      >
                        <span className="calendar-timeline-outside-stub-label">{stub.label}</span>
                  </button>
                ))}
                    {view.blocks.map((block) => {
                      const scheduleKind = taskScheduleKind(block.task);
                      return (
                      <div
                        key={block.key}
                        data-task-id={block.taskId ?? undefined}
                        className={`calendar-timeline-block is-${scheduleKind}${editingTaskId === block.taskId ? " is-editing" : ""}${isTaskHighlighted(block.taskId) ? " is-highlighted" : ""}${block.overdue ? " is-overdue" : ""}${isTaskPopping(block.taskId) ? " is-popping" : ""}`}
                        style={{ top: block.topPx, height: block.heightPx }}
                      >
                <button
                  type="button"
                          className="calendar-timeline-block-body"
                          onClick={() => {
                            if (!block.taskId) return;
                            if (timelineMultiSelect) {
                              selectTimelineTask(block.taskId, { scroll: false });
                              return;
                            }
                            setFocusedOverflowTaskIds(null);
                            setFocusedTaskId(block.taskId);
                            editTask(block.task);
                          }}
                          aria-label={
                            timelineMultiSelect
                              ? `Select task ${block.title}`
                              : `Edit task ${block.title}`
                          }
                        >
                          <span className="calendar-timeline-block-title">{block.title}</span>
                </button>
              </div>
                      );
                    })}
          </div>
                </div>
                {!isTodayGroup &&
                  showOverdueToggle &&
                  renderOverflowSection(day)}
              </section>
              );
            })}
          </div>
        ))}
      </main>

      <nav
        ref={trayRef}
        className={`app-tray${!collapsed ? " is-composer-open" : ""}${searchOpen ? " is-search-open" : ""}`}
        aria-label="Main"
      >
        <div className="app-tray-tabs ui-glass" aria-hidden={!collapsed || searchOpen}>
          {[null, HOME_TAB, DISCOVER_TAB].map((tab) => {
            if (!tab) {
              return (
                <button
                  key="dayline"
                  type="button"
                  className={`app-tray-tab app-tray-tab-dayline${activeView === "dayline" ? " is-active" : ""}`}
                  onClick={() => selectView("dayline")}
                  tabIndex={collapsed && !searchOpen ? 0 : -1}
                  aria-label={DAYLINE_TAB.label}
                >
                  <DaylineIcon />
                </button>
              );
            }
            const { id, label, Icon } = tab;
            return (
              <button
                key={id}
                type="button"
                className={`app-tray-tab${activeView === id ? " is-active" : ""}`}
                onClick={() => {
                  setMoreMenuOpen(false);
                  selectView(id);
                }}
                tabIndex={collapsed && !searchOpen ? 0 : -1}
                aria-label={label}
              >
                <Icon />
              </button>
            );
          })}
          <div className="app-tray-more">
            <ComposerOverlayMenu
              open={moreMenuOpen && !searchOpen}
              anchorRef={moreButtonRef}
              menuRef={moreMenuRef}
              align="end"
              className="app-tray-more-menu app-compose-kind-menu"
              aria-label="More..."
            >
              <button
                type="button"
                className={`app-attach-menu-item app-compose-kind-menu-span${activeView === TEND_MENU_TOP.id ? " is-selected" : ""}`}
                role="menuitem"
                onClick={() => selectView(TEND_MENU_TOP.id)}
              >
                <TEND_MENU_TOP.Icon />
                <span>{TEND_MENU_TOP.label}</span>
              </button>
              <div
                className="app-compose-kind-menu-divider app-compose-kind-menu-divider-half"
                role="separator"
              />
              <div className="app-compose-kind-menu-columns">
                <div className="app-compose-kind-menu-column">
                  {TEND_MENU_LEFT.map(({ id, label, Icon, view }) => (
                    <button
                      key={id}
                      type="button"
                      className={`app-attach-menu-item${view != null && activeView === view ? " is-selected" : ""}`}
                      role="menuitem"
                      onClick={() => {
                        if (view != null) selectView(view);
                        else setMoreMenuOpen(false);
                      }}
                    >
                      <Icon />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div
                  className="app-compose-kind-menu-divider app-compose-kind-menu-divider-vert"
                  role="separator"
                />
                <div className="app-compose-kind-menu-column">
                  {TEND_MENU_RIGHT.map(({ id, label, Icon, view }) => (
                    <button
                      key={id}
                      type="button"
                      className={`app-attach-menu-item${view != null && activeView === view ? " is-selected" : ""}`}
                      role="menuitem"
                      onClick={() => {
                        if (view != null) selectView(view);
                        else setMoreMenuOpen(false);
                      }}
                    >
                      <Icon />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="app-compose-kind-menu-divider" role="separator" />
              <div className="app-compose-kind-menu-columns">
                <div className="app-compose-kind-menu-column">
                  <button
                    type="button"
                    className={`app-attach-menu-item${activeView === "logs" ? " is-selected" : ""}`}
                    role="menuitem"
                    onClick={() => selectView("logs")}
                  >
                    <LogIcon />
                    <span>Entries</span>
                  </button>
                </div>
                <div
                  className="app-compose-kind-menu-divider app-compose-kind-menu-divider-vert"
                  role="separator"
                />
                <div className="app-compose-kind-menu-column">
                  <button
                    type="button"
                    className="app-attach-menu-item app-tray-more-search"
                    role="menuitem"
                    onClick={openSearch}
                  >
                    <SearchIcon />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </ComposerOverlayMenu>
            <button
              ref={moreButtonRef}
              type="button"
              className={`app-tray-more-button${moreButtonActive ? " is-active" : ""}`}
              onClick={() => {
                setMoreMenuOpen((open) => !open);
              }}
              aria-label="More..."
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              tabIndex={collapsed && !searchOpen ? 0 : -1}
            >
              <span className="app-tray-more-divider" aria-hidden="true" />
              <MoreIcon />
            </button>
          </div>
        </div>
        <div
          ref={searchFieldRef}
          className="app-tray-search-field"
          aria-hidden={!searchOpen}
        >
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            autoComplete="off"
            enterKeyHint="search"
            tabIndex={searchOpen ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeSearch();
            }}
          />
          {searchOpen && (
            <button
              ref={searchButtonRef}
              type="button"
              className="app-tray-search-close"
              aria-label="Close search"
              onClick={closeSearch}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </nav>

      <form
        ref={composerRef}
        className={`app-composer${collapsed ? " is-collapsed" : ""}${attachMenuOpen ? " is-attach-open" : ""}${searchOpen ? " is-search-open" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (searchOpen) return;
          // Create never runs via form submit — only the Send button onClick.
          if (editingTaskIdRef.current == null) return;
          if (!isEditDirty) return;
          saveComposerChanges();
        }}
      >
        <div className="app-composer-dock">
          {activeView === "dayline" && collapsed && !searchOpen && (
            <button
              type="button"
              className="task-view-toggle ui-glass"
              onClick={() => {
                pendingViewPreserveChromeRef.current = true;
                pendingViewChromeHiddenRef.current = chromeHiddenRef.current;
                chromeLockRef.current = true;
                const nearest = findNearestToScheduleTrack();
                if (nearest?.type === "task") {
                  pendingViewScrollTaskIdRef.current = nearest.taskId;
                  pendingTimelineScrollDayRef.current = null;
                } else if (nearest?.type === "day") {
                  pendingViewScrollTaskIdRef.current = null;
                  pendingTimelineScrollDayRef.current = nearest.day;
                  setSelectedDay(nearest.day);
                } else {
                  pendingViewScrollTaskIdRef.current = null;
                  pendingTimelineScrollDayRef.current = toStartOfDay(selectedDay);
                }
                setTasksCompact((compact) => !compact);
              }}
              aria-label={tasksCompact ? "Expand task list" : "Compact task list"}
              aria-pressed={tasksCompact}
              tabIndex={0}
            >
              {tasksCompact ? <TaskViewExpandIcon /> : <TaskViewCollapseIcon />}
            </button>
          )}
          <button
            ref={fabRef}
            type="button"
            className={`app-composer-fab app-composer-fab--toggle${collapsed ? "" : " is-hidden"}`}
            onClick={openComposer}
            aria-label={`Add ${fabComposeKind.label.toLowerCase()}`}
            tabIndex={collapsed ? 0 : -1}
            {...(!collapsed ? { inert: true } : {})}
          >
            <ComposeAddIcon Icon={FabComposeIcon} />
          </button>

          <div
            ref={composerFieldRef}
            className="app-composer-field ui-outer-fade"
            aria-hidden={collapsed}
            {...(collapsed ? { inert: true } : {})}
          >
            <button
              type="button"
              className="app-composer-collapse"
              onClick={requestCloseComposer}
              aria-label="Collapse input"
              tabIndex={collapsed ? -1 : 0}
            >
              <CloseIcon />
            </button>
            <div className="app-composer-focus-controls">
              {editingTaskId != null ? (
                <button
                  type="button"
                  className="app-composer-delete-btn"
                  aria-label="Delete"
                  tabIndex={collapsed ? -1 : 0}
                  onClick={() => requestDeleteTask(editingTaskId)}
                >
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  className="app-composer-delete-btn"
                  aria-label="Cancel"
                  tabIndex={collapsed ? -1 : 0}
                  onClick={requestCloseComposer}
                >
                  Cancel
                </button>
              )}
              {(composeKind === "task" ||
                composeKind === "item" ||
                composeKind === "event") && (
                <button
                  type="button"
                  className={`app-composer-pivot-btn${hasText ? " is-ready" : ""}`}
                  aria-label="Pivot"
                  tabIndex={collapsed ? -1 : 0}
                  onClick={() => runAutomaticOverflowReschedule(todayKeyStr)}
                >
                  <IntelligenceIcon />
                  Pivot
                </button>
              )}
              {(composeKind === "task" ||
                composeKind === "item" ||
                composeKind === "event") &&
                renderCurrentFocusControls(
                  editingTaskId != null ? content : null,
                )}
            </div>
            {showComposerTaskRowChrome ? (
              <div className={`task-row is-${composerScheduleKind} app-composer-task-row`}>
                <div className="task-row-primary">
                  {(composerHasTopMeta || composerHasImpact) && (
                    <div className="task-row-top">
                      <span className="task-row-top-meta">
                        {composerPreviewScheduleLabel != null ? (
                          <button
                            type="button"
                            className={`task-row-schedule app-composer-meta-chip${
                              composerScheduleAuto ? " is-auto" : ""
                            }`}
                            tabIndex={collapsed ? -1 : 0}
                            aria-label="Date & Time"
                            aria-expanded={taskToolHint === "Date & Time"}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={openComposerScheduleTool}
                          >
                            {composerPreviewScheduleLabel}
                          </button>
                        ) : composerShowUrgency ? (
                          <button
                            type="button"
                            className={`task-row-urgency app-composer-meta-chip${
                              composerUrgencyAuto ? " is-auto" : ""
                            }`}
                            tabIndex={collapsed ? -1 : 0}
                            aria-label="Date & Time"
                            aria-expanded={taskToolHint === "Date & Time"}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={openComposerScheduleTool}
                          >
                            {composerUrgencyLabel}
                          </button>
                        ) : null}
                        {composerIsRecurring && (
                          <button
                            type="button"
                            className={`task-row-recurring app-composer-meta-chip${
                              composerRecurringAuto ? " is-auto" : ""
                            }`}
                            tabIndex={collapsed ? -1 : 0}
                            aria-label="Repeat"
                            aria-expanded={recurringMenuOpen}
                            title="Repeats"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={openComposerRecurringTool}
                          >
                            <CycleIcon />
                          </button>
                        )}
                      </span>
                      {composerHasImpact && (
                        <button
                          type="button"
                          className={`task-row-impact app-composer-meta-chip${
                            composerImpactAuto ? " is-auto" : ""
                          }`}
                          tabIndex={collapsed ? -1 : 0}
                          aria-label={`Impact ${composerImpactValue} of ${IMPACT_MAX}`}
                          title={`Impact ${composerImpactValue}`}
                          aria-expanded={impactMenuOpen}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={openComposerImpactTool}
                        >
                          <span className="task-row-impact-track" aria-hidden="true">
                            <span
                              className="task-row-impact-fill"
                              style={{ width: `${composerImpactPercent}%` }}
                            />
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="task-row-content">
                    <div className="task-row-content-main">
                      <div className="task-row-main app-composer-field-row">
                        <textarea
                          ref={composeInputRef}
                          rows={1}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder={composePlaceholder}
                          enterKeyHint="enter"
                          autoComplete="off"
                          tabIndex={collapsed ? -1 : 0}
                        />
                      </div>
                    </div>
                  </div>
                  {composerHasParent && (
                    <div className="task-row-bottom">
                      <button
                        type="button"
                        className={`task-row-parent app-composer-meta-chip${
                          composerParentAuto ? " is-auto" : ""
                        }`}
                        tabIndex={collapsed ? -1 : 0}
                        aria-label="Linking"
                        aria-expanded={taskToolHint === LINKING_TOOL_HINT}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={openComposerLinkingTool}
                      >
                        <span className="task-row-parent-name">{composerParentTitle}</span>
                        <LinkIcon />
                      </button>
                    </div>
                  )}
                </div>
                <div className="task-row-rail">
                  <button
                    type="button"
                    className={`task-row-type-label app-composer-meta-chip${
                      composerTypeAuto ? " is-auto" : ""
                    }`}
                    tabIndex={collapsed ? -1 : 0}
                    aria-label="Compose type"
                    aria-expanded={composeKindMenuOpen}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={openComposerTypeTool}
                  >
                    {composerTypeLabel}
                  </button>
                  {composerDurationLabel != null ? (
                    <span className="task-row-duration-slot">
                      <button
                        type="button"
                        className={`task-row-duration app-composer-meta-chip${
                          composerDurationAuto ? " is-auto" : ""
                        }`}
                        tabIndex={collapsed ? -1 : 0}
                        aria-label="Time"
                        aria-expanded={durationMenuOpen}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={openComposerDurationTool}
                      >
                        {composerDurationLabel}
                      </button>
                    </span>
                  ) : (
                    <span className="task-row-rail-spacer" aria-hidden="true" />
                  )}
                </div>
              </div>
            ) : (
              <div className="app-composer-field-row">
                <textarea
                  ref={composeInputRef}
                  rows={1}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={composePlaceholder}
                  enterKeyHint="enter"
                  autoComplete="off"
                  tabIndex={collapsed ? -1 : 0}
                />
              </div>
            )}
            {recurringSchedulePromptOpen && (
              <div
                className="twineline-save-prompt"
                role="dialog"
                aria-label="Change Schedule For..."
              >
                <button
                  type="button"
                  className="twineline-save-prompt-dismiss"
                  onClick={() => setRecurringSchedulePromptOpen(false)}
                  aria-label="Cancel and keep editing"
                >
                  <CloseIcon />
                </button>
                <p className="twineline-save-prompt-title">Change Schedule For...</p>
                <div className="twineline-save-prompt-actions">
                  <button
                    type="button"
                    className="twineline-save-prompt-secondary"
                    onClick={applyRecurringScheduleJustThisOnce}
                  >
                    Just This Once
                  </button>
                  <button
                    type="button"
                    className="twineline-save-prompt-primary"
                    onClick={applyRecurringScheduleAllFuture}
                  >
                    All Future Tasks
                  </button>
                </div>
              </div>
            )}
            <div className="app-composer-tools">
              <div className="app-composer-tools-left">
                <div className="app-composer-attach">
                  <ComposerOverlayMenu
                    open={attachMenuOpen}
                    anchorRef={attachButtonRef}
                    menuRef={attachMenuRef}
                    aria-label="Add options"
                  >
                    <button
                      type="button"
                      className={`app-attach-menu-item${aiEnabled ? "" : " is-disabled"}`}
                      role="menuitem"
                      aria-disabled={!aiEnabled}
                      disabled={!aiEnabled}
                    >
                      <CameraIcon />
                      <span className="app-attach-menu-label">Take a picture</span>
                      {!aiEnabled && (
                        <span className="app-attach-premium" aria-label="Premium feature">
                          <PremiumIcon />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`app-attach-menu-item${aiEnabled ? "" : " is-disabled"}`}
                      role="menuitem"
                      aria-disabled={!aiEnabled}
                      disabled={!aiEnabled}
                    >
                      <PhotoIcon />
                      <span className="app-attach-menu-label">Add a photo</span>
                      {!aiEnabled && (
                        <span className="app-attach-premium" aria-label="Premium feature">
                          <PremiumIcon />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`app-attach-menu-item app-attach-menu-ai${aiEnabled ? " is-on" : " is-disabled"}`}
                      role="menuitem"
                      aria-disabled={!aiEnabled}
                      disabled={!aiEnabled}
                      aria-label={aiEnabled ? "AI Assistant - on" : "AI Assistant - off"}
                    >
                      <span className={`app-attach-ai-dot${aiEnabled ? " is-on" : ""}`} aria-hidden="true" />
                      <span className="app-attach-menu-label">
                        {aiEnabled ? "AI Assistant - on" : "AI Assistant - off"}
                      </span>
                      <span className="app-attach-premium" aria-label="Premium feature">
                        <PremiumIcon />
                      </span>
                    </button>
                    <div className="app-attach-menu-footer">
                      <button type="button" className="app-attach-trial-button">
                        Try These Features!
                      </button>
                      <p className="app-attach-trial-note">free for 7 days</p>
                    </div>
                  </ComposerOverlayMenu>
                  <button
                    ref={attachButtonRef}
                    type="button"
                    className="app-composer-icon"
                    onClick={() => {
                      setComposeKindMenuOpen(false);
                      setDurationMenuOpen(false);
                                            setImpactMenuOpen(false);
                      closeTaskToolHint();
                      setAttachMenuOpen((open) => !open);
                    }}
                    aria-label={attachMenuOpen ? "Close add menu" : "Open add menu"}
                    aria-expanded={attachMenuOpen}
                    tabIndex={collapsed ? -1 : 0}
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div className="app-composer-tools-center" ref={toolsCenterRef}>
                <div className="app-composer-tools-center-inner">
                <ComposerOverlayMenu
                  open={taskToolHint != null}
                  anchorRef={taskToolHintAnchorRef}
                  menuRef={taskToolHintMenuRef}
                  matchWidthRef={
                    taskToolHint === LINKING_TOOL_HINT || taskToolHint === "Date & Time"
                      ? composerFieldRef
                      : undefined
                  }
                  role={taskToolHint === "Date & Time" ? "dialog" : "menu"}
                  className={`app-composer-tool-hint${
                    taskToolHint === "Date & Time"
                      ? " is-due-date"
                      : taskToolHint === LINKING_TOOL_HINT
                        ? " is-linking"
                        : ""
                  }`}
                  aria-label={taskToolHint ?? "Tool info"}
                >
                  {taskToolHint === "Date & Time" ? (
                    <>
                      <p className="app-composer-tool-hint-title">URGENCY</p>
                      <div className="app-due-date-fields">
                        {(() => {
                          const todayKeyValue = dayKey(
                            toStartOfDay(new Date(countdownNow)),
                          );
                          const timeModeOptions = [
                            { id: "due_at", label: "Due by" },
                            { id: "starts_at", label: "Starts on" },
                          ] as const;
                          const urgencyOptions = [
                            { id: "ASAP", label: "ASAP" },
                            { id: "Soon", label: "Soon" },
                            { id: "Later", label: "Later" },
                            { id: "Future", label: "Future" },
                          ] as const;
                          const hasTime = Boolean(taskTimeValue.trim());
                          const hasSchedule =
                            Boolean(taskDate.trim()) || hasTime;
                          return (
                            <>
                              <div className="app-due-date-selector">
                                <div className="app-due-date-schedule">
                                  <div className="app-due-date-schedule-inner">
                                    <label className="app-due-date-field">
                                      <span className="app-due-date-field-label">Date</span>
                                      <div className="app-due-date-input-wrap">
                                        <input
                                          ref={taskDateInputRef}
                                          type="date"
                                          value={taskDate}
                                          onChange={(event) =>
                                            setTaskDateValue(event.target.value)
                                          }
                                          onInput={(event) =>
                                            setTaskDateValue(event.currentTarget.value)
                                          }
                                          {...bindNativeDateTimePicker(
                                            datePickerOpenRef,
                                            datePickerClosingRef,
                                          )}
                                          aria-label="Task date"
                                        />
                                        {taskDate.trim() !== "" && (
                                          <button
                                            type="button"
                                            className="app-due-date-clear"
                                            aria-label="Clear date"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              setTaskDateValue("");
                                              if (taskDateInputRef.current) {
                                                taskDateInputRef.current.value = "";
                                                taskDateInputRef.current.blur();
                                              }
                                              datePickerOpenRef.current = false;
                                            }}
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </div>
                              <div className="app-due-date-selector">
                                <div className="app-due-date-schedule">
                                  <div className="app-due-date-schedule-inner">
                                    <label className="app-due-date-field">
                                      <span className="app-due-date-field-label">Time</span>
                                      <div className="app-due-date-input-wrap">
                                        <input
                                          ref={taskTimeInputRef}
                                          type="time"
                                          value={taskTimeValue}
                                          onChange={(event) =>
                                            setTaskTimeValue(event.target.value)
                                          }
                                          onInput={(event) =>
                                            setTaskTimeValue(event.currentTarget.value)
                                          }
                                          {...bindNativeDateTimePicker(
                                            timePickerOpenRef,
                                            timePickerClosingRef,
                                          )}
                                          aria-label="Task time"
                                        />
                                        {taskTimeValue.trim() !== "" && (
                                          <button
                                            type="button"
                                            className="app-due-date-clear"
                                            aria-label="Clear time"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              setTaskTimeValue("");
                                              if (taskTimeInputRef.current) {
                                                taskTimeInputRef.current.value = "";
                                                taskTimeInputRef.current.blur();
                                              }
                                              timePickerOpenRef.current = false;
                                            }}
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    </label>
                                    {hasTime && (
                                      <div className="app-due-date-option-row">
                                        <div
                                          className="app-due-date-urgency-options"
                                          role="group"
                                          aria-label="Time mode"
                                        >
                                          {timeModeOptions.map((option) => {
                                            const isActive = taskTimeMode === option.id;
                                            return (
                                              <button
                                                key={option.id}
                                                type="button"
                                                className={`app-due-date-urgency-button${
                                                  isActive ? " is-active" : ""
                                                }`}
                                                aria-pressed={isActive}
                                                onClick={() => {
                                                  setUrgencyActivated(false);
                                                  if (!taskDate.trim()) {
                                                    setTaskDateValue(todayKeyValue);
                                                  }
                                                  setTaskTimeModeValue(option.id);
                                                }}
                                              >
                                                {option.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="app-due-date-selector">
                                <div className="app-due-date-option-row">
                                  <div
                                    className="app-due-date-urgency-options"
                                    role="group"
                                    aria-label="Urgency"
                                  >
                                    {urgencyOptions.map((option) => {
                                      const isActive =
                                        urgencyActivated &&
                                        urgency === option.id &&
                                        !hasSchedule;
                                      return (
                                        <button
                                          key={option.id}
                                          type="button"
                                          className={`app-due-date-urgency-button${
                                            isActive ? " is-active" : ""
                                          }`}
                                          aria-pressed={isActive}
                                          onClick={() => {
                                            clearTaskDueDate();
                                            clearEditingTaskSchedule();
                                            if (taskDateInputRef.current) {
                                              taskDateInputRef.current.value = "";
                                            }
                                            if (taskTimeInputRef.current) {
                                              taskTimeInputRef.current.value = "";
                                            }
                                            setUrgency(option.id);
                                            setUrgencyActivated(true);
                                          }}
                                        >
                                          {option.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </>
                  ) : taskToolHint === LINKING_TOOL_HINT && isLinkingToolComposeKind(composeKind) ? (
                    <>
                      <div className="app-composer-link-header">
                        <span className="app-composer-link-search-label">
                          {linkQuickAddOpen ? "Quick add" : "Link with"}
                        </span>
                        <button
                          type="button"
                          className={`app-composer-link-quick-add-toggle${linkQuickAddOpen ? " is-open" : ""}`}
                          aria-label={linkQuickAddOpen ? "Cancel add collection" : "Add new collection"}
                          aria-expanded={linkQuickAddOpen}
                          onClick={() => {
                            if (linkQuickAddOpen) {
                              setLinkQuickAddOpen(false);
                              resetLinkQuickAddFields();
                              return;
                            }
                            setLinkQuickAddKindMenuOpen(false);
                            setLinkQuickAddOpen(true);
                            queueMicrotask(() => linkQuickAddInputRef.current?.focus());
                          }}
                        >
                          {linkQuickAddOpen ? <CloseIcon /> : <PlusIcon />}
                        </button>
                      </div>
                      {linkQuickAddOpen && (
                        <div className="app-composer-link-quick-add">
                          <input
                            ref={linkQuickAddInputRef}
                            type="text"
                            className="app-composer-link-quick-add-input"
                            value={linkQuickAddTitle}
                            onChange={(e) => setLinkQuickAddTitle(e.target.value)}
                            placeholder={`Name this ${selectedLinkQuickAddType.label.toLowerCase()}...`}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                if (linkQuickAddTitle.trim()) submitLinkQuickAdd();
                              }
                            }}
                          />
                          <div className="app-composer-link-quick-add-toolbar">
                            <div className="app-composer-link-quick-add-tools">
                              <div className="app-composer-link-quick-add-tools-inner">
                              <div className="app-composer-link-qa-schedule">
                                <ComposerOverlayMenu
                                  open={linkQaScheduleMenuOpen}
                                  anchorRef={linkQaScheduleButtonRef}
                                  menuRef={linkQaScheduleMenuRef}
                                  align="start"
                                  className="app-duration-menu app-composer-link-qa-schedule-menu"
                                  aria-label="Date & Time"
                                >
                                  <p className="app-duration-title">Date & Time</p>
                                  <div className="app-duration-divider" aria-hidden="true" />
                                  <label className="app-due-date-field">
                                    <span>Date</span>
                                    <input
                                      type="date"
                                      value={linkQaDate}
                                      onChange={(e) => setLinkQaDate(e.target.value)}
                                    />
                                  </label>
                                  <div
                                    className="app-duration-unit app-duration-unit-triple"
                                    role="group"
                                    aria-label="Time mode"
                                  >
                                    <button
                                      type="button"
                                      className={`app-duration-unit-button${
                                        linkQaTimeMode === "starts_at" ? " is-active" : ""
                                      }`}
                                      aria-pressed={linkQaTimeMode === "starts_at"}
                                      onClick={() => setLinkQaTimeMode("starts_at")}
                                    >
                                      Starts
                                    </button>
                                    <button
                                      type="button"
                                      className={`app-duration-unit-button${
                                        linkQaTimeMode === "due_at" ? " is-active" : ""
                                      }`}
                                      aria-pressed={linkQaTimeMode === "due_at"}
                                      onClick={() => setLinkQaTimeMode("due_at")}
                                    >
                                      Due
                                    </button>
                                  </div>
                                  <label className="app-due-date-field">
                                    <span>Time</span>
                                    <input
                                      type="time"
                                      value={
                                        linkQaTimeMode === "starts_at" ? linkQaStartsAt : linkQaDueAt
                                      }
                                      onChange={(e) => {
                                        if (linkQaTimeMode === "starts_at") {
                                          setLinkQaStartsAt(e.target.value);
                                        } else {
                                          setLinkQaDueAt(e.target.value);
                                        }
                                      }}
                                    />
                                  </label>
                                </ComposerOverlayMenu>
                                <button
                                  ref={linkQaScheduleButtonRef}
                                  type="button"
                                  className={`app-composer-tool app-composer-tool-schedule${
                                    linkQaDate || linkQaStartsAt || linkQaDueAt
                                      ? " is-activated"
                                      : ""
                                  }${linkQaScheduleMenuOpen ? " is-open" : ""}`}
                                  aria-label="Date & Time"
                                  aria-expanded={linkQaScheduleMenuOpen}
                                  onClick={() => {
                                    setLinkQaUrgencyMenuOpen(false);
                                    setLinkQaImpactMenuOpen(false);
                                    setLinkQuickAddKindMenuOpen(false);
                                    setLinkQaScheduleMenuOpen((open) => !open);
                                  }}
                                >
                    <CalendarIcon />
                  </button>
                              </div>
                              <div className="app-composer-link-qa-impact">
                                <ComposerOverlayMenu
                                  open={linkQaImpactMenuOpen}
                                  anchorRef={linkQaImpactButtonRef}
                                  menuRef={linkQaImpactMenuRef}
                                  align="start"
                                  className="app-impact-menu"
                                  aria-label="Impact"
                                >
                                  <p className="app-impact-title">Impact</p>
                                  <div className="app-impact-divider" aria-hidden="true" />
                                  <p className="app-impact-value" aria-live="polite">
                                    {linkQaImpact}
                                  </p>
                                  <div className="app-impact-stepper">
                                    <button
                                      type="button"
                                      className="app-duration-step"
                                      aria-label="Decrease impact"
                                      onClick={() =>
                                        setLinkQaImpact((value) => clampImpact(value - 1))
                                      }
                                    >
                                      −
                                    </button>
                                    <input
                                      type="range"
                                      className="app-impact-slider"
                                      min={IMPACT_MIN}
                                      max={IMPACT_MAX}
                                      step={1}
                                      value={linkQaImpact}
                                      style={{
                                        ["--impact-fill" as string]: `${(linkQaImpact / IMPACT_MAX) * 100}%`,
                                      }}
                                      aria-label="Impact score"
                                      onChange={(e) => {
                                        setLinkQaImpact(clampImpact(Number(e.target.value)));
                                        setLinkQaImpactActivated(true);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="app-duration-step"
                                      aria-label="Increase impact"
                                      onClick={() =>
                                        setLinkQaImpact((value) => clampImpact(value + 1))
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </ComposerOverlayMenu>
                                <button
                                  ref={linkQaImpactButtonRef}
                                  type="button"
                                  className={`app-composer-tool app-composer-tool-accent${
                                    linkQaImpactActivated ? " is-activated" : ""
                                  }${linkQaImpactMenuOpen ? " is-open" : ""}`}
                                  aria-label="Impact"
                                  aria-expanded={linkQaImpactMenuOpen}
                                  onClick={() => {
                                    setLinkQaScheduleMenuOpen(false);
                                    setLinkQaUrgencyMenuOpen(false);
                                    setLinkQuickAddKindMenuOpen(false);
                                    setLinkQaImpactActivated(true);
                                    setLinkQaImpactMenuOpen((open) => !open);
                                  }}
                                >
                                  <ImpactIcon />
                                </button>
                              </div>
                              <div className="app-composer-link-qa-urgency">
                                <ComposerOverlayMenu
                                  open={linkQaUrgencyMenuOpen}
                                  anchorRef={linkQaUrgencyButtonRef}
                                  menuRef={linkQaUrgencyMenuRef}
                                  align="start"
                                  className="app-urgency-menu"
                                  aria-label="Urgency"
                                >
                                  <p className="app-urgency-title">Urgency</p>
                                  <div className="app-urgency-divider" aria-hidden="true" />
                                  {URGENCY_OPTIONS.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      className={`app-attach-menu-item app-urgency-menu-item${
                                        linkQaUrgency === option ? " is-selected" : ""
                                      }`}
                                      role="menuitemradio"
                                      aria-checked={linkQaUrgency === option}
                                      onClick={() => {
                                        setLinkQaUrgency(option);
                                        setLinkQaUrgencyActivated(true);
                                        setLinkQaUrgencyMenuOpen(false);
                                      }}
                                    >
                                      <span>{option}</span>
                                    </button>
                                  ))}
                                </ComposerOverlayMenu>
                                <button
                                  ref={linkQaUrgencyButtonRef}
                                  type="button"
                                  className={`app-composer-tool app-composer-tool-accent${
                                    linkQaUrgencyActivated ? " is-activated" : ""
                                  }${linkQaUrgencyMenuOpen ? " is-open" : ""}`}
                                  aria-label="Urgency"
                                  aria-expanded={linkQaUrgencyMenuOpen}
                                  onClick={() => {
                                    setLinkQaScheduleMenuOpen(false);
                                    setLinkQaImpactMenuOpen(false);
                                    setLinkQuickAddKindMenuOpen(false);
                                    setLinkQaUrgencyActivated(true);
                                    setLinkQaUrgencyMenuOpen((open) => !open);
                                  }}
                                >
                                  <UrgencyIcon />
                                </button>
                              </div>
                              </div>
                            </div>
                            <div className="app-compose-action app-composer-link-quick-add-type">
                              <ComposerOverlayMenu
                                open={linkQuickAddKindMenuOpen}
                                anchorRef={linkQuickAddKindButtonRef}
                                menuRef={linkQuickAddKindMenuRef}
                                align="end"
                                className="app-compose-kind-menu"
                                aria-label="Collection type"
                              >
                                {COMPOSE_CONTAINER_TYPE_ITEMS.map(({ id, label, Icon }) => (
                                  <button
                                    key={id}
                                    type="button"
                                    className={`app-attach-menu-item${
                                      linkQuickAddKind === id ? " is-selected" : ""
                                    }`}
                                    role="menuitem"
                                    onClick={() => {
                                      setLinkQuickAddKind(id);
                                      setLinkQuickAddKindMenuOpen(false);
                                    }}
                                  >
                                    <Icon />
                                    <span>{label}</span>
                                  </button>
                                ))}
                              </ComposerOverlayMenu>
                              <button
                                ref={linkQuickAddKindButtonRef}
                                type="button"
                                className="app-compose-kind-button"
                                aria-label="Choose collection type"
                                aria-expanded={linkQuickAddKindMenuOpen}
                                onClick={() => {
                                  setLinkQaScheduleMenuOpen(false);
                                  setLinkQaImpactMenuOpen(false);
                                  setLinkQaUrgencyMenuOpen(false);
                                  setLinkQuickAddKindMenuOpen((open) => !open);
                                }}
                              >
                                <span>{selectedLinkQuickAddType.label}</span>
                              </button>
                              <button
                                type="button"
                                className={`app-composer-icon app-composer-add${
                                  linkQuickAddTitle.trim() ? " is-ready" : ""
                                }`}
                                aria-label={
                                  linkQuickAddTitle.trim() ? "Add collection" : "Choose collection type"
                                }
                                aria-expanded={
                                  linkQuickAddTitle.trim() ? undefined : linkQuickAddKindMenuOpen
                                }
                                onClick={() => {
                                  if (linkQuickAddTitle.trim()) {
                                    submitLinkQuickAdd();
                                    return;
                                  }
                                  setLinkQaScheduleMenuOpen(false);
                                  setLinkQaImpactMenuOpen(false);
                                  setLinkQaUrgencyMenuOpen(false);
                                  setLinkQuickAddKindMenuOpen((open) => !open);
                                }}
                              >
                                {linkQuickAddTitle.trim() ? (
                                  <SendIcon />
                                ) : (
                                  <ComposeAddIcon Icon={SelectedLinkQuickAddIcon} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {!linkQuickAddOpen && (
                      <>
                      <div className="app-composer-link-list" role="listbox" aria-label="Link targets">
                        {(() => {
                          type LinkItem = { id: string; label: string; kindLabel: string };
                          const linkItems: LinkItem[] = [];
                          const pushCollections = () => {
                            for (const collection of collections) {
                              if (!collection.id) continue;
                              linkItems.push({
                                id: collection.id,
                                label: collection.title,
                                kindLabel: "Collection",
                              });
                            }
                          };
                          const pushTasks = (typeFilter: LinkPickerType | "any") => {
                            for (const task of tasks) {
                              if (!task.id) continue;
                              if (typeFilter === "any") {
                                // keep all
                              } else if (typeFilter === "task") {
                                if (task.type != null && task.type !== "task") continue;
                              } else if (task.type !== typeFilter) {
                                continue;
                              }
                              const kindLabel =
                                typeFilter === "any"
                                  ? task.type === "note"
                                    ? "Note"
                                    : task.type === "event"
                                      ? "Event"
                                      : task.type === "item"
                                        ? "Item"
                                        : isPlanTaskType(task.type)
                                          ? "Plan"
                                          : task.type === "list"
                                            ? "List"
                                            : isCollectionTaskType(task.type)
                                              ? "Collection"
                                              : "Task"
                                  : selectedLinkContainerType.label;
                              linkItems.push({
                                id: task.id,
                                label: task.title,
                                kindLabel,
                              });
                            }
                          };
                          if (linkContainerType === "all") {
                            pushCollections();
                            pushTasks("any");
                          } else if (linkContainerType === "collection") {
                            pushCollections();
                          } else if (
                            linkContainerType === "task" ||
                            linkContainerType === "note" ||
                            linkContainerType === "event" ||
                            linkContainerType === "item" ||
                            linkContainerType === "plan" ||
                            linkContainerType === "list"
                          ) {
                            pushTasks(linkContainerType);
                          }
                          const query = linkSearchQuery.trim().toLowerCase();
                          let filteredItems =
                            query.length === 0
                              ? linkItems
                              : linkItems.filter((item) =>
                                  item.label.toLowerCase().includes(query),
                                );
                          // Most recently linked first within the active type filter
                          // (All = across every kind; Tasks/Plans/etc. = that kind only).
                          const rank = new Map(
                            recentLinkIds.map((id, index) => [id, index]),
                          );
                          filteredItems = [...filteredItems].sort((a, b) => {
                            const aRank = rank.get(a.id);
                            const bRank = rank.get(b.id);
                            if (aRank == null && bRank == null) return 0;
                            if (aRank == null) return 1;
                            if (bRank == null) return -1;
                            return aRank - bRank;
                          });
                          if (filteredItems.length === 0) {
                            const emptyKind = selectedLinkContainerType.label.toLowerCase();
                            const emptyLabel =
                              linkContainerType === "all"
                                ? "No items yet"
                                : `No ${emptyKind}${emptyKind.endsWith("s") ? "" : "s"} yet`;
                            return (
                              <p className="app-composer-tool-hint-empty">
                                {linkItems.length === 0 ? emptyLabel : "No matches"}
                              </p>
                            );
                          }
                          return filteredItems.map((item) => (
                            <button
                              key={`${item.kindLabel}:${item.id}`}
                              type="button"
                              className={`app-attach-menu-item${
                                (linkRelation === "child" && pendingChildId === item.id) ||
                                (linkRelation !== "child" && pendingParentId === item.id)
                                  ? " is-selected"
                                  : ""
                              }`}
                              role="option"
                              aria-selected={
                                (linkRelation === "child" && pendingChildId === item.id) ||
                                (linkRelation !== "child" && pendingParentId === item.id)
                              }
                              onClick={() => {
                                if (linkRelation === "child") {
                                  const next = pendingChildId === item.id ? null : item.id;
                                  const previousChildId = pendingChildId;
                                  setPendingChildId(next);
                                  setLinkPrecedence(null);
                                  applyChildLinkToEditingTask(next, previousChildId);
                                  if (next != null) {
                                    setRecentLinkIds((current) =>
                                      rememberRecentLinkId(next, current),
                                    );
                                    closeTaskToolHint();
                                  }
                                } else {
                                  const next = pendingParentId === item.id ? null : item.id;
                                  const nextPrecedence =
                                    linkRelation === "cycle" && next != null
                                      ? (linkPrecedence ?? "before")
                                      : null;
                                  setPendingParentId(next);
                                  setPendingChildId(null);
                                  setLinkPrecedence(nextPrecedence);
                                  applyParentLinkToEditingTask(next, nextPrecedence);
                                  if (next != null) {
                                    setRecentLinkIds((current) =>
                                      rememberRecentLinkId(next, current),
                                    );
                                    closeTaskToolHint();
                                  }
                                }
                              }}
                            >
                              <span className="app-composer-link-item-label">{item.label || "Untitled"}</span>
                              <span className="app-composer-link-item-kind">{item.kindLabel}</span>
                            </button>
                          ));
                        })()}
                      </div>
                      <div className="app-composer-link-search-row">
                        <label className="app-composer-link-search">
                          <input
                            type="search"
                            value={linkSearchQuery}
                            onChange={(e) => setLinkSearchQuery(e.target.value)}
                            placeholder="Search..."
                            aria-label="Search link targets"
                            autoComplete="off"
                            enterKeyHint="search"
                          />
                        </label>
                        <div className="app-compose-action app-composer-link-type-picker">
                          <ComposerOverlayMenu
                            open={linkContainerTypeMenuOpen}
                            anchorRef={linkContainerTypeButtonRef}
                            menuRef={linkContainerTypeMenuRef}
                            align="end"
                            className="app-compose-kind-menu"
                            aria-label="Link type"
                          >
                            {LINK_ITEM_TYPE_ITEMS.map(({ id, label, Icon }) => (
                              <button
                                key={id}
                                type="button"
                                className={`app-attach-menu-item${linkContainerType === id ? " is-selected" : ""}`}
                                role="menuitem"
                                onClick={() => {
                                  setLinkContainerType(id);
                                  setLinkContainerTypeMenuOpen(false);
                                }}
                              >
                                <Icon />
                                <span>{label}</span>
                              </button>
                            ))}
                            <div className="app-compose-kind-menu-divider" role="separator" />
                            {LINK_CONTAINER_TYPE_ITEMS.map(({ id, label, Icon }) => (
                              <button
                                key={id}
                                type="button"
                                className={`app-attach-menu-item${linkContainerType === id ? " is-selected" : ""}`}
                                role="menuitem"
                                onClick={() => {
                                  setLinkContainerType(id);
                                  setLinkContainerTypeMenuOpen(false);
                                }}
                              >
                                <Icon />
                                <span>{label}</span>
                              </button>
                            ))}
                            <div className="app-compose-kind-menu-divider" role="separator" />
                            <button
                              type="button"
                              className={`app-attach-menu-item${linkContainerType === "all" ? " is-selected" : ""}`}
                              role="menuitem"
                              onClick={() => {
                                setLinkContainerType("all");
                                setLinkContainerTypeMenuOpen(false);
                              }}
                            >
                              <LINK_ALL_TYPE_ITEM.Icon />
                              <span>{LINK_ALL_TYPE_ITEM.label}</span>
                            </button>
                          </ComposerOverlayMenu>
                          <button
                            ref={linkContainerTypeButtonRef}
                            type="button"
                            className="app-compose-kind-button"
                            aria-label="Choose link type"
                            aria-expanded={linkContainerTypeMenuOpen}
                            onClick={() => setLinkContainerTypeMenuOpen((open) => !open)}
                          >
                            <span>{selectedLinkContainerType.label}</span>
                            <span className="app-compose-kind-lead-icon" aria-hidden="true">
                              <SelectedLinkContainerIcon />
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="app-duration-divider" aria-hidden="true" />
                      <div className="app-composer-link-footer">
                        <span className="app-composer-link-type-lead">As a</span>
                        <button
                          type="button"
                          className="app-composer-link-toggle"
                          aria-label={`Link as ${LINK_RELATION_LABEL[linkRelation]}; press to switch`}
                          onClick={() => {
                            const next =
                              LINK_RELATIONS[
                                (LINK_RELATIONS.indexOf(linkRelation) + 1) % LINK_RELATIONS.length
                              ]!;
                            setLinkRelation(next);
                            if (next === "cycle") {
                              const precedence = linkPrecedence ?? "before";
                              setLinkPrecedence(precedence);
                              if (pendingParentId != null) {
                                applyParentLinkToEditingTask(pendingParentId, precedence);
                              }
                            } else {
                              setLinkPrecedence(null);
                              if (next === "parent" && pendingParentId != null) {
                                applyParentLinkToEditingTask(pendingParentId, null);
                              }
                            }
                          }}
                        >
                          <span>{LINK_RELATION_LABEL[linkRelation]}</span>
                          <span className="app-composer-link-toggle-chevrons" aria-hidden="true">
                            <svg viewBox="0 0 8 12" focusable="false">
                              <path
                                d="M1.5 4.2 4 1.7l2.5 2.5M1.5 7.8 4 10.3l2.5-2.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </button>
                        {linkRelation === "cycle" && (
                          <>
                            <span className="app-composer-link-type-lead">That starts</span>
                            <button
                              type="button"
                              className="app-composer-link-toggle"
                              aria-label={`That starts ${linkPrecedence === "after" ? "after" : "before"} the link; press to switch`}
                              onClick={() => {
                                const next: LinkPrecedence =
                                  linkPrecedence === "after" ? "before" : "after";
                                setLinkPrecedence(next);
                                if (pendingParentId != null) {
                                  applyParentLinkToEditingTask(pendingParentId, next);
                                }
                              }}
                            >
                              <span>{linkPrecedence === "after" ? "After" : "Before"}</span>
                              <span className="app-composer-link-toggle-chevrons" aria-hidden="true">
                                <svg viewBox="0 0 8 12" focusable="false">
                                  <path
                                    d="M1.5 4.2 4 1.7l2.5 2.5M1.5 7.8 4 10.3l2.5-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </button>
                            <span className="app-composer-link-type-lead">The link is completed</span>
                          </>
                        )}
                      </div>
                      </>
                      )}
                    </>
                  ) : (
                    <p className="app-composer-tool-hint-title">{taskToolHint}</p>
                  )}
                </ComposerOverlayMenu>
                {composeKind === "note" && (
                  <button type="button" className="app-composer-tool" aria-label="Notes" tabIndex={collapsed ? -1 : 0}>
                    <NotesIcon />
                  </button>
                )}
                {composerHasRecurringTool && (
                    <div className="app-composer-recurring">
                      <ComposerOverlayMenu
                        open={recurringMenuOpen}
                        anchorRef={cycleButtonRef}
                        menuRef={recurringMenuRef}
                        matchWidthRef={composerFieldRef}
                        className="app-duration-menu app-recurring-menu"
                        aria-label="Repeat Every"
                      >
                        <p className="app-duration-title">Repeat Every...</p>
                        <div className="app-duration-divider" aria-hidden="true" />
                        <div
                          className="app-duration-unit app-duration-unit-quad"
                          role="group"
                          aria-label="Repeat unit"
                        >
                          {(
                            [
                              { id: "day", label: "Days" },
                              { id: "week", label: "Weeks" },
                              { id: "month", label: "Months" },
                              { id: "year", label: "Years" },
                            ] as const
                          ).map(({ id, label }) => (
                            <button
                              key={id}
                              type="button"
                              className={`app-duration-unit-button${recurringUnit === id ? " is-active" : ""}`}
                              aria-pressed={recurringUnit === id}
                              onClick={() => setRecurringUnitValue(id)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="app-duration-stepper">
                          <button
                            type="button"
                            className="app-duration-step"
                            aria-label="Decrease repeat interval"
                            onClick={() => stepRecurring(-1)}
                          >
                            −
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="app-duration-input"
                            value={recurringInput}
                            aria-label="Repeat interval"
                            onChange={(event) => setRecurringInput(event.target.value)}
                            onBlur={() => commitRecurringInput(recurringInput)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitRecurringInput(recurringInput);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="app-duration-step"
                            aria-label="Increase repeat interval"
                            onClick={() => stepRecurring(1)}
                          >
                            +
                          </button>
                        </div>
                        {recurringUnit === "week" && (
                          <div
                            className="app-recurring-weekdays"
                            role="group"
                            aria-label="Days of the week"
                          >
                            {WEEKDAY_BUTTONS.map(({ id, label, name }) => {
                              const selected = recurringWeekdays.includes(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={`app-recurring-weekday-chip${selected ? " is-selected" : ""}`}
                                  aria-pressed={selected}
                                  aria-label={name}
                                  onClick={() => toggleRecurringWeekday(id)}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {recurringUnit === "month" && (
                          <div className="app-recurring-monthday">
                            <span className="app-recurring-monthday-label">Day of month</span>
                            <div className="app-duration-stepper app-recurring-monthday-stepper">
                              <button
                                type="button"
                                className="app-duration-step"
                                aria-label="Decrease day of month"
                                onClick={() => stepRecurringMonthDay(-1)}
                              >
                                −
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="app-duration-input"
                                value={String(recurringMonthDay)}
                                aria-label="Day of month"
                                onChange={(event) => {
                                  const parsed = Number.parseInt(event.target.value, 10);
                                  if (!Number.isFinite(parsed)) {
                                    setRecurringMonthDay(MIN_MONTH_DAY);
                                    return;
                                  }
                                  setRecurringMonthDay(clampMonthDay(parsed));
                                }}
                              />
                              <button
                                type="button"
                                className="app-duration-step"
                                aria-label="Increase day of month"
                                onClick={() => stepRecurringMonthDay(1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="app-recurring-toggle-row">
                          <span className="app-recurring-toggle-label" id="app-recurring-toggle-label">
                            Repeat
                          </span>
                          <button
                            type="button"
                            className={`app-recurring-switch${recurringActivated ? " is-on" : ""}`}
                            role="switch"
                            aria-checked={recurringActivated}
                            aria-labelledby="app-recurring-toggle-label"
                            onClick={() => setRecurringEnabled(!recurringActivated)}
                          >
                            <span className="app-recurring-switch-thumb" aria-hidden="true" />
                          </button>
                        </div>
                      </ComposerOverlayMenu>
                      <button
                        ref={cycleButtonRef}
                        type="button"
                        className={`app-composer-tool app-composer-tool-recurring${recurringActivated ? " is-activated" : ""}${recurringMenuOpen ? " is-open" : ""}`}
                        aria-label="Repeat"
                        aria-expanded={recurringMenuOpen}
                        tabIndex={collapsed ? -1 : 0}
                        onClick={() => {
                          setAttachMenuOpen(false);
                          setComposeKindMenuOpen(false);
                          setDurationMenuOpen(false);
                          setImpactMenuOpen(false);
                          closeTaskToolHint();
                          clearComposerMetaAuto("recurring");
                          setRecurringMenuOpen((open) => !open);
                        }}
                      >
                        <CycleIcon />
                      </button>
                    </div>
                )}
                {composerHasScheduleImpactTools && (
                    <div className="app-composer-impact">
                      <ComposerOverlayMenu
                        open={impactMenuOpen}
                        anchorRef={impactButtonRef}
                        menuRef={impactMenuRef}
                        matchWidthRef={composerFieldRef}
                        className="app-impact-menu"
                        aria-label="Impact"
                      >
                        <p className="app-impact-title">Impact</p>
                        <div className="app-impact-divider" aria-hidden="true" />
                        <p className="app-impact-value" aria-live="polite">
                          {impact}
                        </p>
                        <div className="app-impact-stepper">
                          <button
                            type="button"
                            className="app-duration-step"
                            aria-label="Decrease impact"
                            onClick={() => stepImpact(-1)}
                          >
                            −
                          </button>
                          <input
                            type="range"
                            className="app-impact-slider"
                            min={IMPACT_MIN}
                            max={IMPACT_MAX}
                            step={1}
                            value={impact}
                            style={{
                              ["--impact-fill" as string]: `${(impact / IMPACT_MAX) * 100}%`,
                            }}
                            aria-label="Impact score"
                            aria-valuemin={IMPACT_MIN}
                            aria-valuemax={IMPACT_MAX}
                            aria-valuenow={impact}
                            onChange={(e) => setImpact(clampImpact(Number(e.target.value)))}
                          />
                          <button
                            type="button"
                            className="app-duration-step"
                            aria-label="Increase impact"
                            onClick={() => stepImpact(1)}
                          >
                            +
                          </button>
                        </div>
                      </ComposerOverlayMenu>
                      <button
                        ref={impactButtonRef}
                        type="button"
                        className={`app-composer-tool app-composer-tool-accent${impactActivated ? " is-activated" : ""}${impactMenuOpen ? " is-open" : ""}`}
                        aria-label="Impact"
                        aria-expanded={impactMenuOpen}
                        tabIndex={collapsed ? -1 : 0}
                        onClick={() => {
                          setAttachMenuOpen(false);
                          setComposeKindMenuOpen(false);
                          setDurationMenuOpen(false);
                          setRecurringMenuOpen(false);
                          closeTaskToolHint();
                          clearComposerMetaAuto("impact");
                          setImpactActivated(true);
                          setImpactMenuOpen((open) => !open);
                        }}
                      >
                        <ImpactIcon />
                      </button>
                    </div>
                )}
                {composerHasDurationTool && (
                  <div className="app-composer-duration">
                    <ComposerOverlayMenu
                      open={durationMenuOpen}
                      anchorRef={durationButtonRef}
                      menuRef={durationMenuRef}
                      matchWidthRef={composerFieldRef}
                      className="app-duration-menu"
                      aria-label="Estimated Duration"
                    >
                      <p className="app-duration-title">Estimated Duration</p>
                      <div className="app-duration-divider" aria-hidden="true" />
                      <div className="app-duration-unit" role="group" aria-label="Duration unit">
                        <button
                          type="button"
                          className={`app-duration-unit-button${durationUnit === "minutes" ? " is-active" : ""}`}
                          aria-pressed={durationUnit === "minutes"}
                          onClick={() => switchDurationUnit("minutes")}
                        >
                          Minutes
                        </button>
                        <button
                          type="button"
                          className={`app-duration-unit-button${durationUnit === "hours" ? " is-active" : ""}`}
                          aria-pressed={durationUnit === "hours"}
                          onClick={() => switchDurationUnit("hours")}
                        >
                          Hours
                        </button>
                      </div>
                      <div className="app-duration-stepper">
                        <button
                          type="button"
                          className="app-duration-step"
                          aria-label={durationUnit === "hours" ? "Decrease by 0.1 hours" : "Decrease by 5 minutes"}
                          onClick={() => stepDuration(-1)}
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode={durationUnit === "hours" ? "decimal" : "numeric"}
                          pattern={durationUnit === "hours" ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
                          className="app-duration-input"
                          value={durationInput}
                          aria-label="Estimated duration"
                          onChange={(e) => {
                            const next = e.target.value;
                            if (durationUnit === "hours") {
                              if (next === "" || /^\d*\.?\d*$/.test(next)) setDurationInput(next);
                              return;
                            }
                            if (next === "" || /^\d*$/.test(next)) setDurationInput(next);
                          }}
                          onBlur={() => commitDurationInput(durationInput)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitDurationInput(durationInput);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="app-duration-step"
                          aria-label={durationUnit === "hours" ? "Increase by 0.1 hours" : "Increase by 5 minutes"}
                          onClick={() => stepDuration(1)}
                        >
                          +
                        </button>
                      </div>
                    </ComposerOverlayMenu>
                    <button
                      ref={durationButtonRef}
                      type="button"
                      className={`app-composer-tool app-composer-tool-accent app-composer-tool-duration${durationActivated ? " is-activated" : ""}${durationMenuOpen ? " is-open" : ""}`}
                      aria-label="Time"
                      aria-expanded={durationMenuOpen}
                      tabIndex={collapsed ? -1 : 0}
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setComposeKindMenuOpen(false);
                        setRecurringMenuOpen(false);
                        setImpactMenuOpen(false);
                        closeTaskToolHint();
                        clearComposerMetaAuto("duration");
                        setDurationActivated(true);
                        setDurationMenuOpen((open) => !open);
                      }}
                    >
                    <ClockIcon />
                  </button>
                  </div>
                )}
                {composerHasScheduleImpactTools && (
                  <button
                    ref={dueDateButtonRef}
                    type="button"
                    className={dueDateButtonClassName}
                    aria-label="Date & Time"
                    aria-expanded={taskToolHint === "Date & Time"}
                    tabIndex={collapsed ? -1 : 0}
                    onClick={(event) => openTaskToolHint(event.currentTarget, "Date & Time")}
                  >
                    <CalendarIcon />
                  </button>
                )}
                {isLinkingToolComposeKind(composeKind) && (
                  <button
                    ref={parentTaskButtonRef}
                    type="button"
                    className={`app-composer-tool app-composer-tool-linking${
                      pendingParentId != null || pendingChildId != null ? " is-activated" : ""
                    }${taskToolHint === LINKING_TOOL_HINT ? " is-open" : ""}`}
                    aria-label="Linking"
                    aria-expanded={taskToolHint === LINKING_TOOL_HINT}
                    aria-pressed={pendingParentId != null || pendingChildId != null}
                    tabIndex={collapsed ? -1 : 0}
                    onClick={(event) => openTaskToolHint(event.currentTarget, LINKING_TOOL_HINT)}
                  >
                    <LinkIcon />
                  </button>
                )}
              </div>
              </div>
              <div className="app-compose-action-row">
              <div className="app-compose-action">
                <ComposerOverlayMenu
                  open={composeKindMenuOpen}
                  anchorRef={composeKindButtonRef}
                  menuRef={composeKindMenuRef}
                  align="end"
                  className="app-compose-kind-menu"
                  aria-label="Compose type"
                >
                  <button
                    type="button"
                    className={`app-attach-menu-item app-compose-kind-menu-span${composeKind === "collection" ? " is-selected" : ""}`}
                    role="menuitem"
                    onClick={() => {
                      clearComposerMetaAuto("type");
                      setComposeKind("collection");
                      setComposeKindMenuOpen(false);
                    }}
                  >
                    <span className="app-compose-kind-plus" aria-hidden="true">
                      +
                    </span>
                    <COMPOSE_KIND_MENU_TOP.Icon />
                    <span>{COMPOSE_KIND_MENU_TOP.label}</span>
                  </button>
                  <div
                    className="app-compose-kind-menu-divider app-compose-kind-menu-divider-half"
                    role="separator"
                  />
                  <div className="app-compose-kind-menu-columns">
                    <div className="app-compose-kind-menu-column">
                      {COMPOSE_KIND_MENU_LEFT.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={`app-attach-menu-item${composeKind === id ? " is-selected" : ""}`}
                          role="menuitem"
                          onClick={() => {
                            clearComposerMetaAuto("type");
                            setComposeKind(id);
                            setComposeKindMenuOpen(false);
                          }}
                        >
                          <span className="app-compose-kind-plus" aria-hidden="true">
                            +
                          </span>
                          <Icon />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                    <div
                      className="app-compose-kind-menu-divider app-compose-kind-menu-divider-vert"
                      role="separator"
                    />
                    <div className="app-compose-kind-menu-column">
                      {COMPOSE_KIND_MENU_RIGHT.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={`app-attach-menu-item${composeKind === id ? " is-selected" : ""}`}
                          role="menuitem"
                          onClick={() => {
                            clearComposerMetaAuto("type");
                            setComposeKind(id);
                            setComposeKindMenuOpen(false);
                          }}
                        >
                          <span className="app-compose-kind-plus" aria-hidden="true">
                            +
                          </span>
                          <Icon />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="app-compose-kind-menu-divider" role="separator" />
                  <div className="app-compose-kind-menu-columns">
                    <div className="app-compose-kind-menu-column">
                      <button
                        type="button"
                        className={`app-attach-menu-item${composeKind === "log" ? " is-selected" : ""}`}
                        role="menuitem"
                        onClick={() => {
                          clearComposerMetaAuto("type");
                          setComposeKind("log");
                          setComposeKindMenuOpen(false);
                        }}
                      >
                        <span className="app-compose-kind-plus is-check" aria-hidden="true">
                          <CheckIcon />
                        </span>
                        <LOG_COMPOSE_KIND.Icon />
                        <span>{LOG_COMPOSE_KIND.label}</span>
                      </button>
                    </div>
                    <div
                      className="app-compose-kind-menu-divider app-compose-kind-menu-divider-vert"
                      role="separator"
                    />
                    <div className="app-compose-kind-menu-column">
                      <button
                        type="button"
                        className={`app-attach-menu-item${composeKind === "assistant" ? " is-selected" : ""}`}
                        role="menuitem"
                        onClick={() => {
                          clearComposerMetaAuto("type");
                          setComposeKind("assistant");
                          setComposeKindMenuOpen(false);
                        }}
                      >
                        <ASSISTANT_COMPOSE_KIND.Icon />
                        <span>{ASSISTANT_COMPOSE_KIND.label}</span>
                      </button>
                    </div>
                  </div>
                </ComposerOverlayMenu>
                <button
                  ref={composeKindButtonRef}
                  type="button"
                  className="app-compose-kind-button"
                  aria-label="Choose compose type"
                  aria-expanded={composeKindMenuOpen}
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setAssistProPromptOpen(false);
                    setDurationMenuOpen(false);
                    setImpactMenuOpen(false);
                    closeTaskToolHint();
                    clearComposerMetaAuto("type");
                    setComposeKindMenuOpen((open) => !open);
                  }}
                  tabIndex={collapsed ? -1 : 0}
                >
                  <span>
                    {composeKind === "assistant" ? "Assist" : selectedComposeKind.label}
                  </span>
                </button>
                <ComposerOverlayMenu
                  open={assistProPromptOpen && !searchOpen}
                  anchorRef={composeAddButtonRef}
                  menuRef={assistProPromptMenuRef}
                  align="end"
                  role="dialog"
                  className="app-assist-pro-prompt"
                  aria-label="AI Assistant Pro"
                >
                  <div className="app-assist-pro-prompt-icon" aria-hidden="true">
                    <PremiumIcon />
                  </div>
                  <p className="app-assist-pro-prompt-title">AI Assistant is a Pro feature</p>
                  <p className="app-assist-pro-prompt-body">
                    Try Pro features free for 7 days and put an AI assistant in your Dayline.
                  </p>
                  <button
                    type="button"
                    className="app-attach-trial-button"
                    onClick={() => {
                      // Placeholder — Pro trial flow not wired yet.
                      setAssistProPromptOpen(false);
                    }}
                  >
                    Turn on Pro features
                  </button>
                  <p className="app-attach-trial-note">free for 7 days</p>
                </ComposerOverlayMenu>
                <button
                  ref={composeAddButtonRef}
                  type="button"
                  className={`app-composer-icon app-composer-add${
                    composeActionReady
                      ? " is-ready"
                      : assistActionReady
                        ? " is-pro-ready"
                        : ""
                  }`}
                  aria-label={
                    assistActionReady
                      ? "AI Assistant Pro"
                      : composeActionReady
                        ? editingTaskId != null
                          ? "Save"
                          : "Send"
                        : "Choose compose type"
                  }
                  aria-expanded={
                    assistActionReady
                      ? assistProPromptOpen
                      : composeActionReady
                        ? undefined
                        : composeKindMenuOpen
                  }
                  tabIndex={collapsed ? -1 : 0}
                  onClick={
                    assistActionReady
                      ? () => {
                          setAttachMenuOpen(false);
                          setComposeKindMenuOpen(false);
                          setDurationMenuOpen(false);
                          setImpactMenuOpen(false);
                          closeTaskToolHint();
                          setAssistProPromptOpen((open) => !open);
                        }
                      : composeActionReady
                        ? editingTaskId != null
                          ? () => {
                              if (!isEditDirty) return;
                              saveComposerChanges();
                            }
                          : () => {
                              submitCreate();
                            }
                        : () => {
                            setAttachMenuOpen(false);
                            setAssistProPromptOpen(false);
                            setDurationMenuOpen(false);
                            setImpactMenuOpen(false);
                            closeTaskToolHint();
                            clearComposerMetaAuto("type");
                            setComposeKindMenuOpen((open) => !open);
                          }
                  }
                >
                  {composeActionReady ? (
                    editingTaskId != null ? (
                      <ComposeAddIcon Icon={EditIcon} badge="check" />
                    ) : (
                      <SendIcon />
                    )
                  ) : (
                    <ComposeAddIcon
                      Icon={SelectedComposeIcon}
                      badge={
                        editingTaskId != null
                          ? "edit"
                          : composeKind !== "assistant"
                            ? "plus"
                            : "none"
                      }
                    />
                  )}
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
