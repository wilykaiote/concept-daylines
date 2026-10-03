import { MINUTES_PER_DAY } from "./calendarTimeline";

export type DayWheelSlice = {
  key: string;
  title: string;
  startMin: number;
  endMin: number;
  kind: "anchored" | "soft";
  overdue?: boolean;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function minutesToAngle(min: number) {
  return (min / MINUTES_PER_DAY) * 360;
}

function donutSegment(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startMin: number,
  endMin: number,
) {
  const start = minutesToAngle(Math.max(0, Math.min(MINUTES_PER_DAY, startMin)));
  let end = minutesToAngle(Math.max(0, Math.min(MINUTES_PER_DAY, endMin)));
  if (end - start < 1.2) end = start + 1.2;
  if (end - start >= 359.9) {
    // Full ring — approximate with two semicircles
    const mid = start + 180;
    const s = polar(cx, cy, rOuter, start);
    const m = polar(cx, cy, rOuter, mid);
    const e = polar(cx, cy, rOuter, end);
    const si = polar(cx, cy, rInner, start);
    const mi = polar(cx, cy, rInner, mid);
    const ei = polar(cx, cy, rInner, end);
    return [
      `M ${s.x} ${s.y}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${m.x} ${m.y}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${e.x} ${e.y}`,
      `L ${ei.x} ${ei.y}`,
      `A ${rInner} ${rInner} 0 1 0 ${mi.x} ${mi.y}`,
      `A ${rInner} ${rInner} 0 1 0 ${si.x} ${si.y}`,
      "Z",
    ].join(" ");
  }
  const large = end - start > 180 ? 1 : 0;
  const s = polar(cx, cy, rOuter, start);
  const e = polar(cx, cy, rOuter, end);
  const si = polar(cx, cy, rInner, start);
  const ei = polar(cx, cy, rInner, end);
  return [
    `M ${s.x} ${s.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${si.x} ${si.y}`,
    "Z",
  ].join(" ");
}

type DayWheelChartProps = {
  label: string;
  slices: DayWheelSlice[];
  /** Minutes from midnight; elapsed sector runs 0 → this value. */
  elapsedEndMin?: number | null;
  showLegend?: boolean;
  showLabel?: boolean;
  compact?: boolean;
};

export function DayWheelChart({
  label,
  slices,
  elapsedEndMin = null,
  showLegend = true,
  showLabel = true,
  compact = false,
}: DayWheelChartProps) {
  const size = 260;
  const pad = 16;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 112;
  const rInner = 58;
  const tickOuter = 118;
  const tickInner = 108;
  const elapsed =
    elapsedEndMin == null
      ? null
      : Math.max(0, Math.min(MINUTES_PER_DAY, elapsedEndMin));

  const hourTicks = Array.from({ length: 24 }, (_, hour) => {
    const angle = minutesToAngle(hour * 60);
    const a = polar(cx, cy, tickInner, angle);
    const b = polar(cx, cy, tickOuter, angle);
    const labelPos = polar(cx, cy, 128, angle);
    return { hour, a, b, labelPos };
  });

  return (
    <div className={`day-wheel${compact ? " is-compact" : ""}`}>
      {showLabel && <p className="day-wheel-label">{label}</p>}
      <svg
        className="day-wheel-svg"
        viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
        role="img"
        aria-label={`24-hour task wheel for ${label}`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={(rOuter + rInner) / 2}
          className="day-wheel-band"
          fill="none"
          strokeWidth={rOuter - rInner}
        />
        {elapsed != null && elapsed > 0 && (
          <path
            d={donutSegment(cx, cy, rOuter, rInner, 0, elapsed)}
            className="day-wheel-elapsed"
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          className="day-wheel-track"
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          className="day-wheel-hub"
          fill="none"
        />
        {hourTicks.map(({ hour, a, b, labelPos }) => (
          <g key={hour}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`day-wheel-tick${hour % 6 === 0 ? " is-major" : ""}`}
            />
            {hour % 6 === 0 && (
              <text
                x={labelPos.x}
                y={labelPos.y}
                className="day-wheel-hour"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {hour}
              </text>
            )}
          </g>
        ))}
        {slices.map((slice) => {
          const fullyPast =
            elapsed != null && slice.endMin <= elapsed && !slice.overdue;
          return (
            <path
              key={slice.key}
              d={donutSegment(cx, cy, rOuter, rInner, slice.startMin, slice.endMin)}
              className={`day-wheel-slice is-${slice.kind}${slice.overdue ? " is-overdue" : ""}${fullyPast ? " is-past" : ""}`}
            >
              <title>
                {slice.title} · {slice.overdue ? "overdue" : slice.kind}
              </title>
            </path>
          );
        })}
        <text
          x={cx}
          y={cy - 6}
          className="day-wheel-center-label"
          textAnchor="middle"
        >
          24h
        </text>
        <text
          x={cx}
          y={cy + 12}
          className="day-wheel-center-count"
          textAnchor="middle"
        >
          {slices.length}
        </text>
      </svg>
      {showLegend && (
        <div className="day-wheel-legend">
          <span className="day-wheel-legend-item is-anchored">Anchored</span>
          <span className="day-wheel-legend-item is-soft">Soft</span>
        </div>
      )}
      {slices.length === 0 && showLegend && (
        <p className="day-wheel-empty">No tasks on this day.</p>
      )}
    </div>
  );
}
