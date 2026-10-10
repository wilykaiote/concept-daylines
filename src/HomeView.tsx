import { useState, type ReactNode } from "react";
import { DayWheelChart, type DayWheelSlice } from "./DayWheelChart";
import type { ComposerDraft } from "./composer";

const HOME_STEP_COUNT = 4;

const PLACEHOLDER_PLANS = [
  { id: "placeholder-focus", title: "Deep Focus", nextTaskTitle: "Outline the draft" },
  { id: "placeholder-move", title: "Daily Move", nextTaskTitle: "10-minute walk" },
  { id: "placeholder-reset", title: "Evening Reset", nextTaskTitle: "Clear the desk" },
  { id: "placeholder-fuel", title: "Fuel Plan", nextTaskTitle: "Prep lunch" },
] as const;

type HomePlanTile = {
  id: string;
  title: string;
  nextTaskTitle: string | null;
};

type HomeViewProps = {
  wheelLabel: string;
  wheelSlices: DayWheelSlice[];
  wheelElapsedEndMin: number | null;
  windowStartMin: number;
  windowEndMin: number;
  wheelCountdown: ReactNode;
  plans: HomePlanTile[];
  onSelectPlan: (planId: string) => void;
  focusTask: ComposerDraft | null;
  renderFocusTask: (task: ComposerDraft) => ReactNode;
  focusLockControl?: ReactNode;
  focusFreeTime?: boolean;
  focusCountdownLabel?: string | null;
  deferredTasks: ComposerDraft[];
  overdueTasks: ComposerDraft[];
  overdueOpen: boolean;
  onOverdueToggle: () => void;
  renderDeferredTask: (task: ComposerDraft, index: number) => ReactNode;
  renderOverdueTask: (task: ComposerDraft, index: number) => ReactNode;
  overflowPinnedBucket?: "overdue" | "deferred" | null;
  renderOverflowBucketItems?: (
    bucket: "overdue" | "deferred",
    tasks: ComposerDraft[],
    renderTask: (task: ComposerDraft, index: number) => ReactNode,
  ) => ReactNode;
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
  focusTask,
  renderFocusTask,
  focusLockControl,
  focusFreeTime = false,
  focusCountdownLabel = null,
  deferredTasks,
  overdueTasks,
  overdueOpen,
  onOverdueToggle,
  renderDeferredTask,
  renderOverdueTask,
  overflowPinnedBucket = null,
  renderOverflowBucketItems,
}: HomeViewProps) {
  const [homeStepIndex, setHomeStepIndex] = useState(0);
  const canStepBack = homeStepIndex > 0;
  const canStepForward = homeStepIndex < HOME_STEP_COUNT - 1;
  const planTiles = plans.length > 0 ? plans : [...PLACEHOLDER_PLANS];
  const overflowCount =
    deferredTasks.length +
    overdueTasks.length +
    (overflowPinnedBucket != null ? 1 : 0);
  const overflowDeferOnly =
    overdueTasks.length === 0 &&
    deferredTasks.length > 0 &&
    overflowPinnedBucket !== "overdue";
  const showOverdueBucket =
    overdueTasks.length > 0 || overflowPinnedBucket === "overdue";
  const showDeferredBucket =
    deferredTasks.length > 0 || overflowPinnedBucket === "deferred";

  return (
    <div className="home-view">
      <div className="home-chrome">
        <header className="home-header">
          <div className="home-top-row">
            <div className="home-wheel">
              <div
                className="home-step-nav"
                role="group"
                aria-label={`Step ${homeStepIndex + 1} of ${HOME_STEP_COUNT}`}
              >
                <button
                  type="button"
                  className="home-step-nav-btn is-prev"
                  aria-label="Previous step"
                  disabled={!canStepBack}
                  onClick={() => setHomeStepIndex((step) => Math.max(0, step - 1))}
                >
                  ‹
                </button>
                <p className="home-step-nav-date">
                  {wheelLabel.startsWith("Today - ") ? (
                    <>
                      <span className="date-title-calendar-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
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
                      </span>
                      {wheelLabel.slice("Today - ".length)}
                    </>
                  ) : (
                    wheelLabel
                  )}
                </p>
                <button
                  type="button"
                  className="home-step-nav-btn is-next"
                  aria-label="Next step"
                  disabled={!canStepForward}
                  onClick={() =>
                    setHomeStepIndex((step) => Math.min(HOME_STEP_COUNT - 1, step + 1))
                  }
                >
                  ›
                </button>
              </div>
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
            <div className="home-top-main">
              {focusTask != null ? (
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
                    <div className="task-current-focus-free-time" aria-label="Free time">
                      <p className="task-current-focus-free-time-title">Free time</p>
                    </div>
                  ) : (
                    <ul className="task-day-tasks home-focus-task">{renderFocusTask(focusTask)}</ul>
                  )}
                </div>
              ) : (
                <p className="home-focus-empty">No focus task right now</p>
              )}
              {overflowCount > 0 && (
                <button
                  type="button"
                  className={`task-day-label task-overdue-toggle home-overdue-toggle${overdueOpen ? " is-open" : ""}${overflowDeferOnly ? " is-defer-only" : ""}`}
                  aria-expanded={overdueOpen}
                  aria-controls="home-overdue-list"
                  aria-label="Overflow"
                  onClick={onOverdueToggle}
                >
                  <span className="task-overdue-toggle-action">
                    <span className="task-overdue-toggle-reschedule">
                      <span className="task-overdue-toggle-count">{overflowCount}</span>{" "}
                      {overflowCount === 1 ? "task" : "tasks"} moved to{" "}
                      <span className="task-overflow-notice-overflow">Overflow</span>
                    </span>
                    <span className="task-overdue-toggle-chevron" aria-hidden="true">
                      {overdueOpen ? "∨" : ">"}
                    </span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {overflowCount > 0 && overdueOpen && (
            <div className="home-focus">
              <section
                id="home-overdue-list"
                className={`task-overdue-section home-overdue-section${overflowDeferOnly ? " is-defer-only" : ""}`}
                aria-label="Overflow tasks"
              >
                {showOverdueBucket && (
                  <div className="task-overflow-bucket">
                    <ul className="task-day-tasks task-overdue-tasks">
                      {renderOverflowBucketItems != null
                        ? renderOverflowBucketItems(
                            "overdue",
                            overdueTasks,
                            renderOverdueTask,
                          )
                        : overdueTasks.map((task, index) =>
                            renderOverdueTask(task, index),
                          )}
                    </ul>
                  </div>
                )}
                {showDeferredBucket && (
                  <div className="task-overflow-bucket">
                    <ul className="task-day-tasks task-overdue-tasks">
                      {renderOverflowBucketItems != null
                        ? renderOverflowBucketItems(
                            "deferred",
                            deferredTasks,
                            renderDeferredTask,
                          )
                        : deferredTasks.map((task, index) =>
                            renderDeferredTask(task, index),
                          )}
                    </ul>
                  </div>
                )}
                <p className="task-overflow-footer">
                  <span className="task-overflow-notice-overflow">Overflow</span>{" "}
                  tasks will be rescheduled at end of day
                </p>
              </section>
            </div>
          )}
        </header>
      </div>

      <div className="home-plans" aria-label="Plans">
        <div className="home-plans-grid">
          {planTiles.map((plan) => (
            <div key={plan.id} className="home-plan-card">
              <button
                type="button"
                className="home-plan-app"
                onClick={() => onSelectPlan(plan.id)}
              >
                <span className="home-plan-app-icon" aria-hidden="true">
                  {plan.title.slice(0, 1).toUpperCase()}
                </span>
                <span className="home-plan-app-label">{plan.title}</span>
              </button>
              <div className="home-plan-next">
                <span className="home-plan-next-kicker">Next up</span>
                <span className="home-plan-next-title">
                  {plan.nextTaskTitle?.trim() || "Nothing queued"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
