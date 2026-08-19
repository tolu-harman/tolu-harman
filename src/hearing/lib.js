/* Ported from the hearing-test-app Expo project (lib/theme.ts, lib/tones.ts,
   lib/demoProfile.ts). Values are unchanged; only the module format differs. */

/* Matches the host app's asset base (main.jsx). Relative so it resolves the
   same way when the bundle is loaded from file:// inside the WKWebView. */
export const ASSET = "./assets/";

export const colors = {
  primary: "#ED4D33",
  primaryBg: "#FDEDEB",
  ink: "#0B131A",
  dark: "#121C25",
  gray20: "#F2F4F5",
  textSecondary: "#4A545E",
  white: "#FFFFFF",
  green: "#00A56D",
  chartPurple: "#5857E5",
  border: "#E4E7E9",
};

/* ── tones.ts ─────────────────────────────────────────────────────────── */

/* The four audiometric bands. Tones are synthesised at these frequencies (see
   useBeepTrial), so the bundled tone wavs are no longer needed. */
export const TONE_FREQS = [500, 1000, 2000, 4000];
export const TONE_DURATION_MS = 1200;

/* Each trial: a frequency and a volume. Heard/not-heard per trial builds the
   profile. */
export const TRIALS = [
  { freq: 500, volume: 1 },
  { freq: 500, volume: 0.25 },
  { freq: 1000, volume: 1 },
  { freq: 1000, volume: 0.25 },
  { freq: 2000, volume: 1 },
  { freq: 2000, volume: 0.25 },
  { freq: 4000, volume: 1 },
  { freq: 4000, volume: 0.25 },
];

/* Convert heard flags into a score per frequency band (0..1, higher = better). */
export function scoreFromHeard(heard) {
  const byFreq = [];
  for (let f = 0; f < 4; f++) {
    const loud = heard[f * 2] ? 0.5 : 0;
    const quiet = heard[f * 2 + 1] ? 0.5 : 0;
    byFreq.push(loud + quiet);
  }
  return byFreq;
}

/* ── demoProfile.ts ───────────────────────────────────────────────────── */

/* RESEARCH MODE: fixed demo profile from the reference audiogram, shown
   regardless of the participant's real test result (participants with normal
   hearing would otherwise see a full circle / flat chart, making the
   visualizations untestable). Values = 1 - dB/80, bands low → high. */

/* Left ear (blue curve): high-frequency loss. dB: 13, 15, 24, 32, 34, 57 */
export const DEMO_LEFT = [0.84, 0.81, 0.7, 0.6, 0.58, 0.29];
/* Right ear (red curve): low-frequency loss. dB: 53, 50, 43, 37, 33, 23 */
export const DEMO_RIGHT = [0.34, 0.38, 0.46, 0.54, 0.59, 0.71];

export const USE_DEMO_PROFILE = true; // set false to show real test results again

export function effectiveEar(ear, real) {
  const demo = ear === "left" ? DEMO_LEFT : DEMO_RIGHT;
  if (USE_DEMO_PROFILE) return demo;
  return real ?? demo;
}
