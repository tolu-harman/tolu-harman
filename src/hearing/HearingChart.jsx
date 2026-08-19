/* Ported from components/HearingChart.tsx — same geometry and gradients. */
import React from "react";
import { colors } from "./lib";

const W = 320;

function toPath(scores, h) {
  /* score 1 = excellent (top), 0 = low (bottom) */
  const pad = 12;
  const usableH = h - pad * 2;
  const stepX = W / (scores.length - 1);
  return scores
    .map((s, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${pad + (1 - s) * usableH}`)
    .join(" ");
}

export default function HearingChart({
  left,
  right,
  showLeft = true,
  showRight = true,
  height = 300,
  compact = false,
}) {
  const fallback = [0.95, 0.9, 0.78, 0.55]; // placeholder curve before a test exists
  const l = left ?? fallback;
  const r = right ?? fallback.map((v) => Math.min(1, v + 0.06));

  /* Gradient ids must be unique per instance — the profile screen renders a
     chart while the results screen may also be mounted. */
  const uid = React.useId().replace(/:/g, "");

  return (
    <div>
      <div className="ht-chart-row">
        {!compact && (
          <div className="ht-chart-y" style={{ height }}>
            <div>
              <p className="ht-chart-band">Excellent</p>
              <p className="ht-chart-band-sub">0-20dB</p>
            </div>
            <div>
              <p className="ht-chart-band">Good</p>
              <p className="ht-chart-band-sub">20-40dB</p>
            </div>
            <div>
              <p className="ht-chart-band">Low</p>
              <p className="ht-chart-band-sub">40-60dB</p>
            </div>
          </div>
        )}
        <svg
          className="ht-chart-svg"
          width={compact ? "100%" : W}
          height={height}
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.chartPurple} stopOpacity="0.25" />
              <stop offset="1" stopColor={colors.chartPurple} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`fillRight-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.ink} stopOpacity="0.2" />
              <stop offset="1" stopColor={colors.ink} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {!compact &&
            [0.33, 0.66].map((f) => (
              <line
                key={`h${f}`}
                x1="0"
                y1={height * f}
                x2={W}
                y2={height * f}
                stroke={colors.border}
              />
            ))}
          {!compact &&
            [0.2, 0.4, 0.6, 0.8].map((f) => (
              <line
                key={`v${f}`}
                x1={W * f}
                y1="0"
                x2={W * f}
                y2={height}
                stroke={colors.border}
                strokeDasharray="3 5"
              />
            ))}
          {showRight && (
            <>
              <path
                d={`${toPath(r, height)} L ${W} ${height} L 0 ${height} Z`}
                fill={`url(#fillRight-${uid})`}
                stroke="none"
              />
              <path d={toPath(r, height)} stroke={colors.ink} strokeWidth="2.5" fill="none" />
            </>
          )}
          {showLeft && (
            <>
              <path
                d={`${toPath(l, height)} L ${W} ${height} L 0 ${height} Z`}
                fill={`url(#fill-${uid})`}
                stroke="none"
              />
              <path
                d={toPath(l, height)}
                stroke={colors.chartPurple}
                strokeWidth="2.5"
                fill="none"
              />
            </>
          )}
        </svg>
      </div>
      <div className={`ht-chart-x${compact ? "" : " is-inset"}`}>
        <span>Low tones</span>
        <span>Mid tones</span>
        <span>High tones</span>
      </div>
    </div>
  );
}
