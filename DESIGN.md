# Design

<!-- impeccable:design-schema 1 -->

## What this is

A cinematic long-read. Four generated images carry a dark visual spine: a full-bleed hero, then three full-bleed chapter openers, with a dark statement band for the twenty-million-response result. Between them the article body is white, one reading measure, typography-led. Dark beat, light read, dark beat.

The rhythm is the design. Nothing decorative sits in the reading columns; everything expressive happens in the full-bleed bands.

The earlier version built a "film cutting room" world with a light-table palette, sprocket perforations, a three.js word field and film vocabulary. The client rejected it. Rebuilt straight on 2026-09-04 at their instruction. That concept and its files are kept only in `.impeccable/old-index.html` and `.impeccable/old-site.css` for reference.

## Imagery

Four images, generated through the Grok CLI as one coherent series and stored in `assets/img/` at 1920-2560px wide (`@2x` files are the ones referenced; the 1280px originals beside them are unused source and can be deleted).

| File | Where | What it shows |
|---|---|---|
| `hero@2x.jpg` | hero | thousands of words in a dark void, one lit blue, a thread running to it |
| `tournament@2x.jpg` | chapter 05 | eight blocks of metal type in a knockout bracket, the winner glowing |
| `detection@2x.jpg` | chapter 07 | a beam sweeping a wall of text, revealing a hidden pattern inside it |
| `breaks@2x.jpg` | chapter 10 | the same field scattering, the blue thread snapped |

The series rule: near-black void, cool greys, one electric cobalt, volumetric haze, 35mm grain, 16:9, no people, no legible sentences, no logos. Every band lays a left-weighted scrim over its image so reversed type holds contrast regardless of what the picture is doing underneath.

## Palette

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FFFFFF` | ground |
| `--wash` | `#F6F7F9` | the only fill; interactive surfaces and bars |
| `--rule` | `#E4E5E9` | hairlines |
| `--ink` | `#15161A` | body text |
| `--ink-2` | `#5C5E66` | secondary text |
| `--ink-3` | `#8A8D96` | captions, labels, disabled |
| `--blue` | `#1B44D8` | the accent: chapter numbers, watermark evidence, live state |
| `--night` | `#07080B` | the ground of every full-bleed band |
| `--blue-lit` | `#7C9BFF` | the accent lifted for legibility on `--night` |
| `--red` | `#C0322A` | damage only: the limitations list and the "marking the text" demo |

Blue still means one of two things and nothing else: this carries watermark evidence, or this is live right now.

## Type

**Poppins only**, at four weights. 400 body, 500 labels and controls, 600 numbers and subheads, 700 display. The hierarchy is weight, size and colour; there is no second family.

- Body 1.125rem / 1.72, measure 40rem
- h1 clamp(2.1rem, 5.4vw, 3.9rem), 700, tracking -0.035em
- h2 clamp(1.45rem, 2.9vw, 2.15rem), 700, tracking -0.028em
- Labels 0.75rem, 500, uppercase, tracking 0.06em
- All figures `tabular-nums lining`

## Layout

One CSS grid, three widths, used by every section:

```
[full-start] minmax(1rem,1fr)
[wide-start] minmax(0, 8.5rem)
[text-start] min(100% - 2.5rem, 40rem) [text-end]
             minmax(0, 8.5rem) [wide-end]
             minmax(1rem,1fr) [full-end]
```

Prose sits in `text`. Charts, comparisons and the interactives break out to `wide`. Only the bracket and the small-multiples chart go `full`, capped at 1400px with its own gutter. The text column is written as `min(100% - 2.5rem, 40rem)` so the flanking columns collapse to zero before the measure is ever allowed to narrow; without that the column starves on a phone.

Chapter numbers hang in the left margin above 1100px and sit inline below it. They are wayfinding for an eleven part article whose contents nav uses the same numbers, not a decorative eyebrow.

## Motion

The top bar rides transparent over the hero and lands on white once past it. Each band's image drifts against the scroll at 7% of viewport travel. Bands, figures and the statement block fade up once on entry, from an already visible default.

The authored moment: the knockout bracket resolves layer by layer as it scrolls into view, and the losing words drop into the "thrown out" row and stay there. Everything else is a 2px scroll progress bar and short state transitions. `prefers-reduced-motion` renders every bracket complete and disables the rest.

## Honest constraints stated on the surface

There is no backend and no live model. The tournaments run on hand-authored candidate sets with a real seeded hash in the browser. The site says so in the sandbox caption and in the colophon, and states that it is a reading of the paper rather than the paper.
