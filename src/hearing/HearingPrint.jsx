/* Ported from components/HearingPrint.tsx.

   Radial hearing print. Grey ticks = your hearing per direction/band. Orange
   overlay = what the selected personalization preset restores.
   Variants (research A/B toggle): 'threads' = fine solid rays; 'capsule' =
   chunky dashed bead rays. Geometry and constants are unchanged from the
   original; the Animated intro is a CSS transition here. */
import React, { useEffect, useRef, useState } from "react";
import { effectiveEar } from "./lib";

const CX = 190;
const CY = 190;

const VARIANTS = {
  threads: {
    step: 2.8,
    strokeWidth: 2.2,
    rin: 30,
    tmin: 10,
    tmax: 136,
    stops: ["#ECEBE9", "#CDCEC9", "#8A867F", "#5B5F66", "#3B3E44"],
  },
  capsule: {
    step: 5.2,
    strokeWidth: 5,
    dash: "14 12",
    rin: 74,
    tmin: 8,
    tmax: 96,
    stops: ["#C6C4C0", "#A6A49F", "#6E6A64", "#4A4E55", "#33363B"],
  },
};

const AID_FACTOR = { softer: 0.4, recommended: 0.7, richer: 1 };

function clamp01(v) {
  return Math.max(0.06, Math.min(1, v));
}

/* Personalization restores most of the lost signal. */
function aided(s) {
  return clamp01(s + (0.93 - s) * 0.85);
}

function buildRight(arr) {
  /* Right half: -84° (bass, bottom) → +84° (treble, top) */
  const n = arr.length;
  return arr.map((s, i) => ({ ang: -84 + (i * 168) / (n - 1), s: clamp01(s) }));
}

function buildLeft(arr) {
  /* Left half: 96° (treble, top) → 264° (bass, bottom), band order reversed */
  const n = arr.length;
  return arr.map((_, j) => ({
    ang: 96 + (j * 168) / (n - 1),
    s: clamp01(arr[n - 1 - j]),
  }));
}

function interp(measured, theta) {
  if (theta <= measured[0].ang) return measured[0].s;
  const last = measured[measured.length - 1];
  if (theta >= last.ang) return last.s;
  for (let i = 0; i < measured.length - 1; i++) {
    const a = measured[i];
    const b = measured[i + 1];
    if (theta >= a.ang && theta <= b.ang) {
      let t = (theta - a.ang) / (b.ang - a.ang);
      t = t * t * (3 - 2 * t);
      return a.s + (b.s - a.s) * t;
    }
  }
  return measured[0].s;
}

export default function HearingPrint({
  left,
  right,
  preset,
  personalizationOn,
  variant = "threads",
}) {
  const {
    step: STEP,
    strokeWidth,
    dash,
    rin: RIN,
    tmin: TMIN,
    tmax: TMAX,
    stops,
  } = VARIANTS[variant];

  const target = personalizationOn ? AID_FACTOR[preset] : 0;
  const [aidAnim, setAidAnim] = useState(target);
  const animRef = useRef(null);
  const aidRef = useRef(target);
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIntro(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* Tween the aid factor (smoothstep, 560ms) whenever preset/toggle changes. */
  useEffect(() => {
    const from = aidRef.current;
    if (Math.abs(target - from) < 0.001) return;
    const t0 = Date.now();
    const dur = 560;
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / dur);
      const e = t * t * (3 - 2 * t);
      const v = from + (target - from) * e;
      aidRef.current = v;
      setAidAnim(v);
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target]);

  const dataL = effectiveEar("left", left);
  const dataR = effectiveEar("right", right);
  const mL = buildLeft(dataL);
  const mR = buildRight(dataR);
  const mLa = buildLeft(dataL.map(aided));
  const mRa = buildRight(dataR.map(aided));

  const ticks = [];
  for (let deg = 0; deg < 360; deg += STEP) {
    const d90 = Math.min(Math.abs(deg - 90), 360 - Math.abs(deg - 90));
    const d270 = Math.min(Math.abs(deg - 270), 360 - Math.abs(deg - 270));
    if (d90 < STEP || d270 < STEP) continue; // gaps at top and bottom
    let s, sAidFull;
    if (deg < 90 || deg > 270) {
      const th = deg > 180 ? deg - 360 : deg;
      s = interp(mR, th);
      sAidFull = interp(mRa, th);
    } else {
      s = interp(mL, deg);
      sAidFull = interp(mLa, deg);
    }
    const sAid = s + (sAidFull - s) * aidAnim;
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const len = TMIN + s * (TMAX - TMIN);
    const aidLen = TMIN + sAid * (TMAX - TMIN);
    ticks.push({
      x1: CX + RIN * cos,
      y1: CY - RIN * sin,
      x2: CX + (RIN + len) * cos,
      y2: CY - (RIN + len) * sin,
      ax2: CX + (RIN + aidLen) * cos,
      ay2: CY - (RIN + aidLen) * sin,
      aidOpacity: aidAnim > 0 && aidLen > len + 4 ? 0.55 + sAid * 0.35 : 0,
    });
  }

  const presetLabel = preset.charAt(0).toUpperCase() + preset.slice(1);
  const gid = `pdepth-${variant}`;

  return (
    <div>
      <div className={`ht-print${intro ? " is-in" : ""}`}>
        <svg width="100%" height="320" viewBox="0 0 380 380" aria-hidden="true">
          <defs>
            <radialGradient id={gid} cx="190" cy="190" r="205" gradientUnits="userSpaceOnUse">
              <stop offset="0.24" stopColor={stops[0]} />
              <stop offset="0.42" stopColor={stops[1]} />
              <stop offset="0.68" stopColor={stops[2]} />
              <stop offset="0.90" stopColor={stops[3]} />
              <stop offset="1" stopColor={stops[4]} />
            </radialGradient>
          </defs>
          <circle
            cx={190}
            cy={190}
            r={176}
            fill="none"
            stroke="#000000"
            strokeOpacity={0.12}
            strokeWidth={2}
            strokeDasharray="0.5 8"
            strokeLinecap="round"
          />
          {variant === "capsule" &&
            /* Fine dot rings bridging the center toward the first beads,
               echoing the granular texture of the print. */
            [
              { r: 40, n: 26, size: 1.4, color: "#A6A49F" },
              { r: 52, n: 34, size: 1.8, color: "#8A867F" },
              { r: 64, n: 42, size: 2.2, color: "#6E6A64" },
            ].map((ring) =>
              Array.from({ length: ring.n }).map((_, i) => {
                const a = (i / ring.n) * 2 * Math.PI;
                return (
                  <circle
                    key={`hub-${ring.r}-${i}`}
                    cx={190 + ring.r * Math.cos(a)}
                    cy={190 - ring.r * Math.sin(a)}
                    r={ring.size / 2}
                    fill={ring.color}
                    opacity={0.8}
                  />
                );
              })
            )}
          {ticks.map((tk, i) => (
            <React.Fragment key={i}>
              {tk.aidOpacity > 0 && (
                <line
                  x1={tk.x1}
                  y1={tk.y1}
                  x2={tk.ax2}
                  y2={tk.ay2}
                  stroke="#F63000"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  opacity={tk.aidOpacity}
                />
              )}
              <line
                x1={tk.x1}
                y1={tk.y1}
                x2={tk.x2}
                y2={tk.y2}
                stroke={`url(#${gid})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={dash}
              />
            </React.Fragment>
          ))}
          <text
            x={190}
            y={13}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight="700"
            letterSpacing="2"
            fill="#3B3E44"
          >
            TREBLE
          </text>
          <text
            x={190}
            y={375}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight="700"
            letterSpacing="2"
            fill="#3B3E44"
          >
            BASS
          </text>
          <text
            x={6}
            y={194}
            textAnchor="start"
            fontSize={10.5}
            fontWeight="700"
            letterSpacing="2"
            fill="#3B3E44"
          >
            L
          </text>
          <text
            x={374}
            y={194}
            textAnchor="end"
            fontSize={10.5}
            fontWeight="700"
            letterSpacing="2"
            fill="#3B3E44"
          >
            R
          </text>
        </svg>
      </div>
      <div className="ht-print-legend">
        <span className="ht-legend-item">
          <span className="ht-legend-dot" style={{ background: "#3B3E44" }} />
          Your hearing
        </span>
        {personalizationOn && (
          <span className="ht-legend-item">
            <span className="ht-legend-dot" style={{ background: "#F63000" }} />
            {presetLabel} personalization
          </span>
        )}
      </div>
    </div>
  );
}
