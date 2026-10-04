import { MINUTES_PER_DAY, parseTimeOfDay } from "./calendarTimeline";
import type { ComposerDraft } from "./composer";
import type { ScheduleSegment } from "./schedule";

function scheduleBlockKind(
  task: ComposerDraft,
  overdue?: boolean,
): "anchored" | "soft" | "overdue" {
  if (overdue) return "overdue";
  if (parseTimeOfDay(task.starts_at) != null || parseTimeOfDay(task.due_at) != null) {
    return "anchored";
  }
  return "soft";
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

export type DayScheduleTrackProps = {
  segments: ScheduleSegment[];
  timelineMinutes: number;
  /** 0–100 portion of the day that has elapsed. */
  elapsedPct?: number;
  windowStartMin?: number;
  windowEndMin?: number;
  className?: string;
  "aria-label"?: string;
  completedCount?: number;
  focusedTaskId?: string | null;
  isTaskHighlighted?: (taskId: string | null | undefined) => boolean;
  isTaskPopping?: (taskId: string | null | undefined) => boolean;
  onTaskSelect?: (task: ComposerDraft) => void;
};

export function DayScheduleTrack({
  segments,
  timelineMinutes,
  elapsedPct = 0,
  windowStartMin,
  windowEndMin,
  className,
  "aria-label": ariaLabel,
  completedCount = 0,
  focusedTaskId = null,
  isTaskHighlighted,
  isTaskPopping,
  onTaskSelect,
}: DayScheduleTrackProps) {
  const windowStartPct =
    windowStartMin == null ? null : (windowStartMin / MINUTES_PER_DAY) * 100;
  const windowEndPct =
    windowEndMin == null ? null : (windowEndMin / MINUTES_PER_DAY) * 100;
  const showCompleted = completedCount > 0;
  const interactive = onTaskSelect != null;

  return (
    <div
      className={[
        "twineline-schedule-track",
        showCompleted ? "has-completed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      <div className="twineline-schedule-lane">
        {elapsedPct > 0 && (
          <div
            className="twineline-schedule-elapsed"
            style={{ width: `${elapsedPct}%` }}
            aria-hidden="true"
          />
        )}
        {windowStartPct != null && (
          <div
            className="twineline-schedule-window-marker is-start"
            style={{ left: `${windowStartPct}%` }}
            aria-hidden="true"
          />
        )}
        {windowEndPct != null && (
          <div
            className="twineline-schedule-window-marker is-end"
            style={{ left: `${windowEndPct}%` }}
            aria-hidden="true"
          />
        )}
        {segments.map((segment, index) => {
          const widthPercent =
            (Math.max(segment.minutes, segment.type === "task" ? 0.01 : 0) /
              Math.max(timelineMinutes, 0.001)) *
            100;
          if (segment.type === "gap") {
            return (
              <div
                key={`gap-${index}`}
                className="twineline-schedule-gap"
                style={{ flex: `0 0 ${widthPercent}%` }}
                aria-hidden="true"
              />
            );
          }

          const taskId = segment.task.id;
          const kind = scheduleBlockKind(segment.task, segment.overdue);
          const highlighted = isTaskHighlighted?.(taskId) ?? false;
          const popping = isTaskPopping?.(taskId) ?? false;
          const classNames = [
            "twineline-schedule-block",
            `is-${kind}`,
            highlighted ? "is-highlighted" : "",
            popping ? "is-popping" : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (!interactive) {
            return (
              <div
                key={taskId ?? `task-${index}`}
                className={classNames}
                style={{ flex: `0 0 ${widthPercent}%` }}
                title={`${segment.task.title} · ${segment.minutes}m`}
              />
            );
          }

          return (
            <button
              key={taskId ?? `task-${index}`}
              type="button"
              data-schedule-task-id={taskId ?? undefined}
              className={classNames}
              style={{ flex: `0 0 ${widthPercent}%` }}
              title={`${segment.task.title} · ${segment.minutes}m`}
              aria-label={`${segment.task.title}, ${segment.minutes} minutes`}
              aria-pressed={focusedTaskId === taskId}
              disabled={popping}
              onClick={() => {
                if (!taskId || popping) return;
                onTaskSelect(segment.task);
              }}
            />
          );
        })}
      </div>
      {showCompleted && (
        <>
          <span className="twineline-schedule-completed-check" aria-hidden="true">
            <CheckIcon />
          </span>
          <span
            className="twineline-schedule-completed"
            aria-label={`${completedCount} task${completedCount === 1 ? "" : "s"} completed today`}
            title={`${completedCount} completed today`}
          >
            {completedCount}
          </span>
        </>
      )}
    </div>
  );
}
