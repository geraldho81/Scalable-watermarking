/*
 * charts.js
 * Hand-authored inline SVG charts for the SynthID-Text explainer.
 * Zero dependencies. Cutting-bench instrument-readout aesthetic on a
 * backlit light table: punched white chart windows, one accent ink
 * (blue), bone as the spent/comparison ink.
 *
 * export function mountCharts(root = document)
 * export function destroyCharts()
 */

const SVGNS = 'http://www.w3.org/2000/svg';

const FALLBACK_TOKENS = {
  punch: '#FFFFFF',
  blue: '#1B44D8',
  bone: '#8C8A84',
  ink: '#1A1917',
  rule: '#C8C5BC',
  red: '#D92B1F',
  strip: '#121211'
};

const MONO_FONT = "'Poppins', system-ui, sans-serif";
const OSWALD_FONT = "'Poppins', system-ui, sans-serif";

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ANIM_MS = 900;

// Registry of everything mountCharts has built, so destroyCharts can
// unwind it cleanly: observers to disconnect, root elements to clear.
let mountedRoots = [];

function getTokens() {
  let cs = null;
  try {
    cs = getComputedStyle(document.documentElement);
  } catch (err) {
    cs = null;
  }
  function read(name, fallback) {
    if (!cs) return fallback;
    const v = cs.getPropertyValue(name);
    return v && v.trim() ? v.trim() : fallback;
  }
  return {
    punch: read('--punch', FALLBACK_TOKENS.punch),
    blue: read('--blue', FALLBACK_TOKENS.blue),
    bone: read('--bone', FALLBACK_TOKENS.bone),
    ink: read('--ink', FALLBACK_TOKENS.ink),
    rule: read('--rule', FALLBACK_TOKENS.rule),
    red: read('--red', FALLBACK_TOKENS.red),
    strip: read('--strip', FALLBACK_TOKENS.strip)
  };
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) {
    for (const key in attrs) {
      const v = attrs[key];
      if (v !== undefined && v !== null) el.setAttribute(key, v);
    }
  }
  return el;
}

function svgText(content, attrs) {
  const el = svgEl('text', attrs);
  el.textContent = content;
  return el;
}

function makeSvgRoot(viewBoxW, viewBoxH, titleText, descText, tokens) {
  const svg = svgEl('svg', {
    viewBox: '0 0 ' + viewBoxW + ' ' + viewBoxH,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    style: 'width:100%;height:auto;display:block;'
  });
  const title = document.createElementNS(SVGNS, 'title');
  title.textContent = titleText;
  const desc = document.createElementNS(SVGNS, 'desc');
  desc.textContent = descText;
  svg.appendChild(title);
  svg.appendChild(desc);
  // punched white chart window, independent of whatever sits behind it
  svg.appendChild(svgEl('rect', {
    x: 0, y: 0, width: viewBoxW, height: viewBoxH, fill: tokens.punch
  }));
  return svg;
}

function scaleLinear(domain, range) {
  const d0 = domain[0], d1 = domain[1];
  const r0 = range[0], r1 = range[1];
  return function (v) {
    if (d1 === d0) return r0;
    return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  };
}

function fmtRate(v) {
  return v.toFixed(1);
}

function fmtTokens(v) {
  return String(v);
}

function fmtMs(v) {
  return v.toFixed(3);
}

function fmtPct(v) {
  const sign = v > 0 ? '+' : v < 0 ? '' : '+';
  return sign + v.toFixed(2) + '%';
}

// Draws the shared cutting-bench frame for a rectangular plot area:
// left + bottom hairline only, horizontal gridlines, sprocket ticks
// on the bottom axis, tabular tick labels, and axis
// titles. Returns nothing; mutates svg in place.
function drawFrame(svg, plot, opts, tokens) {
  const xScale = opts.xScale;
  const yScale = opts.yScale;

  // horizontal gridlines (value axis only)
  opts.yTicks.forEach(function (t) {
    const y = yScale(t);
    svg.appendChild(svgEl('line', {
      x1: plot.x, x2: plot.x + plot.width, y1: y, y2: y,
      stroke: tokens.rule, 'stroke-width': 1, opacity: 0.5
    }));
  });

  // left + bottom hairline rule, no box
  svg.appendChild(svgEl('line', {
    x1: plot.x, x2: plot.x, y1: plot.y, y2: plot.y + plot.height,
    stroke: tokens.rule, 'stroke-width': 1
  }));
  svg.appendChild(svgEl('line', {
    x1: plot.x, x2: plot.x + plot.width, y1: plot.y + plot.height, y2: plot.y + plot.height,
    stroke: tokens.rule, 'stroke-width': 1
  }));

  // sprocket ticks on the bottom axis: solid 4x4 strip squares, punched
  // film holes, not an accent surface
  opts.xTicks.forEach(function (t) {
    const x = xScale(t);
    svg.appendChild(svgEl('rect', {
      x: x - 2, y: plot.y + plot.height - 2, width: 4, height: 4,
      fill: tokens.strip
    }));
    svg.appendChild(svgText(opts.xTickFormat(t), {
      x: x, y: plot.y + plot.height + 18,
      'text-anchor': 'middle',
      style: 'font-family:' + MONO_FONT + ';font-size:11px;letter-spacing:0.02em;fill:' + tokens.ink + ';'
    }));
  });

  opts.yTicks.forEach(function (t) {
    const y = yScale(t);
    svg.appendChild(svgText(opts.yTickFormat(t), {
      x: plot.x - 8, y: y + 4,
      'text-anchor': 'end',
      style: 'font-family:' + MONO_FONT + ';font-size:11px;letter-spacing:0.02em;fill:' + tokens.ink + ';'
    }));
  });

  if (opts.xAxisTitle) {
    svg.appendChild(svgText(opts.xAxisTitle, {
      x: plot.x + plot.width / 2, y: plot.y + plot.height + 40,
      'text-anchor': 'middle',
      style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + tokens.ink + ';text-transform:uppercase;'
    }));
  }
  if (opts.yAxisTitle) {
    const ty = plot.y + plot.height / 2;
    const tx = plot.x - opts.yAxisTitleOffset;
    const g = svgEl('text', {
      x: tx, y: ty,
      'text-anchor': 'middle',
      transform: 'rotate(-90 ' + tx + ' ' + ty + ')',
      style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + tokens.ink + ';text-transform:uppercase;'
    });
    g.textContent = opts.yAxisTitle;
    svg.appendChild(g);
  }
}

// Draws one line series (confidence band, line, markers, end label)
// and registers its reveal animation into `animations`.
function drawSeries(svg, plot, xScale, yScale, series, tokens, animations, reduceMotion) {
  // confidence band
  if (series.band) {
    const upper = series.points.map(function (p, i) {
      return { x: p.x, y: Math.min(1, p.y + series.band[i]) };
    });
    const lower = series.points.map(function (p, i) {
      return { x: p.x, y: Math.max(0, p.y - series.band[i]) };
    });
    const fwd = upper.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + xScale(p.x).toFixed(2) + ' ' + yScale(p.y).toFixed(2);
    });
    const rev = lower.slice().reverse().map(function (p) {
      return 'L' + xScale(p.x).toFixed(2) + ' ' + yScale(p.y).toFixed(2);
    });
    const d = fwd.concat(rev).join(' ') + ' Z';
    // 0.16, not 0.12: a fill tuned for legibility on black nearly
    // vanishes against a white ground.
    const band = svgEl('path', { d: d, fill: series.color, stroke: 'none', opacity: reduceMotion ? 0.16 : 0 });
    svg.appendChild(band);
    if (!reduceMotion) {
      band.style.transition = 'opacity ' + ANIM_MS + 'ms ' + EASE;
      animations.push(function () { band.style.opacity = '0.16'; });
    }
  }

  // the line itself
  const dAttr = series.points.map(function (p, i) {
    return (i === 0 ? 'M' : 'L') + xScale(p.x).toFixed(2) + ' ' + yScale(p.y).toFixed(2);
  }).join(' ');
  const line = svgEl('path', {
    d: dAttr, fill: 'none', stroke: series.color, 'stroke-width': 2,
    'stroke-dasharray': series.dashed ? '5 4' : undefined
  });
  svg.appendChild(line);

  if (!reduceMotion) {
    const len = line.getTotalLength();
    const dash = series.dashed ? '5 4' : String(len);
    line.style.strokeDasharray = dash;
    line.style.strokeDashoffset = String(len);
    line.style.transition = 'stroke-dashoffset ' + ANIM_MS + 'ms ' + EASE;
    animations.push(function () { line.style.strokeDashoffset = '0'; });
  }

  // markers
  series.points.forEach(function (p) {
    const cx = xScale(p.x), cy = yScale(p.y);
    if (series.dashed) {
      svg.appendChild(svgEl('circle', {
        cx: cx, cy: cy, r: 3.5, fill: tokens.punch, stroke: series.color, 'stroke-width': 1.5
      }));
    } else {
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 3.5, fill: series.color, stroke: 'none' }));
    }
  });

  // direct end label, no separate legend
  const last = series.points[series.points.length - 1];
  svg.appendChild(svgText(series.label, {
    x: xScale(last.x) + 8, y: yScale(last.y) + 4,
    'text-anchor': 'start',
    style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + series.color + ';text-transform:uppercase;'
  }));
}

function observeReveal(svg, animations, cleanupList) {
  if (!animations.length) return;
  let observer;
  try {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animations.forEach(function (fn) { fn(); });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    observer.observe(svg);
    cleanupList.push(function () { observer.disconnect(); });
  } catch (err) {
    // no IntersectionObserver support: draw complete
    animations.forEach(function (fn) { fn(); });
  }
}

// ---------------------------------------------------------------------
// data-chart="detectability"
// ---------------------------------------------------------------------
function renderDetectability(container, tokens, cleanupList) {
  const reduceMotion = prefersReducedMotion();
  const W = 640, H = 380;
  const plot = { x: 56, y: 24, width: 436, height: 282 };  // leaves room for the end labels

  const svg = makeSvgRoot(W, H, 'Detection rate by token count',
    'Detection rate for SynthID-Text rises with token count from 50 to 400 tokens, consistently exceeding the Gumbel sampling baseline at every measured length.', tokens);

  const xScale = scaleLinear([0, 400], [plot.x, plot.x + plot.width]);
  const yScale = scaleLinear([0, 1], [plot.y + plot.height, plot.y]);

  const frameOpts = {
    xScale: xScale, yScale: yScale,
    xTicks: [0, 100, 200, 300, 400], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    xTickFormat: fmtTokens, yTickFormat: fmtRate,
    xAxisTitle: 'Number of Tokens', yAxisTitle: 'Detection Rate', yAxisTitleOffset: 40
  };
  drawFrame(svg, plot, frameOpts, tokens);

  const x = [50, 100, 200, 300, 400];
  const animations = [];

  drawSeries(svg, plot, xScale, yScale, {
    points: x.map(function (xi, i) { return { x: xi, y: [0.20, 0.40, 0.53, 0.63, 0.72][i] }; }),
    band: [0.05, 0.05, 0.05, 0.05, 0.05],
    color: tokens.blue, dashed: false, label: 'Synthid-Text'
  }, tokens, animations, reduceMotion);

  drawSeries(svg, plot, xScale, yScale, {
    points: x.map(function (xi, i) { return { x: xi, y: [0.16, 0.28, 0.43, 0.53, 0.60][i] }; }),
    band: [0.08, 0.08, 0.08, 0.08, 0.08],
    color: tokens.bone, dashed: true, label: 'Gumbel'
  }, tokens, animations, reduceMotion);

  observeReveal(svg, animations, cleanupList);
  container.appendChild(svg);
}

// ---------------------------------------------------------------------
// data-chart="entropy"
// ---------------------------------------------------------------------
const ENTROPY_DATA = [
  { title: 'Temperature 0.5', synthid: [0.11, 0.40, 0.54, 0.63, 0.73], gumbel: [0.09, 0.20, 0.34, 0.41, 0.44] },
  { title: 'Temperature 0.7', synthid: [0.21, 0.51, 0.70, 0.78, 0.86], gumbel: [0.18, 0.36, 0.60, 0.67, 0.74] },
  { title: 'Temperature 1.0', synthid: [0.34, 0.67, 0.87, 0.92, 0.96], gumbel: [0.35, 0.64, 0.86, 0.91, 0.95] }
];
const ENTROPY_X = [50, 100, 200, 300, 400];

function renderEntropyPanel(panelDiv, panelData, tokens, cleanupList, reduceMotion) {
  panelDiv.innerHTML = '';
  const W = 260, H = 220;
  const plot = { x: 38, y: 32, width: 200, height: 150 };

  const svg = makeSvgRoot(W, H, panelData.title + ' detection rate',
    'At ' + panelData.title.toLowerCase() + ', Gemma 7B-IT detection rate climbs with token count for both SynthID-Text and Gumbel sampling, with SynthID-Text ahead throughout.', tokens);

  const xScale = scaleLinear([0, 400], [plot.x, plot.x + plot.width]);
  const yScale = scaleLinear([0, 1], [plot.y + plot.height, plot.y]);

  drawFrame(svg, plot, {
    xScale: xScale, yScale: yScale,
    xTicks: [0, 200, 400], yTicks: [0, 0.5, 1.0],
    xTickFormat: fmtTokens, yTickFormat: fmtRate,
    xAxisTitle: null, yAxisTitle: null, yAxisTitleOffset: 0
  }, tokens);

  svg.appendChild(svgText(panelData.title, {
    x: plot.x, y: 16, 'text-anchor': 'start',
    style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + tokens.ink + ';text-transform:uppercase;'
  }));

  const animations = [];
  drawSeries(svg, plot, xScale, yScale, {
    points: ENTROPY_X.map(function (xi, i) { return { x: xi, y: panelData.synthid[i] }; }),
    color: tokens.blue, dashed: false, label: 'Synthid'
  }, tokens, animations, reduceMotion);
  drawSeries(svg, plot, xScale, yScale, {
    points: ENTROPY_X.map(function (xi, i) { return { x: xi, y: panelData.gumbel[i] }; }),
    color: tokens.bone, dashed: true, label: 'Gumbel'
  }, tokens, animations, reduceMotion);

  observeReveal(svg, animations, cleanupList);
  panelDiv.appendChild(svg);
}

function renderEntropy(container, tokens, cleanupList) {
  const reduceMotion = prefersReducedMotion();

  const outer = document.createElement('div');
  outer.style.cssText = 'display:flex;align-items:stretch;gap:10px;';

  const yLabel = document.createElement('div');
  yLabel.textContent = 'Detection Rate';
  yLabel.style.cssText = 'writing-mode:vertical-rl;transform:rotate(180deg);' +
    'font-family:' + OSWALD_FONT + ';text-transform:uppercase;font-size:11px;letter-spacing:0.1em;' +
    'color:' + tokens.ink + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;';

  const rightCol = document.createElement('div');
  rightCol.style.cssText = 'display:flex;flex-direction:column;flex:1;gap:8px;min-width:0;';

  const panelsRow = document.createElement('div');
  panelsRow.style.cssText = 'display:flex;flex-direction:row;gap:12px;flex:1;min-width:0;';

  const xLabel = document.createElement('div');
  xLabel.textContent = 'Number of Tokens';
  xLabel.style.cssText = 'text-align:center;font-family:' + OSWALD_FONT +
    ';text-transform:uppercase;font-size:11px;letter-spacing:0.1em;color:' + tokens.ink + ';';

  const panelDivs = ENTROPY_DATA.map(function () {
    const d = document.createElement('div');
    d.style.cssText = 'flex:1;min-width:0;';
    return d;
  });

  panelDivs.forEach(function (d) { panelsRow.appendChild(d); });
  rightCol.appendChild(panelsRow);
  rightCol.appendChild(xLabel);
  outer.appendChild(yLabel);
  outer.appendChild(rightCol);
  container.appendChild(outer);

  panelDivs.forEach(function (d, i) {
    renderEntropyPanel(d, ENTROPY_DATA[i], tokens, cleanupList, reduceMotion);
  });

  // Re-render only on breakpoint crossings (stacked vs side-by-side),
  // not on every pixel of a resize.
  let stacked = null;
  function applyLayout(width) {
    const shouldStack = width < 640;
    if (shouldStack === stacked) return;
    stacked = shouldStack;
    panelsRow.style.flexDirection = stacked ? 'column' : 'row';
  }

  try {
    const ro = new ResizeObserver(function (entries) {
      for (const entry of entries) {
        applyLayout(entry.contentRect.width);
      }
    });
    ro.observe(outer);
    cleanupList.push(function () { ro.disconnect(); });
  } catch (err) {
    applyLayout(outer.getBoundingClientRect().width || 640);
  }
}

// ---------------------------------------------------------------------
// data-chart="latency"
// ---------------------------------------------------------------------
function renderLatency(container, tokens, cleanupList) {
  const W = 640, H = 200;
  const plot = { x: 40, y: 40, width: 430, height: 110 };
  const bars = [
    { label: 'No Watermark', value: 15.527, filled: false },
    { label: 'Synthid-Text, 30 Rounds', value: 15.615, filled: true }
  ];

  const svg = makeSvgRoot(W, H, 'Generation latency per token',
    'At true scale from 0 to 16 milliseconds, SynthID-Text adds 0.57 percent to per-token generation latency, a difference too small to see.', tokens);

  const xScale = scaleLinear([0, 16], [plot.x, plot.x + plot.width]);
  const xTicks = [0, 4, 8, 12, 16];

  drawFrame(svg, plot, {
    xScale: xScale, yScale: scaleLinear([0, 1], [plot.y + plot.height, plot.y]),
    xTicks: xTicks, yTicks: [],
    xTickFormat: function (v) { return v + ' ms'; }, yTickFormat: fmtRate,
    xAxisTitle: 'Generation Cost Per Token', yAxisTitle: null, yAxisTitleOffset: 0
  }, tokens);

  const barHeight = 22;
  const rowY = [plot.y + 12, plot.y + 12 + barHeight + 30];

  bars.forEach(function (bar, i) {
    const y = rowY[i];
    const x1 = xScale(bar.value);

    svg.appendChild(svgText(bar.label, {
      x: plot.x, y: y - 8, 'text-anchor': 'start',
      style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + tokens.ink + ';text-transform:uppercase;'
    }));

    if (bar.filled) {
      svg.appendChild(svgEl('rect', {
        x: plot.x, y: y, width: x1 - plot.x, height: barHeight, fill: tokens.blue
      }));
    } else {
      svg.appendChild(svgEl('rect', {
        x: plot.x, y: y, width: x1 - plot.x, height: barHeight,
        fill: 'none', stroke: tokens.bone, 'stroke-width': 1
      }));
    }

    svg.appendChild(svgText(fmtMs(bar.value) + ' ms', {
      x: x1 + 8, y: y + barHeight / 2 + 4, 'text-anchor': 'start',
      style: 'font-family:' + MONO_FONT + ';font-size:11px;letter-spacing:0.02em;fill:' + tokens.ink + ';'
    }));
  });

  const deltaX = xScale(bars[1].value);
  svg.appendChild(svgText('+0.57%', {
    x: deltaX + 8, y: rowY[1] + barHeight + 20, 'text-anchor': 'start',
    style: 'font-family:' + MONO_FONT + ';font-size:11px;letter-spacing:0.02em;fill:' + tokens.blue + ';'
  }));

  container.appendChild(svg);
}

// ---------------------------------------------------------------------
// data-chart="quality"
// ---------------------------------------------------------------------
function renderQuality(container, tokens, cleanupList) {
  const W = 640, H = 190;
  const plot = { x: 40, y: 0, width: 560, height: 0 };
  const zeroLineY = 62;
  const tickAxisY = 118;

  const svg = makeSvgRoot(W, H, 'Response quality deviation',
    'Across 20 million live responses, watermarked thumbs-up rate deviated by +0.01 percentage points and thumbs-down rate by -0.02 percentage points, both inside the band of no statistically significant difference.', tokens);

  const xScale = scaleLinear([-0.5, 0.5], [plot.x, plot.x + plot.width]);

  // shaded band of no statistical significance
  const bandX0 = xScale(-0.25), bandX1 = xScale(0.25);
  svg.appendChild(svgEl('rect', {
    x: bandX0, y: zeroLineY - 14, width: bandX1 - bandX0, height: 28,
    fill: tokens.bone, opacity: 0.2
  }));
  // bone is a stroke/marker ink only; this is text, so it takes --ink
  svg.appendChild(svgText('Not Statistically Significant', {
    x: plot.x + plot.width / 2, y: zeroLineY + 5, 'text-anchor': 'middle',
    style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + tokens.ink + ';text-transform:uppercase;'
  }));

  // zero line
  svg.appendChild(svgEl('line', {
    x1: plot.x, x2: plot.x + plot.width, y1: zeroLineY, y2: zeroLineY,
    stroke: tokens.rule, 'stroke-width': 1
  }));

  // bottom axis (tick axis) hairline + sprockets + labels
  svg.appendChild(svgEl('line', {
    x1: plot.x, x2: plot.x + plot.width, y1: tickAxisY, y2: tickAxisY,
    stroke: tokens.rule, 'stroke-width': 1
  }));
  [-0.5, -0.25, 0, 0.25, 0.5].forEach(function (t) {
    const x = xScale(t);
    svg.appendChild(svgEl('rect', {
      x: x - 2, y: tickAxisY - 2, width: 4, height: 4, fill: tokens.strip
    }));
    svg.appendChild(svgText(fmtPct(t).replace('+0.00', '0.00'), {
      x: x, y: tickAxisY + 18, 'text-anchor': 'middle',
      style: 'font-family:' + MONO_FONT + ';font-size:11px;letter-spacing:0.02em;fill:' + tokens.ink + ';'
    }));
  });

  const marks = [
    { key: 'thumbsUp', label: 'Thumbs-up', value: 0.01, anchor: 'start' },
    { key: 'thumbsDown', label: 'Thumbs-down', value: -0.02, anchor: 'end' }
  ];
  marks.forEach(function (m) {
    const x = xScale(m.value);
    svg.appendChild(svgEl('line', {
      x1: x, x2: x, y1: zeroLineY - 14, y2: zeroLineY + 14,
      stroke: tokens.blue, 'stroke-width': 2
    }));
    svg.appendChild(svgEl('circle', { cx: x, cy: zeroLineY, r: 3, fill: tokens.blue }));
    svg.appendChild(svgText(m.label, {
      x: x, y: zeroLineY - 26, 'text-anchor': m.anchor,
      style: 'font-family:' + OSWALD_FONT + ';font-size:11px;letter-spacing:0.1em;fill:' + tokens.ink + ';text-transform:uppercase;'
    }));
    svg.appendChild(svgText(fmtPct(m.value), {
      x: x, y: zeroLineY - 14 - 6, 'text-anchor': m.anchor, dy: '-2',
      style: 'font-family:' + MONO_FONT + ';font-size:11px;letter-spacing:0.02em;fill:' + tokens.blue + ';'
    }));
  });

  container.appendChild(svg);
}

// ---------------------------------------------------------------------
const RENDERERS = {
  detectability: renderDetectability,
  entropy: renderEntropy,
  latency: renderLatency,
  quality: renderQuality
};

export function mountCharts(root) {
  const scope = root || document;
  const tokens = getTokens();
  const nodes = scope.querySelectorAll('[data-chart]');

  nodes.forEach(function (el) {
    const kind = el.getAttribute('data-chart');
    const renderFn = RENDERERS[kind];
    if (!renderFn) return;

    el.innerHTML = '';
    const cleanupList = [];
    renderFn(el, tokens, cleanupList);
    mountedRoots.push({ el: el, cleanupList: cleanupList });
  });
}

export function destroyCharts() {
  mountedRoots.forEach(function (record) {
    record.cleanupList.forEach(function (fn) {
      try { fn(); } catch (err) { /* already torn down */ }
    });
    record.el.innerHTML = '';
  });
  mountedRoots = [];
}
