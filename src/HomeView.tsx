import { useState, type ReactNode } from "react";
import { DayWheelChart, type DayWheelSlice } from "./DayWheelChart";
import type { ComposerDraft } from "./composer";

const ENERGY_DIVIDER_PCT = 62;
const HOME_STEP_COUNT = 4;

type HomeViewProps = {
  wheelLabel: string;
  wheelSlices: DayWheelSlice[];
  wheelElapsedEndMin: number | null;
  windowStartMin: number;
  windowEndMin: number;
  focusTask: ComposerDraft | null;
  renderFocusTask: (task: ComposerDraft) => ReactNode;
  overdueTasks: ComposerDraft[];
  overdueOpen: boolean;
  onOverdueToggle: () => void;
  renderOverdueTask: (task: ComposerDraft) => ReactNode;
};

export function HomeView({
  wheelLabel,
  wheelSlices,
  wheelElapsedEndMin,
  windowStartMin,
  windowEndMin,
  focusTask,
  renderFocusTask,
  overdueTasks,
  overdueOpen,
  onOverdueToggle,
  renderOverdueTask,
}: HomeViewProps) {
  const [homeStepIndex, setHomeStepIndex] = useState(0);
  const canStepBack = homeStepIndex > 0;
  const canStepForward = homeStepIndex < HOME_STEP_COUNT - 1;

  return (
    <div className="home-view">
      <div className="home-chrome">
        <header className="home-header">
          <div className="home-top-row">
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
              />
            </div>
            <div className="home-top-main">
              {focusTask != null ? (
                <div className="home-focus-current">
                  <ul className="task-day-tasks home-focus-task">{renderFocusTask(focusTask)}</ul>
                </div>
              ) : (
                <p className="home-focus-empty">No focus task right now</p>
              )}
              <div className="home-wheel-key-col">
                {overdueTasks.length > 0 && (
                  <button
                    type="button"
                    className={`task-day-label task-overdue-toggle home-overdue-toggle${overdueOpen ? " is-open" : ""}`}
                    aria-expanded={overdueOpen}
                    aria-controls="home-overdue-list"
                    aria-label="Reschedule overdue tasks"
                    onClick={onOverdueToggle}
                  >
                    <span className="task-overdue-toggle-action">
                      <span className="task-overdue-toggle-reschedule">
                        Reschedule Overdue Tasks
                      </span>
                      <span className="task-overdue-toggle-chevron" aria-hidden="true">
                        {overdueOpen ? "∨" : ">"}
                      </span>
                    </span>
                  </button>
                )}
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
                  <div className="home-step-nav-track" aria-hidden="true">
                    <span
                      className={`home-step-nav-edge${canStepBack ? "" : " is-start"}`}
                    />
                    {Array.from({ length: HOME_STEP_COUNT }, (_, index) => (
                      <span
                        key={index}
                        className={`home-step-nav-dot${index === homeStepIndex ? " is-current" : ""}${index < homeStepIndex ? " is-past" : ""}`}
                      />
                    ))}
                    <span
                      className={`home-step-nav-edge${canStepForward ? "" : " is-end"}`}
                    />
                  </div>
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
              </div>
            </div>
          </div>

          {overdueTasks.length > 0 && overdueOpen && (
            <div className="home-focus">
              <section
                id="home-overdue-list"
                className="task-overdue-section home-overdue-section"
                aria-label="Overdue tasks"
              >
                <ul className="task-day-tasks task-overdue-tasks">
                  {overdueTasks.map((task) => renderOverdueTask(task))}
                </ul>
              </section>
            </div>
          )}

          <div className="home-side">
            <div
              className="home-energy"
              role="img"
              aria-label={`Energy balance, marker at ${ENERGY_DIVIDER_PCT}% toward out`}
            >
              <div className="home-energy-labels">
                <span>IN</span>
                <span>OUT</span>
              </div>
              <div className="home-energy-track">
                <span
                  className="home-energy-divider"
                  style={{ left: `${ENERGY_DIVIDER_PCT}%` }}
                />
              </div>
            </div>
            <div className="home-rings" aria-hidden="true">
              <div className="home-ring-slot">
                <span className="home-ring" />
              </div>
              <div className="home-ring-slot">
                <span className="home-ring" />
              </div>
              <div className="home-ring-slot">
                <span className="home-ring" />
              </div>
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}
