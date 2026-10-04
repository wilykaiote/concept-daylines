import { MINUTES_PER_DAY } from "./calendarTimeline";

export type DayWheelSlice = {
  key: string;
  title: string;
  startMin: number;
  endMin: number;
  kind: "anchored" | "soft";
  overdue?: boolean;
};

/** 0° = top, clockwise. Arch: 12AM left (270°) → noon top (0°) → end right (90°). */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function minutesToAngle(min: number) {
  return 270 + (min / MINUTES_PER_DAY) * 180;
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polar(cx, cy, r, startAngle);
  const e = polar(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  // Geometric large-arc (>180°). Arch spans at most 180°, so this stays 0.
  const large = sweep > 180 ? 1 : 0;
  // SVG sweep=1 is clockwise in y-down space: left → top → right.
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
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
  const sweep = end - start;
  // Must be geometric degrees. Using >90 made half-day+ fills take the long way around.
  const large = sweep > 180 ? 1 : 0;
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
  /** Task window bounds in minutes from midnight. */
  windowStartMin?: number | null;
  windowEndMin?: number | null;
  showLegend?: boolean;
  showLabel?: boolean;
  compact?: boolean;
};

export function DayWheelChart({
  label,
  slices,
  elapsedEndMin = null,
  windowStartMin = null,
  windowEndMin = null,
  showLegend = true,
  showLabel = true,
  compact = false,
}: DayWheelChartProps) {
  const size = 260;
  const cx = size / 2;
  // Diameter sits near the bottom of the arch content so the open half is cropped.
  const cy = 128;
  const rOuter = 112;
  const rInner = 58;
  // Ticks sit on the inside of the band (toward the hub).
  const tickOuter = rInner;
  const tickInner = rInner - 10;
  const windowMarkerInner = rInner - 4;
  const windowMarkerOuter = rOuter + 4;
  const archStart = minutesToAngle(0);
  const archEnd = minutesToAngle(MINUTES_PER_DAY);
  const bandRadius = (rOuter + rInner) / 2;
  const viewLeft = cx - windowMarkerOuter;
  const viewRight = cx + windowMarkerOuter;
  const viewTop = cy - windowMarkerOuter;
  const viewBottom = cy;
  const viewWidth = viewRight - viewLeft;
  const viewHeight = viewBottom - viewTop;
  const elapsed =
    elapsedEndMin == null
      ? null
      : Math.max(0, Math.min(MINUTES_PER_DAY, elapsedEndMin));
  const windowMarkers = [windowStartMin, windowEndMin]
    .filter((min): min is number => min != null && Number.isFinite(min))
    .map((min) => {
      const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, min));
      const angle = minutesToAngle(clamped);
      return {
        key: clamped,
        a: polar(cx, cy, windowMarkerInner, angle),
        b: polar(cx, cy, windowMarkerOuter, angle),
      };
    });

  const hourTicks = Array.from({ length: 25 }, (_, hour) => {
    const angle = minutesToAngle(hour * 60);
    const a = polar(cx, cy, tickInner, angle);
    const b = polar(cx, cy, tickOuter, angle);
    return { hour, a, b };
  });

  return (
    <div className={`day-wheel${compact ? " is-compact" : ""}`}>
      {showLabel && <p className="day-wheel-label">{label}</p>}
      <svg
        className="day-wheel-svg"
        viewBox={`${viewLeft} ${viewTop} ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label={`24-hour task arch for ${label}`}
      >
        <path
          d={arcPath(cx, cy, bandRadius, archStart, archEnd)}
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
        <path
          d={arcPath(cx, cy, rOuter, archStart, archEnd)}
          className="day-wheel-track"
          fill="none"
        />
        <path
          d={arcPath(cx, cy, rInner, archStart, archEnd)}
          className="day-wheel-hub"
          fill="none"
        />
        {hourTicks.map(({ hour, a, b }) => {
          const isMajor = hour % 6 === 0 || hour === 24;
          return (
            <g key={hour}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`day-wheel-tick${isMajor ? " is-major" : ""}`}
              />
            </g>
          );
        })}
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
        {windowMarkers.map(({ key, a, b }) => (
          <line
            key={`window-${key}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="day-wheel-window-marker"
          />
        ))}
        <text
          x={cx}
          y={cy - 8}
          className="day-wheel-center-label"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          AM | PM
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
