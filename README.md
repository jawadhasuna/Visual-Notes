# Visual Notes
## https://visualsnote.vercel.app

Front end for the **Visual Notes** prototype — narrative critical-care nursing
documentation restructured into a source-verifiable, body-system chart.

**New England CareFlow LLC** · research and prototype development.
Not clinical decision support, and not for use in patient care.

---

## What this is

A pilot study ([Zaidi et al., JMIR Nursing, preprint 102954][paper]) asked 41
registered critical-care nurses to review the same patient admission twice —
first as conventional written SOAP notes, then as a structured visual note —
scoring perceived workload on the raw NASA-TLX after each condition.

Total workload fell from **54.95 to 30.68** (−24.27 points, −44.2%, *P*<.001),
with improvements on all six subscales. As a fixed-order pilot on a single case,
the finding is preliminary: order and familiarity effects cannot be ruled out.

This repository holds the web front end for the tool that produces those visual
notes.

[paper]: https://preprints.jmir.org/preprint/102954

## Status

Front end only. The conversion currently runs a **timed client-side preview** of
the pipeline stages and renders a fixed demo chart — there is no extraction
backend wired up yet. `src/components/Workspace.tsx` is the seam where the real
API call replaces the simulated run.

## Pipeline this UI is built around

| Stage | What happens |
|---|---|
| **Segment** | Split on record boundaries, then on the nurse's own section headers (`NEURO:`, `RESP:`, `CV:`, `GI:`, `GU:`, `ID:`, `ENDO:` …). Deterministic — no model involved. |
| **Extract** | Map each segment onto a **frozen** body-system schema. The lane taxonomy is identical for every case, so any two charts are comparable. |
| **Ground** | Every fact carries its note id and character offsets, and is byte-checked against the source. Facts that fail verification never reach the chart. |
| **Cover** | Source sentences with no linked fact are fed back for a second pass, so retention is a measured percentage rather than a judgement call. |
| **Render** | Validated JSON is drawn deterministically — same input, same chart, diff-testable. |

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

```bash
npm run build
```

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, brand tokens defined in `src/app/globals.css`
- No runtime dependencies beyond the framework — the logo, the 3D spin, the
  loading animation and the chart are all hand-built SVG and CSS

## Layout

```
src/
  app/
    layout.tsx          fonts, metadata, theme colour
    page.tsx            page composition
    globals.css         brand tokens, mark animation, primitives
    icon.svg            favicon (the NC mark)
  components/
    Logo.tsx            the NC monogram + wordmark lockup
    MarkStage.tsx       hero mark: 5s idle → fast Y-axis spin → border shine
    SiteHeader.tsx
    Hero.tsx
    Workspace.tsx       state for the three-panel workspace
    NotesInput.tsx      notes entry (left)
    ConversionStage.tsx pipeline animation (centre)
    GraphPanel.tsx      swim-lane chart (right)
    MethodSection.tsx   method + research sections
  lib/
    demo.ts             synthetic sample case and its structured form
```

## Branding

The mark is the **official corporate artwork** — a stethoscope drawn so its
binaural and tubing form the `N`. Vector paths live in
`src/components/Logo.tsx` under `<g id="mark-art">`.

The brand fills are **fixed** — navy `#052C52` for the `N`, seagreen `#04ACAF`
for the `C`. The site commits to the deep navy ground (no light theme), so the
artwork is never recoloured to suit a background.

Navy needs separation from that ground. The hero mark gets it from a soft rim
light (`.mark-gleam`) plus a wide ambient bloom rather than a plate, so it
floats free. The small header and footer lockups keep a light chip
(`MarkChip`), which is what makes the navy legible at 32px.

The edge light is deliberately restrained — it lifts slightly as the mark
settles out of its spin rather than flashing.

Favicons are the supplied RealFaviconGenerator set: `src/app/favicon.ico` and
`src/app/apple-icon.png` are picked up automatically by the App Router, and
`public/brand/icon-{96,192,512}.png` back `src/app/manifest.ts`.

Brand colours (navy `#052C52`, seagreen `#04ACAF`) are defined once as CSS
custom properties in `globals.css` and flip automatically for dark mode.

### Motion

The hero mark is the **artwork itself extruded in 3D** — 20 copies stacked
along Z for ~21px of real thickness, progressively darkened so the strokes read
as solid. It rests, snaps a fast 360 degree revolve on its own Y axis every 5s,
then pulses a gleam across the lit face. The stethoscope backdrop
revolves on a slow 26s axis behind the hero. Both are CSS 3D transforms on
vector/raster art rather than WebGL, and both stop under
`prefers-reduced-motion`.

### Texture

The page ground is a plaster sheet (`public/brand/paper.jpg`) under a seamless
180px grain tile (`public/brand/grain.png`), both composited over the navy with
`mix-blend-mode: overlay` so they add tooth without lightening the ground.
Strength is tunable via `--paper-opacity` / `--grain-opacity`.

## Asset credits

- **Stethoscope backdrop** (`public/brand/stethoscope.png`) — Vecteezy asset,
  processed here to remove its white matte. **The Vecteezy Free License
  requires attribution**, which the site footer carries as a link to
  `vecteezy.com`. If the company holds a Pro License, that credit can be
  removed.
- **Plaster sheet** (`public/brand/paper.jpg`) — Unsplash (NordWood Themes),
  downscaled and recompressed. The Unsplash License does not require
  attribution.
- **Grain tile** (`public/brand/grain.png`) — seamless texture supplied with
  the brand assets.

Confirm the licence tier held for each before this goes public.

## Data policy

**No credentialed PhysioNet data belongs in this repository.**

The sample case shipped in `src/lib/demo.ts` is the *synthetic* note published
in the study's Multimedia Appendix 1 (Table S1) — written by the research team
for illustration and never used in participant exposure or analysis. Real case
text stays out of source control, out of the client bundle, and off the
deployed site.
