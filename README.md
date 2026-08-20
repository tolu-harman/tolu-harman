# Denon PerL 2 — pairing, fit test & hearing test prototype

A single web app covering the full flow: product pairing → fit test → hearing test,
built to the Figma designs and packaged to run on any phone.

## Run it

```bash
npm install
npm run dev          # local dev server
npm run build        # production build into dist/
npm run preview      # serve the production build
```

`dist/` is already built — you can serve it with any static host:

```bash
npx serve dist
```

Then open the URL on your phone (same Wi-Fi) to try it on a real device.

## Flow options panel

**Long-press the status bar** on any screen to open it. From there you can:

- pick a scenario — Happy path, Noisy room, Poor fit, Device not found, Practice fails
- set each branch outcome individually (device search, mic access, noise, fit, practice)
- jump straight to any of the ~40 screens

This exists because the prototype otherwise hard-codes a happy outcome at every
branch, which leaves the unhappy screens unreachable.

## Layout

Designed at 393×852 (Figma) and 375×812 (the Denon frames), but the layout is
fluid: spacing collapses on short devices via `clamp()`, art is sized with
`min()` so it fits a 320pt screen, and the shell caps at 520px and centres on
tablets. Screens scroll rather than clip when content exceeds the viewport.

## Project layout

```
src/
  main.jsx              router + the Denon pairing and fit-test screens
  styles.css            Denon screen styles
  components/           shared: StatusBar, LevelMeter, flow panel
  hearing/              the hearing test — screens, components, styles, audio
public/assets/          images and video (optimised for mobile)
assets-original/        the untouched source art, for re-exporting
tools/build-preview.mjs builds a single-file preview.html for review
ios/                    Xcode wrapper that loads the built bundle in a WKWebView
```

## Audio

Test tones are synthesised with the Web Audio API rather than loaded as files —
they're pure sines at 500/1000/2000/4000 Hz, matching the original assets, and
each is ramped in and out over 12ms. That ramp matters: hard-switching a sine
produces a broadband click that a participant can hear even when the tone
itself is inaudible, which would corrupt the result.

The audio context is unlocked by the first tap anywhere in the app. Browsers
start it suspended, and the test screen can't wait for a tap because the
participant is waiting to *hear* something first.

## Assets

Source art was 29.6MB; the shipped set is 2.3MB (some images were 2233×3864 for
a 38pt display size). Originals are kept in `assets-original/`.

## GitHub Pages

The production site is published at
<https://tolu-harman.github.io/tolu-harman/>.

Pushes to `main` run the GitHub Pages deployment workflow. Before the first
deployment, set **Settings** > **Pages** > **Build and deployment** > **Source**
to **GitHub Actions**.
