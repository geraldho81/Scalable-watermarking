# Design

<!-- impeccable:design-schema 1 -->

Live: https://scalable-watermarking.vercel.app
Repo: https://github.com/geraldho81/Scalable-watermarking

## What this is

An all-black cinematic long-read. Four generated images carry a dark visual spine: a full-bleed hero, then three full-bleed chapter openers, with a dark statement band for the twenty-million-response result. Between them the article body is white, one reading measure, typography-led. Dark beat, light read, dark beat.

The rhythm is the design. Nothing decorative sits in the reading columns; everything expressive happens in the full-bleed bands.

The earlier version built a "film cutting room" world with a light-table palette, sprocket perforations, a three.js word field and film vocabulary. The client rejected it. Rebuilt straight on 2026-09-04 at their instruction. That concept and its files are kept only in `.impeccable/old-index.html` and `.impeccable/old-site.css` for reference.

## Imagery

Twelve images, generated through the Grok CLI as one coherent series and stored in `assets/img/` at 1920-2560px wide (`@2x` files are the ones referenced; the 1280px originals beside them are unused source and can be deleted).

| File | Where | What it shows |
|---|---|---|
| `hero@2x.jpg` | hero | thousands of words in a dark void, one lit blue, a thread running to it |
| `tournament@2x.jpg` | chapter 05 | eight blocks of metal type in a knockout bracket, the winner glowing |
| `detection@2x.jpg` | chapter 07 | a beam sweeping a wall of text, revealing a hidden pattern inside it |
| `breaks@2x.jpg` | chapter 10 | the same field scattering, the blue thread snapped |
| `rewrite@2x.jpg` | chapter 12 opener | the field pulled apart and re-formed, the thread breaking with no replacement |
| `twokinds@2x.jpg` | chapter 12 beat | two slabs: one stamped on the surface, one with the mark woven inside the material |
| `hidden@2x.jpg` | chapter 12 beat | raking light catching cobalt fragments embedded flush in a surface that looks clean |
| `diffuse@2x.jpg` | chapter 12 beat | a signal spread so thin across a plane that it has no source to point at |
| `cascade@2x.jpg` | ch 12 beat | a row of lit tiles, one swapped out, the four after it going dark in sequence |
| `rewriter@2x.jpg` | ch 12 beat | an arm lifting one glowing seal off and pressing a different one on in the same motion |
| `pipeline@2x.jpg` | ch 12 beat | five lit gates in a corridor, material entering disordered and leaving clean |
| `needle@2x.jpg` | ch 12 beat | an instrument needle resting near but visibly not on zero |
| `finale@2x.jpg` | finale | the field settled and clean, all cobalt gone, one clear white beam straight through |

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


## Chapter 12, the closing act

The article closes with a pitch for Slopstopper, the site author's own tool. It earns its place by callback rather than assertion: chapter 07 already let the reader move a real score from 0.618 to 0.493 by paraphrasing, and chapter 10 already quotes the paper saying paraphrasing defeats the watermark. Chapter 12 only points at what the reader already did.

It is built as an act rather than a section: five full-bleed beats carrying one move of the argument each, then a full-viewport finale. The finale is the hero's answer, and it is the only place on the site with centred type: the hero's field of words is now settled and clean with the cobalt gone and one clear beam running through it, the wordmark at hero scale, one white button.

It is fenced off honestly. A line above it states that everything before it is a reading of someone else's research and this part is the author's own, and the colophon still separates the site from DeepMind and Nature.

Its interactive is a browser port of Slopstopper's Layer A (`js/strip.js`), built from the real tables in the tool's `scripts/text_unicode.py`: about sixty codepoints plus the full tag range U+E0001 to U+E007F, plus the lookalike-space map. It scans, names every codepoint it finds, and strips on demand, entirely client side. Emoji are exempted, because zero width joiners and variation selectors are load-bearing inside emoji sequences.

**The claim boundary is a design constraint, not a caveat.** The section says plainly that no local tool can see or remove a statistical watermark, that a rewrite by a watermarking model only swaps one vendor's mark for another, and that Slopstopper reduces the signal rather than guaranteeing removal. Slopstopper's own documentation forbids claiming undetectability, and the audience for a Nature paper explainer would take the site apart for overclaiming.


## The scoring, corrected

Building the paraphrase dial exposed a real bug in the scorer: it generated the watermarked sample at one tournament depth and scored it at another, so its three numbers were never computed the same way. They told the right story by accident.

Two fixes followed. Generation and scoring now share one depth. And that depth is **3**, not 6: with only eight distinct candidates per position, a six-round tournament almost never has a word that wins every layer, so ties decide the result and the signal flattens instead of strengthening. The rule is that knockout depth cannot exceed the log2 of the candidate field.

The passage was then extended from 78 to 138 tokens, because at the shorter length the score was too noisy to separate the samples reliably. That is the site's own argument about text length, arrived at the hard way.

The demo key is fixed at `synthid`, chosen because human text scores 0.490 under it, which is where chance says it should sit. A key sweep showed the spread between watermarked and human text ranging from 0.13 down to nothing depending on the key, at this passage length. The scorer's caption states this rather than hiding it: the noise is the paper's point about short text, showing up inside the demo built to explain it.

Current figures, all consistently computed: watermarked **0.618**, human **0.490**, watermarked then paraphrased **0.493**.


## The practical answer

Chapter 12 names what to actually point the rewrite at, because "use a model that does not watermark" is useless without a list. Three options, ordered by how long each will last:

1. **An older Claude.** Marking applies only to models launched on or after 2 August 2026, so far Fable 5.1 and Mythos 5.1. Opus 5, Sonnet 5, Fable 5, Opus 4.8 and Haiku 4.5 all shipped earlier and come out unmarked. The page says plainly that Anthropic is working to close this and gives no date, so it is a gap, not a loophole.
2. **Open weights locally.** DeepSeek, Kimi, Llama, Qwen. You own the sampling, so no key-based mark is possible.
3. **A hosted vendor that does not mark.** Grok for now. Least durable, since Article 50 can change any vendor's position.

Verified against Anthropic's own documentation before publishing rather than taken from the skill file.
