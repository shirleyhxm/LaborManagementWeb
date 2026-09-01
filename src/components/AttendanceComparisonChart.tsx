import { useMemo, useState } from "react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import type { ClockRecord } from "../types/attendance";
import type { Shift } from "../types/scheduling";

/**
 * Planned vs actual attendance, one day per row.
 *
 * Grouped bars: each day gets a "scheduled" and a "worked" bar on a shared hour
 * axis, both growing from the same baseline. Every row is therefore built
 * identically - a day worked to plan, a missed day and an unscheduled day differ
 * only in bar length, never in which marks are present.
 *
 * One hue in two shades (ordinal ramp, validated light->dark) rather than two
 * categorical hues: planned and actual are the same measure at two stages, not
 * two independent series.
 */

// Blue ordinal ramp, steps 250 and 450. Validated as a two-step ordinal ramp
// against the white dialog surface: monotone lightness, adjacent dL >= 0.06,
// light end clears 2:1. Do not lighten PLANNED further - step 250 is the
// lightest step that still holds contrast on white.
const PLANNED = "#86b6ef";
const ACTUAL = "#2a78d6";
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";

// Status token, used only where the value genuinely means good/bad. Kept
// distinct from the series ramp so a status color never impersonates a series.
const STATUS_CRITICAL = "#d03b3b";

/**
 * Below this, an entry is treated as no time at all.
 *
 * Hours render to one decimal, so anything under 0.05h displays as "0.0h" - and
 * a dot plotted at the origin labelled "0.0h" claims work that visibly didn't
 * happen. Accidental clock-in/clock-out pairs seconds apart are common in real
 * data and land exactly here.
 */
const MIN_COUNTED_HOURS = 0.05;

export interface AttendanceDay {
  date: string;
  plannedHours: number;
  actualHours: number;
}

/**
 * Fold shifts and clock records into one row per day.
 *
 * Both sides are summed per day rather than matched record-to-record: shifts are
 * stored split at the overtime boundary, so two rows that look like separate
 * shifts are often one continuous block. Summing is immune to where the split
 * falls; pairing rows would invent variances that aren't real.
 *
 * `businessId` scopes the actual side to one location. The clock-record endpoint
 * returns every location the employee works at, while the shift endpoint returns
 * only the queried business - so without this filter, work done elsewhere is
 * charted against a plan of zero and reads as "unscheduled".
 */
export function buildAttendanceDays(
  shifts: Shift[],
  records: ClockRecord[],
  rangeStart: Date,
  rangeEnd: Date,
  businessId: string
): AttendanceDay[] {
  const planned = new Map<string, number>();
  const actual = new Map<string, number>();

  for (const shift of shifts) {
    const key = shift.date.slice(0, 10);
    planned.set(key, (planned.get(key) ?? 0) + (shift.durationHours ?? 0));
  }

  for (const record of records.filter(r => r.businessId === businessId)) {
    // An open session has no duration yet - count it as worked-so-far so a
    // mid-shift day doesn't read as a total no-show.
    const end = record.clockOutTime ? new Date(record.clockOutTime) : new Date();
    const start = new Date(record.clockInTime);
    const hours =
      record.durationHours ?? Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);

    const key = format(start, "yyyy-MM-dd");
    actual.set(key, (actual.get(key) ?? 0) + hours);
  }

  // Every day in range gets a row, including ones with no data at all: a missed
  // day is the most important thing this chart can show, and it only exists as
  // an absence. Dropping empty days would hide exactly the days worth seeing.
  return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(day => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: key,
      plannedHours: planned.get(key) ?? 0,
      actualHours: actual.get(key) ?? 0,
    };
  });
}

type Tip = { x: number; y: number; day: AttendanceDay } | null;

export function AttendanceComparisonChart({ days }: { days: AttendanceDay[] }) {
  const [showTable, setShowTable] = useState(false);
  const [tip, setTip] = useState<Tip>(null);

  const rows = days.filter(
    d => d.plannedHours >= MIN_COUNTED_HOURS || d.actualHours >= MIN_COUNTED_HOURS
  );

  const maxHours = useMemo(() => {
    const peak = Math.max(...days.map(d => Math.max(d.plannedHours, d.actualHours)), 0);
    // Round up to a clean even tick so the axis reads 0 / 2 / 4 ... rather than
    // landing on an arbitrary maximum.
    return Math.max(2, Math.ceil(peak / 2) * 2);
  }, [days]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-400 text-center py-3">
        No scheduled shifts or clock records this week
      </p>
    );
  }

  // Two 8px bars plus the 2px surface gaps that separate them from each other
  // and from the neighbouring rows. Thin marks, never filling the band.
  const BAR_H = 8;
  const BAR_GAP = 2;
  const ROW_H = 26;
  // Wide enough for a full "Aug 31, Mon" row label at 10px without crowding the
  // 0h gridline.
  const PAD_L = 74;
  // Wide enough for the longest end-label ("8.0h unscheduled") at its furthest
  // right position, so a label is never clipped by the viewBox.
  const PAD_R = 96;
  const PAD_T = 4;
  // Reserve the axis band inside the height so the labels are never cropped
  // into a nested scrollbar.
  const AXIS_H = 18;
  const plotW = 320;
  const width = PAD_L + plotW + PAD_R;
  const height = PAD_T + days.length * ROW_H + AXIS_H;

  const xOf = (hours: number) => PAD_L + (hours / maxHours) * plotW;
  const ticks = Array.from({ length: maxHours / 2 + 1 }, (_, i) => i * 2);

  const totalPlanned = days.reduce((s, d) => s + d.plannedHours, 0);
  const totalActual = days.reduce((s, d) => s + d.actualHours, 0);

  return (
    <div>
      {/* Legend - always present for two series, so identity is never color-alone. */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span
              className="inline-block w-3 h-2 rounded-[2px]"
              style={{ backgroundColor: PLANNED }}
            />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span
              className="inline-block w-3 h-2 rounded-[2px]"
              style={{ backgroundColor: ACTUAL }}
            />
            Worked
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowTable(v => !v)}
          className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-2"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr className="text-xs text-neutral-500 text-left">
              <th className="font-normal py-1.5">Day</th>
              <th className="font-normal py-1.5 text-right">Scheduled</th>
              <th className="font-normal py-1.5 text-right">Worked</th>
              <th className="font-normal py-1.5 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const delta = day.actualHours - day.plannedHours;
              return (
                <tr key={day.date} className="border-t border-neutral-200">
                  <td className="py-1.5 text-neutral-700">
                    {format(parseISO(day.date), "EEE, MMM d")}
                  </td>
                  <td className="py-1.5 text-right text-neutral-700">
                    {day.plannedHours.toFixed(1)}h
                  </td>
                  <td className="py-1.5 text-right text-neutral-700">
                    {day.actualHours.toFixed(1)}h
                  </td>
                  <td className="py-1.5 text-right text-neutral-700">
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)}h
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-neutral-300">
              <td className="py-1.5 text-neutral-900">Total</td>
              <td className="py-1.5 text-right text-neutral-900">{totalPlanned.toFixed(1)}h</td>
              <td className="py-1.5 text-right text-neutral-900">{totalActual.toFixed(1)}h</td>
              <td className="py-1.5 text-right text-neutral-900">
                {totalActual - totalPlanned > 0 ? "+" : ""}
                {(totalActual - totalPlanned).toFixed(1)}h
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg
            width="100%"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Scheduled versus worked hours per day"
            onMouseLeave={() => setTip(null)}
          >
            {/* Gridlines: solid hairlines, one step off surface, recessive. */}
            {ticks.map(t => (
              <line
                key={t}
                x1={xOf(t)}
                x2={xOf(t)}
                y1={PAD_T}
                y2={PAD_T + days.length * ROW_H}
                stroke={t === 0 ? AXIS : GRID}
                strokeWidth={1}
              />
            ))}

            {ticks.map(t => (
              <text
                key={`tick-${t}`}
                x={xOf(t)}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="#898781"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {t}h
              </text>
            ))}

            {days.map((day, i) => {
              const rowTop = PAD_T + i * ROW_H;
              const hasPlanned = day.plannedHours >= MIN_COUNTED_HOURS;
              const hasActual = day.actualHours >= MIN_COUNTED_HOURS;
              const missed = hasPlanned && !hasActual;

              // Two bars per day sharing the hour axis, with a 2px surface gap
              // between them. Both grow from the same baseline, so every row is
              // built the same way whatever the values - a day worked to plan,
              // a missed day, and an unscheduled day all read as bar lengths
              // rather than as three different-looking marks.
              const plannedW = hasPlanned ? xOf(day.plannedHours) - PAD_L : 0;
              const actualW = hasActual ? xOf(day.actualHours) - PAD_L : 0;
              const labelX = PAD_L + Math.max(plannedW, actualW) + 8;

              return (
                <g
                  key={day.date}
                  onMouseMove={e => {
                    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, day });
                  }}
                >
                  {/* Hit target spans the whole row - the reader aims at a day,
                      not at a thin bar. */}
                  <rect x={0} y={rowTop} width={width} height={ROW_H} fill="transparent" />

                  <text
                    x={PAD_L - 8}
                    y={rowTop + ROW_H / 2 + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill="#52514e"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {format(parseISO(day.date), "MMM d, EEE")}
                  </text>

                  {hasPlanned && (
                    <rect
                      x={PAD_L}
                      y={rowTop + BAR_GAP}
                      width={plannedW}
                      height={BAR_H}
                      fill={PLANNED}
                      rx={2}
                    />
                  )}

                  {hasActual && (
                    <rect
                      x={PAD_L}
                      y={rowTop + BAR_GAP + BAR_H + BAR_GAP}
                      width={actualW}
                      height={BAR_H}
                      fill={ACTUAL}
                      rx={2}
                    />
                  )}

                  {/* One value per row, at the end of the longer bar. A missed
                      day has no actual bar to label, so its text has to say both
                      what was owed and that none of it was worked. */}
                  {missed ? (
                    <text
                      x={labelX}
                      y={rowTop + ROW_H / 2 + 3}
                      fontSize={10}
                      fill={STATUS_CRITICAL}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {day.plannedHours.toFixed(1)}h missed
                    </text>
                  ) : (
                    hasActual && (
                      <text
                        x={labelX}
                        y={rowTop + ROW_H / 2 + 3}
                        fontSize={10}
                        fill="#52514e"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {day.actualHours.toFixed(1)}h
                        {!hasPlanned && <tspan fill="#898781"> unscheduled</tspan>}
                      </text>
                    )
                  )}
                </g>
              );
            })}
          </svg>

          {tip && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 shadow-sm"
              style={{
                left: Math.min(tip.x + 12, width - 120),
                top: tip.y + 12,
              }}
            >
              <p className="text-xs text-neutral-500 mb-0.5">
                {format(parseISO(tip.day.date), "EEE, MMM d")}
              </p>
              <p className="text-xs text-neutral-900">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {tip.day.plannedHours.toFixed(1)}h
                </span>
                <span className="text-neutral-500"> scheduled</span>
              </p>
              <p className="text-xs text-neutral-900">
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {tip.day.actualHours.toFixed(1)}h
                </span>
                <span className="text-neutral-500"> worked</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
