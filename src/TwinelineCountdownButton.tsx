type TwinelineCountdownButtonProps = {
  countdownRemaining: string;
  targetTimeLabel: string;
  windowStartLabel: string;
  timePickerOpen: boolean;
  daySnoozed: boolean;
  outsideTaskWindow: boolean;
  className?: string;
  onClick: () => void;
};

export function TwinelineCountdownButton({
  countdownRemaining,
  targetTimeLabel,
  windowStartLabel,
  timePickerOpen,
  daySnoozed,
  outsideTaskWindow,
  className = "",
  onClick,
}: TwinelineCountdownButtonProps) {
  return (
    <button
      type="button"
      className={`twineline-countdown-button${timePickerOpen ? " is-open" : ""}${
        daySnoozed || outsideTaskWindow ? " is-rest" : ""
      }${className ? ` ${className}` : ""}`}
      aria-label={
        timePickerOpen
          ? daySnoozed
            ? "Close target time picker. Day is snoozed."
            : outsideTaskWindow
              ? `Close target time picker. Rest time until ${windowStartLabel}.`
              : `Close target time picker. Currently ${targetTimeLabel}.`
          : daySnoozed
            ? "Day snoozed. Undated tasks are hidden. Change target time or turn snooze off."
            : outsideTaskWindow
              ? `Rest time. Outside task window until ${windowStartLabel}. Change target time.`
              : `Countdown to ${targetTimeLabel}. Change target time.`
      }
      aria-expanded={timePickerOpen}
      onClick={onClick}
    >
      {daySnoozed ? (
        <>
          <span className="twineline-countdown-remaining">SNOOZE</span>
          <span className="twineline-date-chevron" aria-hidden="true">
            {timePickerOpen ? "∨" : ">"}
          </span>
        </>
      ) : outsideTaskWindow ? (
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
  );
}
