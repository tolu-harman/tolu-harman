#!/usr/bin/env node
/**
 * Builds a single self-contained preview.html for reviewing the app in a
 * browser, without touching the Xcode project.
 *
 * Why this exists: the Xcode round-trip (clean build, run, click through ~25
 * screens in the simulator) costs minutes per change. This produces one file
 * you can double-click and refresh instead.
 *
 * Three things it has to solve:
 *  1. file:// blocks ES module scripts, so the app is rebuilt as an IIFE and
 *     inlined with a plain <script> tag.
 *  2. Assets are 34MB, mostly oversized PNGs. They're downscaled to phone
 *     resolution and inlined as data URIs. This only affects the preview —
 *     the real bundle keeps the originals.
 *  3. The app builds asset paths at runtime (`${ASSET}name.png`), so string
 *     rewriting isn't enough. A shim maps those paths to data URIs at load.
 *
 * Usage: node tools/build-preview.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* Kept out of dist/ so the preview build can't be confused with the real
   bundle that gets copied into the Xcode project. */
const DIST = path.join(ROOT, ".preview-dist");
const ASSETS = path.join(DIST, "assets");
const TMP = path.join(ROOT, ".preview-tmp");
const OUT = path.join(ROOT, "preview.html");
/* Video is written out as real files rather than inlined. Browsers serve
   <video> through a media pipeline that wants byte-range requests; data: URIs
   can't provide them and blob: behaviour varies. A plain relative path is what
   the app uses on device, so it's the one mechanism with no unknowns. */
const MEDIA_DIR = path.join(ROOT, "preview-media");
const MEDIA_REL = "preview-media";

/* Phone viewport the design targets. 2x covers retina. */
const MAX_IMG_W = 780;
const VIDEO_W = 750;

const sh = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString();
const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

function mime(file) {
  const e = path.extname(file).toLowerCase();
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".wav": "audio/wav",
      ".webp": "image/webp",
    }[e] || "application/octet-stream"
  );
}

console.log("→ building app as IIFE (file:// can't load ES modules)");
execSync("npx vite build --mode preview", {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, PREVIEW_BUILD: "1" },
});

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

/* ── Shrink + encode assets ───────────────────────────────────────────── */
const files = fs.readdirSync(ASSETS).filter((f) => !/\.(js|css)$/.test(f));
const toneDir = path.join(ASSETS, "tones");
const tones = fs.existsSync(toneDir)
  ? fs.readdirSync(toneDir).map((f) => path.join("tones", f))
  : [];

const map = {};
let before = 0;
let after = 0;

for (const rel of [...files, ...tones]) {
  const src = path.join(ASSETS, rel);
  if (fs.statSync(src).isDirectory()) continue;
  const ext = path.extname(rel).toLowerCase();
  before += fs.statSync(src).size;
  let use = src;

  try {
    if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
      /* Downscale and drop to 8-bit palette where it still looks right. */
      const out = path.join(TMP, rel.replace(/[\\/]/g, "_") + ".png");
      sh(
        `convert ${JSON.stringify(src)} -resize ${MAX_IMG_W}x${MAX_IMG_W}\\> ` +
          `-strip -quality 82 ${JSON.stringify(out)}`
      );
      use = out;
    } else if (ext === ".mp4") {
      const out = path.join(TMP, rel.replace(/[\\/]/g, "_"));
      /* -pix_fmt yuv420p and baseline-ish profile keep it decodable in every
         browser; x264 will otherwise pick 4:4:4 for some sources. */
      sh(
        `ffmpeg -y -loglevel error -i ${JSON.stringify(src)} ` +
          `-vf "scale=${VIDEO_W}:-2" -c:v libx264 -crf 30 -preset veryfast ` +
          `-pix_fmt yuv420p -profile:v main -level 4.0 ` +
          `-an -movflags +faststart ${JSON.stringify(out)}`
      );
      use = out;
    }
  } catch (e) {
    console.warn(`  ! could not shrink ${rel}, using original`);
    use = src;
  }

  const buf = fs.readFileSync(use);
  after += buf.length;

  if (ext === ".mp4") {
    /* Sidecar file, not a data URI — see MEDIA_DIR note above. */
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(path.join(MEDIA_DIR, path.basename(rel)), buf);
    map[`./assets/${rel}`] = `./${MEDIA_REL}/${path.basename(rel)}`;
  } else {
    map[`./assets/${rel}`] = `data:${mime(rel)};base64,${buf.toString("base64")}`;
  }
}

console.log(`→ assets ${kb(before)} → ${kb(after)} (preview only)`);

/* ── Assemble ─────────────────────────────────────────────────────────── */
const entries = fs.readdirSync(ASSETS);
const jsFile = entries.find((f) => f.endsWith(".js"));
const cssFile = entries.find((f) => f.endsWith(".css"));
if (!jsFile || !cssFile) throw new Error(`missing build output in ${ASSETS}`);
let js = fs.readFileSync(path.join(ASSETS, jsFile), "utf8");
let css = fs.readFileSync(path.join(ASSETS, cssFile), "utf8");

/* CSS url() references can be rewritten directly. */
css = css.replace(/url\((['"]?)([^)'"]+)\1\)/g, (m, q, p) => {
  const key = p.startsWith("./") ? p : `./assets/${path.basename(p)}`;
  return map[key] ? `url("${map[key]}")` : m;
});

/* Viewport units are the phone screen on device, but the browser window in a
   preview — so screens sized with 100dvh spill out of the frame. Rebind them
   to the frame's own dimensions (--ph/--pw, set on .phone). Order matters:
   dvh before vh, since "dvh" contains "vh". */
const vhCount = (css.match(/[\d.]+(dvh|vh|vw)\b/g) || []).length;
css = css
  .replace(/([\d.]+)dvh\b/g, (m, n) =>
    n === "100" ? "var(--ph)" : `calc(var(--ph) * ${n} / 100)`)
  .replace(/([\d.]+)vh\b/g, (m, n) =>
    n === "100" ? "var(--ph)" : `calc(var(--ph) * ${n} / 100)`)
  .replace(/([\d.]+)vw\b/g, (m, n) =>
    n === "100" ? "var(--pw)" : `calc(var(--pw) * ${n} / 100)`);
console.log(`→ rebound ${vhCount} viewport-unit values to the phone frame`);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Denon Preview — review build</title>
<style>
  html, body { margin:0; height:100%; background:#1c1f24;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .frame-wrap { display:flex; flex-direction:column; align-items:center; gap:10px;
    padding:18px 16px 24px; box-sizing:border-box; }
  .bar { color:#aeb4bd; font-size:12.5px; text-align:center; line-height:1.5; }
  .bar b { color:#fff; font-weight:600; }

  /* The Denon screens are designed at 375x812, the hearing test at 393x852,
     so the frame can switch between them for checking against Figma. */
  .sizes { display:flex; gap:6px; }
  .sizes button {
    padding:5px 11px; border:1px solid #3a3f47; border-radius:99px;
    background:transparent; color:#aeb4bd; font:inherit; font-size:11.5px;
    cursor:pointer;
  }
  .sizes button.is-active { background:#eef1f5; border-color:#eef1f5; color:#16181d; font-weight:600; }

  /* Reserves the on-screen height the scaled frame actually occupies, so the
     page never scrolls just to reveal the phone. */
  .phone-slot { height:calc(var(--ph) * var(--scale)); flex-shrink:0; }

  .phone {
    --ph:812px; --pw:375px; --scale:1;
    width:var(--pw); height:var(--ph);
    background:#fff; border-radius:44px; position:relative;
    /* overflow:hidden clips content to the screen; the transform makes this
       the containing block for the app's position:fixed nav/home bar, which
       would otherwise anchor to the browser window and escape the frame. */
    overflow:hidden;
    transform:scale(var(--scale));
    transform-origin:top center;
    box-shadow:0 0 0 11px #2b2f36, 0 0 0 13px #43484f, 0 24px 60px rgba(0,0,0,.55);
  }

  /* The app scrolls inside the screen, exactly as it does on device. */
  #root { width:100%; height:100%; overflow-y:auto; overflow-x:hidden;
    -webkit-overflow-scrolling:touch; position:relative; }
</style>
<style>${css}</style>
</head>
<body>
<div class="frame-wrap">
  <div class="bar"><b>Denon Preview</b> — review build<br>
  Preview images are downscaled; the shipping bundle keeps the originals.</div>
  <div class="sizes">
    <button data-w="375" data-h="812" class="is-active">375 × 812 &middot; Denon</button>
    <button data-w="393" data-h="852">393 × 852 &middot; Hearing test</button>
  </div>
  <div class="phone-slot"><div class="phone" id="phone"><div id="root"></div></div></div>
</div>

<script>
/* Scale the frame down when the window is shorter than the phone, so the whole
   screen is always visible without scrolling the page. Never scales up. */
(function () {
  var phone = document.getElementById("phone");
  var slot = document.querySelector(".phone-slot");
  if (!phone || !slot) return;
  var W = 375, H = 812, CHROME = 130; // header text + size toggle + bezel

  function fit() {
    var s = Math.min(1, (window.innerHeight - CHROME) / H, (window.innerWidth - 60) / W);
    s = Math.max(0.35, s);
    phone.style.setProperty("--pw", W + "px");
    phone.style.setProperty("--ph", H + "px");
    phone.style.setProperty("--scale", s);
    slot.style.setProperty("--scale", s);
    slot.style.setProperty("--ph", H + "px");
  }

  document.querySelectorAll(".sizes button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".sizes button").forEach(function (o) {
        o.classList.remove("is-active");
      });
      b.classList.add("is-active");
      W = +b.dataset.w;
      H = +b.dataset.h;
      fit();
    });
  });

  fit();
  window.addEventListener("resize", fit);
})();
</script>

<script>
/* Asset shim: the app composes paths like "./assets/foo.png" at runtime, so
   map them to inlined data URIs as they're assigned. */
(function () {
  var MAP = ${JSON.stringify(map)};

  var resolve = function (v) {
    if (typeof v !== "string") return v;
    if (MAP[v]) return MAP[v];
    var m = v.match(/assets\\/(.+)$/);
    return (m && MAP["./assets/" + m[1]]) || v;
  };

  /* The accessor isn't always an own property of the element class: src is
     defined on HTMLMediaElement.prototype, not HTMLVideoElement.prototype, so
     walk the chain to find it, then shadow it on the subclass. */
  var patch = function (K, prop) {
    if (!K) return;
    var d = null;
    var p = K.prototype;
    while (p && !d) {
      d = Object.getOwnPropertyDescriptor(p, prop);
      p = Object.getPrototypeOf(p);
    }
    if (!d || !d.set) return;
    Object.defineProperty(K.prototype, prop, {
      get: d.get,
      set: function (v) { d.set.call(this, resolve(v)); },
      configurable: true,
    });
  };

  [
    typeof HTMLImageElement !== "undefined" ? HTMLImageElement : null,
    typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement : null,
    typeof HTMLVideoElement !== "undefined" ? HTMLVideoElement : null,
    typeof HTMLAudioElement !== "undefined" ? HTMLAudioElement : null,
    typeof HTMLSourceElement !== "undefined" ? HTMLSourceElement : null,
  ].forEach(function (K) {
    ["src", "poster"].forEach(function (prop) { patch(K, prop); });
  });

  var setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    if (n === "src" || n === "href" || n === "poster") v = resolve(v);
    return setAttr.call(this, n, v);
  };

  /* Tone wavs are loaded with fetch(). */
  var realFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === "string") input = resolve(input);
    return realFetch.call(this, input, init);
  };
})();
</script>
<script>${js}</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
fs.rmSync(TMP, { recursive: true, force: true });
fs.rmSync(DIST, { recursive: true, force: true });
console.log(`✓ ${path.relative(ROOT, OUT)} — ${kb(fs.statSync(OUT).size)}`);
