# Avail Atomic

Standalone landing page for **Avail Atomic** — routes orders to CLOBs & PropAMMs for better swap pricing with atomic, trustless settlement. Built to drop into the Avail website shell (shared nav, footer, page frame, fonts, animated background).

## Stack

Static HTML / CSS / vanilla JS — no build step. Just open `index.html` or serve the folder.

```bash
# any static server, e.g.
python3 -m http.server 5191
# then visit http://localhost:5191
```

## Structure

```
index.html              # the page (nav → hero → what-is → problem → value → how-it-works → live-integration → get-started → footer)
style.css               # page + shell styles, responsive breakpoints (1024 / 640 / 460)
nav.css                 # nav + mobile menu (from the Avail shell)
app.js                  # mobile menu + How It Works scroll/click sync
halftone-background.js  # animated simplex-noise pixel background (Avail shell)
assets/
  logo-mark.svg, logo-wordmark.svg
  footer/avail-wordmark.png
  icons/                # value-prop icons, pixel arrow, Get Started corner pixels
  visuals/              # hero atom, what-is diagram, How It Works cards
                        #   *-mobile.png = re-laid-out device versions (≤1024px)
```

## Responsive notes

- **Fonts:** Geist via Google Fonts; Delight via `local()` (falls back to Georgia if not installed) — matches the Avail shell.
- **Device assets:** the What-is diagram and How It Works cards have dedicated `*-mobile.png` versions served at ≤1024px (vertical funnel diagram; each step shows its own compact card).
- **How It Works:** desktop pins the visual and swaps it on scroll/click; tablet & phone stack each step with its visual inline.
