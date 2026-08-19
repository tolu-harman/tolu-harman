import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./hearing/hearing.css";
import StatusBar from "./components/StatusBar";
import LevelMeter from "./components/LevelMeter";
import DevPanel from "./components/DevPanel";
import { FlowProvider, useFlow } from "./components/FlowConfig";
import "./components/dev-panel.css";
import "./components/level-meter.css";
import { TestProvider } from "./hearing/TestContext";
import {
  HtAbout,
  HtDeviceSetup,
  HtEarTest,
  HtIntro,
  HtMicDenied,
  HtMicDialog,
  HtMicPrompt,
  HtMoreInfo,
  HtOverview,
  HtPractice,
  HtProfile,
  HtQuietPlace,
  HtResults,
  HtTestComplete,
  HtTestSuccess,
} from "./hearing/screens";

const ASSET = "./assets/";
const FIGMA_EAR_TIP_CHECK = `${ASSET}figma-ear-tip-check.svg`;

const catalogueProducts = [
  {
    name: "Denon PerL 2",
    image: "perl2-list-white.png",
    imageClass: "single-image",
    enabled: true,
  },
  {
    name: "Denon PerL Pro",
    pair: ["perl-pro-left.png", "perl-pro-right.png"],
    imageClass: "pro-pair",
  },
  {
    name: "Denon PerL",
    pair: ["perl-left.png", "perl-right.png"],
    imageClass: "perl-pair",
  },
  {
    name: "Denon AH-C840NCW",
    pair: ["c840-left.png", "c840-right.png"],
    imageClass: "stem-pair",
  },
  {
    name: "Denon AH-C500W",
    pair: ["c500-left.png", "c500-right.png"],
    imageClass: "stem-pair compact",
  },
];

const foundProducts = [
  {
    name: "Denon PerL 2 White",
    image: "found-white.png",
    imageClass: "found-white",
  },
  {
    name: "Denon PerL 2 Black",
    image: "found-black.png",
    imageClass: "found-black",
  },
];

function HomeIndicator() {
  return (
    <div className="home-bar" aria-hidden="true">
      <span />
    </div>
  );
}

function FlowChooserHotspot({ onOpen }) {
  const press = useRef(null);
  const start = () => {
    press.current = window.setTimeout(onOpen, 600);
  };
  const cancel = () => {
    if (press.current) window.clearTimeout(press.current);
    press.current = null;
  };
  return (
    <div
      className="flow-chooser-hotspot"
      aria-hidden="true"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
    />
  );
}

function TopNavigation({ onBack, title }) {
  return (
    <header className="top-navigation">
      <StatusBar />
      <div className="nav-row">
        <button className="icon-button back-button" onClick={onBack} aria-label="Back">
          <img src={`${ASSET}back.svg`} alt="" />
        </button>
        {title && <h1 className="nav-title">{title}</h1>}
      </div>
    </header>
  );
}

function FigmaVideo({ className, src, poster, label }) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={`media-swap ${className}${playing ? " is-playing" : ""}`}
      role="img"
      aria-label={label}
    >
      <img className="media-placeholder" src={poster} alt="" aria-hidden="true" />
      {!failed && (
        <video
          className="media-video"
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onCanPlay={(event) => {
            event.currentTarget.play().catch(() => {});
          }}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function ProductThumb({ product }) {
  if (product.pair) {
    return (
      <div className={`product-thumb ${product.imageClass || ""}`} aria-hidden="true">
        <img src={`${ASSET}${product.pair[0]}`} alt="" />
        <img src={`${ASSET}${product.pair[1]}`} alt="" />
      </div>
    );
  }

  return (
    <div className={`product-thumb ${product.imageClass || ""}`} aria-hidden="true">
      <img src={`${ASSET}${product.image}`} alt="" />
    </div>
  );
}

function FigmaFitTestScreen({ onBack, onNext }) {
  return (
    <main className="screen fit-test-rebuilt-screen">
      <header className="fit-test-rebuilt-nav">
        <div className="fit-test-rebuilt-status" aria-hidden="true" />
        <div className="fit-test-rebuilt-title-row">
          <button className="fit-test-rebuilt-back" onClick={onBack} aria-label="Back">
            <img src={`${ASSET}figma-fit-back.svg`} alt="" />
          </button>
          <h1>Fit test</h1>
          <span aria-hidden="true" />
        </div>
      </header>
      <div className="fit-test-rebuilt-visual" aria-hidden="true">
        <img className="fit-test-rebuilt-lines" src={`${ASSET}figma-fit-lines.svg`} alt="" />
        <div className="fit-test-rebuilt-earbud">
          <img src={`${ASSET}figma-fit-perl2.png`} alt="" />
        </div>
      </div>
      <section className="fit-test-rebuilt-copy">
        <h2>Fit test</h2>
        <p>This test will help you find the right fit and make sure there is no sound leakage which can greatly improve your listening experience. </p>
      </section>
      <div className="fit-test-rebuilt-bottom">
        <button onClick={onNext}>Next</button>
        <div className="fit-test-rebuilt-home" aria-hidden="true" />
      </div>
    </main>
  );
}

function CatalogueScreen({ onSelect }) {
  const [notice, setNotice] = useState("");

  return (
    <main className="screen catalogue-screen">
      <header className="catalogue-nav">
        <StatusBar />
        <div className="catalogue-nav-row">
          <button className="icon-button more-button" aria-label="More options">
            <img src={`${ASSET}more.svg`} alt="" />
          </button>
        </div>
      </header>

      <section className="catalogue-content">
        <div className="intro-copy">
          <h1>Welcome, John</h1>
          <p>Please select the Denon headphones you wish to connect:</p>
        </div>

        <div className="product-list">
          {catalogueProducts.map((product) => (
            <button
              key={product.name}
              className="product-row"
              onClick={() => {
                if (product.enabled) {
                  onSelect();
                } else {
                  setNotice("This prototype flow is available for Denon PerL 2.");
                }
              }}
              aria-label={`Connect ${product.name}`}
            >
              <ProductThumb product={product} />
              <span>{product.name}</span>
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <button className="toast" onClick={() => setNotice("")} aria-label="Dismiss message">
          {notice}
        </button>
      )}
      <HomeIndicator />
    </main>
  );
}

function SearchVisual({ failed = false }) {
  return (
    <div className="search-visual" aria-hidden="true">
      <img
        src={`${ASSET}${failed ? "not-found-rings.svg" : "search-rings.svg"}`}
        alt=""
      />
    </div>
  );
}

function SearchScreen({ onBack, onHelp, onCancel, onFinished, attempt }) {
  useEffect(() => {
    const timer = window.setTimeout(onFinished, 5000);
    return () => window.clearTimeout(timer);
  }, [attempt, onFinished]);

  return (
    <main className="screen search-screen">
      <TopNavigation onBack={onBack} />
      <section className="search-content">
        <SearchVisual />
        <div className="search-copy">
          <h1>Searching for Denon PerL 2</h1>
          <p>Please make sure your headphones are nearby with the case lid open.</p>
        </div>
      </section>

      <div className="search-actions">
        <button className="button button-outline" onClick={onHelp}>Need help</button>
        <button className="button button-text" onClick={onCancel}>Cancel</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

function NotFoundScreen({ onBack, onHelp }) {
  return (
    <main className="screen search-screen">
      <TopNavigation onBack={onBack} />
      <section className="search-content">
        <SearchVisual failed />
        <div className="search-copy">
          <h1>Denon PerL 2 not found</h1>
          <p>Please make sure your headphones are nearby with the case lid open.</p>
        </div>
      </section>
      <div className="search-actions not-found-actions">
        <button className="button button-outline" onClick={onHelp}>Need help</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

function HelpScreen({ onClose, onRetry }) {
  const [reported, setReported] = useState(false);

  return (
    <main className="screen help-screen">
      <div className="help-backdrop">
        <StatusBar light />
      </div>
      <section className="help-sheet">
        <div className="grabber" aria-hidden="true" />
        <div className="help-title">
          <h1>Connection help</h1>
          <button className="icon-button close-button" onClick={onClose} aria-label="Close">
            <img src={`${ASSET}close.svg`} alt="" />
          </button>
        </div>
        <FigmaVideo
          className="help-visual"
          src={`${ASSET}perl-2-pairing-animation.mp4`}
          poster={`${ASSET}pairing-help.png`}
          label="Black Denon PerL 2 charging case entering pairing mode"
        />
        <div className="help-copy">
          <h2>Press and hold the button</h2>
          <p>
            Place your earbuds in the case, then press the button on the back to
            enter pairing mode. The indicator light will start blinking blue.
          </p>
        </div>
      </section>

      <div className="help-actions">
        <button className="button button-outline" onClick={onRetry}>Try again</button>
        <button className="button button-text" onClick={() => setReported(true)}>
          Report connection issue
        </button>
      </div>
      {reported && (
        <button className="toast" onClick={() => setReported(false)} aria-label="Dismiss message">
          Connection issue recorded.
        </button>
      )}
      <HomeIndicator />
    </main>
  );
}

function FoundCard({ product, onConnect }) {
  return (
    <article className="found-card">
      <div className="found-image-wrap">
        <img
          className={product.imageClass}
          src={`${ASSET}${product.image}`}
          alt={product.name}
        />
      </div>
      <div className="found-copy">
        <h2>{product.name}</h2>
        <p>Connect to start enjoying your headphones.</p>
      </div>
      <button className="button button-primary" onClick={() => onConnect(product)}>
        Connect
      </button>
    </article>
  );
}

function FoundScreen({ onBack, onConnect }) {
  return (
    <main className="screen found-screen">
      <TopNavigation onBack={onBack} />
      <section className="found-list">
        {foundProducts.map((product) => (
          <FoundCard key={product.name} product={product} onConnect={onConnect} />
        ))}
      </section>
      <HomeIndicator />
    </main>
  );
}

function LoadingMark() {
  return (
    <span className="loading-mark" aria-label="Pairing">
      <img
        className="loading-ring"
        src={`${ASSET}spinner-ring.svg`}
        alt=""
        aria-hidden="true"
      />
      <span className="loading-sweep" aria-hidden="true">
        <img className="loading-arc" src={`${ASSET}spinner-arc.svg`} alt="" />
      </span>
    </span>
  );
}

function SetupCard({ complete = false, onNext }) {
  return (
    <article className={`setup-card ${complete ? "setup-card-complete" : "setup-card-preparing"}`}>
      {complete ? (
        <FigmaVideo
          className="setup-visual"
          src={`${ASSET}buds-moving-white-2.mp4`}
          poster={`${ASSET}setup-complete.png`}
          label="Denon PerL 2 earbuds lifting from their charging case"
        />
      ) : (
        <div className="setup-visual setup-placeholder">
          <img
            className="setup-placeholder-image"
            src={`${ASSET}preparing.png`}
            alt="Denon PerL 2 preparing"
          />
        </div>
      )}
      <div className="setup-copy">
        <h1>{complete ? "Setup complete" : "Getting ready..."}</h1>
        <p>{complete ? "Enjoy your headphones." : "Finishing up setup."}</p>
      </div>
      <button
        className="button button-primary setup-button"
        onClick={complete ? onNext : undefined}
        disabled={!complete}
      >
        {complete ? "Next" : <LoadingMark />}
      </button>
    </article>
  );
}

function PairingPromptScreen({ onBack, onSelectAccessory }) {
  return (
    <main className="screen setup-screen">
      <TopNavigation onBack={onBack} />
      <div className="setup-shell">
        <SetupCard />
      </div>
      <HomeIndicator />

      <div className="shade" aria-hidden="true" />
      <section className="ios-alert" role="dialog" aria-modal="true" aria-labelledby="accessory-title">
        <h2 id="accessory-title">Select An Accessory</h2>
        <button className="ios-row accessory-row" onClick={onSelectAccessory}>
          Denon PerL 2
        </button>
        <div className="ios-row" aria-hidden="true" />
        <div className="ios-row" aria-hidden="true" />
        <button className="ios-row ios-cancel" onClick={onBack}>Cancel</button>
      </section>
    </main>
  );
}

function PreparingScreen({ onBack, onFinished }) {
  useEffect(() => {
    const timer = window.setTimeout(onFinished, 1800);
    return () => window.clearTimeout(timer);
  }, [onFinished]);

  return (
    <main className="screen setup-screen">
      <TopNavigation onBack={onBack} />
      <div className="setup-shell">
        <SetupCard />
      </div>
      <HomeIndicator />
    </main>
  );
}

function CompleteScreen({ onBack, onNext }) {
  return (
    <main className="screen setup-screen complete-screen">
      <TopNavigation onBack={onBack} />
      <div className="setup-shell">
        <SetupCard complete onNext={onNext} />
      </div>
      <HomeIndicator />
    </main>
  );
}

function FitBudsScreen({ onBack, onTryNow, onNext }) {
  return (
    <main className="screen fit-buds-screen">
      <TopNavigation onBack={onBack} />
      <section className="fit-buds-content">
        <div className="fit-buds-visual">
          <img src={`${ASSET}fit-buds-product.png`} alt="Denon PerL 2 earbuds and case" />
        </div>
        <div className="fit-buds-copy">
          <h1>Finding the right fit</h1>
          <p>Try the fit test to check if your headphones fit properly. A good fit improves sound quality and feature performance.</p>
        </div>
        <button className="button button-primary" onClick={onTryNow}>Try now</button>
        <button className="button button-text" onClick={onNext}>Next</button>
      </section>
      <HomeIndicator />
    </main>
  );
}

/* ---------------------------------------------------------------------------
   Fit test flow (Figma board 1545:72055, screens named 11a-N).
   Geometry taken from Figma: 375x812 frame, nav 92, title row 48 at y=100,
   body text 335 wide at x=20, bottom wrapper at y=698.
   --------------------------------------------------------------------------- */

const EAR_TIP_OPTIONS = [
  "Extra small",
  "Small",
  "Medium (Default)",
  "Large",
  "Foam tip",
  "3rd party ear tip",
];

function ScreenTitle({ children }) {
  return (
    <div className="screen-title">
      <h2>{children}</h2>
    </div>
  );
}

/* Figma "Fit - Test Buds" component, 223x120, L/R labels above the pair. */
function FitBudsGraphic({ left, right }) {
  const showSeal = Boolean(left && right);
  return (
    <div className="fit-buds-graphic">
      <div className="fit-bud-labels" aria-hidden="true">
        <span>L</span>
        <span>R</span>
      </div>
      <div className="fit-bud-images">
        <img src={`${ASSET}fit-test-buds.png`} alt="" aria-hidden="true" />
      </div>
      {showSeal && (
        <div className="fit-seal-row">
          {[left, right].map((state, index) => (
            <div className={`fit-seal fit-seal-${state}`} key={index}>
              <span className="fit-seal-icon" aria-hidden="true">
                {state === "good" ? "✓" : "!"}
              </span>
              <span>{state === "good" ? "Good seal" : "Bad seal"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 11a-1 */
function FitIntroScreen({ onBack, onNext }) {
  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="Fit test" />
      <section className="fit-body">
        <div className="fit-asset-box" aria-hidden="true" />
        <p className="fit-paragraph">
          This test will help you find the right fit and make sure there is no
          sound leakage which can greatly improve your listening experience
        </p>
      </section>
      <div className="fit-actions">
        <button className="button button-primary" onClick={onNext}>Next</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

/* 11a-4a / 4b / 4c / noisy — background noise check, four states. */
/* Measuring sweep: starts quiet (green), rises through OK to loud (red), then
   comes back down and settles quiet (green). Times are fractions of the run. */
const NOISE_SWEEP = [
  { t: 0, level: 0.14 },
  { t: 0.16, level: 0.3 },
  { t: 0.34, level: 0.62 },
  { t: 0.46, level: 0.88 },
  { t: 0.56, level: 0.84 },
  { t: 0.72, level: 0.5 },
  { t: 0.88, level: 0.2 },
  { t: 1, level: 0.15 },
];
const NOISE_SWEEP_MS = 11000;

function sweepLevel(p) {
  if (p <= 0) return NOISE_SWEEP[0].level;
  const last = NOISE_SWEEP[NOISE_SWEEP.length - 1];
  if (p >= 1) return last.level;
  for (let i = 0; i < NOISE_SWEEP.length - 1; i++) {
    const a = NOISE_SWEEP[i];
    const b = NOISE_SWEEP[i + 1];
    if (p >= a.t && p <= b.t) {
      let k = (p - a.t) / (b.t - a.t);
      k = k * k * (3 - 2 * k); // smoothstep
      return a.level + (b.level - a.level) * k;
    }
  }
  return last.level;
}

function NoiseCheckScreen({ state, onBack, onNext, onRetry, onLater, onProceed, onCancelAudio }) {
  const isGood = state === "good";
  const isNoisy = state === "noisy";
  const measuring = state === "measuring";

  /* Resting levels for the non-measuring states, mid-band so the label and
     colour read unambiguously. */
  const restLevel = isGood ? 0.16 : isNoisy ? 0.88 : 0.55;
  const [level, setLevel] = useState(measuring ? NOISE_SWEEP[0].level : restLevel);

  useEffect(() => {
    if (!measuring) {
      setLevel(restLevel);
      return;
    }
    /* rAF rather than an interval: the level is continuous, so it reads as a
       room getting louder and settling rather than stepping between bands. */
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / NOISE_SWEEP_MS);
      /* Small jitter keeps it alive without crossing a band boundary. */
      const jitter = (Math.random() - 0.5) * 0.015;
      setLevel(Math.max(0.05, Math.min(0.97, sweepLevel(p) + jitter)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [measuring, restLevel]);

  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="Fit test" />
      <h2 className="fit-section-title">Background noise check</h2>
      <section className="fit-body">
        <LevelMeter level={level} />
        {isGood && (
          <div className="noise-status" aria-hidden="true">
            <span className="noise-status-icon">✓</span>
            <span>Good</span>
          </div>
        )}
        <p className="fit-paragraph">
          {isGood
            ? "The background noise levels are good. You’re all set to begin the fit test."
            : isNoisy
            ? "The current noise levels aren’t suitable for the Fit test. Please move to a quieter place and try again."
            : "To measure your fit more accurately, make sure you are in a quiet place"}
        </p>
      </section>

      <div className="fit-actions">
        {isNoisy ? (
          <>
            <button className="button button-primary" onClick={onRetry}>Try again</button>
            <button className="button button-outline" onClick={onLater}>Maybe later</button>
          </>
        ) : (
          <button className="button button-primary" onClick={onNext}>Next</button>
        )}
      </div>
      <HomeIndicator />

      {state === "audio-paused" && (
        <>
          <div className="shade" aria-hidden="true" />
          <section
            className="fit-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audio-paused-title"
          >
            <header className="fit-popup-title">
              <h2 id="audio-paused-title">Audio will be paused</h2>
            </header>
            <div className="fit-popup-body">
              <p>
                We need to pause your currently playing song to complete the fit
                test. Would you like to proceed?
              </p>
              <div className="fit-popup-actions">
                <button className="button button-text" onClick={onCancelAudio}>Cancel</button>
                <button className="button button-text" onClick={onProceed}>Proceed</button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/* 11a-5 — fit test, buds entering the ear. */
function FitTestScreen({ onBack, onNext, budsOut = false }) {
  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="Fit test" />
      <section className="fit-body">
        <div className="fit-mesh">
          <img src={`${ASSET}fit-mesh.png`} alt="" aria-hidden="true" />
        </div>
        <h1 className="fit-heading">Fit test</h1>
        <p className="fit-paragraph">
          This test will help you find the right fit and make sure there is no
          sound leakage which can greatly improve your listening experience.
        </p>
      </section>
      <div className="fit-actions">
        {/* Design surfaces why Next is unavailable rather than just dimming it. */}
        {budsOut && <p className="fit-status-note">Buds not in ear</p>}
        <button className="button button-primary" onClick={onNext} disabled={budsOut}>
          Next
        </button>
      </div>
      <HomeIndicator />
    </main>
  );
}

/* 11a-6 / 11a-8e — ear tip size. */
function EarTipsScreen({ onBack, onDone, title }) {
  const [selected, setSelected] = useState("Medium (Default)");

  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="What size is your ear tips?" />
      <p className="fit-paragraph fit-paragraph-tight">
        Select the eartip size you’re currently using. The default is set to Medium.
      </p>
      <ul className="ear-tip-list">
        {EAR_TIP_OPTIONS.map((option) => (
          <li key={option}>
            <button
              className="ear-tip-row"
              onClick={() => setSelected(option)}
              aria-pressed={selected === option}
            >
              <span>{option}</span>
              {selected === option && (
                <img
                  className="ear-tip-check"
                  src={FIGMA_EAR_TIP_CHECK}
                  alt=""
                  aria-hidden="true"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="fit-actions">
        <button className="button button-primary" onClick={onDone}>Done</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

/* 11a-7 / 11a-8a — checking the fit, progress. */
function CheckingFitScreen({ onBack, onCancel, onFinished, progress = 0.08, status }) {
  const [animatedProgress, setAnimatedProgress] = useState(0.08);

  useEffect(() => {
    const tone = new Audio(`${ASSET}fit-test-tone.mp4`);
    tone.loop = true;
    tone.preload = "auto";

    // This screen is entered from a user action in the flow, so start the
    // tone immediately. If a browser blocks autoplay, the check still runs
    // and the audio element is cleaned up when the screen ends.
    tone.play().catch(() => {});

    // Animate from current progress to 100% over 3 seconds
    const startTime = Date.now();
    const duration = 3200;
    let frame;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setAnimatedProgress(newProgress);

      if (newProgress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        tone.pause();
        tone.currentTime = 0;
        onFinished();
      }
    };

    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      tone.pause();
      tone.currentTime = 0;
      tone.src = "";
    };
  }, [onFinished]);

  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="Fit test" />
      <h2 className="fit-section-title">Checking the fit</h2>
      <section className="fit-body">
        <FitBudsGraphic />
        <div className="fit-progress">
          <p>{status}</p>
          <div className="fit-progress-track" aria-hidden="true">
            <span style={{ width: `${Math.round(animatedProgress * 100)}%` }} />
          </div>
        </div>
      </section>
      <div className="fit-actions">
        <button className="button button-outline" onClick={onCancel}>Cancel</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

/* Good-seal result. */
function FitGoodScreen({ onBack, onNext }) {
  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="Fit test" />
      <section className="fit-body">
        <FitBudsGraphic left="good" right="good" />
        <div className="fit-result-copy">
          <h1>You have a good fit</h1>
          <p>Your earbuds sound great.</p>
        </div>
      </section>
      <div className="fit-actions">
        <button className="button button-primary" onClick={onNext}>Next</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

/* Bad-seal result — one or both buds sealing poorly. */
function FitBadScreen({ onBack, onRetry, onContinue, left = "bad", right = "good" }) {
  return (
    <main className="screen fit-screen">
      <TopNavigation onBack={onBack} title="Fit test" />
      <section className="fit-body">
        <FitBudsGraphic left={left} right={right} />
        <p className="fit-paragraph">
          Please adjust earbud or change the ear tip size that is most
          comfortable. You can always try testing again.
        </p>
      </section>
      <div className="fit-actions">
        <button className="button button-primary" onClick={onRetry}>
          Check fit and noise level again
        </button>
        <button className="button button-outline" onClick={onContinue}>Continue</button>
      </div>
      <HomeIndicator />
    </main>
  );
}

function App() {
  const flow = useFlow();
  const { config } = flow;
  /* Bumped on every navigation so the rendered screen remounts — including
     when navigating to the screen you're already on (jumping to the same
     route from the flow panel, or "Restart this ear"). Without this React
     reuses the instance and initial state never re-applies. */
  const [navSeq, setNavSeq] = useState(0);
  const [screen, setScreen] = useState(() => window.history.state?.screen || "catalogue");
  const [attempt, setAttempt] = useState(() => window.history.state?.attempt || 0);
  const attemptRef = useRef(attempt);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    if (!window.history.state?.screen) {
      window.history.replaceState({ screen: "catalogue", attempt: 0 }, "");
    }

    const handlePopState = (event) => {
      setScreen(event.state?.screen || "catalogue");
      const nextAttempt = event.state?.attempt || 0;
      attemptRef.current = nextAttempt;
      setAttempt(nextAttempt);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const pushScreen = useCallback((nextScreen, nextAttempt = attemptRef.current) => {
    window.history.pushState({ screen: nextScreen, attempt: nextAttempt }, "");
    setNavSeq((n) => n + 1);
    setScreen(nextScreen);
    attemptRef.current = nextAttempt;
    setAttempt(nextAttempt);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const replaceScreen = useCallback((nextScreen, nextAttempt = attemptRef.current) => {
    window.history.replaceState({ screen: nextScreen, attempt: nextAttempt }, "");
    setNavSeq((n) => n + 1);
    setScreen(nextScreen);
    attemptRef.current = nextAttempt;
    setAttempt(nextAttempt);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.state?.screen !== "catalogue") {
      window.history.back();
    }
  }, []);

  const startSearch = useCallback(() => {
    pushScreen("searching", 0);
  }, [pushScreen]);

  const finishSearch = useCallback(() => {
    /* "auto" keeps the designed demo (misses first, finds on retry); the other
       options pin the outcome so either path can be walked directly. */
    const outcome =
      config.search === "found"
        ? "found"
        : config.search === "not-found"
        ? "not-found"
        : attemptRef.current === 0
        ? "not-found"
        : "found";
    replaceScreen(outcome, attemptRef.current);
  }, [replaceScreen, config.search]);

  const retrySearch = useCallback(() => {
    const nextAttempt = attemptRef.current + 1;
    pushScreen("searching", nextAttempt);
  }, [pushScreen]);

  /* Hearing-test navigation. `replace` mirrors expo-router's router.replace,
     which the original uses for the test steps so back can't re-enter a
     finished trial. */
  /* Let the walkthrough panel drive the router. */
  useEffect(() => {
    flow.registerNavigate((next) => pushScreen(next));
  }, [flow, pushScreen]);

  const htGo = useCallback(
    (nextScreen, replace = false) =>
      replace ? replaceScreen(nextScreen) : pushScreen(nextScreen),
    [pushScreen, replaceScreen]
  );

  const renderScreen = () => {
    switch (screen) {
      case "figma-fit-test":
        return <FigmaFitTestScreen onBack={goBack} onNext={startSearch} />;
      case "searching":
        return (
          <SearchScreen
            attempt={attempt}
            onBack={goBack}
            onCancel={goBack}
            onHelp={() => pushScreen("help")}
            onFinished={finishSearch}
          />
        );
      case "not-found":
        return <NotFoundScreen onBack={goBack} onHelp={() => pushScreen("help")} />;
      case "help":
        return <HelpScreen onClose={goBack} onRetry={retrySearch} />;
      case "found":
        return <FoundScreen onBack={goBack} onConnect={() => pushScreen("pairing")} />;
      case "pairing":
        return <PairingPromptScreen onBack={goBack} onSelectAccessory={() => replaceScreen("preparing")} />;
      case "preparing":
        return <PreparingScreen onBack={goBack} onFinished={() => replaceScreen("complete")} />;
      case "complete":
        return <CompleteScreen onBack={goBack} onNext={() => pushScreen("fit-buds")} />;
      case "fit-buds":
        return (
          <FitBudsScreen
            onBack={goBack}
            onTryNow={() => pushScreen("fit-intro")}
            onNext={() => replaceScreen("catalogue", 0)}
          />
        );
      case "fit-intro":
        return <FigmaFitTestScreen onBack={goBack} onNext={() => pushScreen("noise-measuring")} />;
      case "noise-measuring":
        return (
          <NoiseCheckScreen
            state="measuring"
            onBack={goBack}
            onNext={() =>
              pushScreen(config.noise === "noisy" ? "noise-noisy" : "noise-good")
            }
          />
        );
      case "noise-good":
        return (
          <NoiseCheckScreen
            state="good"
            onBack={goBack}
            onNext={() => pushScreen("noise-audio-paused")}
          />
        );
      case "noise-audio-paused":
        return (
          <NoiseCheckScreen
            state="audio-paused"
            onBack={goBack}
            onCancelAudio={goBack}
            onProceed={() => pushScreen("ear-tips")}
          />
        );
      case "noise-noisy":
        return (
          <NoiseCheckScreen
            state="noisy"
            onBack={goBack}
            onRetry={() => pushScreen("noise-measuring")}
            onLater={() => replaceScreen("catalogue", 0)}
          />
        );
      case "fit-test":
        return <EarTipsScreen onBack={goBack} onDone={() => pushScreen("checking-fit")} />;
      /* Design shows the same screen with Next disabled and a "Buds not in ear"
         status while the earbuds aren't detected as worn. */
      case "fit-test-buds-out":
        return <EarTipsScreen onBack={goBack} onDone={() => pushScreen("checking-fit")} />;
      case "ear-tips":
        return <EarTipsScreen onBack={goBack} onDone={() => pushScreen("checking-fit")} />;
      case "checking-fit":
        return (
          <CheckingFitScreen
            onBack={goBack}
            onCancel={goBack}
            status="Checking the fit..."
            progress={0.08}
            onFinished={() =>
              replaceScreen(
                config.fit === "bad" ? "fit-bad" : "fit-good"
              )
            }
          />
        );
      /* 11a-8b — good-seal result. Next continues to 11a-8e. */
      /* Design has two progress states before the result. */
      case "checking-fit-progress":
        return (
          <CheckingFitScreen
            onBack={goBack}
            onCancel={goBack}
            status="Fit test in progress..."
            progress={0.62}
            onFinished={() =>
              replaceScreen(config.fit === "bad" ? "fit-bad" : "fit-good")
            }
          />
        );
      /* Both seals poor — the second unhappy variant in the design. */
      case "fit-bad-both":
        return (
          <FitBadScreen
            onBack={goBack}
            onRetry={() => pushScreen("noise-measuring")}
            onContinue={() => pushScreen("ear-tips-final")}
            left="bad"
            right="bad"
          />
        );
      case "fit-good":
        return <FitGoodScreen onBack={goBack} onNext={() => pushScreen("ear-tips-final")} />;
      /* 11a-8e — last screen of the fit-test flow. Done hands over to the
         hearing-test flow, which starts at its own intro screen. */
      case "ear-tips-final":
        return (
          <EarTipsScreen
            onBack={goBack}
            onDone={() => pushScreen("ht-intro")}
            title="What size is your ear tips?"
          />
        );
      case "fit-bad":
        return (
          <FitBadScreen
            onBack={goBack}
            onRetry={() => pushScreen("noise-measuring")}
            onContinue={() => pushScreen("ear-tips-final")}
            left="bad"
            right="good"
          />
        );

      /* ── Hearing test flow (ported from hearing-test-app) ───────────── */
      case "ht-intro":
        return <HtIntro go={htGo} />;
      case "ht-about":
        return <HtAbout go={htGo} back={goBack} />;
      case "ht-overview":
        return <HtOverview go={htGo} back={goBack} />;
      case "ht-mic-prompt":
        return <HtMicPrompt go={htGo} back={goBack} />;
      case "ht-mic-dialog":
        return <HtMicDialog go={htGo} back={goBack} />;
      case "ht-mic-denied":
        return <HtMicDenied go={htGo} back={goBack} />;
      case "ht-quiet-place":
        return <HtQuietPlace go={htGo} back={goBack} />;
      case "ht-device-setup":
        return <HtDeviceSetup go={htGo} back={goBack} />;
      case "ht-practice":
        return <HtPractice key="practice" go={htGo} />;
      /* Straight to 4.2 for review. */
      case "ht-practice-complete":
        return <HtPractice key="practice-done" go={htGo} startComplete />;
      case "ht-test-left":
        return <HtEarTest key="ear-left" ear="left" go={htGo} />;
      /* Same screen, opened straight into the pause menu for review. */
      case "ht-test-left-paused":
        return <HtEarTest key="ear-left-paused" ear="left" go={htGo} startPaused />;
      /* Ambient-noise interruption states (5.1.1.G / H / H.1). */
      case "ht-test-noise-loud":
        return <HtEarTest key="ear-noise-loud" ear="right" go={htGo} startNoise="loud" />;
      case "ht-test-noise-quiet":
        return <HtEarTest key="ear-noise-quiet" ear="right" go={htGo} startNoise="quiet" />;
      case "ht-test-noise-cant-find":
        return (
          <HtEarTest key="ear-noise-cf" ear="right" go={htGo} startNoise="cant-find" />
        );
      case "ht-test-right":
        return <HtEarTest ear="right" go={htGo} />;
      case "ht-test-complete":
        return <HtTestComplete go={htGo} />;
      case "ht-test-success":
        return <HtTestSuccess go={htGo} />;
      case "ht-results":
        return <HtResults go={htGo} />;
      case "ht-more-info":
        return <HtMoreInfo back={goBack} />;
      case "ht-profile":
        return <HtProfile go={htGo} exit={() => replaceScreen("ht-intro")} />;

      default:
        return <CatalogueScreen onSelect={startSearch} />;
    }
  };

  return (
    <TestProvider>
      <div className="app-shell">
        <React.Fragment key={`${screen}:${navSeq}`}>{renderScreen()}</React.Fragment>
        <FlowChooserHotspot onOpen={() => flow.setOpen(true)} />
        <DevPanel />
      </div>
    </TestProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FlowProvider>
      <App />
    </FlowProvider>
  </React.StrictMode>
);
