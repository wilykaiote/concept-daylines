import { useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { buildComposerDraft, type ComposerDraft } from "./composer";
import {
  buildMonthCalendarDays,
  buildTargetTime,
  formatCountdown,
  formatMonthYearLabel,
  formatTargetTimeLabel,
  formatTwinelineDateLabel,
  loadTargetTime,
  loadTargetTimeOverrides,
  loadTasks,
  msUntilTargetTime,
  parseTargetTimeParts,
  resolveTargetTime,
  sameCalendarDay,
  saveTargetTime,
  saveTargetTimeOverrides,
  saveTasks,
  shiftMonth,
  targetTimeDayKey,
  toStartOfDay,
  WEEKDAY_BUTTONS,
  type TargetTimePeriod,
} from "./taskStorage";
import { buildScheduleLayoutForWindow } from "./schedule";
import {
  addDays,
  buildDayRange,
  dayKey,
  formatHourLabel,
  formatMinutesLabel,
  layoutCalendarTasks,
  minutesFromMidnight,
  MINUTES_PER_DAY,
  PACK_START_MINUTES,
  packWindowEndMinutes,
  parseTaskDate,
  PX_PER_MINUTE,
} from "./calendarTimeline";

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

function TinyArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function TasksListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 7h11M9 12h11M9 17h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2L7.5 11M4 17l1.2 1.2L7.5 16"
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
        d="M9 7h11M9 12h11M9 17h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2L7.5 11M4 17l1.2 1.2L7.5 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 7h12M8 12h12M8 17h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 7h.01M4 12h.01M4 17h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CycleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19 8a7 7 0 0 0-12.6-3.5M5 8V4.5M5 8h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16a7 7 0 0 0 12.6 3.5M19 16v3.5M19 16h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ParentTaskIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.7v4.3M8 16.5v-2.8c0-.9.7-1.6 1.6-1.6h4.8c.9 0 1.6.7 1.6 1.6v2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="18.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="18.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function UrgencyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 4.5v10M12 4.5v10M17.5 4.5v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="18.5" r="1.15" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.15" fill="currentColor" />
      <circle cx="17.5" cy="18.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

function ImpactIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
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

function ShoppingBagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 8h12l-1 13H7L6 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 0 1 6 0v1"
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

function ScrollTopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M6 11l6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function ComposeAddIcon({ Icon, showPlus = true }: { Icon: () => ReactElement; showPlus?: boolean }) {
  return (
    <span className="app-compose-add-icon">
      <Icon />
      {showPlus && (
        <span className="app-compose-add-plus" aria-hidden="true">
          +
        </span>
      )}
    </span>
  );
}

const COMPOSE_KINDS = [
  {
    id: "project",
    label: "Project",
    placeholder: "Describe the outcome of this project...",
    Icon: ListIcon,
  },
  { id: "note", label: "Note", placeholder: "Type away...", Icon: NotesIcon },
  { id: "item", label: "Item", placeholder: "What item(s) should I add to your list?", Icon: ShoppingBagIcon },
  { id: "task", label: "Task", placeholder: "Describe your task(s)...", Icon: TasksListIcon },
  {
    id: "assistant",
    label: "AI Assistant",
    placeholder: "Ask the AI assistant...",
    Icon: IntelligenceIcon,
  },
] as const;

type ComposeKind = (typeof COMPOSE_KINDS)[number]["id"];

const DAYLINE_TAB = { id: "dayline", label: "Twineline", Icon: TimelineIcon } as const;

const TRAY_TABS = [
  { id: "projects", label: "Projects", Icon: ListIcon },
  { id: "notes", label: "Notes", Icon: NotesIcon },
] as const;

const MORE_OPTIONS = [
  { id: "tasks", label: "Tasks", Icon: MenuBarsIcon },
  { id: "routines", label: "Routines", Icon: CycleIcon },
  { id: "groceries", label: "Groceries", Icon: FoodIcon },
  { id: "recipes", label: "Recipes", Icon: RecipeIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
] as const;

const MORE_MENU_ITEMS = MORE_OPTIONS.filter((item) => item.id !== "settings");

const URGENCY_OPTIONS = ["Future", "Later", "Soon", "Now"] as const;
type UrgencyOption = (typeof URGENCY_OPTIONS)[number];
const DEFAULT_URGENCY: UrgencyOption = "Now";
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

const TASK_META_MONTHS = [
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

function dayOrdinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function formatTaskClockLabel(hhmm: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? "pm" : "am";
  return `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
}

function formatTaskScheduleMetaLabel(
  task: ComposerDraft,
  now: Date,
): string | null {
  const date = parseTaskDate(task.date);
  if (!date) return null;

  const today = toStartOfDay(now);
  const tomorrow = addDays(today, 1);
  let datePart: string;
  if (sameCalendarDay(date, today)) datePart = "Today";
  else if (sameCalendarDay(date, tomorrow)) datePart = "Tomorrow";
  else datePart = `${TASK_META_MONTHS[date.getMonth()]} ${dayOrdinal(date.getDate())}`;

  const startsAt = normalizeOptionalField(task.starts_at);
  const dueAt = normalizeOptionalField(task.due_at);
  const timeRaw = startsAt ?? dueAt;
  if (!timeRaw) return datePart;

  const timePart = formatTaskClockLabel(timeRaw);
  if (!timePart) return datePart;

  const prefix = startsAt ? "Starts" : "Due";
  return `${prefix} ${datePart}, ${timePart}`;
}

function CompactTaskRow({
  task,
  overdue,
  editing,
  highlighted,
  now,
  onComplete,
  onEdit,
}: {
  task: ComposerDraft;
  overdue: boolean;
  editing: boolean;
  highlighted: boolean;
  now: Date;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const urgencyLabel = isUrgencyOption(task.urgency) ? task.urgency : null;
  const impactValue =
    typeof task.impact === "number" && Number.isFinite(task.impact)
      ? Math.round(task.impact)
      : null;
  const impactPercent =
    impactValue != null ? Math.min(100, Math.max(0, (impactValue / IMPACT_MAX) * 100)) : null;
  const durationLabel = formatTaskDurationLabel(task.est_duration);
  const scheduleLabel = formatTaskScheduleMetaLabel(task, now);
  const hasMeta =
    urgencyLabel != null ||
    impactValue != null ||
    durationLabel != null ||
    scheduleLabel != null;

  return (
    <li
      data-task-id={task.id ?? undefined}
      className={`task-row${editing ? " is-editing" : ""}${highlighted ? " is-highlighted" : ""}${overdue ? " is-overdue" : ""}`}
    >
      <button
        type="button"
        className="task-complete"
        aria-label="Mark complete"
        onClick={onComplete}
      />
      <button
        type="button"
        className="task-row-body"
        onClick={onEdit}
        aria-label={`Edit task ${task.title}`}
      >
        <p className="task-row-title">{task.title}</p>
        {hasMeta && (
          <div className="task-row-meta">
            <div className="task-row-meta-left">
              {urgencyLabel != null && (
                <span className="task-row-urgency">{urgencyLabel}</span>
              )}
              {impactValue != null && impactPercent != null && (
                <span
                  className="task-row-impact"
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
              {scheduleLabel != null && (
                <span className="task-row-schedule">{scheduleLabel}</span>
              )}
            </div>
            {durationLabel != null && (
              <span className="task-row-duration">{durationLabel}</span>
            )}
          </div>
        )}
      </button>
    </li>
  );
}

const SETTINGS_OPTION = MORE_OPTIONS.find((item) => item.id === "settings")!;

const NAV_ITEMS = [DAYLINE_TAB, ...TRAY_TABS, ...MORE_OPTIONS] as const;

type ActiveView = (typeof NAV_ITEMS)[number]["id"];

const COMPOSE_KIND_BY_VIEW: Record<ActiveView, ComposeKind> = {
  dayline: "task",
  tasks: "task",
  notes: "note",
  projects: "project",
  routines: "task",
  groceries: "item",
  recipes: "task",
  settings: "task",
};

const TRAY_GAP = 4;
const TRAY_PAD = 8;
const TRAY_BORDER = 2;

type OverlayMenuAlign = "start" | "end";

function ComposerOverlayMenu({
  open,
  anchorRef,
  menuRef,
  align = "start",
  className = "",
  "aria-label": ariaLabel,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  align?: OverlayMenuAlign;
  className?: string;
  "aria-label": string;
  children: ReactNode;
}) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

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
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      let left = align === "end" ? rect.right - menuWidth : rect.left;
      left = Math.min(Math.max(left, viewLeft + pad), viewRight - menuWidth - pad);

      let top = rect.top - menuHeight - gap;
      if (top < viewTop + pad) {
        top = Math.min(rect.bottom + gap, viewBottom - menuHeight - pad);
      }
      top = Math.min(Math.max(top, viewTop + pad), Math.max(viewTop + pad, viewBottom - menuHeight - pad));

      setCoords({ top, left });
    };

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", updatePosition);
    vv?.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", updatePosition);
      vv?.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, menuRef, align]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`app-attach-menu app-overlay-menu${className ? ` ${className}` : ""}`}
      role="menu"
      aria-label={ariaLabel}
      style={
        coords
          ? { top: coords.top, left: coords.left }
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
  const [durationMenuOpen, setDurationMenuOpen] = useState(false);
  const [durationActivated, setDurationActivated] = useState(false);
  const [urgencyMenuOpen, setUrgencyMenuOpen] = useState(false);
  const [urgencyActivated, setUrgencyActivated] = useState(false);
  const [urgency, setUrgency] = useState<UrgencyOption>(DEFAULT_URGENCY);
  const [impactMenuOpen, setImpactMenuOpen] = useState(false);
  const [impactActivated, setImpactActivated] = useState(false);
  const [impact, setImpact] = useState(DEFAULT_IMPACT);
  const [taskDate, setTaskDate] = useState("");
  const [taskStartsAt, setTaskStartsAt] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskTimeMode, setTaskTimeMode] = useState<"starts_at" | "due_at">("starts_at");
  const [taskToolHint, setTaskToolHint] = useState<string | null>(null);
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const [estDurationMinutes, setEstDurationMinutes] = useState<number | null>(15);
  const [durationInput, setDurationInput] = useState("15");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [composeKind, setComposeKind] = useState<ComposeKind>("task");
  const aiEnabled = false;
  const [activeView, setActiveView] = useState<ActiveView>("dayline");
  const [trayCompact, setTrayCompact] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<ComposerDraft[]>(() => loadTasks());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskBaseline, setEditTaskBaseline] = useState<{
    title: string;
    est_duration: number | null;
    urgency: UrgencyOption;
    impact: number;
    date: string | null;
    starts_at: string | null;
    due_at: string | null;
  } | null>(null);
  const [composerSavePromptOpen, setComposerSavePromptOpen] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [focusedOverflowTaskIds, setFocusedOverflowTaskIds] = useState<string[] | null>(null);
  const [defaultTargetTime, setDefaultTargetTime] = useState(() => loadTargetTime());
  const [targetTimeOverrides, setTargetTimeOverrides] = useState(() => loadTargetTimeOverrides());
  const [targetTime, setTargetTime] = useState(() =>
    resolveTargetTime(toStartOfDay(new Date()), loadTargetTime(), loadTargetTimeOverrides()),
  );
  const [selectedDay, setSelectedDay] = useState(() => toStartOfDay(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [overdueSectionOpen, setOverdueSectionOpen] = useState(true);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerBaseline, setTimePickerBaseline] = useState<string | null>(null);
  const [timeSavePromptOpen, setTimeSavePromptOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => toStartOfDay(new Date()));
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const composerRef = useRef<HTMLFormElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const twinelineChromeRef = useRef<HTMLDivElement>(null);
  const twinelineSlotRef = useRef<HTMLDivElement>(null);
  const twinelineHeaderRef = useRef<HTMLElement>(null);
  const twinelineSlideRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const chromeHiddenRef = useRef(false);
  const chromeLockRef = useRef(false);
  const chromeCooldownUntilRef = useRef(0);
  const selectedDayRef = useRef(selectedDay);
  selectedDayRef.current = selectedDay;
  const countdownNowRef = useRef(countdownNow);
  countdownNowRef.current = countdownNow;
  const [tasksCompact, setTasksCompact] = useState(true);
  const [timelineRangeStart, setTimelineRangeStart] = useState(() => toStartOfDay(new Date()));
  const [timelineDayCount, setTimelineDayCount] = useState(31);
  const [weekdayDayCount, setWeekdayDayCount] = useState(28);
  const [showTimelineScrollTop, setShowTimelineScrollTop] = useState(false);
  const timelineScrollSyncLockRef = useRef(false);
  const timelineScrollTopBtnVisibleRef = useRef(false);
  const pendingTimelineScrollDayRef = useRef<Date | null>(null);
  const pendingViewScrollTaskIdRef = useRef<string | null>(null);
  const pendingViewPreserveChromeRef = useRef(false);
  const pendingViewChromeHiddenRef = useRef(false);
  const weekdayStripRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const searchFieldRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const composeKindMenuRef = useRef<HTMLDivElement>(null);
  const composeKindButtonRef = useRef<HTMLButtonElement>(null);
  const composeAddButtonRef = useRef<HTMLButtonElement>(null);
  const durationMenuRef = useRef<HTMLDivElement>(null);
  const durationButtonRef = useRef<HTMLButtonElement>(null);
  const urgencyMenuRef = useRef<HTMLDivElement>(null);
  const impactMenuRef = useRef<HTMLDivElement>(null);
  const taskToolHintMenuRef = useRef<HTMLDivElement>(null);
  const taskToolHintAnchorRef = useRef<HTMLElement | null>(null);
  const dueDateButtonRef = useRef<HTMLButtonElement>(null);
  const parentTaskButtonRef = useRef<HTMLButtonElement>(null);
  const urgencyButtonRef = useRef<HTMLButtonElement>(null);
  const impactButtonRef = useRef<HTMLButtonElement>(null);
  const cycleButtonRef = useRef<HTMLButtonElement>(null);
  const toolsCenterRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const composeInputRef = useRef<HTMLTextAreaElement>(null);
  const taskViewControlsRef = useRef<HTMLDivElement>(null);
  const hasText = content.trim().length > 0;
  const selectedComposeKind =
    COMPOSE_KINDS.find((kind) => kind.id === composeKind) ?? COMPOSE_KINDS[0];
  const SelectedComposeIcon = selectedComposeKind.Icon;
  const fabComposeKind =
    COMPOSE_KINDS.find((kind) => kind.id === COMPOSE_KIND_BY_VIEW[activeView]) ?? COMPOSE_KINDS[0];
  const FabComposeIcon = fabComposeKind.Icon;

  const DaylineIcon = DAYLINE_TAB.Icon;
  const moreMenuItems = MORE_MENU_ITEMS;
  const visibleTabIds = new Set<ActiveView>(["dayline", ...TRAY_TABS.map((tab) => tab.id)]);
  const moreButtonActive =
    moreMenuOpen ||
    (activeView !== "dayline" && activeView !== "settings" && !visibleTabIds.has(activeView));
  const todayStart = toStartOfDay(new Date(countdownNow));
  const getTargetTimeForDay = (day: Date) => {
    if (timePickerOpen && sameCalendarDay(day, selectedDay)) return targetTime;
    return resolveTargetTime(day, defaultTargetTime, targetTimeOverrides);
  };
  const todayTargetTime = getTargetTimeForDay(todayStart);
  const countdownMs = msUntilTargetTime(todayTargetTime, new Date(countdownNow));
  const countdownRemaining = formatCountdown(countdownMs);
  const nowMinutes = minutesFromMidnight(new Date(countdownNow));
  const todayPackEnd = packWindowEndMinutes(todayTargetTime);
  const outsideTaskWindow =
    nowMinutes < PACK_START_MINUTES || nowMinutes >= todayPackEnd;
  const targetTimeLabel = formatTargetTimeLabel(timePickerOpen ? targetTime : todayTargetTime);
  const targetTimeParts = parseTargetTimeParts(targetTime);
  const calendarDays = buildMonthCalendarDays(calendarMonth);
  const calendarMonthLabel = formatMonthYearLabel(calendarMonth);
  const weekdayDays = buildDayRange(todayStart, weekdayDayCount);
  const calendarTasksLayout = layoutCalendarTasks(tasks, new Date(countdownNow), getTargetTimeForDay);
  const calendarTaskLayout = calendarTasksLayout.days;
  const overdueTasks = calendarTasksLayout.overdueTasks;
  const calendarLayoutSpanKey =
    calendarTaskLayout.length > 0
      ? `${calendarTaskLayout[0].dayKey}:${calendarTaskLayout[calendarTaskLayout.length - 1].dayKey}`
      : "";
  const calendarLayoutByKey = new Map(calendarTaskLayout.map((day) => [day.dayKey, day]));
  const selectedDayKey = dayKey(selectedDay);
  const selectedDayLayout = calendarLayoutByKey.get(selectedDayKey);
  const selectedDayTargetTime = getTargetTimeForDay(selectedDay);
  const selectedPackEnd =
    selectedDayLayout?.packEndMin ?? packWindowEndMinutes(selectedDayTargetTime);
  const selectedIsToday = sameCalendarDay(selectedDay, todayStart);
  const selectedWindowStart = selectedIsToday
    ? Math.min(selectedPackEnd, Math.max(PACK_START_MINUTES, nowMinutes))
    : PACK_START_MINUTES;
  const selectedDayBlocks = (selectedDayLayout?.blocks ?? []).map((block) => ({
    startMin: block.startMin,
    endMin: block.endMin,
    task: block.task,
  }));
  const scheduleOverflowSeen = new Set<string>();
  const scheduleOverflowTasks = calendarTaskLayout
    .filter((day) => day.date.getTime() > selectedDay.getTime())
    .flatMap((day) => day.blocks)
    .map((block) => block.task)
    .filter((task) => {
      const id = task.id ?? task.title;
      if (scheduleOverflowSeen.has(id)) return false;
      scheduleOverflowSeen.add(id);
      return true;
    });
  const scheduleLayout = buildScheduleLayoutForWindow(
    selectedDayBlocks,
    selectedWindowStart,
    selectedPackEnd,
    outsideTaskWindow ? [] : scheduleOverflowTasks,
  );
  const { timelineMinutes: scheduleTimelineMinutes, segments: scheduleSegments, overflowTasks } =
    scheduleLayout;
  const scheduleOverflowCount = overflowTasks.length;
  const isTaskHighlighted = (id: string | null | undefined) => {
    if (!id) return false;
    if (focusedTaskId === id) return true;
    return focusedOverflowTaskIds?.includes(id) ?? false;
  };
  const overflowHighlighted =
    (focusedOverflowTaskIds != null && focusedOverflowTaskIds.length > 0) ||
    (focusedTaskId != null && overflowTasks.some((task) => task.id === focusedTaskId));
  const nowDate = new Date(countdownNow);
  const timelineDays = buildDayRange(timelineRangeStart, timelineDayCount)
    .filter((date) => date.getTime() >= todayStart.getTime())
    .map((date) => {
      const key = dayKey(date);
      const existing = calendarLayoutByKey.get(key);
      if (existing) return existing;
      const isToday = sameCalendarDay(date, todayStart);
      const visibleStartMin = isToday ? minutesFromMidnight(nowDate) : 0;
      const packEnd = packWindowEndMinutes(getTargetTimeForDay(date));
      const markerStart = PACK_START_MINUTES;
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
        hourMarkers,
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
    if (!(section instanceof HTMLElement)) {
      pendingTimelineScrollDayRef.current = clamped;
      const start = timelineRangeStart;
      const end = addDays(start, timelineDayCount - 1);
      if (clamped.getTime() < start.getTime()) {
        setTimelineRangeStart(today);
      } else if (clamped.getTime() > end.getTime()) {
        const extra = Math.ceil((clamped.getTime() - end.getTime()) / 86_400_000) + 1;
        setTimelineDayCount((count) => count + extra);
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

  const openTimePicker = () => {
    setCalendarOpen(false);
    setTimeSavePromptOpen(false);
    const resolved = resolveTargetTime(selectedDay, defaultTargetTime, targetTimeOverrides);
    setTargetTime(resolved);
    setTimePickerBaseline(resolved);
    setTimePickerOpen(true);
  };

  const finishCloseTimePicker = () => {
    setTimeSavePromptOpen(false);
    setTimePickerOpen(false);
    setTimePickerBaseline(null);
  };

  const requestCloseTimePicker = () => {
    if (timePickerBaseline != null && targetTime !== timePickerBaseline) {
      setTimeSavePromptOpen(true);
      return;
    }
    finishCloseTimePicker();
  };

  const discardTimeChanges = () => {
    if (timePickerBaseline != null) setTargetTime(timePickerBaseline);
    finishCloseTimePicker();
  };

  const applyTargetTimeThisDay = () => {
    const key = targetTimeDayKey(selectedDay);
    setTargetTimeOverrides((prev) => ({ ...prev, [key]: targetTime }));
    finishCloseTimePicker();
  };

  const applyTargetTimeAllFutureDays = () => {
    setDefaultTargetTime(targetTime);
    finishCloseTimePicker();
  };

  const updateTargetTimeParts = (patch: Partial<typeof targetTimeParts>) => {
    setTargetTime(buildTargetTime({ ...targetTimeParts, ...patch }));
  };

  const stepTargetHour = (direction: 1 | -1) => {
    const nextHour = ((targetTimeParts.hour - 1 + direction + 12) % 12) + 1;
    updateTargetTimeParts({ hour: nextHour });
  };

  const stepTargetMinute = (direction: 1 | -1) => {
    const nextMinute = (targetTimeParts.minute + direction * 5 + 60) % 60;
    updateTargetTimeParts({ minute: nextMinute });
  };

  const setTargetPeriod = (period: TargetTimePeriod) => {
    updateTargetTimeParts({ period });
  };

  const scrollTaskIntoView = (
    taskId: string,
    behavior: ScrollBehavior = "smooth",
    options?: { preserveChrome?: boolean },
  ) => {
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

  const submitComposerDraft: Record<ComposeKind, (draft: ComposerDraft) => void> = {
    task: (draft) => {
      setTasks((current) => {
        if (!editingTaskId) return [draft, ...current];
        return current.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: draft.title,
                type: draft.type,
                est_duration: draft.est_duration,
                urgency: draft.urgency,
                impact: draft.impact,
                date: draft.date,
                starts_at: draft.starts_at,
                due_at: draft.due_at,
              }
            : task,
        );
      });
    },
    project: (_draft) => {},
    note: (_draft) => {},
    item: (_draft) => {},
    assistant: (_draft) => {},
  };

  const resetComposerFields = () => {
    setContent("");
    setEstDurationMinutes(15);
    setDurationInput("15");
    setDurationUnit("minutes");
    setDurationMenuOpen(false);
    setDurationActivated(false);
    setUrgencyMenuOpen(false);
    setUrgencyActivated(false);
    setUrgency(DEFAULT_URGENCY);
    setImpactMenuOpen(false);
    setImpactActivated(false);
    setImpact(DEFAULT_IMPACT);
    setTaskDate("");
    setTaskStartsAt("");
    setTaskDueAt("");
    setTaskTimeMode("starts_at");
    setTaskToolHint(null);
    setEditingTaskId(null);
    setEditTaskBaseline(null);
    setComposerSavePromptOpen(false);
  };

  const openTaskToolHint = (anchor: HTMLElement | null, title: string) => {
    if (!anchor) return;
    taskToolHintAnchorRef.current = anchor;
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setDurationMenuOpen(false);
    setUrgencyMenuOpen(false);
    setImpactMenuOpen(false);
    setTaskToolHint((current) => (current === title ? null : title));
  };

  const closeTaskToolHint = () => setTaskToolHint(null);

  const composerDate = normalizeOptionalField(taskDate);
  const composerStartsAt = normalizeOptionalField(taskStartsAt);
  const composerDueAt = normalizeOptionalField(taskDueAt);
  const dueDateActivated = composerDate != null;

  const isEditDirty =
    editingTaskId != null &&
    editTaskBaseline != null &&
    (content !== editTaskBaseline.title ||
      (estDurationMinutes ?? null) !== (editTaskBaseline.est_duration ?? null) ||
      urgency !== editTaskBaseline.urgency ||
      impact !== editTaskBaseline.impact ||
      composerDate !== editTaskBaseline.date ||
      composerStartsAt !== editTaskBaseline.starts_at ||
      composerDueAt !== editTaskBaseline.due_at);

  const completeTask = (id: string | null) => {
    if (!id) return;
    setTasks((current) => current.filter((task) => task.id !== id));
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
  };

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
    setEditingTaskId(task.id);
    setEditTaskBaseline({
      title: task.title,
      est_duration: minutes,
      urgency: nextUrgency,
      impact: nextImpact,
      date: nextDate,
      starts_at: nextStartsAt,
      due_at: nextDueAt,
    });
    setComposerSavePromptOpen(false);
    setComposeKind("task");
    setContent(task.title);
    setEstDurationMinutes(minutes);
    setDurationUnit("minutes");
    setDurationInput(String(Math.round(minutes)));
    setDurationActivated(task.est_duration != null && task.est_duration > 0);
    setDurationMenuOpen(false);
    setUrgency(nextUrgency);
    setUrgencyActivated(task.urgency != null);
    setUrgencyMenuOpen(false);
    setImpact(nextImpact);
    setImpactActivated(task.impact != null);
    setImpactMenuOpen(false);
    setTaskDate(nextDate ?? "");
    setTaskStartsAt(nextStartsAt ?? "");
    setTaskDueAt(nextDueAt ?? "");
    setTaskTimeMode(nextDueAt && !nextStartsAt ? "due_at" : "starts_at");
    setTaskToolHint(null);
    setAttachMenuOpen(false);
    setComposeKindMenuOpen(false);
    setMoreMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setCollapsed(false);
  };

  const clearTaskDueDate = () => {
    setTaskDate("");
    setTaskStartsAt("");
    setTaskDueAt("");
  };

  const setTaskDateValue = (value: string) => {
    const next = value.trim();
    setTaskDate(next);
    if (!next) {
      setTaskStartsAt("");
      setTaskDueAt("");
    }
  };

  const setTaskTimeValue = (value: string) => {
    const next = value.trim();
    if (taskTimeMode === "starts_at") {
      setTaskStartsAt(next);
      setTaskDueAt("");
    } else {
      setTaskDueAt(next);
      setTaskStartsAt("");
    }
    if (next && !taskDate.trim()) {
      setTaskDate(dayKey(new Date(countdownNow)));
    }
  };

  const setTaskTimeModeValue = (mode: "starts_at" | "due_at") => {
    if (mode === taskTimeMode) return;
    const currentTime = taskTimeMode === "starts_at" ? taskStartsAt : taskDueAt;
    setTaskTimeMode(mode);
    if (mode === "starts_at") {
      setTaskStartsAt(currentTime);
      setTaskDueAt("");
    } else {
      setTaskDueAt(currentTime);
      setTaskStartsAt("");
    }
  };

  const taskTimeValue = taskTimeMode === "starts_at" ? taskStartsAt : taskDueAt;

  const selectView = (id: ActiveView) => {
    setActiveView(id);
    if (!content.trim()) {
      setComposeKind(COMPOSE_KIND_BY_VIEW[id]);
    }
    setMoreMenuOpen(false);
  };

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
    setUrgencyMenuOpen(false);
    setImpactMenuOpen(false);
    closeTaskToolHint();
    setComposerSavePromptOpen(false);
    if (editingTaskId) {
      resetComposerFields();
    } else {
      setEditTaskBaseline(null);
    }
  };

  const requestCloseComposer = () => {
    if (isEditDirty) {
      setAttachMenuOpen(false);
      setComposeKindMenuOpen(false);
      setDurationMenuOpen(false);
      setUrgencyMenuOpen(false);
      setImpactMenuOpen(false);
      closeTaskToolHint();
      setComposerSavePromptOpen(true);
      return;
    }
    closeComposer();
  };

  const discardComposerChanges = () => {
    closeComposer();
  };

  const saveComposerChanges = () => {
    const draft = buildComposerDraft({
      title: content,
      type: composeKind,
      est_duration: estDurationMinutes,
      urgency,
      impact,
      date: composerDate,
      starts_at: composerStartsAt,
      due_at: composerDueAt,
    });
    if (draft) {
      submitComposerDraft[composeKind](draft);
    }
    closeComposer();
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

  const stepImpact = (direction: 1 | -1) => {
    setImpact((value) => clampImpact(value + direction));
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
    setMoreMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    fabRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCollapsed(false);
  };

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveTargetTime(defaultTargetTime);
  }, [defaultTargetTime]);

  useEffect(() => {
    saveTargetTimeOverrides(targetTimeOverrides);
  }, [targetTimeOverrides]);

  useEffect(() => {
    if (activeView !== "dayline") return;
    const id = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeView]);

  const syncTaskViewControlsBottom = () => {
    const composer = composerRef.current;
    const controls = taskViewControlsRef.current;
    if (!controls) return;

    const composerHidden = composer?.classList.contains("is-chrome-hidden") === true;
    if (!composer || composerHidden) {
      controls.style.bottom = "calc(12px + var(--safe-bottom))";
      return;
    }

    // Use layout sizes (not getBoundingClientRect) so the slide-in transform
    // does not place the toggle on top of the FAB while chrome reappears.
    const field = composer.querySelector<HTMLElement>(".app-composer-field");
    const useField =
      field != null &&
      !composer.classList.contains("is-collapsed") &&
      !composer.classList.contains("is-search-open");

    if (useField && field) {
      const padBottom = parseFloat(getComputedStyle(composer).paddingBottom) || 0;
      controls.style.bottom = `${padBottom + field.offsetHeight + 10}px`;
      return;
    }

    controls.style.bottom = `${composer.offsetHeight + 10}px`;
  };

  const setChromeHidden = (hidden: boolean) => {
    if (chromeHiddenRef.current === hidden) return;
    chromeHiddenRef.current = hidden;
    chromeCooldownUntilRef.current = performance.now() + 280;

    twinelineChromeRef.current?.classList.toggle("is-chrome-hidden", hidden);

    const composer = composerRef.current;
    const hideComposer = hidden && collapsed && !searchOpen;
    if (composer) {
      composer.classList.toggle("is-chrome-hidden", hideComposer);
    }

    syncTaskViewControlsBottom();
  };

  useEffect(() => {
    if (activeView !== "dayline") {
      setChromeHidden(false);
    }
  }, [activeView]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    lastScrollTopRef.current = main.scrollTop;

    const onScroll = () => {
      const top = main.scrollTop;
      const delta = top - lastScrollTopRef.current;
      lastScrollTopRef.current = top;

      if (activeView === "dayline") {
        const today = toStartOfDay(new Date(countdownNowRef.current));
        const awayFromToday =
          top > 80 || !sameCalendarDay(selectedDayRef.current, today);
        if (awayFromToday !== timelineScrollTopBtnVisibleRef.current) {
          timelineScrollTopBtnVisibleRef.current = awayFromToday;
          setShowTimelineScrollTop(awayFromToday);
        }

        if (!timelineScrollSyncLockRef.current) {
          const chromeHeight = twinelineChromeRef.current?.offsetHeight ?? 0;
          const syncY = main.getBoundingClientRect().top + chromeHeight + 12;
          const sections = main.querySelectorAll<HTMLElement>("[data-calendar-day]");
          let matched: HTMLElement | null = null;
          for (const section of sections) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= syncY && rect.bottom > syncY) {
              matched = section;
              break;
            }
            if (rect.top <= syncY) matched = section;
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
          if (top / maxScroll > 0.88) {
            setTimelineDayCount((count) => count + 14);
          }
        }
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
    // Timeline only starts at today — never keep a past range start.
    const today = toStartOfDay(new Date(countdownNow));
    if (timelineRangeStart.getTime() !== today.getTime()) {
      setTimelineRangeStart(today);
    }
  }, [countdownNow, timelineRangeStart]);

  useEffect(() => {
    if (!calendarLayoutSpanKey || calendarTaskLayout.length === 0) return;
    const last = calendarTaskLayout[calendarTaskLayout.length - 1].date;
    const rangeEnd = addDays(timelineRangeStart, timelineDayCount - 1);
    if (last.getTime() > rangeEnd.getTime()) {
      const extra = Math.ceil((last.getTime() - rangeEnd.getTime()) / 86_400_000) + 1;
      setTimelineDayCount((count) => count + extra);
    }
  }, [calendarLayoutSpanKey, timelineRangeStart, timelineDayCount, calendarTaskLayout]);

  useLayoutEffect(() => {
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
            setTimelineDayCount((count) => count + extra);
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
  }, [tasksCompact, timelineRangeStart, timelineDayCount, timelineDays.length, calendarLayoutSpanKey]);

  useLayoutEffect(() => {
    if (activeView !== "dayline") return;
    const main = mainRef.current;
    if (!main) return;
    // Compact day groups are short — grow the range until the list can scroll.
    if (main.scrollHeight <= main.clientHeight + 48) {
      setTimelineDayCount((count) => count + 14);
    }
  }, [activeView, tasksCompact, timelineDayCount, timelineDays.length, tasks.length]);

  useEffect(() => {
    if (!collapsed || searchOpen || moreMenuOpen) {
      setChromeHidden(false);
    } else {
      const composer = composerRef.current;
      const hideComposer = chromeHiddenRef.current && activeView === "dayline";
      composer?.classList.toggle("is-chrome-hidden", hideComposer);
      syncTaskViewControlsBottom();
    }
  }, [collapsed, searchOpen, moreMenuOpen, activeView]);

  useLayoutEffect(() => {
    const slide = twinelineSlideRef.current;
    const slot = twinelineSlotRef.current;
    if (!slide || !slot || activeView !== "dayline") return;

    const syncSlotHeight = () => {
      slot.style.height = `${slide.offsetHeight}px`;
    };
    syncSlotHeight();

    const observer = new ResizeObserver(syncSlotHeight);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [activeView, calendarOpen, timePickerOpen, scheduleOverflowCount, weekdayDayCount]);

  useEffect(() => {
    const end = addDays(todayStart, weekdayDayCount - 1);
    if (selectedDay.getTime() > end.getTime()) {
      const extra = Math.ceil((selectedDay.getTime() - end.getTime()) / 86_400_000) + 7;
      setWeekdayDayCount((count) => count + extra);
    }
  }, [selectedDay, todayStart, weekdayDayCount]);

  useLayoutEffect(() => {
    if (calendarOpen) return;
    const strip = weekdayStripRef.current;
    if (!strip) return;
    const key = dayKey(selectedDay);
    const button = strip.querySelector(`[data-weekday-day="${CSS.escape(key)}"]`);
    if (!(button instanceof HTMLElement)) return;
    const stripRect = strip.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.left < stripRect.left || buttonRect.right > stripRect.right) {
      const nextLeft = strip.scrollLeft + (buttonRect.left - stripRect.left);
      strip.scrollTo({ left: Math.max(0, nextLeft), behavior: "smooth" });
    }
  }, [selectedDay, calendarOpen, weekdayDayCount]);

  useLayoutEffect(() => {
    if (activeView !== "dayline") return;
    const composer = composerRef.current;
    const controls = taskViewControlsRef.current;
    if (!composer || !controls) return;

    syncTaskViewControlsBottom();

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== composer || event.propertyName !== "transform") return;
      syncTaskViewControlsBottom();
    };

    const observer = new ResizeObserver(() => {
      syncTaskViewControlsBottom();
    });
    observer.observe(composer);
    const field = composer.querySelector(".app-composer-field");
    if (field) observer.observe(field);
    composer.addEventListener("transitionend", onTransitionEnd);
    return () => {
      observer.disconnect();
      composer.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [activeView, collapsed, searchOpen, composerSavePromptOpen]);

  useLayoutEffect(() => {
    const el = composeInputRef.current;
    if (!el) return;

    const syncHeight = () => {
      if (collapsed || el.clientWidth < 40) {
        el.style.height = "46px";
        return;
      }
      // Measure from the min height so empty/short text doesn't inflate scrollHeight.
      el.style.height = "46px";
      const next = Math.min(Math.max(el.scrollHeight, 46), 160);
      el.style.height = `${next}px`;
    };

    syncHeight();
    const frame = requestAnimationFrame(() => {
      syncHeight();
      requestAnimationFrame(syncHeight);
    });
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [content, collapsed, composeKind, editingTaskId]);

  useEffect(() => {
    if (collapsed) return;
    const frame = requestAnimationFrame(() => {
      composeInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [collapsed]);

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

  useLayoutEffect(() => {
    if (!collapsed || searchOpen) return;

    const tray = trayRef.current;
    const measure = measureRef.current;
    const composer = composerRef.current;
    if (!tray || !measure || !composer) return;

    const measureWidth = (id: string, compact: boolean) => {
      const el = measure.querySelector<HTMLElement>(`[data-measure-id="${id}"][data-compact="${compact}"]`);
      return el?.offsetWidth ?? 0;
    };

    const update = () => {
      const dock = composer.querySelector<HTMLElement>(".app-composer-dock");
      const trayDockGap = 10;
      const composerStyle = getComputedStyle(composer);
      const padX =
        (parseFloat(composerStyle.paddingLeft) || 0) +
        (parseFloat(composerStyle.paddingRight) || 0);
      const dockWidth = dock?.getBoundingClientRect().width || 44;
      // Use the composer budget, not the tray's content-shrunk width — otherwise
      // overflowed tabs never come back when the viewport widens.
      const available = composer.clientWidth - padX - dockWidth - trayDockGap;
      if (available <= 0) return;

      const fit = (compact: boolean) => {
        const dayline = measureWidth("dayline", false);
        const more = measureWidth("more", compact);
        let total = TRAY_PAD + dayline + more;
        let itemCount = 2;

        for (const tab of TRAY_TABS) {
          total += measureWidth(tab.id, compact);
          itemCount += 1;
        }

        return total + (itemCount - 1) * TRAY_GAP + TRAY_BORDER <= available;
      };

      const nextCompact = !fit(false);
      setTrayCompact((current) => (current === nextCompact ? current : nextCompact));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(composer);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [collapsed, searchOpen]);

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
      if (composerRef.current?.contains(target)) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (composeKindMenuRef.current?.contains(target)) return;
      if (durationMenuRef.current?.contains(target)) return;
      if (urgencyMenuRef.current?.contains(target)) return;
      if (impactMenuRef.current?.contains(target)) return;
      if (taskToolHintMenuRef.current?.contains(target)) return;

      // Edit form: close on outside click, but let the click reach tasks/buttons.
      // Create form: swallow the outside click so it only dismisses the composer.
      const allowClickThrough = editingTaskId != null;

      if (!allowClickThrough) {
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
      }

      if (
        attachMenuOpen ||
        composeKindMenuOpen ||
        durationMenuOpen ||
        urgencyMenuOpen ||
        impactMenuOpen ||
        taskToolHint != null
      ) {
        setAttachMenuOpen(false);
        setComposeKindMenuOpen(false);
        setDurationMenuOpen(false);
        setUrgencyMenuOpen(false);
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
    durationMenuOpen,
    urgencyMenuOpen,
    impactMenuOpen,
    taskToolHint,
    editingTaskId,
    isEditDirty,
  ]);

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
      if (composeKindMenuRef.current?.contains(target)) return;
      if (composeKindButtonRef.current?.contains(target)) return;
      if (composeAddButtonRef.current?.contains(target)) return;
      setComposeKindMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [composeKindMenuOpen]);

  useEffect(() => {
    if (!durationMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (durationMenuRef.current?.contains(target)) return;
      if (durationButtonRef.current?.contains(target)) return;
      setDurationMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [durationMenuOpen]);

  useEffect(() => {
    if (!urgencyMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (urgencyMenuRef.current?.contains(target)) return;
      if (urgencyButtonRef.current?.contains(target)) return;
      setUrgencyMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [urgencyMenuOpen]);

  useEffect(() => {
    if (!impactMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
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
      if (taskToolHintMenuRef.current?.contains(target)) return;
      if (taskToolHintAnchorRef.current?.contains(target)) return;
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
      if (target.closest("[data-schedule-overflow]")) return;
      setFocusedTaskId(null);
      setFocusedOverflowTaskIds(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [focusedTaskId, focusedOverflowTaskIds]);

  useEffect(() => {
    if (!timePickerOpen || timeSavePromptOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (twinelineHeaderRef.current?.contains(target)) return;
      requestCloseTimePicker();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [timePickerOpen, timeSavePromptOpen, targetTime, timePickerBaseline]);

  return (
    <div className="app">
      <main className="app-main" ref={mainRef}>
        {activeView === "dayline" && (
          <div className="twineline-chrome" ref={twinelineChromeRef}>
            <div className="twineline-chrome-slot" ref={twinelineSlotRef} aria-hidden="true" />
            <header
              className={`twineline-countdown${calendarOpen ? " is-calendar-open" : ""}${timePickerOpen ? " is-time-open" : ""}`}
              ref={twinelineHeaderRef}
            >
              <div className="twineline-countdown-slide" ref={twinelineSlideRef}>
            {!calendarOpen && (
              <div className="twineline-countdown-bar">
                <button
                  type="button"
                  className="twineline-settings"
                  aria-label={SETTINGS_OPTION.label}
                  onClick={() => selectView("settings")}
                >
                  <SETTINGS_OPTION.Icon />
                </button>
                {!timePickerOpen && (
                  <button
                    type="button"
                    className="twineline-date"
                    aria-label="Open calendar"
                    aria-expanded={false}
                    onClick={openCalendar}
                  >
                    <span>{formatMonthYearLabel(selectedDay)}</span>
                    <span className="twineline-date-chevron" aria-hidden="true">
                      {">"}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className={`twineline-countdown-button${timePickerOpen ? " is-open" : ""}${outsideTaskWindow && !timePickerOpen ? " is-rest" : ""}`}
                  aria-label={
                    timePickerOpen
                      ? `Close target time picker. Currently ${targetTimeLabel}.`
                      : outsideTaskWindow
                        ? `Rest time. Outside task window until ${formatMinutesLabel(PACK_START_MINUTES)}. Change target time.`
                        : `Countdown to ${targetTimeLabel}. Change target time.`
                  }
                  aria-expanded={timePickerOpen}
                  onClick={() => (timePickerOpen ? requestCloseTimePicker() : openTimePicker())}
                >
                  {outsideTaskWindow && !timePickerOpen ? (
                    <span className="twineline-countdown-remaining">REST</span>
                  ) : (
                    <>
                      <span className="twineline-countdown-remaining">{countdownRemaining}</span>
                      {timePickerOpen && (
                        <span className="twineline-date-chevron" aria-hidden="true">
                          ∨
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            )}
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
            {timePickerOpen ? (
              <div className="twineline-time-picker" aria-label="Choose target time">
                <p className="twineline-time-picker-title">Countdown to {targetTimeLabel}</p>
                <div className="app-duration-unit" role="group" aria-label="AM or PM">
                  <button
                    type="button"
                    className={`app-duration-unit-button${targetTimeParts.period === "AM" ? " is-active" : ""}`}
                    aria-pressed={targetTimeParts.period === "AM"}
                    onClick={() => setTargetPeriod("AM")}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`app-duration-unit-button${targetTimeParts.period === "PM" ? " is-active" : ""}`}
                    aria-pressed={targetTimeParts.period === "PM"}
                    onClick={() => setTargetPeriod("PM")}
                  >
                    PM
                  </button>
                </div>
                <div className="twineline-time-steppers">
                  <div className="app-duration-stepper" role="group" aria-label="Hour">
                    <button
                      type="button"
                      className="app-duration-step"
                      aria-label="Decrease hour"
                      onClick={() => stepTargetHour(-1)}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="app-duration-input"
                      value={String(targetTimeParts.hour)}
                      aria-label="Hour"
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === "" || /^\d{1,2}$/.test(next)) {
                          const parsed = Number.parseInt(next || "0", 10);
                          if (next === "") return;
                          if (parsed >= 1 && parsed <= 12) updateTargetTimeParts({ hour: parsed });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="app-duration-step"
                      aria-label="Increase hour"
                      onClick={() => stepTargetHour(1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="app-duration-stepper" role="group" aria-label="Minutes">
                    <button
                      type="button"
                      className="app-duration-step"
                      aria-label="Decrease minutes by 5"
                      onClick={() => stepTargetMinute(-1)}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="app-duration-input"
                      value={String(targetTimeParts.minute).padStart(2, "0")}
                      aria-label="Minutes"
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === "" || /^\d{1,2}$/.test(next)) {
                          const parsed = Number.parseInt(next || "0", 10);
                          if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 59) {
                            updateTargetTimeParts({ minute: parsed });
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="app-duration-step"
                      aria-label="Increase minutes by 5"
                      onClick={() => stepTargetMinute(1)}
                    >
                      +
                    </button>
                  </div>
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
            ) : (
              <>
                {!calendarOpen && (
                  <div
                    ref={weekdayStripRef}
                    className="twineline-weekdays"
                    role="tablist"
                    aria-label="Upcoming days"
                    onScroll={(event) => {
                      const el = event.currentTarget;
                      if (el.scrollLeft + el.clientWidth > el.scrollWidth - 96) {
                        setWeekdayDayCount((count) => count + 14);
                      }
                    }}
                  >
                    {weekdayDays.map((dayDate) => {
                      const weekday = WEEKDAY_BUTTONS[dayDate.getDay()];
                      const key = dayKey(dayDate);
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          data-weekday-day={key}
                          className={`twineline-weekday${sameCalendarDay(dayDate, selectedDay) ? " is-selected" : ""}`}
                          aria-selected={sameCalendarDay(dayDate, selectedDay)}
                          aria-label={`${weekday.name} ${dayDate.getDate()}`}
                          onClick={() => selectDayFromUi(dayDate)}
                        >
                          <span className="twineline-weekday-letter">{weekday.label}</span>
                          <span className="twineline-weekday-date">{dayDate.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div
                  className="twineline-schedule"
                  aria-label={`Timeline until ${formatTargetTimeLabel(selectedDayTargetTime)}`}
                >
                  <div
                    className={`twineline-schedule-track${scheduleOverflowCount > 0 ? " has-overflow" : ""}`}
                  >
                    <div className="twineline-schedule-lane">
                      {scheduleSegments.map((segment, index) => {
                        const widthPercent =
                          (Math.max(segment.minutes, segment.type === "task" ? 0.01 : 0) /
                            scheduleTimelineMinutes) *
                          100;
                        return segment.type === "gap" ? (
                          <div
                            key={`gap-${index}`}
                            className="twineline-schedule-gap"
                            style={{ flex: `0 0 ${widthPercent}%` }}
                            aria-hidden="true"
                          />
                        ) : (
                          <button
                            key={segment.task.id ?? `task-${index}`}
                            type="button"
                            data-schedule-task-id={segment.task.id ?? undefined}
                            className={`twineline-schedule-block${isTaskHighlighted(segment.task.id) ? " is-highlighted" : ""}`}
                            style={{ flex: `0 0 ${widthPercent}%` }}
                            title={`${segment.task.title} · ${segment.minutes}m`}
                            aria-label={`${segment.task.title}, ${segment.minutes} minutes`}
                            aria-pressed={focusedTaskId === segment.task.id}
                            onClick={() => {
                              if (!segment.task.id) return;
                              setFocusedOverflowTaskIds(null);
                              setFocusedTaskId(segment.task.id);
                              scrollTaskIntoView(segment.task.id);
                            }}
                          />
                        );
                      })}
                    </div>
                    {scheduleOverflowCount > 0 && (
                      <>
                        <span className="twineline-schedule-overflow-chevron" aria-hidden="true">
                          <TinyArrowRightIcon />
                        </span>
                        <button
                          type="button"
                          data-schedule-overflow=""
                          className={`twineline-schedule-overflow${overflowHighlighted ? " is-highlighted" : ""}`}
                          aria-label={`${scheduleOverflowCount} more task${scheduleOverflowCount === 1 ? "" : "s"} beyond the timeline`}
                          title={overflowTasks.map((task) => task.title).join(", ")}
                          onClick={() => {
                            const ids = overflowTasks
                              .map((task) => task.id)
                              .filter((id): id is string => !!id);
                            if (ids.length === 0) return;
                            setFocusedTaskId(null);
                            setFocusedOverflowTaskIds(ids);
                            scrollTaskIntoView(ids[0]);
                          }}
                        >
                          {scheduleOverflowCount}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
              </div>
            </header>
          </div>
        )}
        {activeView === "dayline" && overdueTasks.length > 0 && (
          <section className="task-overdue-section" aria-label="Overdue tasks">
            <button
              type="button"
              className={`task-day-label task-overdue-toggle${overdueSectionOpen ? " is-open" : ""}`}
              aria-expanded={overdueSectionOpen}
              onClick={() => setOverdueSectionOpen((open) => !open)}
            >
              <span>Overdue</span>
              <span className="task-overdue-toggle-action">
                <span className="task-overdue-toggle-reschedule">Reschedule</span>
                <span className="task-overdue-toggle-chevron" aria-hidden="true">
                  {overdueSectionOpen ? "∨" : ">"}
                </span>
              </span>
            </button>
            {overdueSectionOpen && (
              <ul className="task-day-tasks task-overdue-tasks">
                {overdueTasks.map((task) => (
                  <CompactTaskRow
                    key={task.id ?? task.title}
                    task={task}
                    overdue
                    editing={editingTaskId === task.id}
                    highlighted={isTaskHighlighted(task.id)}
                    now={new Date(countdownNow)}
                    onComplete={() => completeTask(task.id)}
                    onEdit={() => {
                      if (task.id) {
                        setFocusedOverflowTaskIds(null);
                        setFocusedTaskId(task.id);
                      }
                      editTask(task);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
        {tasks.length === 0 ? (
          <p className="task-list-empty">No tasks yet. Add one below.</p>
        ) : tasksCompact ? (
          <div className="task-list is-compact">
            {timelineDays.map((day) => {
              const seenTaskIds = new Set<string>();
              const dayTasks = day.blocks.filter((block) => {
                const id = block.taskId ?? block.key;
                if (seenTaskIds.has(id)) return false;
                seenTaskIds.add(id);
                return true;
              });
              return (
                <section
                  key={day.dayKey}
                  className="task-day-group"
                  data-calendar-day={day.dayKey}
                >
                  <div className="task-day-label">
                    {formatTwinelineDateLabel(day.date, new Date(countdownNow))}
                  </div>
                  {dayTasks.length > 0 && (
                    <ul className="task-day-tasks">
                      {dayTasks.map((block) => (
                        <CompactTaskRow
                          key={block.key}
                          task={block.task}
                          overdue={block.overdue}
                          editing={editingTaskId === block.taskId}
                          highlighted={isTaskHighlighted(block.taskId)}
                          now={new Date(countdownNow)}
                          onComplete={() => completeTask(block.taskId)}
                          onEdit={() => {
                            if (block.taskId) {
                              setFocusedOverflowTaskIds(null);
                              setFocusedTaskId(block.taskId);
                            }
                            editTask(block.task);
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="calendar-timeline">
            {timelineDays.map((day) => (
              <section
                key={day.dayKey}
                className="calendar-timeline-day"
                data-calendar-day={day.dayKey}
              >
                <div className="calendar-timeline-day-label">
                  {formatTwinelineDateLabel(day.date, new Date(countdownNow))}
                </div>
                <div
                  className="calendar-timeline-body"
                  style={{ height: Math.max(PX_PER_MINUTE, day.visibleMinutes * PX_PER_MINUTE) }}
                >
                  <div className="calendar-timeline-hours" aria-hidden="true">
                    {day.hourMarkers.map(({ hour, label, topPx }) => (
                      <div key={hour} className="calendar-timeline-hour" style={{ top: topPx }}>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="calendar-timeline-track">
                    {day.hourMarkers.map(({ hour, topPx }) => (
                      <div
                        key={`line-${hour}`}
                        className="calendar-timeline-hour-line"
                        style={{ top: topPx }}
                      />
                    ))}
                    {day.packStartTopPx != null && (
                      <div
                        className="calendar-timeline-pack-marker is-start"
                        style={{ top: day.packStartTopPx }}
                      >
                        <span className="calendar-timeline-pack-marker-label">{day.packStartLabel}</span>
                      </div>
                    )}
                    {day.packEndTopPx != null && (
                      <div
                        className="calendar-timeline-pack-marker is-end"
                        style={{ top: day.packEndTopPx }}
                      >
                        <span className="calendar-timeline-pack-marker-label">{day.packEndLabel}</span>
                      </div>
                    )}
                    {day.blocks.map((block) => (
                      <div
                        key={block.key}
                        data-task-id={block.taskId ?? undefined}
                        className={`calendar-timeline-block${editingTaskId === block.taskId ? " is-editing" : ""}${isTaskHighlighted(block.taskId) ? " is-highlighted" : ""}${block.overdue ? " is-overdue" : ""}`}
                        style={{ top: block.topPx, height: block.heightPx }}
                      >
                        <button
                          type="button"
                          className="task-complete"
                          aria-label="Mark complete"
                          onClick={() => completeTask(block.taskId)}
                        />
                        <button
                          type="button"
                          className="calendar-timeline-block-body"
                          onClick={() => {
                            if (block.taskId) {
                              setFocusedOverflowTaskIds(null);
                              setFocusedTaskId(block.taskId);
                            }
                            editTask(block.task);
                          }}
                          aria-label={`Edit task ${block.title}`}
                        >
                          <span className="calendar-timeline-block-title">{block.title}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {activeView === "dayline" && (
        <div className="task-view-controls" ref={taskViewControlsRef}>
          {showTimelineScrollTop && (
            <button
              type="button"
              className="task-view-scroll-top"
              onClick={() => {
                const today = toStartOfDay(new Date(countdownNow));
                setSelectedDay(today);
                scrollTimelineToDay(today);
                const strip = weekdayStripRef.current;
                if (strip) strip.scrollTo({ left: 0, behavior: "smooth" });
              }}
              aria-label="Scroll to today"
            >
              <ScrollTopIcon />
            </button>
          )}
          <button
            type="button"
            className="task-view-toggle"
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
          >
            {tasksCompact ? <TaskViewExpandIcon /> : <TaskViewCollapseIcon />}
          </button>
        </div>
      )}

      <form
        ref={composerRef}
        className={`app-composer${collapsed ? " is-collapsed" : ""}${attachMenuOpen ? " is-attach-open" : ""}${searchOpen ? " is-search-open" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (searchOpen) return;
          const draft = buildComposerDraft({
            title: content,
            type: composeKind,
            est_duration: estDurationMinutes,
            urgency,
            impact,
            date: composerDate,
            starts_at: composerStartsAt,
            due_at: composerDueAt,
          });
          if (!draft) return;
          const wasEditing = editingTaskId != null;
          submitComposerDraft[composeKind](draft);
          resetComposerFields();
          if (wasEditing) setCollapsed(true);
        }}
      >
        <div className="app-tray" ref={trayRef}>
          <div
            ref={measureRef}
            className="app-tray-measure"
            aria-hidden="true"
          >
            {[false, true].map((compact) => (
              <div key={String(compact)} className="app-tray-measure-row">
                {NAV_ITEMS.map(({ id, label, Icon }) => {
                  const tabCompact = compact && id !== "dayline";
                  return (
                    <button
                      key={id}
                      type="button"
                      tabIndex={-1}
                      data-measure-id={id}
                      data-compact={String(compact)}
                      className={`app-tray-tab${tabCompact ? " is-compact" : ""}`}
                    >
                      <Icon />
                      {!tabCompact && <span>{label}</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  tabIndex={-1}
                  data-measure-id="more"
                  data-compact={String(compact)}
                  className={`app-tray-more-button${compact ? " is-compact" : ""}`}
                >
                  <span className="app-tray-more-divider" aria-hidden="true" />
                  <MoreIcon />
                </button>
              </div>
            ))}
          </div>
          <div className="app-tray-tabs ui-outer-fade" aria-hidden={!collapsed || searchOpen}>
            <button
              type="button"
              className={`app-tray-tab${activeView === "dayline" ? " is-active" : ""}`}
              onClick={() => selectView("dayline")}
              tabIndex={collapsed && !searchOpen ? 0 : -1}
              aria-label="Twineline"
            >
              <DaylineIcon />
              <span>{DAYLINE_TAB.label}</span>
            </button>
            {TRAY_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`app-tray-tab${trayCompact ? " is-compact" : ""}${activeView === id ? " is-active" : ""}`}
                onClick={() => selectView(id)}
                tabIndex={collapsed && !searchOpen ? 0 : -1}
                aria-label={label}
              >
                <Icon />
                {!trayCompact && <span>{label}</span>}
              </button>
            ))}
            <div className="app-tray-more">
              <ComposerOverlayMenu
                open={moreMenuOpen && !searchOpen}
                anchorRef={moreButtonRef}
                menuRef={moreMenuRef}
                align="end"
                className="app-tray-more-menu"
                aria-label="More..."
              >
                {moreMenuItems.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`app-attach-menu-item${activeView === id ? " is-selected" : ""}`}
                    role="menuitem"
                    onClick={() => selectView(id)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="app-attach-menu-item app-tray-more-search"
                  role="menuitem"
                  onClick={openSearch}
                >
                  <SearchIcon />
                  <span>Search</span>
                </button>
              </ComposerOverlayMenu>
              <button
                ref={moreButtonRef}
                type="button"
                className={`app-tray-more-button${trayCompact ? " is-compact" : ""}${moreButtonActive ? " is-active" : ""}`}
                onClick={() => setMoreMenuOpen((open) => !open)}
                aria-label="More..."
                aria-expanded={moreMenuOpen}
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
        </div>

        <div className="app-composer-dock">
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
            <div className="app-composer-field-row">
              {editingTaskId != null && (
                <div className="app-composer-complete-slot">
                  <button
                    type="button"
                    className="task-complete"
                    aria-label="Mark complete"
                    tabIndex={collapsed ? -1 : 0}
                    onClick={() => completeTask(editingTaskId)}
                  />
                </div>
              )}
              <textarea
                ref={composeInputRef}
                rows={1}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }}
                placeholder={selectedComposeKind.placeholder}
                enterKeyHint="send"
                autoComplete="off"
                tabIndex={collapsed ? -1 : 0}
              />
            </div>
            {composerSavePromptOpen && (
              <div className="twineline-save-prompt" role="dialog" aria-label="Save Changes?">
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
                    onClick={saveComposerChanges}
                  >
                    Save
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
                      setUrgencyMenuOpen(false);
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
                  className={`app-composer-tool-hint${taskToolHint === "Date & Time" ? " is-due-date" : ""}`}
                  aria-label={taskToolHint ?? "Tool info"}
                >
                  {taskToolHint === "Date & Time" ? (
                    <>
                      <p className="app-due-date-title">Date &amp; Time</p>
                      <div className="app-due-date-divider" aria-hidden="true" />
                      <div className="app-due-date-fields">
                        <label className="app-due-date-field">
                          Date
                          <input
                            type="date"
                            value={taskDate}
                            onChange={(event) => setTaskDateValue(event.target.value)}
                            aria-label="Task date"
                          />
                        </label>
                        <label className="app-due-date-field">
                          Time
                          <input
                            type="time"
                            value={taskTimeValue}
                            onChange={(event) => setTaskTimeValue(event.target.value)}
                            aria-label="Task time"
                          />
                        </label>
                        <div
                          className="app-due-date-mode"
                          role="group"
                          aria-label="Time meaning"
                        >
                          <button
                            type="button"
                            className={`app-due-date-mode-button${taskTimeMode === "starts_at" ? " is-active" : ""}`}
                            aria-pressed={taskTimeMode === "starts_at"}
                            onClick={() => setTaskTimeModeValue("starts_at")}
                          >
                            Starts at
                          </button>
                          <button
                            type="button"
                            className={`app-due-date-mode-button${taskTimeMode === "due_at" ? " is-active" : ""}`}
                            aria-pressed={taskTimeMode === "due_at"}
                            onClick={() => setTaskTimeModeValue("due_at")}
                          >
                            Due date
                          </button>
                        </div>
                      </div>
                      <div className="app-due-date-actions">
                        <button
                          type="button"
                          className="app-due-date-clear"
                          onClick={clearTaskDueDate}
                          disabled={!dueDateActivated && !composerStartsAt && !composerDueAt}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          className="app-due-date-confirm"
                          aria-label="Done"
                          onClick={closeTaskToolHint}
                        >
                          <CheckIcon />
                        </button>
                      </div>
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
                {composeKind === "project" && (
                  <button
                    ref={dueDateButtonRef}
                    type="button"
                    className={`app-composer-tool${taskToolHint === "Date & Time" ? " is-open" : ""}`}
                    aria-label="Date & Time"
                    aria-expanded={taskToolHint === "Date & Time"}
                    tabIndex={collapsed ? -1 : 0}
                    onClick={(event) => openTaskToolHint(event.currentTarget, "Date & Time")}
                  >
                    <CalendarIcon />
                  </button>
                )}
                {composeKind === "task" && (
                  <>
                    <button
                      ref={parentTaskButtonRef}
                      type="button"
                      className={`app-composer-tool${taskToolHint === "Parent Task" ? " is-open" : ""}`}
                      aria-label="Parent Task"
                      aria-expanded={taskToolHint === "Parent Task"}
                      tabIndex={collapsed ? -1 : 0}
                      onClick={(event) => openTaskToolHint(event.currentTarget, "Parent Task")}
                    >
                      <ParentTaskIcon />
                    </button>
                    <button
                      ref={cycleButtonRef}
                      type="button"
                      className={`app-composer-tool${taskToolHint === "Recurring or Cycle/After" ? " is-open" : ""}`}
                      aria-label="Recurring or Cycle/After"
                      aria-expanded={taskToolHint === "Recurring or Cycle/After"}
                      tabIndex={collapsed ? -1 : 0}
                      onClick={(event) =>
                        openTaskToolHint(event.currentTarget, "Recurring or Cycle/After")
                      }
                    >
                      <CycleIcon />
                    </button>
                    <button
                      ref={dueDateButtonRef}
                      type="button"
                      className={`app-composer-tool${taskToolHint === "Date & Time" ? " is-open" : ""}`}
                      aria-label="Date & Time"
                      aria-expanded={taskToolHint === "Date & Time"}
                      tabIndex={collapsed ? -1 : 0}
                      onClick={(event) => openTaskToolHint(event.currentTarget, "Date & Time")}
                    >
                      <CalendarIcon />
                    </button>
                    <div className="app-composer-impact">
                      <ComposerOverlayMenu
                        open={impactMenuOpen}
                        anchorRef={impactButtonRef}
                        menuRef={impactMenuRef}
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
                          setUrgencyMenuOpen(false);
                          closeTaskToolHint();
                          setImpactActivated(true);
                          setImpactMenuOpen((open) => !open);
                        }}
                      >
                        <ImpactIcon />
                      </button>
                    </div>
                    <div className="app-composer-urgency">
                      <ComposerOverlayMenu
                        open={urgencyMenuOpen}
                        anchorRef={urgencyButtonRef}
                        menuRef={urgencyMenuRef}
                        className="app-urgency-menu"
                        aria-label="Urgency"
                      >
                        <p className="app-urgency-title">Urgency</p>
                        <div className="app-urgency-divider" aria-hidden="true" />
                        {URGENCY_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`app-attach-menu-item app-urgency-menu-item${urgency === option ? " is-selected" : ""}`}
                            role="menuitemradio"
                            aria-checked={urgency === option}
                            onClick={() => {
                              setUrgency(option);
                              setUrgencyActivated(true);
                              setUrgencyMenuOpen(false);
                            }}
                          >
                            <span>{option}</span>
                          </button>
                        ))}
                      </ComposerOverlayMenu>
                      <button
                        ref={urgencyButtonRef}
                        type="button"
                        className={`app-composer-tool app-composer-tool-accent${urgencyActivated ? " is-activated" : ""}${urgencyMenuOpen ? " is-open" : ""}`}
                        aria-label="Urgency"
                        aria-expanded={urgencyMenuOpen}
                        tabIndex={collapsed ? -1 : 0}
                        onClick={() => {
                          setAttachMenuOpen(false);
                          setComposeKindMenuOpen(false);
                          setDurationMenuOpen(false);
                          setImpactMenuOpen(false);
                          closeTaskToolHint();
                          setUrgencyActivated(true);
                          setUrgencyMenuOpen((open) => !open);
                        }}
                      >
                        <UrgencyIcon />
                      </button>
                    </div>
                  </>
                )}
                {composeKind === "task" && (
                  <div className="app-composer-duration">
                    <ComposerOverlayMenu
                      open={durationMenuOpen}
                      anchorRef={durationButtonRef}
                      menuRef={durationMenuRef}
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
                        setUrgencyMenuOpen(false);
                        setImpactMenuOpen(false);
                        closeTaskToolHint();
                        setDurationActivated(true);
                        setDurationMenuOpen((open) => !open);
                      }}
                    >
                      <ClockIcon />
                    </button>
                  </div>
                )}
                </div>
              </div>
              <div className="app-compose-action">
                <ComposerOverlayMenu
                  open={composeKindMenuOpen}
                  anchorRef={composeKindButtonRef}
                  menuRef={composeKindMenuRef}
                  align="end"
                  className="app-compose-kind-menu"
                  aria-label="Compose type"
                >
                  {COMPOSE_KINDS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`app-attach-menu-item${composeKind === id ? " is-selected" : ""}`}
                      role="menuitem"
                      onClick={() => {
                        setComposeKind(id);
                        setComposeKindMenuOpen(false);
                      }}
                    >
                      {id === "assistant" ? (
                        <span className="app-compose-kind-plus app-compose-kind-lead-icon" aria-hidden="true">
                          <Icon />
                        </span>
                      ) : (
                        <>
                          <span className="app-compose-kind-plus" aria-hidden="true">
                            +
                          </span>
                          <Icon />
                        </>
                      )}
                      <span>{label}</span>
                    </button>
                  ))}
                </ComposerOverlayMenu>
                <button
                  ref={composeKindButtonRef}
                  type="button"
                  className="app-compose-kind-button"
                  aria-label="Choose compose type"
                  aria-expanded={composeKindMenuOpen}
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setDurationMenuOpen(false);
                    setUrgencyMenuOpen(false);
                    setImpactMenuOpen(false);
                    closeTaskToolHint();
                    setComposeKindMenuOpen((open) => !open);
                  }}
                  tabIndex={collapsed ? -1 : 0}
                >
                  <span>{selectedComposeKind.label}</span>
                </button>
                <button
                  ref={composeAddButtonRef}
                  type={hasText ? "submit" : "button"}
                  className={`app-composer-icon app-composer-add${hasText ? " is-ready" : ""}`}
                  aria-label={
                    hasText
                      ? editingTaskId != null
                        ? "Save"
                        : "Send"
                      : "Choose compose type"
                  }
                  aria-expanded={hasText ? undefined : composeKindMenuOpen}
                  tabIndex={collapsed ? -1 : 0}
                  onClick={
                    hasText
                      ? undefined
                      : () => {
                          setAttachMenuOpen(false);
                          setDurationMenuOpen(false);
                          setUrgencyMenuOpen(false);
                          setImpactMenuOpen(false);
                          closeTaskToolHint();
                          setComposeKindMenuOpen((open) => !open);
                        }
                  }
                >
                  {hasText ? (
                    editingTaskId != null ? (
                      <CheckIcon />
                    ) : (
                      <SendIcon />
                    )
                  ) : (
                    <ComposeAddIcon Icon={SelectedComposeIcon} showPlus={composeKind !== "assistant"} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
