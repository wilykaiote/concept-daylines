import { type ReactNode } from "react";
import { DayWheelChart, type DayWheelSlice } from "./DayWheelChart";

type HomePlanTask = {
  id: string;
  title: string;
  scheduleKind: "anchored" | "soft" | "undated";
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

function pickFocusPlan(
  plans: readonly HomePlanTile[],
  preferredPlanId: string | null,
): HomePlanTile | null {
  if (plans.length === 0) return null;
  if (preferredPlanId != null) {
    const preferred = plans.find((plan) => plan.id === preferredPlanId);
    if (preferred != null) return preferred;
  }
  const named = plans.find((plan) =>
    /nutrition|fuel|food|meal/i.test(plan.title),
  );
  if (named != null) return named;
  const withNext = plans.find((plan) => plan.nextUpTask != null);
  return withNext ?? plans[0] ?? null;
}

type HomeViewProps = {
  wheelLabel: string;
  wheelSlices: DayWheelSlice[];
  wheelElapsedEndMin: number | null;
  windowStartMin: number;
  windowEndMin: number;
  wheelCountdown: ReactNode;
  plans: HomePlanTile[];
  /** Plan to feature in the header (e.g. parent of today's focus task). */
  focusPlanId?: string | null;
  onSelectPlan: (planId: string) => void;
  onCompletePlanTask: (taskId: string) => void;
  onEditPlanTask: (taskId: string) => void;
};

export function HomeView({
  wheelLabel,
  wheelSlices,
  wheelElapsedEndMin,
  windowStartMin,
  windowEndMin,
  wheelCountdown,
  plans,
  focusPlanId = null,
  onSelectPlan,
  onCompletePlanTask,
  onEditPlanTask,
}: HomeViewProps) {
  const focusPlan = pickFocusPlan(plans, focusPlanId);
  const gridPlans =
    focusPlan != null ? plans.filter((plan) => plan.id !== focusPlan.id) : plans;

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

  const renderPlanCard = (plan: HomePlanTile, featured = false) => {
    const taskCount = Math.max(0, plan.taskCount);
    const completedCount = Math.min(taskCount, Math.max(0, plan.completedCount));
    const segmentCount = Math.max(1, taskCount);
    return (
      <div
        key={plan.id}
        className={`home-plan-card${featured ? " is-focus-plan" : ""}`}
      >
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
          <span className="home-plan-next-kicker">
            {featured ? "Current plan" : "Next up"}
          </span>
          {plan.nextUpTask != null ? (
            <ul
              className="home-plan-tasks is-next-up"
              aria-label={`${plan.title} next up`}
            >
              {renderPlanTaskRow(plan.nextUpTask)}
            </ul>
          ) : (
            <p className="home-plan-next-empty">Nothing queued</p>
          )}
        </div>
        {!featured && plan.tasks.length > 0 && (
          <ul className="home-plan-tasks" aria-label={`${plan.title} tasks`}>
            {plan.tasks.map((task) => renderPlanTaskRow(task))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="home-view">
      <div className="home-chrome">
        <header className="home-header">
          <div className="home-top-row">
            <div className="home-top-main">
              {focusPlan != null && (
                <div className="home-focus-plan" aria-label="Current focus plan">
                  {renderPlanCard(focusPlan, true)}
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="home-plans" aria-label="Plans">
        <div className="home-plans-grid">
          {gridPlans.map((plan) => renderPlanCard(plan))}
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
