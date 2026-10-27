import type { ComposerDraft } from "./composer";
import { addDays, isAnchoredTaskMissed, parseTaskDate } from "./calendarTimeline";
import { sameCalendarDay, toStartOfDay } from "./taskStorage";

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

function normalizeOptionalField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTaskClockLabel(hhmm: string): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? "pm" : "am";
  return `${hour12}:${String(minutes).padStart(2, "0")}${period}`;
}

export function formatTaskScheduleMetaLabel(
  task: Pick<ComposerDraft, "date" | "starts_at" | "due_at"> &
    Pick<Partial<ComposerDraft>, "est_duration">,
  now: Date,
  options?: { overflow?: boolean },
): string | null {
  if (options?.overflow && isAnchoredTaskMissed(task as ComposerDraft, now)) {
    return "OVERDUE";
  }

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
