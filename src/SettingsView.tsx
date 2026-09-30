type SettingsViewProps = {
  taskGapInput: string;
  onTaskGapInputChange: (value: string) => void;
  onTaskGapCommit: (value: string) => void;
  onTaskGapStep: (direction: 1 | -1) => void;
};

export function SettingsView({
  taskGapInput,
  onTaskGapInputChange,
  onTaskGapCommit,
  onTaskGapStep,
}: SettingsViewProps) {
  return (
    <div className="settings-view">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </header>

      <section className="settings-section" aria-label="Time Between Tasks">
        <h2 className="settings-section-title">Time Between Tasks</h2>
        <p className="settings-section-copy">
          Soft-pack gap between untimed tasks on the timeline.
        </p>
        <div className="app-duration-stepper settings-gap-stepper" role="group" aria-label="Minutes between tasks">
          <button
            type="button"
            className="app-duration-step"
            aria-label="Decrease by 5 minutes"
            onClick={() => onTaskGapStep(-1)}
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="app-duration-input"
            value={taskGapInput}
            aria-label="Minutes between tasks"
            onChange={(e) => {
              const next = e.target.value;
              if (next === "" || /^\d*$/.test(next)) onTaskGapInputChange(next);
            }}
            onBlur={() => onTaskGapCommit(taskGapInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onTaskGapCommit(taskGapInput);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <button
            type="button"
            className="app-duration-step"
            aria-label="Increase by 5 minutes"
            onClick={() => onTaskGapStep(1)}
          >
            +
          </button>
        </div>
        <p className="settings-gap-unit">Minutes</p>
      </section>
    </div>
  );
}
