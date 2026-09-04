import { initBracket, initScorer, initBench, initDice, initRewrite } from './tournament.js';
import { initStrip } from './strip.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initNav() {
  const list = document.getElementById('railFrames');
  const nav = list.parentElement;
  const toggle = document.getElementById('railToggle');
  const progress = document.getElementById('railProgress');
  const current = document.getElementById('railCurrent');
  const links = Array.prototype.slice.call(list.querySelectorAll('a'));
  const sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  toggle.addEventListener('click', function () {
    const open = nav.classList.toggle('is-shown');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-shown');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) {
        const here = a.dataset.rail === e.target.id;
        a.classList.toggle('is-here', here);
        if (!here) return;
        current.textContent = a.querySelector('.rail__n').textContent;
        if (list.scrollWidth > list.clientWidth) {
          const r = a.getBoundingClientRect(), f = list.getBoundingClientRect();
          if (r.left < f.left || r.right > f.right) {
            list.scrollTo({ left: a.offsetLeft - f.width / 2 + r.width / 2, behavior: REDUCED ? 'auto' : 'smooth' });
          }
        }
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(function (s) { io.observe(s); });

  const bar = document.getElementById('rail');
  const hero = document.querySelector('.hero');

  return function () {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    if (hero) {
      const over = hero.getBoundingClientRect().bottom > bar.offsetHeight + 8;
      bar.classList.toggle('is-over', over);
    }
  };
}

function initScroll(handlers) {
  let queued = false;
  function run() { queued = false; handlers.forEach(function (h) { h(); }); }
  function tick() { if (!queued) { queued = true; requestAnimationFrame(run); } }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick, { passive: true });
  run();
}

function progressThrough(el, startAt, span) {
  const r = el.getBoundingClientRect();
  return Math.max(0, Math.min(1, (window.innerHeight * startAt - r.top) / Math.max(1, r.height * span)));
}

/* Poppins lands after first layout, which shifts every offset.
   Re-resolve a deep link once the font is in, or it drops in the wrong place. */
function settleHash() {
  const id = location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const go = function () {
    const top = target.getBoundingClientRect().top + window.scrollY
      - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0) - 72;
    window.scrollTo({ top: top, behavior: 'auto' });
  };
  go();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(go); });
  window.addEventListener('load', function () { requestAnimationFrame(go); }, { once: true });
}

/* the image inside each dark band drifts against the scroll */
function initParallax() {
  const media = Array.prototype.slice.call(document.querySelectorAll('.beat__media, .finale__media'));
  if (!media.length || REDUCED) return function () {};
  return function () {
    const vh = window.innerHeight;
    media.forEach(function (m) {
      const r = m.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const t = (r.top + r.height / 2 - vh / 2) / vh;
      m.style.transform = 'translate3d(0,' + (t * -7).toFixed(2) + '%,0)';
    });
  };
}

/* one entrance per block, from an already visible default */
function initReveal() {
  if (REDUCED) return;
  const targets = document.querySelectorAll('.beat__body, .band__inner, .fig, .finale__body');
  targets.forEach(function (t) { t.classList.add('reveal'); });
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  targets.forEach(function (t) { io.observe(t); });
}

/* the still carries the hero; the loop fades in only once it can actually play,
   and never on reduced motion, a save-data hint, or a metered connection */
function initHeroVideo() {
  const v = document.getElementById('heroVideo');
  if (!v || REDUCED) return;
  const c = navigator.connection || {};
  if (c.saveData || /^(slow-)?2g$/.test(c.effectiveType || '')) return;

  let started = false;
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !started) {
        started = true;
        v.preload = 'auto';
        v.load();
        v.play().then(function () { v.classList.add('is-playing'); }).catch(function () {});
      } else if (!e.isIntersecting && started) {
        v.pause();
      } else if (e.isIntersecting && started && v.paused) {
        v.play().catch(function () {});
      }
    });
  }, { threshold: 0.05 });
  io.observe(v);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) v.pause();
    else if (started && v.getBoundingClientRect().bottom > 0) v.play().catch(function () {});
  });
}

async function boot() {
  const handlers = [initNav(), initParallax()];
  initReveal();

  initDice();
  initScorer();
  initBench();
  initStrip();
  initRewrite();

  const bracket = initBracket();
  const bracketEl = document.getElementById('bracket');
  if (bracket && bracketEl) {
    handlers.push(function () { bracket.setProgress(progressThrough(bracketEl, 0.86, 0.72)); });
  }

  initScroll(handlers);
  settleHash();
  initHeroVideo();

  try {
    const mod = await import('./charts.js');
    if (mod && typeof mod.mountCharts === 'function') mod.mountCharts(document);
  } catch (err) {
    document.querySelectorAll('[data-chart]').forEach(function (el) {
      const fig = el.closest('figure');
      if (fig) fig.hidden = true;
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
