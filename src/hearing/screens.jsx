/* Ported from the hearing-test-app app/ routes. Screen order, copy, timings and
   navigation targets are unchanged from the Expo original; expo-router pushes
   become calls into the host app's history router. */
import React, { useEffect, useRef, useState } from "react";
import {
  HearingHeader,
  HoldCircle,
  PauseButton,
  NoiseInterruption,
  PauseMenu,
  PresetIcon,
  PrimaryButton,
  SkipButton,
  TestProgress,
  TrialMark,
} from "./components";
import StatusBar from "../components/StatusBar";
import LevelMeter from "../components/LevelMeter";
import { useFlow } from "../components/FlowConfig";
import HearingChart from "./HearingChart";
import HearingPrint from "./HearingPrint";
import { useTest } from "./TestContext";
import { colors, effectiveEar, scoreFromHeard, TRIALS } from "./lib";
import { useBeepTrial } from "./useBeepTrial";

const ASSET = "./assets/";

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ── index.tsx — intro ────────────────────────────────────────────────── */
export function HtIntro({ go, back, accentSecond = false, figmaCopy = false }) {
  const { lastTestDate, setLastTestDate } = useTest();

  /* Researcher shortcut: skip the whole test flow and land on the results. */
  const skipToResults = () => {
    if (!lastTestDate) setLastTestDate(todayLabel());
    go("ht-results");
  };

  return (
    <main className="screen ht-screen ht-personalise-screen">
      <HearingHeader title="Personalise sound" onBack={back} />
      <div className="ht-personalise-visual" aria-hidden="true">
        <video
          className="ht-personalise-video"
          src={`${ASSET}hearing-profile-loop-2.mp4`}
          autoPlay
          loop
          muted
          playsInline
        />
        <img className="ht-personalise-earbud ht-personalise-earbud--left" src={`${ASSET}profile-left-earbud.png`} alt="" />
        <img className="ht-personalise-earbud ht-personalise-earbud--right" src={`${ASSET}profile-right-earbud.png`} alt="" />
      </div>
      <div className="ht-personalise-content">
        <p className="ht-p1">Two quick steps to audio that's tuned to your ears.</p>
        <div className="ht-personalise-cards">
          <section className="ht-personalise-card">
            <div className="ht-personalise-card-title">
              <span className="ht-step-num">1</span>
              <h2 className="ht-h3">Fit test</h2>
            </div>
            <p className="ht-p1">
              Find the best fit for your earbuds. A good seal reduces sound leakage and improving
              your listening experience
            </p>
          </section>
          <section className="ht-personalise-card">
            <div className="ht-personalise-card-title">
              <span className={accentSecond ? "ht-step-num" : "ht-step-num ht-step-num--muted"}>2</span>
              <h2 className="ht-h3">Sound Personalization</h2>
            </div>
            {figmaCopy ? (
              <ul className="ht-personalise-steps">
                <li>Find a quiet place</li>
                <li>Take the 4-min hearing test</li>
                <li>Enjoy sound tuned to you</li>
              </ul>
            ) : (
              <ul className="ht-personalise-steps">
                <li>Audio is more immersive and dialogue becomes easier to understand.</li>
                <li>Listen at reduced volume with detail preserved.</li>
              </ul>
            )}
          </section>
        </div>
      </div>
      <div className="ht-personalise-actions">
        <PrimaryButton
          title={figmaCopy ? "Personalise your sound" : "Test the fit"}
          onPress={() => go(figmaCopy ? "ht-mic-prompt" : "fit-intro")}
        />
        <PrimaryButton title="Maybe later" variant="ghost" onPress={skipToResults} />
        <div className="ht-personalise-home" aria-hidden="true"><span /></div>
      </div>
    </main>
  );
}

/* ── about.tsx ────────────────────────────────────────────────────────── */
export function HtAbout({ go, back }) {
  return (
    <main className="screen ht-screen ht-mic-screen">
      <HearingHeader onBack={back} />
      <div className="ht-content ht-mic-content">
        <h2 className="ht-h2 ht-center">Sound Personalization</h2>
        <p className="ht-p1 ht-mt16">
          Sound Personalization reveals a unique and enriched audio experience tailored to your
          individual hearing ability.
        </p>
        <div className="ht-bullet">
          <span className="ht-dot">•</span>
          <p className="ht-p1">
            Audio is more immersive and dialogue becomes easier to understand.
          </p>
        </div>
        <div className="ht-bullet">
          <span className="ht-dot">•</span>
          <p className="ht-p1">Listen at reduced volume with detail preserved.</p>
        </div>
      </div>
      <div className="ht-bottom">
        <PrimaryButton title="Get started" onPress={() => go("ht-overview")} />
      </div>
    </main>
  );
}

/* ── overview.tsx ─────────────────────────────────────────────────────── */
const OVERVIEW_STEPS = [
  "Find a quiet place",
  "Take the 4-min hearing test",
  "Enjoy sound tuned to you",
];

export function HtOverview({ go, back }) {
  const { config } = useFlow();
  return (
    <main className="screen ht-screen ht-screen--gray">
      <HearingHeader onBack={back} />
      <h2 className="ht-h2 ht-center ht-mt8">Sound Personalization</h2>
      <div className="ht-card ht-card--overview">
        <h3 className="ht-h3">Take 4-min hearing test</h3>
        <p className="ht-p1 ht-mt8">
          Personalize sound to your unique hearing ability and enjoy audio tuned to you.
        </p>
        <div className="ht-mt20">
          {OVERVIEW_STEPS.map((s, i) => (
            <div className="ht-step" key={s}>
              <span className="ht-step-num">{i + 1}</span>
              <p className="ht-p1">{s}</p>
            </div>
          ))}
        </div>
        <PrimaryButton
          title="Test your ears"
          onPress={() =>
            go(config.mic === "granted" ? "ht-quiet-place" : "ht-mic-prompt")
          }
          className="ht-mt16"
        />
      </div>
    </main>
  );
}

/* ── quiet-place.tsx ──────────────────────────────────────────────────── */
export function HtQuietPlace({ go, back }) {
  /* Simulated ambient noise level 0..1 — swap in real metering for a live read. */
  const [level, setLevel] = useState(0.25);
  const drift = useRef(0.25);

  useEffect(() => {
    const id = window.setInterval(() => {
      drift.current = Math.min(
        0.95,
        Math.max(0.05, drift.current + (Math.random() - 0.52) * 0.18)
      );
      setLevel(drift.current);
    }, 350);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="screen ht-screen">
      <HearingHeader title="Setup" onBack={back} />
      <div className="ht-content">
        <h2 className="ht-h2 ht-center">Find a quiet place</h2>
        <p className="ht-p1 ht-center ht-mt12">
          For the most accurate results, take the hearing test in a quiet environment.
        </p>
        <div className="ht-meter-wrap">
          <LevelMeter level={level} />
        </div>
      </div>
      <div className="ht-bottom">
        <PrimaryButton title="Next" onPress={() => go("ht-device-setup")} />
      </div>
    </main>
  );
}

/* ── device-setup.tsx ─────────────────────────────────────────────────── */
const SETUP_ITEMS = [
  {
    title: "Turn on 'Do Not Disturb'",
    subtitle: "Mute notifications, sounds, and vibrations.",
    modalTitle: "Turn on 'Do not Disturb'",
    modalBody:
      'Turning on Do Not Disturb mode minimizes distractions from notifications, calls, or alerts, ensuring accurate results and a smoother testing experience.\n\nTo find Do Not Disturb on your phone:\n\n1. Open the search function on your phone.\n2. Type "Do not Disturb" in the search bar.\n3. The system will display the relevant option for you to enable the feature.',
  },
  {
    title: "Turn off Audio Effects",
    subtitle: "For example, EQ, Dolby Atmos, or Noise Cancellation.",
    modalTitle: "Turn off Audio Effects",
    modalBody:
      "Audio Effects can affect sound quality and accuracy. We recommend disabling these features while performing the test, including those on your phone and headphones.\n\nPopular Audio Effects:\n• EQ (Equalizer)\n• Dolby Atmos\n• Spatial Audio\n• Noise Cancellation\n• Transparency\n• Adaptive Audio\n• Bass Boost & Surround Sound\n• LDAC",
  },
  {
    title: "Turn off Accessibility settings",
    subtitle: "For example, Headphone Accommodations, or Sound Amplifier.",
    modalTitle: "Turn off Accessibility settings",
    modalBody:
      "Accessibility settings can affect sound quality and accuracy. We recommend disabling these features while performing the test.\n\nPopular Accessibility settings:\n• Headphones Accommodations\n• Background Sounds\n• Mono Audio\n• Balance\n• Volume Limit / Reduce Loud Audio\n• Adapt Sound\n• Sound Amplifier",
  },
];

export function HtDeviceSetup({ go, back }) {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <main className="screen ht-screen">
      <HearingHeader title="Setup" onBack={back} />
      <div className="ht-content ht-scroll">
        <h2 className="ht-h2 ht-center">Set up your phone and headphones</h2>
        {SETUP_ITEMS.map((item, i) => (
          <div className="ht-mt20" key={item.title}>
            <button type="button" className="ht-setup-row" onClick={() => setOpenIdx(i)}>
              <span className="ht-h3">{item.title}</span>
              <span className="ht-info-badge">i</span>
            </button>
            <p className="ht-p2 ht-setup-sub">{item.subtitle}</p>
          </div>
        ))}
      </div>
      <div className="ht-bottom">
        <PrimaryButton title="Next" onPress={() => go("ht-practice")} />
      </div>

      {openIdx !== null && (
        <div className="ht-sheet-backdrop" role="dialog" aria-modal="true">
          <div className="ht-sheet">
            <button
              type="button"
              className="ht-sheet-close"
              onClick={() => setOpenIdx(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="ht-sheet-body">
              <h2 className="ht-h2">{SETUP_ITEMS[openIdx].modalTitle}</h2>
              <p className="ht-p1 ht-mt16 ht-prewrap">{SETUP_ITEMS[openIdx].modalBody}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── practice.tsx — Figma 4.1.A–E and 4.2 ────────────────────────────────
   Five successful rounds, a progress bar that fills with each one, and a skip
   control in the header. Each round: hold while the beep plays, release when
   it stops. */
const PRACTICE_ROUNDS = 5;

export function HtPractice({ go, startComplete = false }) {
  const { config } = useFlow();
  const { playBeep } = useBeepTrial();
  /* start → waiting → beeping → success|fail → … → complete */
  const [phase, setPhase] = useState(startComplete ? "complete" : "start");
  const [done, setDone] = useState(startComplete ? PRACTICE_ROUNDS : 0);
  /* The round loop recurses, so the tally has to live in a ref — reading the
     state variable would capture a stale value from the render that started
     the run and the count would never pass 1. */
  const doneRef = useRef(startComplete ? PRACTICE_ROUNDS : 0);
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function runRound() {
    setPhase("waiting");
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1400));
    if (cancelled.current) return;

    setPhase("beeping");
    let heard = false;
    const poll = window.setInterval(() => {
      if (pressedRef.current) heard = true;
    }, 50);
    await playBeep(1000, 1);
    window.clearInterval(poll);
    if (cancelled.current) return;

    const ok =
      config.practice === "pass" ? true : config.practice === "fail" ? false : heard;
    setPhase(ok ? "success" : "fail");

    const next = ok ? doneRef.current + 1 : doneRef.current;
    doneRef.current = next;
    setDone(next);
    await new Promise((r) => setTimeout(r, 1100));
    if (cancelled.current) return;
    if (next >= PRACTICE_ROUNDS) setPhase("complete");
    else runRound();
  }

  const restart = () => {
    doneRef.current = 0;
    setDone(0);
    runRound();
  };

  /* 4.2 — practice complete. */
  if (phase === "complete") {
    return (
      <main className="screen ht-screen ht-screen--off">
        <HearingHeader
          title="Practice round complete"
          action={<SkipButton onSkip={() => go("ht-test-left", true)} />}
        />
        <TestProgress value={1} />
        <div className="ht-top ht-practice-done">
          <h3 className="ht-h3">Well done, you’re ready for the test</h3>
          <p className="ht-p2">
            Don’t worry about your reaction time, we take this into account.
          </p>
        </div>
        <div className="ht-bottom ht-bottom--anchored">
          <PrimaryButton title="Practice again" variant="ghost" onPress={restart} />
          <PrimaryButton
            title="Start test"
            onPress={() => go("ht-test-left", true)}
            className="ht-mt4"
          />
        </div>
      </main>
    );
  }

  const starting = phase === "start";
  const instruction = starting
    ? "Before we start the test, try this practice round"
    : phase === "beeping" && pressed
    ? "Release the button when you stop hearing the beep"
    : phase === "fail"
    ? "Keep the button pressed"
    : phase === "success"
    ? ""
    : "Keep the button pressed while you hear the beep";

  return (
    <main className="screen ht-screen ht-screen--off">
      <HearingHeader
        title="Practice round"
        action={<SkipButton onSkip={() => go("ht-test-left", true)} />}
      />
      <TestProgress value={done / PRACTICE_ROUNDS} />
      <div className="ht-top">
        <h3 className="ht-h3 ht-center">{instruction}</h3>
      </div>
      <div className="ht-middle">
        <div className="ht-practice-feedback">
          {(phase === "success" || phase === "fail") && <TrialMark kind={phase} />}
        </div>
        <HoldCircle
          onPressIn={() => {
            if (starting) {
              runRound();
              return;
            }
            pressedRef.current = true;
            setPressed(true);
          }}
          onPressOut={() => {
            pressedRef.current = false;
            setPressed(false);
          }}
          pressed={pressed}
          label={starting ? "Start" : undefined}
        />
      </div>
    </main>
  );
}

/* ── test/[ear].tsx ───────────────────────────────────────────────────── */
export function HtEarTest({ ear, go, startPaused = false, startNoise = null }) {
  const earName = ear === "right" ? "Right ear" : "Left ear";
  const { setEarResult, setLastTestDate } = useTest();
  const { playBeep } = useBeepTrial();

  const [phase, setPhase] = useState("countdown");
  const [count, setCount] = useState(3);
  const [trialIdx, setTrialIdx] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [paused, setPaused] = useState(startPaused);
  /* Bumped to re-run the whole sequence in place (pause → Restart this ear).
     Navigating to the same route wouldn't remount, so the effect keys on this
     as well as the ear. */
  const [runKey, setRunKey] = useState(0);
  /* null | "loud" | "quiet" | "cant-find" — the ambient-noise interruption
     (5.1.1.G/H/H.1). Holds the trial loop the same way a pause does. */
  const [noise, setNoise] = useState(startNoise);
  const noiseRef = useRef(!!startNoise);
  const pressedRef = useRef(false);
  const cancelled = useRef(false);
  const pausedRef = useRef(false);

  /* Holds the sequence between trials while paused, so a tone is never cut
     off mid-playback. */
  const waitWhilePaused = async () => {
    while ((pausedRef.current || noiseRef.current) && !cancelled.current) {
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  useEffect(() => {
    cancelled.current = false;
    pausedRef.current = startPaused;
    setPaused(startPaused);
    setPhase("countdown");
    setTrialIdx(0);

    async function run() {
      /* Countdown 3-2-1 */
      for (let c = 3; c > 0; c--) {
        setCount(c);
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled.current) return;
      }
      await waitWhilePaused();
      if (cancelled.current) return;
      setPhase("running");

      const heard = [];
      for (let i = 0; i < TRIALS.length; i++) {
        setTrialIdx(i);
        await waitWhilePaused();
        if (cancelled.current) return;
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
        if (cancelled.current) return;
        let heardThis = false;
        const poll = window.setInterval(() => {
          if (pressedRef.current) heardThis = true;
        }, 50);
        await playBeep(TRIALS[i].freq, TRIALS[i].volume);
        window.clearInterval(poll);
        if (cancelled.current) return;
        heard.push(heardThis);
      }

      setEarResult(ear === "right" ? "right" : "left", scoreFromHeard(heard));
      setPhase("done");
      if (ear === "right") {
        setLastTestDate(todayLabel());
        go("ht-test-success", true);
      } else {
        go("ht-test-complete", true);
      }
    }

    run();
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ear, runKey]);

  /* "It's too loud" holds until the room quietens; "It's quiet" confirms and
     dismisses itself after a moment — no tap required (per the design note). */
  useEffect(() => {
    noiseRef.current = noise === "loud" || noise === "quiet" || noise === "cant-find";
    if (noise === "loud") {
      const t = window.setTimeout(() => setNoise("quiet"), 4000);
      return () => window.clearTimeout(t);
    }
    if (noise === "quiet") {
      const t = window.setTimeout(() => {
        setNoise(null);
        noiseRef.current = false;
      }, 2600);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [noise]);

  const progress = phase === "running" ? trialIdx / TRIALS.length : 0;
  const counting = phase === "countdown";

  return (
    <main className="screen ht-screen ht-screen--off">
      <HearingHeader
        title="Hearing test"
        action={<PauseButton paused={paused} onToggle={togglePause} />}
      />
      <TestProgress value={progress} />
      <div className="ht-top">
        <h3 className="ht-h3 ht-center">{earName}</h3>
        <p className="ht-p1 ht-center ht-mt4">Keep the button pressed while you hear the beep.</p>
      </div>
      <div className="ht-middle">
        {/* One circle for both phases — it holds its position and only the
            label inside it changes, so nothing jumps when the test begins. */}
        <HoldCircle
          onPressIn={() => {
            pressedRef.current = true;
            setPressed(true);
          }}
          onPressOut={() => {
            pressedRef.current = false;
            setPressed(false);
          }}
          pressed={pressed}
          inert={counting || paused}
          label={counting ? String(count) : undefined}
        />
      </div>
      {noise && (
        <NoiseInterruption
          variant={noise}
          meter={<LevelMeter level={noise === "quiet" ? 0.16 : 0.9} />}
          onCantFind={() => setNoise("cant-find")}
          onCancel={() => setNoise("loud")}
          onRestart={() => {
            setNoise(null);
            noiseRef.current = false;
            setRunKey((k) => k + 1);
          }}
        />
      )}
      {paused && !noise && (
        <PauseMenu
          onResume={togglePause}
          onAction={(action) => {
            pausedRef.current = false;
            setPaused(false);
            cancelled.current = true;
            if (action === "skip") {
              /* Leave this ear's result unset and move on. */
              go(ear === "right" ? "ht-test-success" : "ht-test-complete", true);
            } else if (action === "restart") {
              setRunKey((k) => k + 1);
            } else if (action === "practice") {
              go("ht-practice", true);
            } else {
              go("ht-profile", true);
            }
          }}
        />
      )}
    </main>
  );
}

/* ── test/complete.tsx ────────────────────────────────────────────────── */
export function HtTestComplete({ go }) {
  return (
    <main className="screen ht-screen ht-screen--off">
      <HearingHeader title="Hearing test" />
      <div className="ht-top">
        <h3 className="ht-h3 ht-center">Great work!</h3>
        <p className="ht-p1 ht-center ht-mt4">Now let’s test your other ear.</p>
      </div>
      <div className="ht-bottom ht-bottom--anchored">
        <PrimaryButton
          title="Restart test"
          variant="ghost"
          onPress={() => go("ht-test-left", true)}
        />
        <PrimaryButton
          title="Next"
          onPress={() => go("ht-test-right", true)}
          className="ht-mt4"
        />
      </div>
    </main>
  );
}

/* ── test/success.tsx ─────────────────────────────────────────────────── */
export function HtTestSuccess({ go }) {
  useEffect(() => {
    const t = window.setTimeout(() => go("ht-results", true), 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="screen ht-screen ht-screen--off">
      <HearingHeader title="Test complete" />
      <div className="ht-top">
        <h3 className="ht-h3 ht-center">Success!</h3>
        <p className="ht-p1 ht-center ht-mt4">Your results are ready.</p>
      </div>
      <div className="ht-middle ht-middle--center">
        <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="38" stroke="#4DB6AC" strokeWidth="2" fill="none" />
          <path
            d="M24 42 L36 53 L57 28"
            stroke="#4DB6AC"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </main>
  );
}

/* ── results.tsx ──────────────────────────────────────────────────────── */
function capacity(r) {
  return Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 100);
}

function CapacityCard({ label, pct, barColor }) {
  return (
    <div className="ht-cap-card">
      <h3 className="ht-h3">{label}</h3>
      <p className="ht-p2 ht-mt2">hearing capacity</p>
      <p className="ht-cap-pct">{pct}%</p>
      <div className="ht-cap-track">
        <span style={{ width: `${Math.max(4, pct)}%`, background: barColor }} />
      </div>
    </div>
  );
}

export function HtResults({ go }) {
  const { left: realLeft, right: realRight, lastTestDate } = useTest();
  const left = effectiveEar("left", realLeft);
  const right = effectiveEar("right", realRight);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  return (
    <main className="screen ht-screen">
      <StatusBar />
      <div className="ht-scroll ht-scroll--flush">
        <div className="ht-results-header">
          <h1 className="ht-h1">Hearing test results</h1>
          <p className="ht-p2 ht-mt4">Last test: {lastTestDate ?? "—"}</p>
        </div>

        <div className="ht-cap-row">
          <CapacityCard label="Left" pct={capacity(left)} barColor={colors.chartPurple} />
          <CapacityCard label="Right" pct={capacity(right)} barColor={colors.dark} />
        </div>

        <div className="ht-chart-section">
          <div className="ht-chips">
            <button
              type="button"
              className={`ht-chip${showLeft ? " is-active" : ""}`}
              onClick={() => setShowLeft(!showLeft)}
            >
              <span className="ht-chip-dot" style={{ background: colors.chartPurple }} />
              Left ear
            </button>
            <button
              type="button"
              className={`ht-chip${showRight ? " is-active" : ""}`}
              onClick={() => setShowRight(!showRight)}
            >
              <span className="ht-chip-dot" style={{ background: colors.ink }} />
              Right ear
            </button>
          </div>
          <div className="ht-mt16">
            <HearingChart
              left={left}
              right={right}
              showLeft={showLeft}
              showRight={showRight}
              height={300}
            />
          </div>
          <button type="button" className="ht-more-row" onClick={() => go("ht-more-info")}>
            <span className="ht-info-circle">i</span>
            <span className="ht-more-label">More about hearing test</span>
            <span className="ht-chevron">›</span>
          </button>
        </div>
      </div>
      <div className="ht-bottom ht-bottom--tight">
        <PrimaryButton title="Done" onPress={() => go("ht-profile", true)} />
      </div>
    </main>
  );
}

/* ── more-info.tsx ────────────────────────────────────────────────────── */
export function HtMoreInfo({ back }) {
  return (
    <main className="screen ht-screen">
      <HearingHeader title="More about your sound profile" onBack={back} />
      <div className="ht-scroll ht-scroll--pad">
        <div className="ht-card">
          <p className="ht-card-title">PERSONALISED SOUND</p>
          <p className="ht-p1 ht-mt12">
            • Brings back sonic details for a more immersive and distinctive sound experience.
          </p>
          <p className="ht-p1 ht-mt12">
            • Restores whiz and click tones in spoken content, making it easier to catch every word
            and improve speech-intelligibility.
          </p>
        </div>
        <div className="ht-card ht-mt16">
          <p className="ht-card-title">DISCLAIMER</p>
          <p className="ht-p1 ht-mt12">
            This hearing test software is not a medical device and is not intended to diagnose,
            cure, mitigate, treat or prevent any disease or condition. If you have questions or
            concerns about your hearing, you should contact a physician.
          </p>
        </div>
      </div>
      <div className="ht-bottom">
        <PrimaryButton title="Done" onPress={back} />
      </div>
    </main>
  );
}

/* ── profile.tsx ──────────────────────────────────────────────────────── */
const PRESETS = [
  { key: "softer", label: "Softer" },
  { key: "recommended", label: "Recommended" },
  { key: "richer", label: "Richer" },
];

function ProfileNavBar({ onProfileDown, onProfileUp }) {
  return (
    <nav className="ht-figma-nav" aria-label="Primary navigation">
      <div className="ht-figma-nav-row">
        <div className="ht-figma-nav-item">
          <img src="./assets/nav-home.svg" alt="" />
          <span>Home</span>
        </div>
        <div
          className="ht-figma-nav-item is-active"
          onPointerDown={onProfileDown}
          onPointerUp={onProfileUp}
          onPointerCancel={onProfileUp}
          onPointerLeave={onProfileUp}
        >
          <img src="./assets/nav-person.svg" alt="" />
          <span>Profile</span>
        </div>
        <div className="ht-figma-nav-item">
          <span className="ht-figma-settings" aria-hidden="true">
            <img src="./assets/nav-settings-outer.svg" alt="" />
            <img src="./assets/nav-settings-inner.svg" alt="" />
          </span>
          <span>Settings</span>
        </div>
      </div>
      <div className="ht-figma-home-indicator" aria-hidden="true" />
    </nav>
  );
}

export function HtProfile({ go, exit }) {
  const {
    left,
    right,
    preset,
    setPreset,
    personalizationOn,
    setPersonalizationOn,
    vizVariant,
    setVizVariant,
    reset,
  } = useTest();
  const [playing, setPlaying] = useState(false);
  const [vizToast, setVizToast] = useState(null);
  const longPress = useRef(null);

  /* Hidden research toggle: long-press the "Profile" tab to switch between the
     Threads and Capsule visualizations. Not visible to participants. */
  const toggleViz = () => {
    const next = vizVariant === "threads" ? "capsule" : "threads";
    setVizVariant(next);
    setVizToast(`Visualization: ${next === "threads" ? "Threads" : "Capsule"}`);
    window.setTimeout(() => setVizToast(null), 1200);
  };

  const startLongPress = () => {
    longPress.current = window.setTimeout(toggleViz, 600);
  };
  const cancelLongPress = () => {
    if (longPress.current) window.clearTimeout(longPress.current);
    longPress.current = null;
  };

  return (
    <main className="screen ht-screen">
      <StatusBar />
      <div className="ht-scroll ht-scroll--profile">
        <h1 className="ht-h1">Profile</h1>
        {vizToast && <div className="ht-viz-toast">{vizToast}</div>}

        <div className="ht-card ht-mt16">
          <div className="ht-row-between">
            <h3 className="ht-h3">Sound Personalization</h3>
            <button
              type="button"
              role="switch"
              aria-checked={personalizationOn}
              aria-label="Sound Personalization"
              className={`ht-switch${personalizationOn ? " is-on" : ""}`}
              onClick={() => setPersonalizationOn(!personalizationOn)}
            >
              <span />
            </button>
          </div>
          <p className="ht-p2 ht-mt8">
            Based on your hearing test, we’ve calibrated your audio to match your hearing profile.
          </p>
          <div className="ht-mt8">
            <HearingPrint
              left={left}
              right={right}
              preset={preset}
              personalizationOn={personalizationOn}
              variant={vizVariant}
            />
          </div>
          <div className="ht-segmented">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.key}
                className={`ht-segment${preset === p.key ? " is-active" : ""}`}
                onClick={() => setPreset(p.key)}
                aria-label={p.label}
                aria-pressed={preset === p.key}
              >
                <PresetIcon
                  preset={p.key}
                  color={preset === p.key ? colors.white : colors.ink}
                />
              </button>
            ))}
          </div>
          <div className="ht-segment-labels">
            {PRESETS.map((p) => (
              <span key={p.key} className={preset === p.key ? "is-active" : undefined}>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <button type="button" className="ht-play-bar" onClick={() => setPlaying(!playing)}>
          <span className="ht-play-copy">
            <span className="ht-play-title">Hear the difference</span>
            <span className="ht-play-sub">{playing ? "Tap to pause" : "Tap to play"}</span>
          </span>
          <span className="ht-play-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              {playing ? (
                <>
                  <rect x="3" y="2" width="3.6" height="12" rx="1.2" fill="#F63000" />
                  <rect x="9.4" y="2" width="3.6" height="12" rx="1.2" fill="#F63000" />
                </>
              ) : (
                <path d="M4 2.5v11l9-5.5z" fill="#F63000" />
              )}
            </svg>
          </span>
        </button>

        <button type="button" className="ht-results-card" onClick={() => go("ht-results")}>
          <span className="ht-row-between">
            <span className="ht-h3">Hearing test results</span>
            <span className="ht-chevron">›</span>
          </span>
          <span className="ht-p2 ht-results-card-sub">
            Look at how sound personalization tailors the stereo to your unique hearing ability.
          </span>
          <HearingChart
            left={effectiveEar("left", left)}
            right={effectiveEar("right", right)}
            height={140}
            compact
          />
        </button>

        <PrimaryButton
          title="Test your ears again"
          variant="secondary"
          onPress={() => go("ht-quiet-place")}
          className="ht-mt24"
        />
        <PrimaryButton
          title="Reset"
          variant="ghost"
          onPress={() => {
            reset();
            exit();
          }}
          className="ht-mt4"
        />
      </div>

      <ProfileNavBar onProfileDown={startLongPress} onProfileUp={cancelLongPress} />
    </main>
  );
}

/* ── Microphone permission (Figma 14b-2a / 2b / 2c) ───────────────────────
   Gates the quiet-place measurement: the meter can't run without mic access.
   Three states — pre-prompt, the system dialog, and the denied state that
   sends the participant to Settings. */

function MicScreen({ back, children, onAllow }) {
  return (
    <main className="screen ht-screen">
      <HearingHeader title="Setup" onBack={back} />
      <div className="ht-content">
        <h2 className="ht-h2 ht-center">Find a quiet place</h2>
        <p className="ht-p1 ht-center ht-mt12">
          For the most accurate results, take the hearing test in a quiet environment.
        </p>
        <div className="ht-mic-mark" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="58" fill="none" stroke="#9AA1A7" strokeWidth="1.5" />
            <path
              d="M60 34a8 8 0 0 1 8 8v18a8 8 0 0 1-16 0V42a8 8 0 0 1 8-8Z"
              fill="none"
              stroke="#4A545E"
              strokeWidth="3"
            />
            <path
              d="M44 58a16 16 0 0 0 32 0M60 74v12"
              fill="none"
              stroke="#4A545E"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M32 32l56 56" stroke="#4A545E" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="ht-p1 ht-center ht-mic-caption">Allow microphone access</p>
      </div>
      <div className="ht-bottom ht-mic-bottom">
        <PrimaryButton title="Allow access" onPress={onAllow} />
        <div className="ht-mic-home" aria-hidden="true"><span /></div>
      </div>
      {children}
    </main>
  );
}

/* 14b-2a — before the system prompt has been raised. */
export function HtMicPrompt({ go, back }) {
  return <MicScreen back={back} onAllow={() => go("ht-mic-dialog")} />;
}

/* 14b-2b — the iOS permission alert. */
export function HtMicDialog({ go, back }) {
  return (
    <MicScreen back={back} onAllow={() => {}}>
      <div className="ht-ios-backdrop">
        <div className="ht-ios-alert" role="dialog" aria-modal="true">
          <div className="ht-ios-alert-body">
            <h3>“Denon” Would Like to Access Your Microphone</h3>
            <p>Enable microphone access to measure your ambient noise during hearing tests.</p>
          </div>
          <div className="ht-ios-alert-actions">
            <button type="button" onClick={() => go("ht-mic-denied", true)}>
              Don’t Allow
            </button>
            <button type="button" className="is-default" onClick={() => go("ht-quiet-place", true)}>
              Allow
            </button>
          </div>
        </div>
      </div>
    </MicScreen>
  );
}

/* 14b-2c — denied. Open settings leads to the OS app settings, where mic and
   bluetooth permissions can be changed. */
export function HtMicDenied({ go, back }) {
  return (
    <MicScreen back={back} onAllow={() => go("ht-mic-dialog")}>
      <div className="ht-ios-backdrop">
        <div className="ht-ios-alert" role="dialog" aria-modal="true">
          <div className="ht-ios-alert-body">
            <h3>Allow microphone access</h3>
            <p>
              For the most accurate hearing test results, the microphone measures whether the
              environment is quiet enough.
            </p>
          </div>
          <div className="ht-ios-alert-actions">
            <button type="button" className="is-destructive" onClick={back}>
              Cancel
            </button>
            <button type="button" className="is-default" onClick={() => go("ht-quiet-place", true)}>
              Open settings
            </button>
          </div>
        </div>
      </div>
    </MicScreen>
  );
}
