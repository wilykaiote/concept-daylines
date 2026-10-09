import type { CSSProperties } from "react";
import { MINUTES_PER_DAY, parseTaskDate, parseTimeOfDay } from "./calendarTimeline";
import type { ComposerDraft } from "./composer";
import { daySkyCssStops } from "./daySky";
import type { ScheduleSegment } from "./schedule";

const SCHEDULE_DAY_SKY = daySkyCssStops();

function scheduleBlockKind(
  task: ComposerDraft,
  overdue?: boolean,
): "anchored" | "soft" | "overdue" {
  if (overdue) return "overdue";
  if (
    parseTaskDate(task.date) != null ||
    parseTimeOfDay(task.starts_at) != null ||
    parseTimeOfDay(task.due_at) != null
  ) {
    return "anchored";
  }
  return "soft";
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
  focusedTaskId = null,
  isTaskHighlighted,
  isTaskPopping,
  onTaskSelect,
}: DayScheduleTrackProps) {
  const windowStartPct =
    windowStartMin == null ? null : (windowStartMin / MINUTES_PER_DAY) * 100;
  const windowEndPct =
    windowEndMin == null ? null : (windowEndMin / MINUTES_PER_DAY) * 100;
  const interactive = onTaskSelect != null;
  const hourTicks = Array.from({ length: 25 }, (_, hour) => {
    const leftPct = (hour / 24) * 100;
    return {
      hour,
      leftPct,
      major: hour % 6 === 0,
    };
  }).filter(({ leftPct }) => leftPct > elapsedPct);

  return (
    <div
      className={["twineline-schedule-track", className].filter(Boolean).join(" ")}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      <div className="twineline-schedule-lane">
        <div
          className="twineline-schedule-ruler"
          aria-hidden="true"
          style={
            {
              "--schedule-day-sky": `linear-gradient(to right, ${SCHEDULE_DAY_SKY})`,
            } as CSSProperties
          }
        >
          <div className="twineline-schedule-ruler-line" />
          {elapsedPct > 0 && (
            <div
              className="twineline-schedule-elapsed"
              style={{ width: `${elapsedPct}%` }}
            >
              <div
                className="twineline-schedule-elapsed-sky"
                style={{
                  width: `${(100 / Math.max(elapsedPct, 0.001)) * 100}%`,
                }}
              />
            </div>
          )}
          {hourTicks.map(({ hour, leftPct, major }) => (
            <span
              key={hour}
              className={[
                "twineline-schedule-ruler-tick",
                major ? "is-major" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  left: `${leftPct}%`,
                  "--tick-pct": String(leftPct / 100),
                } as CSSProperties
              }
            />
          ))}
        </div>
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
        <div className="twineline-schedule-lane-blocks">
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
                aria-pressed={
                  isTaskHighlighted?.(taskId) ?? focusedTaskId === taskId
                }
                disabled={popping}
                onClick={() => {
                  if (!taskId || popping) return;
                  onTaskSelect(segment.task);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
