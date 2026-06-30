# Atomic Hero — Remotion render

Frame-deterministic mp4/webm export of the Avail Atomic hero swap animation
(the live DOM/CSS/JS version lives in `../index.html` + `../style.css` + `../app.js`).

Why Remotion instead of Playwright capture: Remotion seeks Chromium to each
frame and screenshots it, so output is deterministic (no flaky wall-clock
timing). The 7 Figma states are ported to a keyframe table in
`src/HeroAtomic.tsx` and interpolated from `useCurrentFrame()` — CSS
transitions don't play during a Remotion render, so motion is driven in JS.

The timing mirrors `../app.js` `DURATIONS` (per-state hold) at 30fps →
276 frames / 9.2s, looping seamlessly (state 7 ≡ state 1 layout).

## Render

```bash
npm install
npm run render          # both mp4 + webm into out/
# or individually:
npm run render:mp4
npm run render:webm     # vp9
npm run studio          # interactive preview at localhost:3000
```

Output: `out/atomic-hero.mp4` (1200×1294 h264) and `out/atomic-hero.webm` (vp9).

## Browser note

Remotion normally auto-downloads Chrome Headless Shell on first render
(`npx remotion browser ensure`). If that CDN download fails, grab a
`chrome-headless-shell` build from
[Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)
and pass it explicitly:

```bash
npx remotion render src/index.ts HeroAtomic out/atomic-hero.mp4 \
  --browser-executable="/path/to/chrome-headless-shell"
```

(Full Google Chrome does **not** work as the render browser — use the
headless-shell build.)

## Using the output

By default the on-page hero stays the live DOM/CSS/JS version. Swap to the
video only if a future need calls for it (og:video, social preview, a
`<video>` fallback). To refresh `../assets/visuals/atomic-hero.{mp4,webm}`
from this render:

```bash
cp out/atomic-hero.mp4 out/atomic-hero.webm ../assets/visuals/
```
