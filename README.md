# Watermarked

An interactive reading of **"Scalable watermarking for identifying large language model outputs"** (Dathathri et al., *Nature* 634, 818-823, 23 October 2024), the paper describing SynthID-Text.

It explains, for a general audience, how Google DeepMind hid a signature inside the way Gemini chooses its words: not by marking the finished text, but by running a secret knockout tournament between candidate next-words at the moment of generation.

## Interactive

Three demos run the paper's real arithmetic in the browser, with no backend and no model:

- **The secret dice.** A seeded hash over the last four words plus a key assigns every word in a sample vocabulary a Bernoulli coin. Change a word and all 64 flip, repeatably.
- **The tournament.** Eight candidates, three knockout rounds, higher coin wins, ties broken deterministically. The seven losers stay on screen.
- **Detection.** Recomputes g-values over a passage and scores it as the paper's `Score(x)` does. Watermarked scores 0.618, human 0.490, watermarked-then-paraphrased 0.493.

The candidate words at each position are hand written rather than drawn from a live model. Everything else is the paper's arithmetic.

## Stack

Plain static HTML, CSS and ES modules. No build step, no dependencies, no backend. Charts are hand-authored SVG.

```
python3 -m http.server 8000
```

## Attribution

This site is a reading of that paper. It is not published by Google DeepMind, by Nature, or by any of the authors, and it is not endorsed by them. Every number quoted comes from the article; every simplification and mistake is this site's own.

- Paper: https://doi.org/10.1038/s41586-024-08025-4 (CC BY 4.0)
- SynthID-Text source: https://github.com/google-deepmind/synthid-text

Header and section imagery generated for this project.
