# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static multi-file (HTML + CSS + JS), no build step. User's answer. Three.js and GSAP/ScrollTrigger + Lenis from CDN. Deployable to any static host.

## Users

Primary: the curious general public. Someone who has read a headline about AI-written text and wants to know whether it can be identified. No machine-learning background, no familiarity with tokens, sampling, entropy or false-positive rates. Reading on a laptop or a phone, by choice, in one sitting. They came for an answer, not a course.

Secondary (not designed for, must not be alienated): technically literate readers who will check whether the site is honest about the paper.

## Product Purpose

A single scrolling site that lets a non-expert experience the mechanism of SynthID-Text, the text watermarking scheme published in Nature on 23 October 2024 by Google DeepMind (Dathathri, See, Ghaisas, Huang, McAdam et al., "Scalable watermarking for identifying large language model outputs", Nature 634, 818-823). Success is a reader who can, unprompted, explain to someone else how a watermark gets into text without changing what the text says, and who knows what the method cannot do.

## Positioning

The paper's own mechanism is the differentiator and it is unusually well suited to being played rather than described: watermarking happens inside the act of choosing each next word, through a knockout tournament between candidate words. Nothing is added to the text after the fact. The site is not a summary of the paper; it is the paper's mechanism made operable, with a sandbox the reader can run on their own sentence.

## Operating Context

One-shot linear read, scroll-driven. Desktop and mobile both first-class. No sign-in, no data collection, no backend. The reader arrives cold from a link.

## Capabilities and Constraints

Confirmed factual content the site must carry accurately:

- LLMs generate text one token at a time by sampling from a probability distribution over the vocabulary, conditioned on the text so far.
- Generative watermarking has three parts: a random seed generator, a sampling algorithm, and a scoring function. SynthID-Text replaces the sampling algorithm with Tournament sampling.
- Random seed r_t is a hash of the last H tokens plus a secret watermarking key. Experiments use H = 4.
- The seed drives m independent random watermarking functions g_1..g_m, each assigning a g-value to any candidate token. Paper's default g-value distribution is Bernoulli(0.5), so g-values are 0 or 1.
- Tournament sampling draws N^m candidate tokens from the LLM's own distribution (Fig. 2 uses m = 3, N = 2, so 8 entrants), pairs them, and in each layer the higher g-value wins; ties are broken at random. The final survivor is the emitted token.
- Detection scores text as the mean g-value across tokens and layers: Score(x) = (1/mT) * sum over t, l of g_l(x_t, r_t). Higher mean means watermarked. Detection needs only the text and the key, never the LLM itself.
- Two factors drive detectability: text length (longer = more evidence) and entropy of the LLM distribution (more genuine choice = more room to encode). Low-entropy text, such as a factual answer with one right phrasing, carries little watermark.
- More tournament layers m increases evidence per token and reduces score variance; experiments generally use m = 30. Benefit diminishes with depth.
- Non-distortionary configuration preserves text quality; distortionary configuration trades quality for detectability. The paper defines non-distortion at three strengths and uses single-sequence non-distortionary as its default.
- Repeated context masking (K-sequence, K = 1 in most experiments) prevents the watermark being applied twice on the same context window, which would degrade quality and cause repetition loops.
- Live production evidence: roughly 20 million watermarked and unwatermarked Gemini (then Bard) responses. Thumbs-up rate differed by 0.01% (watermarked higher), thumbs-down by 0.02% (watermarked lower). Both statistically insignificant, well within 95% confidence intervals.
- Human side-by-side study: 3,000 ELI5 questions, Gemma 7B-IT, five aspects (grammaticality/coherence, relevance, correctness, helpfulness, overall). No significant difference in rater preference.
- Latency: Gemma 7B-IT on 4 v5e TPUs generates at 15.527 ms/token; with 30-layer Tournament sampling, 15.615 ms/token. A 0.57% increase. Gumbel sampling adds 0.26%, Soft Red List 0.28%.
- Detectability: SynthID-Text beats Gumbel sampling on non-distortionary, and Soft Red List on distortionary, across Gemma 2B-IT, Gemma 7B-IT and Mistral 7B-IT v0.2, at temperatures 0.5-1.0. Advantage is largest at lower entropy.
- Watermarking was combined with speculative sampling in two algorithms: high-detectability (preserves watermark strength, costs speed) and fast (preserves speed, may cost detectability).
- SynthID-Text is in production in Gemini and Gemini Advanced. Code is open-sourced.
- Stated limitations, which the site must carry and not soften: watermarks are weakened by heavy editing and by paraphrasing; they are vulnerable to stealing, spoofing and scrubbing attacks; they require the text generator to cooperate, so open-weight models deployed by anyone are a real gap; they are complementary to, not a replacement for, post-hoc detection and retrieval; no text detection method is foolproof.

Technical constraints: no backend, so the interactive tournament runs on hand-authored token candidate sets and a real seeded hash in the browser, not a live LLM. This must be stated on the surface, not buried.

## Brand Commitments

None inherited. The site is not published by Google DeepMind or Nature and must never present itself as either. Attribution to the authors, the journal, the DOI (10.1038/s41586-024-08025-4) and the CC BY 4.0 licence of the original article is required and visible.

## Evidence on Hand

- The full paper PDF at ./s41586-024-08025-4.pdf, including Methods and Extended Data. All figures and numbers above are drawn from it.
- Figure 1 (generation and watermarking overview), Figure 2 (Tournament sampling bracket, m = 3, N = 2), Figure 3 (detection performance: TPR@FPR=1% vs token count; abstention rate; detectability vs perplexity trade-off), Extended Data Fig. 1 (detectability across three models and three temperatures).
- No testimonials, no user research, no metrics of our own. None may be invented.

## Product Principles

1. Mechanism over summary. If a concept can be operated, it is operated; prose is the fallback, not the default.
2. Honest to the paper. Every number on the site is traceable to it. The limitations section is not an appendix, it is part of the argument.
3. Build from zero. No term is used before it is earned, in the reader's own vocabulary first and the paper's second.
4. The scroll is the explanation. Sections advance one idea each, and motion carries meaning rather than decorating it.
5. Not the source. The site is a reading of the paper and says so plainly, everywhere it could be mistaken for the original.

## Accessibility & Inclusion

Full keyboard operation of the interactive tournament. prefers-reduced-motion collapses scroll-scrubbing and the three.js hero to static, legible states rather than degrading to nothing. Colour never the sole carrier of meaning in the bracket or the charts. Body text meets WCAG AA against its background on a dark ground.
