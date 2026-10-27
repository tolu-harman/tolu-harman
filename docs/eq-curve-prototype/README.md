# EQ Curve prototype (PerL 2 · 10-band Advanced EQ)

An interactive prototype of the 10-band Advanced EQ with three board options:

- **Option 1** – response curve with a +6 / 0 / −6 dB scale
- **Option 2** – response curve without the scale, wider plot
- **Option 3** – slim faders

It's a plain static site: no build step, no server code, no dependencies to install.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | All styling |
| `app.js` | All behaviour (dragging, presets, option switching) |
| `favicon.svg` | Browser tab icon |

Keep the four files together in the same folder.

## Put it online

Any static host works. A few quick routes:

- **Netlify Drop** – go to app.netlify.com/drop and drag this folder onto the page. You get a link straight away.
- **Vercel** – `npx vercel` from inside this folder, or import the folder in the Vercel dashboard (framework: "Other", no build command).
- **GitHub Pages** – push the folder to a repo, then Settings → Pages → deploy from the branch root.
- **Your own server or S3 / Azure / Cloudflare Pages bucket** – upload the four files as they are; `index.html` is the entry point.

## Open it locally

Double-clicking `index.html` works in most browsers. If anything looks off, serve the folder instead:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Using it

- Drag a band up or down to change its gain (±6 dB in 0.5 dB steps). Double-tap a band to reset it to 0 dB.
- Arrow keys: ↑ ↓ adjust the selected band, ← → move between bands.
- Switch options with the **Version** switch beside the phone, or **press and hold "Advanced EQ"** inside the phone.
- Link straight to an option by adding `#option-1`, `#option-2` or `#option-3` to the URL.
- **Reset prototype** clears any saved Custom curve and returns to the board values.

## Notes

- Text uses Graphik LC App if it's installed on the viewer's device, otherwise Inter from Google Fonts. Offline, it falls back to the system font.
- The saved Custom curve and the last option viewed are stored in the browser's local storage, per device.
