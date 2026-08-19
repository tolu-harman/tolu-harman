/* Ported from lib/useBeepTrial.ts, with two deliberate changes.
 *
 * 1. Audio unlock. Browsers start an AudioContext suspended until a user
 *    gesture. The Expo original could ignore this; on the web it deadlocks —
 *    the practice round auto-starts a beep a few seconds after the screen
 *    mounts, and the participant is waiting to *hear* something before they
 *    tap, so nothing ever unlocks the context and every trial is silent.
 *    The context is therefore a module-level singleton, unlocked by the first
 *    tap anywhere in the app (long before the test screen is reached).
 *
 * 2. Tones are synthesised rather than decoded from the bundled wavs. Those
 *    files are pure sine waves (measured 499/999/1999/3999 Hz at 0.6 peak), so
 *    an oscillator is audibly identical while removing the fetch + decode path
 *    and 424KB of assets. It also lets each tone be ramped in and out, which
 *    matters here: hard-switching a sine produces a broadband click that a
 *    participant can hear even when the tone itself is inaudible, which would
 *    quietly corrupt the result.
 */
import { useCallback } from "react";
import { TONE_DURATION_MS } from "./lib";

/* Matches the amplitude of the original wavs (19660/32767). */
const TONE_PEAK = 0.6;
/* Short enough to stay perceptually instant, long enough to kill the click. */
const RAMP_S = 0.012;

let ctx = null;
let listening = false;

function createCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/* Must run inside a real gesture handler to satisfy Safari/WKWebView. */
function unlock() {
  const c = createCtx();
  if (!c) return teardown();
  if (c.state === "suspended") c.resume().catch(() => {});
  /* Playing a silent buffer during the gesture is what actually flips iOS
     out of its blocked state; resume() alone isn't always enough. */
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* non-fatal */
  }
  if (c.state === "running") teardown();
}

const EVENTS = ["pointerdown", "touchend", "click"];

function teardown() {
  if (!listening) return;
  listening = false;
  EVENTS.forEach((e) => document.removeEventListener(e, unlock, true));
}

function armUnlock() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  EVENTS.forEach((e) => document.addEventListener(e, unlock, true));
}

/* Armed as soon as the app loads, so any tap on any screen unlocks audio. */
armUnlock();

export function useBeepTrial() {
  const playBeep = useCallback(
    (freq, volume) =>
      new Promise((resolve) => {
        const c = createCtx();
        const dur = TONE_DURATION_MS / 1000;

        if (c) {
          if (c.state === "suspended") c.resume().catch(() => {});
          try {
            const t0 = c.currentTime;
            const peak = TONE_PEAK * volume;
            const osc = c.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t0);

            const gain = c.createGain();
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(peak, t0 + RAMP_S);
            gain.gain.setValueAtTime(peak, t0 + dur - RAMP_S);
            gain.gain.linearRampToValueAtTime(0, t0 + dur);

            osc.connect(gain).connect(c.destination);
            osc.start(t0);
            osc.stop(t0 + dur);
          } catch {
            /* fall through to the timer so the trial still advances */
          }
        }

        /* Resolve on the same schedule whether or not audio is available, so a
           muted device still walks the participant through every trial. */
        window.setTimeout(resolve, TONE_DURATION_MS);
      }),
    []
  );

  return { playBeep, audioReady: !!ctx && ctx.state === "running" };
}
