import { type ReactNode } from "react";
import { DayWheelChart, type DayWheelSlice } from "./DayWheelChart";
import type { ComposerDraft } from "./composer";

type HomePlanTask = {
  id: string;
  title: string;
  scheduleKind: "anchored" | "soft";
  popping?: boolean;
};

type HomePlanTile = {
  id: string;
  title: string;
  completedCount: number;
  taskCount: number;
  nextUpTask: HomePlanTask | null;
  tasks: readonly HomePlanTask[];
};

const PLACEHOLDER_PLANS: HomePlanTile[] = [
  {
    id: "placeholder-focus",
    title: "Deep Focus",
    completedCount: 1,
    taskCount: 4,
    nextUpTask: {
      id: "ph-focus-1",
      title: "Outline the draft",
      scheduleKind: "soft",
    },
    tasks: [
      { id: "ph-focus-2", title: "Write the intro", scheduleKind: "soft" },
      { id: "ph-focus-3", title: "Review notes", scheduleKind: "anchored" },
    ],
  },
  {
    id: "placeholder-move",
    title: "Daily Move",
    completedCount: 0,
    taskCount: 3,
    nextUpTask: {
      id: "ph-move-1",
      title: "10-minute walk",
      scheduleKind: "soft",
    },
    tasks: [
      { id: "ph-move-2", title: "Stretch break", scheduleKind: "soft" },
    ],
  },
  {
    id: "placeholder-reset",
    title: "Evening Reset",
    completedCount: 2,
    taskCount: 2,
    nextUpTask: null,
    tasks: [],
  },
  {
    id: "placeholder-fuel",
    title: "Fuel Plan",
    completedCount: 1,
    taskCount: 5,
    nextUpTask: {
      id: "ph-fuel-1",
      title: "Prep lunch",
      scheduleKind: "soft",
    },
    tasks: [
      { id: "ph-fuel-2", title: "Fill water bottle", scheduleKind: "soft" },
    ],
  },
];

type HomeViewProps = {
  wheelLabel: string;
  wheelSlices: DayWheelSlice[];
  wheelElapsedEndMin: number | null;
  windowStartMin: number;
  windowEndMin: number;
  wheelCountdown: ReactNode;
  plans: HomePlanTile[];
  onSelectPlan: (planId: string) => void;
  onCompletePlanTask: (taskId: string) => void;
  onEditPlanTask: (taskId: string) => void;
  focusTask: ComposerDraft | null;
  renderFocusTask: (task: ComposerDraft) => ReactNode;
  focusLockControl?: ReactNode;
  focusFreeTime?: boolean;
  focusRest?: boolean;
  focusRescheduleOverflow?: boolean;
  onAutomaticOverflowReschedule?: () => void;
  focusCountdownLabel?: string | null;
  focusCountdownProgress?: number | null;
  focusCountdownBarColor?: string | null;
};

export function HomeView({
  wheelLabel,
  wheelSlices,
  wheelElapsedEndMin,
  windowStartMin,
  windowEndMin,
  wheelCountdown,
  plans,
  onSelectPlan,
  onCompletePlanTask,
  onEditPlanTask,
  focusTask,
  renderFocusTask,
  focusLockControl,
  focusFreeTime = false,
  focusRest = false,
  focusRescheduleOverflow = false,
  onAutomaticOverflowReschedule,
  focusCountdownLabel = null,
  focusCountdownProgress = null,
  focusCountdownBarColor = null,
}: HomeViewProps) {
  const planTiles = plans.length > 0 ? plans : [...PLACEHOLDER_PLANS];
  const showFocusCountdownBar =
    typeof focusCountdownProgress === "number" &&
    Number.isFinite(focusCountdownProgress);
  const renderPlanTaskRow = (task: HomePlanTask) => (
    <li key={task.id} className="home-plan-task">
      <button
        type="button"
        className={`task-complete is-${task.scheduleKind}${
          task.popping ? " is-checked" : ""
        }`}
        aria-label={`Mark complete ${task.title}`}
        disabled={task.popping}
        onClick={() => onCompletePlanTask(task.id)}
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
        className="home-plan-task-body"
        aria-label={`Edit task ${task.title}`}
        onClick={() => onEditPlanTask(task.id)}
      >
        <p className="task-row-title">{task.title}</p>
      </button>
    </li>
  );
  const renderFocusStatusBox = (title: "Rest" | "Free time") => (
    <div
      className={`task-current-focus-free-time${showFocusCountdownBar ? " has-countdown" : ""}`}
      aria-label={title}
    >
      {showFocusCountdownBar && (
        <div
          className="task-row-countdown"
          aria-hidden="true"
          style={
            focusCountdownBarColor != null
              ? { background: focusCountdownBarColor }
              : undefined
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
  const renderFocusRescheduleOverflowBox = () => (
    <div
      className={`task-current-focus-free-time task-current-focus-reschedule${showFocusCountdownBar ? " has-countdown" : ""}`}
      aria-label="Reschedule Overflow"
    >
      {showFocusCountdownBar && (
        <div
          className="task-row-countdown"
          aria-hidden="true"
          style={
            focusCountdownBarColor != null
              ? { background: focusCountdownBarColor }
              : undefined
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
      <p className="task-current-focus-free-time-title">Reschedule Overflow:</p>
      <div className="task-current-focus-reschedule-actions">
        <button
          type="button"
          className="task-current-focus-reschedule-btn is-automatic"
          onClick={onAutomaticOverflowReschedule}
        >
          Automatic
        </button>
        <button
          type="button"
          className="task-current-focus-reschedule-btn is-manual"
        >
          Manual
        </button>
      </div>
    </div>
  );

  return (
    <div className="home-view">
      <div className="home-chrome">
        <header className="home-header">
          <div className="home-top-row">
            <div className="home-top-main">
              {focusRescheduleOverflow ? (
                <div className="home-focus-current">
                  <div className="task-current-focus-label-row">
                    <p className="task-current-focus-label">
                      Current focus
                      {focusCountdownLabel != null && (
                        <span className="task-current-focus-countdown" aria-live="polite">
                          {focusCountdownLabel}
                        </span>
                      )}
                    </p>
                  </div>
                  {renderFocusRescheduleOverflowBox()}
                </div>
              ) : focusRest ? (
                <div className="home-focus-current">
                  <div className="task-current-focus-label-row">
                    <p className="task-current-focus-label">
                      Current focus
                      {focusCountdownLabel != null && (
                        <span className="task-current-focus-countdown" aria-live="polite">
                          {focusCountdownLabel}
                        </span>
                      )}
                    </p>
                  </div>
                  {renderFocusStatusBox("Rest")}
                </div>
              ) : focusTask != null ? (
                <div className="home-focus-current">
                  <div className="task-current-focus-label-row">
                    <p className="task-current-focus-label">
                      Current focus
                      {focusCountdownLabel != null && (
                        <span className="task-current-focus-countdown" aria-live="polite">
                          {focusCountdownLabel}
                        </span>
                      )}
                    </p>
                    {focusLockControl}
                  </div>
                  {focusFreeTime ? (
                    renderFocusStatusBox("Free time")
                  ) : (
                    <ul className="task-day-tasks home-focus-task">{renderFocusTask(focusTask)}</ul>
                  )}
                </div>
              ) : (
                <p className="home-focus-empty">No focus task right now</p>
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="home-plans" aria-label="Plans">
        <div className="home-plans-grid">
          {planTiles.map((plan) => {
            const taskCount = Math.max(0, plan.taskCount);
            const completedCount = Math.min(
              taskCount,
              Math.max(0, plan.completedCount),
            );
            const segmentCount = Math.max(1, taskCount);
            return (
              <div key={plan.id} className="home-plan-card">
                <button
                  type="button"
                  className="home-plan-app"
                  onClick={() => onSelectPlan(plan.id)}
                >
                  <span className="home-plan-app-label">{plan.title}</span>
                  <div
                    className="home-plan-progress"
                    aria-label={`${completedCount} of ${taskCount} tasks completed`}
                  >
                    <div className="home-plan-progress-bar" aria-hidden="true">
                      {Array.from({ length: segmentCount }, (_, index) => (
                        <span
                          key={index}
                          className={`home-plan-progress-seg${
                            taskCount > 0 && index < completedCount ? " is-done" : ""
                          }`}
                        />
                      ))}
                    </div>
                    <span className="home-plan-progress-count">
                      {completedCount} / {taskCount}
                    </span>
                  </div>
                </button>
                <div className="home-plan-next">
                  <span className="home-plan-next-kicker">Next up</span>
                  {plan.nextUpTask != null ? (
                    <ul className="home-plan-tasks is-next-up" aria-label={`${plan.title} next up`}>
                      {renderPlanTaskRow(plan.nextUpTask)}
                    </ul>
                  ) : (
                    <p className="home-plan-next-empty">Nothing queued</p>
                  )}
                </div>
                {plan.tasks.length > 0 && (
                  <ul className="home-plan-tasks" aria-label={`${plan.title} tasks`}>
                    {plan.tasks.map((task) => renderPlanTaskRow(task))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="home-wheel">
        <DayWheelChart
          label={wheelLabel}
          slices={wheelSlices}
          elapsedEndMin={wheelElapsedEndMin}
          windowStartMin={windowStartMin}
          windowEndMin={windowEndMin}
          showLegend={false}
          showLabel={false}
          compact
          hubCenter={wheelCountdown}
        />
      </div>
    </div>
  );
}
