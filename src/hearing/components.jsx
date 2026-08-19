/* Ported from components/PrimaryButton.tsx, HoldCircle.tsx, PresetIcon.tsx and
   the expo-router Stack header. Styling lives in hearing.css. */
import React from "react";
import StatusBar from "../components/StatusBar";

const ASSET = "./assets/";

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`ht-button ht-button--${variant} ${className}`}
      onClick={onPress}
      disabled={disabled}
    >
      {title}
    </button>
  );
}

/* Hold-to-answer target. Pointer events cover touch and mouse; releasing
   outside the circle still counts as a release.

   The circle is always mounted and always in the same place — during the
   countdown it simply shows the number instead of the label, so nothing
   shifts when the test starts. */
export function HoldCircle({ onPressIn, onPressOut, pressed, label, inert = false }) {
  return (
    <button
      type="button"
      className={`ht-hold${pressed ? " is-pressed" : ""}${inert ? " is-inert" : ""}`}
      disabled={inert}
      onPointerDown={
        inert
          ? undefined
          : (e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              onPressIn();
            }
      }
      onPointerUp={inert ? undefined : onPressOut}
      onPointerCancel={inert ? undefined : onPressOut}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span>{label ?? "I hear the beep"}</span>
    </button>
  );
}

/* Pause / resume control shown at the right of the test header. */
export function PauseButton({ paused, onToggle }) {
  return (
    <button
      type="button"
      className="ht-pause"
      onClick={onToggle}
      aria-label={paused ? "Resume test" : "Pause test"}
      aria-pressed={paused}
    >
      {paused ? (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 3.5v13l11-6.5z" fill="currentColor" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="4" y="3" width="4" height="14" rx="1.4" fill="currentColor" />
          <rect x="12" y="3" width="4" height="14" rx="1.4" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

/* Wave icons for the personalization presets (from the design's SVG paths). */
const PRESET_PATHS = {
  softer:
    "M1 12 C5 12 5 9 9 9 C13 9 13 15 17 15 C21 15 21 9 25 9 C29 9 29 15 33 15 C37 15 37 12 41 12",
  recommended:
    "M1 12 C5 12 5 7 9 7 C13 7 13 17 17 17 C21 17 21 7 25 7 C29 7 29 17 33 17 C37 17 37 12 41 12",
  richer:
    "M1 12 C5 12 5 4 9 4 C13 4 13 20 17 20 C21 20 21 4 25 4 C29 4 29 20 33 20 C37 20 37 12 41 12",
};

export function PresetIcon({ preset, color }) {
  return (
    <svg width="46" height="26" viewBox="0 0 42 24" fill="none" aria-hidden="true">
      <path
        d={PRESET_PATHS[preset]}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Equivalent of the expo-router Stack header: optional back chevron + title.
   Carries the status bar the way TopNavigation does on the Denon screens — the
   RN original relied on SafeAreaView + the iOS system bar, which has no
   equivalent here. */
export function HearingHeader({ title = "", onBack, action = null }) {
  return (
    <>
      <StatusBar />
      <header className="ht-header">
        {/* Same arrow asset and geometry as TopNavigation's back button
            (Figma "Main Navigation"), so there is one back control across the
            whole app rather than a chevron here and an arrow elsewhere. */}
        {onBack ? (
          <button
            type="button"
            className="icon-button back-button ht-header-back"
            onClick={onBack}
            aria-label="Back"
          >
            <img src={`${ASSET}back.svg`} alt="" />
          </button>
        ) : (
          <span className="ht-header-back" />
        )}
        <h1 className="ht-header-title">{title}</h1>
        {/* Mirrors the back slot so the title stays optically centred whether
            or not there's an action. */}
        <span className="ht-header-back">{action}</span>
      </header>
    </>
  );
}

/* Full-width fill under the test header. */
export function TestProgress({ value }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="ht-progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/* Pause menu (Figma 5.1.2.A). Four destructive actions plus Resume; each
   action raises a confirmation alert (5.1.2.1.A–D) before it takes effect. */
export const PAUSE_ACTIONS = [
  {
    key: "skip",
    label: "Skip this ear",
    title: "Skip this ear?",
    body: "This will erase data collected for this ear and cannot be undone.",
    confirm: "Skip",
  },
  {
    key: "restart",
    label: "Restart this ear",
    title: "Restart this ear?",
    body: "This will erase data collected for this ear and start it again.",
    confirm: "Restart",
  },
  {
    key: "practice",
    label: "Practice again",
    title: "Practice again?",
    body: "This will erase data collected for this ear and take you back to the practice round.",
    confirm: "Practice",
  },
  {
    key: "exit",
    label: "Exit test",
    title: "Exit test?",
    body: "This will erase all data collected so far and cannot be undone.",
    confirm: "Exit",
  },
];

export function PauseMenu({ onResume, onAction }) {
  const [pending, setPending] = React.useState(null);

  return (
    <div className="ht-pause-backdrop">
      {pending ? (
        <div className="ht-pause-alert">
          <div className="ht-ios-alert" role="dialog" aria-modal="true">
            <div className="ht-ios-alert-body">
              <h3>{pending.title}</h3>
              <p>{pending.body}</p>
            </div>
            <div className="ht-ios-alert-actions">
              <button type="button" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="is-destructive is-default"
                onClick={() => onAction(pending.key)}
              >
                {pending.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="ht-pause-card" role="dialog" aria-modal="true" aria-label="Test paused">
          {PAUSE_ACTIONS.map((a) => (
            <button
              type="button"
              key={a.key}
              className="ht-pause-item"
              onClick={() => setPending(a)}
            >
              {a.label}
            </button>
          ))}
          <PrimaryButton title="Resume" onPress={onResume} />
        </div>
      )}
    </div>
  );
}

/* Skip control shown on the practice round (Figma 4.1.A–E, 4.2). */
export function SkipButton({ onSkip }) {
  return (
    <button type="button" className="ht-pause" onClick={onSkip} aria-label="Skip practice">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 3.5v13l9-6.5z" fill="currentColor" />
        <rect x="14" y="3" width="2.6" height="14" rx="1.1" fill="currentColor" />
      </svg>
    </button>
  );
}

/* Per-round feedback above the circle (4.1.D success / 4.1.E failure). */
export function TrialMark({ kind }) {
  const ok = kind === "success";
  return (
    <span className="ht-trial-mark" aria-hidden="true">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="21" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {ok ? (
          <path
            d="M13 22.5l6 6 12-13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M15 15l14 14M29 15L15 29"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </span>
  );
}

/* ── Ambient-noise interruption (Figma 5.1.1.G / H / H.1) ────────────────
   The test pauses when the room gets loud. G prompts, H confirms it's quiet
   again and dismisses itself, H.1 is the "can't find a quiet place" alert. */
export function NoiseInterruption({ variant, onCantFind, onCancel, onRestart, meter }) {
  if (variant === "cant-find") {
    return (
      <div className="ht-pause-backdrop">
        <div className="ht-pause-alert">
          <div className="ht-ios-alert" role="dialog" aria-modal="true">
            <div className="ht-ios-alert-body">
              <h3>Can’t find a quiet place?</h3>
              <p>Testing in a loud environment will affect your hearing test result.</p>
            </div>
            <div className="ht-ios-alert-actions">
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="is-destructive is-default" onClick={onRestart}>
                Restart
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const quiet = variant === "quiet";
  return (
    <div className="ht-pause-backdrop">
      <div className="ht-noise-card" role="status">
        <h3 className="ht-h3 ht-center">{quiet ? "It’s quiet" : "It’s too loud"}</h3>
        <p className="ht-p2 ht-center ht-mt4">
          {quiet ? "You will now resume." : "Try to find a quiet place."}
        </p>
        <div className="ht-noise-card-meter">{meter}</div>
        <button
          type="button"
          className="ht-noise-link"
          onClick={onCantFind}
          disabled={quiet}
        >
          Can’t find a quiet place?
        </button>
      </div>
    </div>
  );
}
