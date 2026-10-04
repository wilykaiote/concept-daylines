import type { ReactNode } from "react";
import { DayScheduleTrack } from "./DayScheduleTrack";
import { DayWheelChart, type DayWheelSlice } from "./DayWheelChart";
import { TwinelineCountdownButton } from "./TwinelineCountdownButton";
import type { ComposerDraft } from "./composer";
import type { ScheduleSegment } from "./schedule";

const ENERGY_DIVIDER_PCT = 62;

type HomeViewProps = {
  wheelLabel: string;
  wheelSlices: DayWheelSlice[];
  wheelElapsedEndMin: number | null;
  windowStartMin: number;
  windowEndMin: number;
  countdownRemaining: string;
  targetTimeLabel: string;
  windowStartLabel: string;
  timePickerOpen: boolean;
  daySnoozed: boolean;
  outsideTaskWindow: boolean;
  onCountdownClick: () => void;
  focusTask: ComposerDraft | null;
  dayElapsedPct: number;
  focusCountdownLabel: string | null;
  focusTimelineMinutes: number;
  focusScheduleSegments: ScheduleSegment[];
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
  countdownRemaining,
  targetTimeLabel,
  windowStartLabel,
  timePickerOpen,
  daySnoozed,
  outsideTaskWindow,
  onCountdownClick,
  focusTask,
  dayElapsedPct,
  focusCountdownLabel,
  focusTimelineMinutes,
  focusScheduleSegments,
  renderFocusTask,
  overdueTasks,
  overdueOpen,
  onOverdueToggle,
  renderOverdueTask,
}: HomeViewProps) {
  return (
    <div className="home-view">
      <div className="home-chrome">
        <header className="home-header">
          <div className="home-wheel-row">
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
            <div className="home-wheel-key-col">
              <TwinelineCountdownButton
                countdownRemaining={countdownRemaining}
                targetTimeLabel={targetTimeLabel}
                windowStartLabel={windowStartLabel}
                timePickerOpen={timePickerOpen}
                daySnoozed={daySnoozed}
                outsideTaskWindow={outsideTaskWindow}
                onClick={onCountdownClick}
              />
              <ul className="home-wheel-key" aria-label="Day wheel color key">
                <li className="home-wheel-key-item is-anchored">Anchored</li>
                <li className="home-wheel-key-item is-soft">Soft</li>
                <li className="home-wheel-key-item is-overdue">Overdue</li>
              </ul>
            </div>
          </div>

          <div className="home-focus">
            {focusTask != null ? (
              <div className="home-focus-current">
                <div className="home-focus-track-row">
                  <DayScheduleTrack
                    className="home-focus-track"
                    segments={focusScheduleSegments}
                    timelineMinutes={focusTimelineMinutes}
                    elapsedPct={dayElapsedPct}
                    windowStartMin={windowStartMin}
                    windowEndMin={windowEndMin}
                    aria-label={`Day progress ${Math.round(dayElapsedPct)} percent`}
                  />
                  {focusCountdownLabel != null && (
                    <span
                      className="home-focus-countdown"
                      aria-label={`Time remaining ${focusCountdownLabel}`}
                    >
                      {focusCountdownLabel}
                    </span>
                  )}
                </div>
                <span className="home-focus-badge">Focus</span>
                <ul className="task-day-tasks home-focus-task">{renderFocusTask(focusTask)}</ul>
              </div>
            ) : (
              <p className="home-focus-empty">No focus task right now</p>
            )}
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
            {overdueTasks.length > 0 && overdueOpen && (
              <section
                id="home-overdue-list"
                className="task-overdue-section home-overdue-section"
                aria-label="Overdue tasks"
              >
                <ul className="task-day-tasks task-overdue-tasks">
                  {overdueTasks.map((task) => renderOverdueTask(task))}
                </ul>
              </section>
            )}
          </div>

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
