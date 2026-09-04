/* ============================================================
   Layer A, in the browser.
   A port of the invisible-character tables in slopstopper's
   scripts/text_unicode.py. Nothing is uploaded: the scan and
   the strip both run here.
   ============================================================ */

const NAMES = {
  0x00AD: 'soft hyphen', 0x034F: 'combining grapheme joiner', 0x061C: 'Arabic letter mark',
  0x115F: 'Hangul choseong filler', 0x1160: 'Hangul jungseong filler',
  0x17B4: 'Khmer vowel inherent AQ', 0x17B5: 'Khmer vowel inherent AA',
  0x180E: 'Mongolian vowel separator',
  0x200B: 'zero width space', 0x200C: 'zero width non-joiner', 0x200D: 'zero width joiner',
  0x200E: 'left-to-right mark', 0x200F: 'right-to-left mark',
  0x202A: 'left-to-right embedding', 0x202B: 'right-to-left embedding',
  0x202C: 'pop directional formatting', 0x202D: 'left-to-right override', 0x202E: 'right-to-left override',
  0x2060: 'word joiner', 0x2061: 'function application', 0x2062: 'invisible times',
  0x2063: 'invisible separator', 0x2064: 'invisible plus', 0x2065: 'reserved ignorable',
  0x2066: 'left-to-right isolate', 0x2067: 'right-to-left isolate',
  0x2068: 'first strong isolate', 0x2069: 'pop directional isolate',
  0x3164: 'Hangul filler', 0xFEFF: 'byte order mark', 0xFFA0: 'halfwidth Hangul filler',
  0xFFF9: 'interlinear annotation anchor', 0xFFFA: 'interlinear annotation separator',
  0xFFFB: 'interlinear annotation terminator'
};

const STRIP = new Set([
  0x00AD, 0x034F, 0x061C, 0x115F, 0x1160, 0x17B4, 0x17B5,
  0x180B, 0x180C, 0x180D, 0x180E, 0x180F,
  0x200B, 0x200C, 0x200D, 0x200E, 0x200F,
  0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
  0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2065,
  0x2066, 0x2067, 0x2068, 0x2069,
  0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F,
  0x3164, 0xFEFF, 0xFFA0, 0xFFF9, 0xFFFA, 0xFFFB, 0xE0000
]);
for (let cp = 0xFE00; cp <= 0xFE0F; cp++) STRIP.add(cp);

/* the lookalike spaces: not invisible, but not a normal space either */
const SPACES = {
  0x00A0: 'no-break space', 0x1680: 'Ogham space mark', 0x2000: 'en quad', 0x2001: 'em quad',
  0x2002: 'en space', 0x2003: 'em space', 0x2004: 'three-per-em space', 0x2005: 'four-per-em space',
  0x2006: 'six-per-em space', 0x2007: 'figure space', 0x2008: 'punctuation space',
  0x2009: 'thin space', 0x200A: 'hair space', 0x202F: 'narrow no-break space',
  0x205F: 'medium mathematical space', 0x3000: 'ideographic space'
};

function isTag(cp) { return cp >= 0xE0001 && cp <= 0xE007F; }
function isReservedTag(cp) { return cp >= 0xE0080 && cp <= 0xE00FF; }
function isEmojiish(cp) {
  return (cp >= 0x1F000 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x27BF) ||
         (cp >= 0x2190 && cp <= 0x21FF) || cp === 0x00A9 || cp === 0x00AE ||
         (cp >= 0x1F1E6 && cp <= 0x1F1FF);
}

function label(cp) {
  if (NAMES[cp]) return NAMES[cp];
  if (SPACES[cp]) return SPACES[cp];
  if (isTag(cp)) return 'tag character';
  if (isReservedTag(cp)) return 'reserved tag character';
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 'variation selector';
  if (cp >= 0x180B && cp <= 0x180F) return 'Mongolian format character';
  if (cp >= 0x206A && cp <= 0x206F) return 'deprecated format character';
  return 'format character';
}
function hex(cp) { return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'); }

/* Emoji are built out of joiners and variation selectors on purpose.
   Stripping those breaks the emoji, so they are left alone. */
export function scan(text) {
  const chars = Array.from(text);
  const found = new Map();
  let out = '';
  let removed = 0, normalised = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cp = ch.codePointAt(0);
    const prev = i > 0 ? chars[i - 1].codePointAt(0) : 0;
    const next = i < chars.length - 1 ? chars[i + 1].codePointAt(0) : 0;

    const inEmoji = (cp === 0x200D && isEmojiish(prev) && isEmojiish(next)) ||
                    ((cp === 0xFE0E || cp === 0xFE0F) && isEmojiish(prev));

    if (!inEmoji && (STRIP.has(cp) || isTag(cp) || isReservedTag(cp))) {
      // a tag run is one hidden payload, not eighty separate findings
      const key = (isTag(cp) || isReservedTag(cp)) ? 'tags' : cp;
      const e = found.get(key) ||
        { cp: cp, name: label(cp), count: 0, kind: 'invisible', run: key === 'tags' };
      e.count++; found.set(key, e);
      removed++;
      continue;
    }
    if (SPACES[cp]) {
      const e = found.get(cp) || { cp: cp, name: label(cp), count: 0, kind: 'space' };
      e.count++; found.set(cp, e);
      normalised++;
      out += ' ';
      continue;
    }
    out += ch;
  }

  const list = Array.from(found.values()).sort(function (a, b) { return b.count - a.count; });
  return { clean: out, findings: list, removed: removed, normalised: normalised, chars: chars.length };
}

/* ------------------------------------------------------------
   A sample that actually carries the characters, built here so
   the page source stays plain ASCII.
   ------------------------------------------------------------ */
const SAMPLE =
  'Paste anything here.​ This paragraph was seeded with the characters a‍generator ' +
  'leaves behind:⁠ four zero width joiners, a byte order mark, two narrow no-break ' +
  'spaces, a soft­hyphen, and a run of tag󠁨󠁩󠁤󠁤󠁥󠁮 ' +
  'characters carrying a hidden payload.﻿ None of them are visible to you. ' +
  'All of them survive copy, paste and spellcheck.‍';

export function initStrip() {
  const root = document.getElementById('strip');
  if (!root) return;
  const input = document.getElementById('stripInput');
  const list = document.getElementById('stripFindings');
  const count = document.getElementById('stripCount');
  const verdict = document.getElementById('stripVerdict');
  const clean = document.getElementById('stripClean');
  const copy = document.getElementById('stripCopy');

  let last = null;

  function render() {
    const r = scan(input.value);
    last = r;
    const total = r.removed + r.normalised;
    count.textContent = total;
    verdict.textContent = total === 0
      ? 'nothing hidden in this text'
      : total + (total === 1 ? ' marker character' : ' marker characters') + ' in ' + r.chars + ' characters';
    verdict.classList.toggle('is-hit', total > 0);

    list.innerHTML = '';
    if (!r.findings.length) {
      const li = document.createElement('li');
      li.className = 'finding finding--none';
      li.textContent = 'Clean. No invisible or lookalike characters found.';
      list.appendChild(li);
      clean.disabled = true;
      return;
    }
    clean.disabled = false;
    r.findings.forEach(function (f) {
      const li = document.createElement('li');
      li.className = 'finding';
      li.dataset.kind = f.kind;
      li.innerHTML = '<span class="finding__cp"></span><span class="finding__name"></span><span class="finding__n"></span>';
      li.querySelector('.finding__cp').textContent = f.run ? 'U+E0001..E007F' : hex(f.cp);
      li.querySelector('.finding__name').textContent = f.run ? 'tag characters, a hidden payload' : f.name;
      li.querySelector('.finding__n').textContent = f.count === 1 ? 'once' : f.count + ' times';
      list.appendChild(li);
    });
  }

  clean.addEventListener('click', function () {
    if (!last) return;
    const n = last.removed + last.normalised;
    input.value = last.clean;
    render();
    verdict.textContent = 'stripped ' + n + (n === 1 ? ' character' : ' characters');
    verdict.classList.remove('is-hit');
  });

  copy.addEventListener('click', function () {
    navigator.clipboard.writeText(input.value).then(function () {
      copy.textContent = 'Copied';
      setTimeout(function () { copy.textContent = 'Copy the clean text'; }, 1600);
    }).catch(function () {
      copy.textContent = 'Select and copy';
      setTimeout(function () { copy.textContent = 'Copy the clean text'; }, 1600);
    });
  });

  input.addEventListener('input', render);
  input.value = SAMPLE;
  render();
}
