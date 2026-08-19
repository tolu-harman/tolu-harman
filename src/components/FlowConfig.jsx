/* Flow configuration for walkthroughs and demos.
 *
 * The prototype hard-codes a happy outcome at every branch, which leaves the
 * unhappy screens (noisy room, bad fit, device not found) built but
 * unreachable. This holds the chosen outcome for each branch so the router can
 * take either path, and exposes the dev panel that drives it. */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export const BRANCHES = [
  {
    key: "search",
    label: "Device search",
    help: "What happens when the app looks for the earbuds",
    options: [
      { value: "auto", label: "Auto", hint: "Fails first, found on retry" },
      { value: "found", label: "Found" },
      { value: "not-found", label: "Not found" },
    ],
  },
  {
    key: "mic",
    label: "Microphone access",
    help: "Whether the mic permission has already been granted",
    options: [
      { value: "prompt", label: "Ask", hint: "Shows the permission flow" },
      { value: "granted", label: "Granted", hint: "Skips straight to the meter" },
    ],
  },
  {
    key: "noise",
    label: "Background noise",
    help: "Result of the noise check before the fit test",
    options: [
      { value: "good", label: "Quiet" },
      { value: "noisy", label: "Too noisy" },
    ],
  },
  {
    key: "fit",
    label: "Fit result",
    help: "Seal quality after checking the fit",
    options: [
      { value: "good", label: "Good fit" },
      { value: "bad", label: "Poor fit" },
    ],
  },
  {
    key: "practice",
    label: "Practice round",
    help: "Whether the practice beep is registered",
    options: [
      { value: "live", label: "Live", hint: "Depends on your press" },
      { value: "pass", label: "Always pass" },
      { value: "fail", label: "Always fail" },
    ],
  },
];

export const DEFAULT_CONFIG = {
  search: "auto",
  mic: "prompt",
  noise: "good",
  fit: "good",
  practice: "live",
};

/* Named runs, for jumping straight into a scenario. */
export const PRESETS = [
  { label: "Happy path", config: { search: "found", noise: "good", fit: "good", practice: "pass" } },
  { label: "Noisy room", config: { ...DEFAULT_CONFIG, noise: "noisy" } },
  { label: "Poor fit", config: { ...DEFAULT_CONFIG, fit: "bad" } },
  { label: "Device not found", config: { ...DEFAULT_CONFIG, search: "not-found" } },
  { label: "Practice fails", config: { ...DEFAULT_CONFIG, practice: "fail" } },
];

/* Every route, grouped as it appears in the flow. */
export const SCREEN_GROUPS = [
  {
    title: "Pairing",
    screens: [
      ["catalogue", "Catalogue"],
      ["searching", "Searching"],
      ["not-found", "Not found"],
      ["help", "Connection help"],
      ["found", "Device found"],
      ["pairing", "Select accessory"],
      ["preparing", "Getting ready"],
      ["complete", "Setup complete"],
    ],
  },
  {
    title: "Fit test",
    screens: [
      ["fit-buds", "Finding the right fit"],
      ["fit-intro", "Fit test intro"],
      ["noise-measuring", "Noise check"],
      ["noise-good", "Noise good"],
      ["noise-noisy", "Noise too loud"],
      ["noise-audio-paused", "Audio will pause"],
      ["ear-tips", "Ear tip size"],
      ["checking-fit", "Checking the fit"],
      ["checking-fit-progress", "Fit test in progress"],
      ["fit-good", "Good fit (11a-8b)"],
      ["fit-bad", "Poor fit — one bud"],
      ["fit-bad-both", "Poor fit — both buds"],
      ["ear-tips-final", "Ear tip size (11a-8e)"],
    ],
  },
  {
    title: "Hearing test",
    screens: [
      ["ht-intro", "Find Your Sound"],
      ["ht-about", "Sound Personalization"],
      ["ht-overview", "Overview"],
      ["ht-mic-prompt", "Mic — allow access"],
      ["ht-mic-dialog", "Mic — system prompt"],
      ["ht-mic-denied", "Mic — denied"],
      ["ht-quiet-place", "Find a quiet place"],
      ["ht-device-setup", "Device setup"],
      ["ht-practice", "Practice round"],
      ["ht-practice-complete", "Practice complete"],
      ["ht-test-left", "Test — left ear"],
      ["ht-test-left-paused", "Test — pause menu"],
      ["ht-test-noise-loud", "Interrupt — it’s too loud"],
      ["ht-test-noise-quiet", "Interrupt — it’s quiet"],
      ["ht-test-noise-cant-find", "Interrupt — can’t find a quiet place"],
      ["ht-test-complete", "Great work"],
      ["ht-test-right", "Test — right ear"],
      ["ht-test-success", "Success"],
      ["ht-results", "Results"],
      ["ht-more-info", "More about results"],
      ["ht-profile", "Profile"],
    ],
  },
];

const Ctx = createContext(null);

export function FlowProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  const setBranch = useCallback(
    (key, value) => setConfig((c) => ({ ...c, [key]: value })),
    []
  );

  /* App registers its router so the panel can jump to any screen. */
  const registerNavigate = useCallback((fn) => {
    navRef.current = fn;
  }, []);

  const goTo = useCallback((screen) => {
    if (navRef.current) navRef.current(screen);
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      setBranch,
      reset: () => setConfig(DEFAULT_CONFIG),
      open,
      setOpen,
      registerNavigate,
      goTo,
    }),
    [config, open, setBranch, registerNavigate, goTo]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFlow() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFlow must be used inside FlowProvider");
  return v;
}
