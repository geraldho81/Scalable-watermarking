/* ============================================================
   Motion.
   Every block gets the entrance that suits what it contains,
   never one identical fade on everything. Nothing animates on
   prefers-reduced-motion; every element is already in its
   finished state and the classes only ever add movement.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function once(selector, fn, opts) {
  const targets = Array.prototype.slice.call(document.querySelectorAll(selector));
  if (!targets.length) return;
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      fn(e.target);
    });
  }, opts || { rootMargin: '0px 0px -14% 0px', threshold: 0.15 });
  targets.forEach(function (t) { io.observe(t); });
}

/* a number that means something counts to it */
function countTo(el) {
  const target = Number(el.dataset.count);
  if (!target) return;
  const dur = 1500, t0 = performance.now();
  const fmt = new Intl.NumberFormat('en-GB');
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt.format(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(step);
  }
  el.textContent = fmt.format(0);
  requestAnimationFrame(step);
}

export function initMotion() {
  if (REDUCED) return;
  document.documentElement.classList.add('motion');

  // the hero lines arrive on load, not on scroll
  requestAnimationFrame(function () {
    const h = document.querySelector('.hero__h');
    if (h) h.classList.add('is-in');
    const rest = document.querySelectorAll('.hero__stand, .hero__by, .hero__cue');
    rest.forEach(function (el, i) {
      el.style.setProperty('--i', String(i + 2));
      el.classList.add('is-in');
    });
  });

  // a band's headline wipes rather than fades, so it reads as a title card
  once('.beat__body, .finale__body', function (el) { el.classList.add('is-in'); });

  // bars are data, so they grow from nothing to their value
  once('.odds', function (el) { el.classList.add('is-in'); });

  // the big number counts
  once('[data-count]', countTo, { threshold: 0.6 });

  // lists arrive item by item
  once('.steps, .limits, .options, .reads, .twoup, .figures', function (el) {
    Array.prototype.slice.call(el.children).forEach(function (c, i) {
      c.style.setProperty('--i', String(i));
    });
    el.classList.add('is-in');
  });

  // the vocabulary lands as a wave, which is what it is
  once('.coins', function (el) {
    Array.prototype.slice.call(el.children).forEach(function (c, i) {
      c.style.setProperty('--i', String(i % 24));
    });
    el.classList.add('is-in');
  }, { threshold: 0.12 });

  // evidence accumulates through the passage in reading order
  once('#scorerText, #rwText', function (el) {
    const toks = el.querySelectorAll('.tok, .rwtok');
    toks.forEach(function (t, i) { t.style.setProperty('--i', String(Math.min(i, 60))); });
    el.classList.add('is-in');
  }, { threshold: 0.1 });

  // figures and prose keep the quiet default
  once('.fig, .chapter > p, .chapter > .sub', function (el) {
    el.classList.add('is-in');
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
}
