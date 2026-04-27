"use client";

import { useEffect, useState } from "react";

interface Props {
  ipponWins: number;
  regularWins: number;
  losses: number;
  total: number;
  locale: string;
}

const CX = 60;
const CY = 60;
const R = 45;
const STROKE = 14;
const C = 2 * Math.PI * R; // ≈ 282.74

/** Convert degrees (0 = 12 o'clock, clockwise) to SVG x/y coordinates. */
function toXY(deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
}

/**
 * Build a <path> arc command for a donut segment.
 * startDeg and endDeg are degrees clockwise from 12 o'clock.
 */
function arcPath(startDeg: number, endDeg: number): string {
  const [x1, y1] = toXY(startDeg);
  const [x2, y2] = toXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
}

export default function WinLossBar({
  ipponWins,
  regularWins,
  losses,
  total,
  locale,
}: Props) {
  const [animate, setAnimate] = useState(false);
  const isFi = locale === "fi";

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (total === 0) return null;

  // Sanity check: all three counts must sum to total, otherwise arc math is wrong.
  if (ipponWins + regularWins + losses !== total) {
    console.error(
      `WinLossBar: ipponWins(${ipponWins}) + regularWins(${regularWins}) + losses(${losses}) = ${ipponWins + regularWins + losses} ≠ total(${total}). Arcs will not sum to 360°.`,
    );
  }

  const totalWins = ipponWins + regularWins;
  const winPct = Math.round((totalWins / total) * 100);

  // Exact degree spans — these always sum to 360.
  // 1 match out of 10 = exactly 36°.
  const ipponDeg   = (ipponWins   / total) * 360;
  const regularDeg = (regularWins / total) * 360;
  const lossDeg    = (losses      / total) * 360;

  // Cumulative start angles (clockwise from 12 o'clock).
  const a0 = 0;
  const a1 = a0 + ipponDeg;    // ippon ends / regular starts
  const a2 = a1 + regularDeg;  // regular ends / losses start
  const a3 = a2 + lossDeg;     // losses end (= 360)

  // Arc lengths for each segment, used to animate stroke-dashoffset.
  // Setting dashoffset = arcLen hides the segment; animating to 0 draws it in.
  const ipponLen   = (ipponWins   / total) * C;
  const regularLen = (regularWins / total) * C;
  const lossLen    = (losses      / total) * C;

  const segments = [
    {
      start: a0, end: a1, len: ipponLen,
      color: "#15803d",
      label: isFi ? "Ippon-voitot" : "Ippon wins",
      count: ipponWins,
    },
    {
      start: a1, end: a2, len: regularLen,
      color: "#86efac",
      label: isFi ? "Muut voitot" : "Other wins",
      count: regularWins,
    },
    {
      start: a2, end: a3, len: lossLen,
      color: "#f87171",
      label: isFi ? "Häviöt" : "Losses",
      count: losses,
    },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
      {/* Donut */}
      <div className="relative flex-shrink-0">
        <svg width="170" height="170" viewBox="0 0 120 120" aria-hidden>
          {/* Gray background ring */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={STROKE}
          />

          {segments.map((seg, i) => (
            <path
              key={i}
              d={arcPath(seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              // dasharray = exact arc length → one dash that covers exactly the segment
              strokeDasharray={seg.len}
              // dashoffset animates from full-length (hidden) → 0 (fully drawn)
              strokeDashoffset={animate ? 0 : seg.len}
              style={{
                transition: `stroke-dashoffset 0.75s ease-out ${i * 120}ms`,
              }}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-primary">{winPct}%</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {isFi ? "voitot" : "win rate"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex w-full flex-col justify-center gap-3 sm:max-w-xs">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="text-sm text-gray-600">{seg.label}</span>
            <span className="ml-auto text-lg font-bold text-gray-900">
              {seg.count}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-400">
            {isFi ? "Otteluita yht." : "Total matches"}
          </span>
          <span className="font-semibold text-gray-700">{total}</span>
        </div>
      </div>
    </div>
  );
}
