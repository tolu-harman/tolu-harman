/* Ambient level meter, from the hearing test's "Find a quiet place" screen.
   Shared so the Denon "Background noise check" shows the same thing — one
   meter, one set of thresholds, driven by a plain 0..1 level. */
import React from "react";

export const BAR_COUNT = 60;

export const LEVEL_COLORS = {
  quiet: "#00A56D",
  ok: "#F5A623",
  loud: "#ED4D33",
};

export function bandFor(level) {
  if (level < 0.4) return "quiet";
  if (level < 0.75) return "ok";
  return "loud";
}

export default function LevelMeter({ level }) {
  const band = bandFor(level);
  const color = LEVEL_COLORS[band];
  const active = Math.round(Math.max(0, Math.min(1, level)) * BAR_COUNT);

  return (
    <div className="level-meter" data-band={band}>
      <div className="level-meter-bars" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            className="level-meter-bar"
            style={{ background: i < active ? color : "#C9CED2" }}
          />
        ))}
      </div>
      <div className="level-meter-labels" aria-hidden="true">
        <span style={band === "quiet" ? { color: LEVEL_COLORS.quiet } : undefined}>Quiet</span>
        <span style={band === "ok" ? { color: LEVEL_COLORS.ok } : undefined}>OK</span>
        <span style={band === "loud" ? { color: LEVEL_COLORS.loud } : undefined}>Loud</span>
      </div>
    </div>
  );
}
