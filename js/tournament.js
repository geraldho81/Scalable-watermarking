/* ============================================================
   The engine.
   Real seeded hashing, real g-values, real Tournament sampling.
   There is no language model here: the candidate words at each
   position are hand written. Everything else is the paper's
   arithmetic.
   ============================================================ */

const H = 4;          // sliding context window; the paper's experiments use 4
const LAYERS = 30;    // production depth in the paper
const M = 6;          // knockout depth. 2^6 = 64 entrants drawn with replacement,
                      // which is what Algorithm 2 does: N^m possibly non-unique samples
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15; h = Math.imul(h, 0x2545f491) >>> 0; h ^= h >>> 13;
  return h >>> 0;
}

/* the random seed generator: last H tokens, plus the watermarking key */
export function seedFor(context, key) {
  const win = context.slice(-H).join(' ').toLowerCase();
  return hash32(key + ' ' + win);
}

/* the g-value: a Bernoulli(0.5) coin for this word, at this layer, under this seed */
export function gValue(word, layer, seed) {
  return hash32(seed + ':' + layer + ':' + word.toLowerCase()) & 1;
}

function tieBreak(a, b, layer, seed) {
  return (hash32(seed + '#' + layer + '#' + a + '#' + b) & 1) === 1 ? a : b;
}

/* Tournament sampling, the paper's Algorithm 2 */
export function playTournament(candidates, layers, seed) {
  let field = candidates.slice();
  const rounds = [{ cells: field.map(function (w) { return { w: w, g: gValue(w, 1, seed) }; }) }];
  const eliminated = [];

  for (let l = 1; l <= layers && field.length > 1; l++) {
    const next = [];
    for (let i = 0; i < field.length; i += 2) {
      const a = field[i], b = field[i + 1];
      if (b === undefined) { next.push(a); continue; }
      const ga = gValue(a, l, seed), gb = gValue(b, l, seed);
      let win, lose, lg;
      if (ga > gb) { win = a; lose = b; lg = gb; }
      else if (gb > ga) { win = b; lose = a; lg = ga; }
      else { win = tieBreak(a, b, l, seed); lose = win === a ? b : a; lg = ga; }
      next.push(win);
      eliminated.push({ w: lose, layer: l, g: lg });
    }
    field = next;
    const nl = Math.min(l + 1, layers);
    rounds.push({ layer: l, cells: field.map(function (w) { return { w: w, g: gValue(w, nl, seed) }; }) });
  }
  return { winner: field[0], rounds: rounds, eliminated: eliminated };
}

/* the scoring function: mean g-value across every position and every layer */
export function scoreTokens(tokens, key, layers) {
  layers = layers || M;
  const ctx = [];
  let total = 0, n = 0;
  const per = [];
  for (const t of tokens) {
    const seed = seedFor(ctx.length ? ctx : ['<s>'], key);
    let ones = 0;
    for (let l = 1; l <= layers; l++) ones += gValue(t, l, seed);
    per.push(ones / layers);
    total += ones; n += layers;
    ctx.push(t);
  }
  return { score: n ? total / n : 0.5, per: per };
}

/* ------------------------------------------------------------
   Hand written candidate chains. Each slot holds the words a
   model could plausibly emit at that position. A slot with one
   entry is a low entropy position: no choice, so no watermark.
   ------------------------------------------------------------ */
function F(w) { return [w]; }

const SEA_CHAIN = [
  F('The'), ['strangest', 'oddest', 'quietest', 'oldest', 'loneliest', 'plainest', 'coldest', 'darkest'],
  F('thing'), F('about'), F('the'), F('sea'), F('is'), F('how'),
  ['patient', 'careless', 'certain', 'ancient', 'indifferent', 'unhurried', 'thorough', 'stubborn'],
  F('it'), F('is'), F('.'),
  F('It'), F('has'),
  ['taken', 'claimed', 'reshaped', 'flattened', 'swallowed', 'unpicked', 'eroded', 'rearranged'],
  F('every'),
  ['harbour', 'shoreline', 'headland', 'estuary', 'jetty', 'sandbar', 'inlet', 'breakwater'],
  F('on'), F('this'),
  ['coast', 'shore', 'island', 'stretch', 'peninsula', 'map', 'edge', 'border'],
  F(','),
  ['slowly', 'gradually', 'quietly', 'steadily', 'patiently', 'gently', 'evenly', 'thoroughly'],
  F('and'), F('without'),
  ['argument', 'ceremony', 'apology', 'hurry', 'warning', 'complaint', 'malice', 'announcement'],
  F('.'),
  ['Sailors', 'Fishermen', 'Cartographers', 'Islanders', 'Divers', 'Pilots', 'Surveyors', 'Whalers'],
  F('learned'), F('this'),
  ['early', 'first', 'quickly', 'young', 'painfully', 'reluctantly', 'plainly', 'slowly'],
  F('and'),
  ['wrote', 'carved', 'copied', 'printed', 'folded', 'stitched', 'kept', 'pressed'],
  F('it'), F('into'), F('their'),
  ['charts', 'logbooks', 'almanacs', 'songs', 'ledgers', 'margins', 'journals', 'prayers'],
  F('.'),
  ['Nothing', 'Not much', 'Almost nothing', 'Hardly anything'], F('they'),
  ['drew', 'measured', 'named', 'recorded', 'marked', 'sketched', 'counted', 'plotted'],
  F('stayed'),
  ['true', 'accurate', 'useful', 'current', 'reliable', 'fixed', 'exact', 'legible'],
  F('for'),
  ['long', 'a generation', 'a decade', 'a season', 'very long', 'a lifetime', 'two winters', 'any time'],
  F('.'),
  F('The'), ['tide', 'water', 'current', 'swell', 'undertow', 'channel', 'surf', 'ebb'],
  F('keeps'), F('no'),
  ['record', 'account', 'ledger', 'memory', 'note', 'register', 'tally', 'copy'],
  F('and'), F('needs'), F('none'), F(','), F('because'), F('it'), F('will'), F('be'), F('back'),
  F('before'), F('the'),
  ['ink', 'paint', 'chalk', 'tar', 'glue', 'varnish', 'plaster', 'mortar'],
  F('is'), F('dry'), F('.'),
  F('Whatever'), F('you'),
  ['build', 'draw', 'set', 'plant', 'pour', 'fix', 'anchor', 'lay'],
  F('at'), F('the'),
  ['edge', 'margin', 'lip', 'rim', 'boundary', 'limit', 'fringe', 'verge'],
  F('of'), F('it'), F('is'), F('a'),
  ['temporary', 'provisional', 'borrowed', 'passing', 'hopeful', 'private', 'stubborn', 'brief'],
  ['opinion', 'arrangement', 'guess', 'argument', 'promise', 'sketch', 'habit', 'claim'],
  F('.')
];

const FRUIT_CHAIN = [
  F('My'), F('favourite'), F('tropical'), F('fruit'), F('is'),
  ['mango', 'lychee', 'papaya', 'durian', 'guava', 'rambutan', 'mangosteen', 'pineapple'],
  F(','), F('because'), F('it'),
  ['tastes', 'smells', 'ripens', 'arrives', 'behaves', 'lingers', 'cuts', 'travels'],
  ['like', 'nothing like', 'exactly like', 'almost like', 'faintly like', 'a little like', 'strangely like', 'hardly like'],
  F('a'),
  ['season', 'bruise', 'promise', 'thunderstorm', 'holiday', 'rumour', 'kitchen', 'memory'],
  F('and'),
  ['refuses', 'declines', 'fails', 'hates', 'struggles', 'tends not', 'is unwilling', 'was never made'],
  F('to'),
  ['travel', 'wait', 'keep', 'behave', 'apologise', 'ripen indoors', 'survive shipping', 'sit quietly'],
  F('.')
];

const VILLAGE_CHAIN = [
  F('Nobody'), F('in'), F('the'), F('village'), F('would'), F('say'), F('it'),
  ['aloud', 'plainly', 'directly', 'first', 'twice', 'sober', 'to her face', 'in daylight'],
  F(','), F('but'), F('every'),
  ['child', 'household', 'stranger', 'winter', 'neighbour', 'shopkeeper', 'visitor', 'dog'],
  F('knew'), F('which'),
  ['door', 'window', 'field', 'lane', 'chimney', 'gate', 'well', 'orchard'],
  F('the'),
  ['stories', 'rumours', 'quarrels', 'money', 'silences', 'letters', 'blame', 'trouble'],
  ['belonged', 'led', 'pointed', 'returned', 'ran back', 'traced', 'came home', 'kept turning'],
  F('to'), F('.')
];

const CHAINS = [FRUIT_CHAIN, SEA_CHAIN, VILLAGE_CHAIN];

/* Run a chain: at every position with real choice, play the tournament. */
export function generate(chain, key, layers, watermark) {
  if (watermark === undefined) watermark = true;
  const ctx = [];
  const out = [];
  for (const slot of chain) {
    const seed = seedFor(ctx.length ? ctx : ['<s>'], key);
    let word, losers = [];
    if (slot.length === 1) {
      word = slot[0];
    } else if (!watermark) {
      word = slot[hash32(seed + 'plain') % slot.length];
    } else {
      const m = Math.max(1, Math.min(layers, M));
      const field = [];
      for (let k = 0; k < Math.pow(2, m); k++) field.push(slot[hash32(seed + 'draw' + k) % slot.length]);
      const r = playTournament(field, m, seed);
      word = r.winner;
      const seen = {};
      r.eliminated.forEach(function (e) {
        if (e.w !== word && !seen[e.w]) { seen[e.w] = 1; losers.push(e.w); }
      });
    }
    const depth = Math.max(1, Math.min(layers, M));
    let ones = 0;
    for (let l = 1; l <= depth; l++) ones += gValue(word, l, seed);
    out.push({ w: word, evidence: ones / depth, choice: slot.length > 1, losers: losers });
    ctx.push(word);
  }
  return out;
}

function band(e) { return e < 0.5 ? 0 : e < 0.58 ? 1 : e < 0.68 ? 2 : 3; }
function joinable(w) { return /^[.,;:!?]/.test(w); }

/* ============================================================
   05 : the bracket, scrubbed by scroll then replayable
   ============================================================ */
const BRACKET_FIELD = ['durian', 'mango', 'lychee', 'mango', 'papaya', 'lychee', 'mango', 'guava'];

export function initBracket() {
  const root = document.getElementById('bracket');
  if (!root) return null;
  const layersEl = document.getElementById('bracketLayers');
  const winnerEl = document.getElementById('bracketWinner');
  const pinsEl = document.getElementById('bracketPins');
  const statusEl = document.getElementById('bracketStatus');
  const replay = document.getElementById('bracketReplay');
  const TITLES = ['Eight candidates', 'Round one, dice g1', 'Round two, dice g2', 'Round three, dice g3'];

  let run = null, shown = -2;

  function build(salt) {
    const seed = hash32('deepmind-2024|my favourite tropical fruit' + (salt || ''));
    run = playTournament(BRACKET_FIELD, 3, seed);
    layersEl.innerHTML = '';
    run.rounds.forEach(function (round, i) {
      const col = document.createElement('div');
      col.className = 'blayer';
      const h = document.createElement('p');
      h.className = 'blayer__h';
      h.textContent = TITLES[i] || ('Round ' + i);
      col.appendChild(h);
      for (let j = 0; j < round.cells.length; j += 2) {
        const pair = document.createElement('div');
        pair.className = 'bpair';
        [round.cells[j], round.cells[j + 1]].forEach(function (c) {
          if (!c) return;
          const cell = document.createElement('div');
          cell.className = 'bcell';
          cell.dataset.g = String(c.g);
          cell.innerHTML = '<span class="bcell__w"></span><span class="bcell__g"></span>';
          cell.querySelector('.bcell__w').textContent = c.w;
          cell.querySelector('.bcell__g').textContent = c.g;
          pair.appendChild(cell);
        });
        col.appendChild(pair);
      }
      layersEl.appendChild(col);
    });
    winnerEl.textContent = 'waiting';
    pinsEl.innerHTML = '';
    shown = -2;
    reveal(REDUCED ? 3 : 0);
  }

  function reveal(upTo) {
    if (upTo === shown) return;
    shown = upTo;
    layersEl.querySelectorAll('.blayer').forEach(function (col, i) {
      const on = i <= upTo;
      col.querySelectorAll('.bcell').forEach(function (c) { c.classList.toggle('is-in', on); });
    });
    pinsEl.innerHTML = '';
    const dropped = run.eliminated.filter(function (e) { return e.layer <= upTo; });
    dropped.forEach(function (e) {
      const t = document.createElement('span');
      t.className = 'trim';
      t.innerHTML = '<span class="trim__w"></span><span class="trim__g"></span>';
      t.querySelector('.trim__w').textContent = e.w;
      t.querySelector('.trim__g').textContent = 'g ' + e.g;
      pinsEl.appendChild(t);
    });
    if (upTo >= 3) {
      winnerEl.textContent = run.winner;
      statusEl.textContent = 'The word "' + run.winner + '" won three coin flips in a row and goes on the page. Seven words thrown out.';
    } else if (upTo <= 0) {
      winnerEl.textContent = 'waiting';
      statusEl.textContent = "Eight candidates drawn from the model's own list, waiting.";
    } else {
      winnerEl.textContent = 'waiting';
      statusEl.textContent = 'Round ' + upTo + ' resolved. ' + dropped.length + ' thrown out.';
    }
  }

  replay.addEventListener('click', function () {
    build('#' + Math.floor(Math.random() * 1e6));
    if (REDUCED) { reveal(3); return; }
    let i = 0;
    (function step() { reveal(i); if (i++ < 3) setTimeout(step, 620); })();
  });

  build('');
  return { setProgress: function (p) {
    if (REDUCED) return;
    reveal(Math.max(0, Math.min(3, Math.floor(p * 4.4))));
  } };
}

/* ============================================================
   07 : the scorer
   ============================================================ */
export function initScorer() {
  const root = document.getElementById('scorer');
  if (!root) return;
  const textEl = document.getElementById('scorerText');
  const fill = document.getElementById('scorerFill');
  const thr = document.getElementById('scorerThreshold');
  const scoreEl = document.getElementById('scorerScore');
  const verdict = document.getElementById('scorerVerdict');
  const range = document.getElementById('scorerRange');
  const tabs = Array.prototype.slice.call(root.querySelectorAll('.scorer__tab'));
  const KEY = 'deepmind-2024';

  const wm = generate(SEA_CHAIN, KEY, 3, true);

  const humanWords = SEA_CHAIN.map(function (slot) { return slot[0]; });
  const humanPer = scoreTokens(humanWords, KEY).per;
  const human = humanWords.map(function (w, i) {
    return { w: w, evidence: humanPer[i], choice: SEA_CHAIN[i].length > 1 };
  });

  const paraWords = SEA_CHAIN.map(function (slot, i) {
    const w = wm[i].w;
    if (slot.length > 1 && i % 3 !== 2) {
      const alt = slot.filter(function (s) { return s !== w; })[0];
      return alt || w;
    }
    return w;
  });
  const paraPer = scoreTokens(paraWords, KEY).per;
  const para = paraWords.map(function (w, i) {
    return { w: w, evidence: paraPer[i], choice: SEA_CHAIN[i].length > 1 };
  });

  const SETS = { wm: wm, human: human, para: para };
  let current = 'wm';

  function render() {
    const set = SETS[current];
    textEl.innerHTML = '';
    let sum = 0;
    set.forEach(function (t, i) {
      const s = document.createElement('span');
      s.className = 'tok' + (t.choice ? '' : ' tok--fixed') + (joinable(t.w) ? ' tok--punct' : '');
      s.dataset.band = String(band(t.evidence));
      s.textContent = t.w;
      s.title = 'evidence ' + t.evidence.toFixed(2);
      textEl.appendChild(s);
      if (i < set.length - 1 && !joinable(set[i + 1].w)) textEl.appendChild(document.createTextNode(' '));
      sum += t.evidence;
    });
    const score = sum / set.length;
    root.dataset.score = score.toFixed(4);
    paint(score);
  }

  function paint(score) {
    const t = Number(range.value) / 1000;
    const lo = 0.45, hi = 0.78;
    function pct(v) { return Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)); }
    fill.style.transform = 'scaleX(' + (pct(score) / 100) + ')';
    thr.style.left = pct(t) + '%';
    scoreEl.textContent = score.toFixed(3);
    const marked = score >= t;
    verdict.textContent = marked ? 'Watermarked' : 'Not watermarked';
    verdict.classList.toggle('is-wm', marked);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        t.classList.toggle('is-on', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      current = tab.dataset.sample;
      textEl.setAttribute('aria-labelledby', tab.id);
      render();
    });
  });
  range.addEventListener('input', function () { paint(Number(root.dataset.score)); });
  render();
}

/* ============================================================
   11 : the bench
   ============================================================ */
export function initBench() {
  const root = document.getElementById('bench');
  if (!root) return;
  const stripEl = document.getElementById('benchStrip');
  const pinsEl = document.getElementById('benchPins');
  const scoreEl = document.getElementById('benchScore');
  const verdict = document.getElementById('benchVerdict');
  const runBtn = document.getElementById('benchRun');
  const offBtn = document.getElementById('benchOff');
  const keyEl = document.getElementById('benchKey');
  const chainEl = document.getElementById('benchSeedText');
  const layersEl = document.getElementById('benchLayers');
  const layersOut = document.getElementById('benchLayersOut');
  let watermark = true;

  layersEl.addEventListener('input', function () { layersOut.textContent = layersEl.value; });

  function cut() {
    const chain = CHAINS[Number(chainEl.value)] || CHAINS[0];
    const key = keyEl.value.trim() || 'no-key';
    const toks = generate(chain, key, Number(layersEl.value), watermark);

    stripEl.innerHTML = '';
    pinsEl.innerHTML = '';
    let sum = 0;
    toks.forEach(function (t, i) {
      const f = document.createElement('span');
      f.className = 'bframe';
      f.dataset.g = t.evidence >= 0.5 ? '1' : '0';
      f.style.animationDelay = REDUCED ? '0ms' : (i * 34) + 'ms';
      f.innerHTML = '<span class="bframe__t"></span><span class="bframe__n"></span>';
      f.querySelector('.bframe__t').textContent = t.w;
      f.querySelector('.bframe__n').textContent = t.evidence.toFixed(2);
      stripEl.appendChild(f);
      sum += t.evidence;
      t.losers.forEach(function (l) {
        const tr = document.createElement('span');
        tr.className = 'trim';
        tr.textContent = l;
        pinsEl.appendChild(tr);
      });
    });
    if (!pinsEl.children.length) {
      const e = document.createElement('span');
      e.className = 'bin__empty';
      e.textContent = watermark
        ? 'No choices at any position, so nothing was thrown out'
        : 'Watermark off. No tournament ran, so nothing was thrown out';
      pinsEl.appendChild(e);
    }

    const score = sum / toks.length;
    scoreEl.textContent = score.toFixed(3);
    const marked = score >= 0.575;
    verdict.textContent = marked ? 'Reads as watermarked' : 'Reads as unwatermarked';
    verdict.classList.toggle('is-wm', marked);
  }

  runBtn.addEventListener('click', cut);
  offBtn.addEventListener('click', function () {
    watermark = !watermark;
    offBtn.setAttribute('aria-pressed', String(!watermark));
    offBtn.textContent = watermark ? 'Watermark off' : 'Watermark on';
    cut();
  });
  [keyEl, chainEl, layersEl].forEach(function (el) { el.addEventListener('change', cut); });

  stripEl.innerHTML = '<span class="bench__empty">Nothing on the bench yet</span>';
  pinsEl.innerHTML = '<span class="bin__empty">Nothing thrown out yet</span>';
}

/* ============================================================
   04 : the dice
   ============================================================ */
const DICE_WORDS = [
  'mango', 'lychee', 'papaya', 'durian', 'guava', 'rambutan', 'mangosteen', 'pineapple',
  'sweet', 'sharp', 'ripe', 'bitter', 'green', 'heavy', 'fragrant', 'cold',
  'the', 'a', 'and', 'but', 'because', 'although', 'while', 'since',
  'always', 'never', 'often', 'rarely', 'slowly', 'quickly', 'quietly', 'gently',
  'morning', 'evening', 'winter', 'harbour', 'kitchen', 'market', 'island', 'river',
  'remember', 'forget', 'arrive', 'leave', 'begin', 'finish', 'choose', 'refuse',
  'word', 'sentence', 'letter', 'page', 'signature', 'pattern', 'key', 'seed',
  'machine', 'model', 'output', 'sample', 'token', 'coin', 'draw', 'chance'
];

export function initDice() {
  const input = document.getElementById('diceInput');
  const seedEl = document.getElementById('diceSeed');
  const list = document.getElementById('diceCoins');
  if (!input) return;

  const tally = document.getElementById('diceTally');
  let built = false;

  function build() {
    list.innerHTML = '';
    DICE_WORDS.forEach(function (w, i) {
      const li = document.createElement('li');
      li.style.setProperty('--i', String(i % 16));
      li.innerHTML = '<span class="w"></span><span class="g"></span>';
      li.querySelector('.w').textContent = w;
      list.appendChild(li);
    });
    built = true;
  }

  function paint() {
    const ctx = input.value.trim().split(/\s+/).filter(Boolean);
    const seed = seedFor(ctx.length ? ctx : ['<s>'], 'deepmind-2024');
    seedEl.textContent = '0x' + seed.toString(16).padStart(8, '0');
    if (!built) build();
    const cells = list.children;
    let ones = 0;
    for (let i = 0; i < DICE_WORDS.length; i++) {
      const g = gValue(DICE_WORDS[i], 1, seed);
      ones += g;
      const li = cells[i];
      if (li.dataset.g !== String(g)) {
        li.dataset.g = String(g);
        li.classList.remove('is-flip');
        void li.offsetWidth;
        if (!REDUCED) li.classList.add('is-flip');
      }
      li.querySelector('.g').textContent = g;
    }
    if (tally) tally.textContent = ones + ' of ' + DICE_WORDS.length + ' showing a 1';
  }
  input.addEventListener('input', paint);
  paint();
}
