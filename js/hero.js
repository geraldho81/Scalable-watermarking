import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const ATLAS_SIZE = 2048;
const ATLAS_COLS = 10;
const ATLAS_ROWS = 9;
const CELL_SCALE_X = 1 / ATLAS_COLS;
const CELL_SCALE_Y = 1 / ATLAS_ROWS;
// 0 by design. Floating 3D words beside fixed 2D type collide on some
// viewport or some word length, every time. The filmstrip in the DOM carries
// the live word; the canvas is only the field of unchosen ones.
const ORANGE_COUNT = 0;
const DEFAULT_GROUND = '#F5F4F0';
const DEFAULT_DIM = '#8C8A84';
const DEFAULT_LIVE = '#1B44D8';

const WORDS = [
  'mango', 'lychee', 'papaya', 'durian', 'guava', 'mangosteen', 'rambutan', 'pineapple', 'banana', 'apple',
  'orange', 'grape', 'melon', 'kiwi', 'plum', 'cherry', 'peach', 'coconut', 'fig', 'lime',
  'the', 'a', 'of', 'and', 'but', 'because', 'however', 'slowly', 'quickly', 'bright',
  'dark', 'morning', 'evening', 'night', 'remember', 'forget', 'machine', 'letter', 'signature', 'hidden',
  'secret', 'choice', 'chosen', 'word', 'words', 'watermark', 'coin', 'tournament', 'bin', 'frame',
  'key', 'seed', 'sentence', 'sample', 'token', 'model', 'output', 'random', 'pattern', 'signal',
  'noise', 'distribution', 'probability', 'weight', 'vector', 'layer', 'network', 'text', 'language', 'human',
  'reader', 'writer', 'paper', 'ink', 'page', 'print', 'cut', 'bench', 'film', 'grain',
  'black', 'white', 'grey', 'bone', 'edge', 'light', 'shadow', 'drift', 'float', 'near'
];

const ORANGE_WORDS = ['mango', 'lychee', 'papaya', 'durian', 'guava', 'mangosteen', 'rambutan', 'pineapple'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function noop() {
  return { destroy() {}, setProgress() {} };
}

function relativeLuminance(color) {
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(color.r) + 0.7152 * lin(color.g) + 0.0722 * lin(color.b);
}

function uvOffsetForIndex(idx) {
  const col = idx % ATLAS_COLS;
  const row = Math.floor(idx / ATLAS_COLS);
  return [col * CELL_SCALE_X, 1 - (row + 1) * CELL_SCALE_Y];
}

function buildAtlasCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cellW = ATLAS_SIZE / ATLAS_COLS;
  const cellH = ATLAS_SIZE / ATLAS_ROWS;
  for (let i = 0; i < WORDS.length; i++) {
    const word = WORDS[i].toUpperCase();
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const cx = col * cellW + cellW / 2;
    const cy = row * cellH + cellH / 2;
    let fontSize = cellH * 0.42;
    ctx.font = `${fontSize}px 'Poppins', system-ui, sans-serif`;
    const width = ctx.measureText(word).width;
    const maxWidth = cellW * 0.88;
    if (width > maxWidth) {
      fontSize *= maxWidth / width;
      ctx.font = `${fontSize}px 'Poppins', system-ui, sans-serif`;
    }
    ctx.fillText(word, cx, cy);
  }
  return canvas;
}

const FIELD_VERTEX = `
#include <common>
attribute vec2 uvOffset;
attribute vec3 instColor;
attribute float instOpacity;
attribute float instScale;

uniform vec2 uCellScale;

varying vec2 vUv;
varying vec3 vColor;
varying float vOpacity;

void main() {
  vUv = uv * uCellScale + uvOffset;
  vColor = instColor;
  vOpacity = instOpacity;

  vec4 pivot = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  pivot.xyz += vec3(position.x, position.y, 0.0) * instScale;
  gl_Position = projectionMatrix * pivot;
}
`;

const FIELD_FRAGMENT = `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec3 vColor;
varying float vOpacity;

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  float a = tex.a * vOpacity;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

const GRAIN_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRAIN_HASH = `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
`;

const GRAIN_FRAGMENT_ADD = `
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;

${GRAIN_HASH}

void main() {
  float n = hash(vUv * 900.0 + uTime * 60.0);
  gl_FragColor = vec4(vec3(n), uStrength);
}
`;

const GRAIN_FRAGMENT_MULTIPLY = `
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;

${GRAIN_HASH}

void main() {
  float n = hash(vUv * 900.0 + uTime * 60.0);
  float v = 1.0 - uStrength * n;
  gl_FragColor = vec4(vec3(v), 1.0);
}
`;

export function initHero(canvas, opts = {}) {
  if (!canvas || typeof window === 'undefined') return noop();

  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    renderer = null;
  }
  if (!renderer) return noop();

  const count = window.innerWidth < 700 ? 900 : 2200;

  const css = getComputedStyle(document.documentElement);
  const pick = (k, fb) => (opts && opts[k]) || css.getPropertyValue(k).trim() || fb;

  const groundColor = new THREE.Color(pick('--ground', DEFAULT_GROUND));
  const dimColor = new THREE.Color(pick('--dim', DEFAULT_DIM));
  const liveColor = new THREE.Color(pick('--live', DEFAULT_LIVE));
  const grainModeOpt = pick('--grain-mode', '');
  const groundIsLight = relativeLuminance(groundColor) > 0.5;
  const grainMode = grainModeOpt === 'additive' || grainModeOpt === 'multiply'
    ? grainModeOpt
    : (groundIsLight ? 'multiply' : 'additive');

  const scene = new THREE.Scene();
  scene.background = groundColor.clone();
  scene.fog = new THREE.Fog(groundColor.getHex(), 28, 95);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 2.2, 3);

  const grainScene = new THREE.Scene();
  const grainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const grainMaterial = new THREE.ShaderMaterial({
    vertexShader: GRAIN_VERTEX,
    fragmentShader: grainMode === 'multiply' ? GRAIN_FRAGMENT_MULTIPLY : GRAIN_FRAGMENT_ADD,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: grainMode === 'multiply' ? 0.06 : 0.045 }
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: grainMode === 'multiply' ? THREE.MultiplyBlending : THREE.AdditiveBlending
  });
  const grainMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), grainMaterial);
  grainScene.add(grainMesh);

  renderer.setClearColor(groundColor, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.autoClear = false;

  let destroyed = false;
  let rafId = null;
  let progress = 0;
  let progressSmoothed = 0;
  let inView = true;
  let lastTime = 0;
  let resizeTimer = null;
  let io = null;
  let mesh = null;
  let atlasTexture = null;

  const posX = new Float32Array(count);
  const posY = new Float32Array(count);
  const posZ = new Float32Array(count);
  const velX = new Float32Array(count);
  const velY = new Float32Array(count);
  const velZ = new Float32Array(count);
  const baseX = new Float32Array(ORANGE_COUNT);
  const baseY = new Float32Array(ORANGE_COUNT);
  const orangeZFront = new Float32Array(ORANGE_COUNT);
  const orangePhase = new Float32Array(ORANGE_COUNT);
  const orangeFreq = new Float32Array(ORANGE_COUNT);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    if (reducedMotion) renderOnce();
  }

  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }

  function onVisibility() {
    if (!document.hidden && inView && rafId === null && !destroyed && !reducedMotion) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    }
  }

  function setupInstances() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const uvOffsetArr = new Float32Array(count * 2);
    const instColorArr = new Float32Array(count * 3);
    const instOpacityArr = new Float32Array(count);
    const instScaleArr = new Float32Array(count);

    const farColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const isOrange = i < ORANGE_COUNT;
      let wordIndex;
      if (isOrange) {
        wordIndex = WORDS.indexOf(ORANGE_WORDS[i]);
      } else {
        wordIndex = Math.floor(Math.random() * WORDS.length);
      }
      const [ox, oy] = uvOffsetForIndex(wordIndex);
      uvOffsetArr[i * 2] = ox;
      uvOffsetArr[i * 2 + 1] = oy;

      if (isOrange) {
        instColorArr[i * 3] = liveColor.r;
        instColorArr[i * 3 + 1] = liveColor.g;
        instColorArr[i * 3 + 2] = liveColor.b;
        instOpacityArr[i] = 1.0;
        // laid out on a grid, not scattered: eight competing words that
        // overlap each other stop reading as eight separate candidates
        const narrow = window.innerWidth < 760;
        const col = i % 2, row = Math.floor(i / 2);
        instScaleArr[i] = narrow ? rand(1.2, 1.6) : rand(2.5, 3.2);
        baseX[i] = narrow
          ? -5 + col * 10 + rand(-0.5, 0.5)
          : 8.5 + col * 8.0 + rand(-0.6, 0.6);
        baseY[i] = narrow
          ? -11 - row * 3.0 + rand(-0.3, 0.3)
          : 2.0 - row * 3.6 + rand(-0.35, 0.35);
        orangeZFront[i] = -17 - (i % 2) * 1.6 - rand(0, 1.2);
        orangePhase[i] = rand(0, Math.PI * 2);
        orangeFreq[i] = rand(0.25, 0.55);
        posX[i] = baseX[i] + rand(-10, 10);
        posY[i] = baseY[i];
        posZ[i] = rand(-14, -34);
      } else {
        const z = -5 - Math.pow(Math.random(), 0.42) * 85;
        const depthT = THREE.MathUtils.clamp((-z - 5) / 85, 0, 1);
        // distant words fade toward the ground colour (never toward black),
        // near words carry the full dim ink colour at high contrast
        farColor.copy(dimColor).lerp(groundColor, depthT * 0.9);
        instColorArr[i * 3] = farColor.r;
        instColorArr[i * 3 + 1] = farColor.g;
        instColorArr[i * 3 + 2] = farColor.b;
        instOpacityArr[i] = THREE.MathUtils.lerp(0.34, 0.045, depthT);
        instScaleArr[i] = rand(0.55, 1.15);
        posX[i] = rand(-30, 30);
        posY[i] = rand(-17, 17);
        posZ[i] = z;
        velX[i] = rand(-0.15, 0.15);
        velY[i] = rand(-0.08, 0.08);
        velZ[i] = rand(1.5, 3.0);
      }
    }

    geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(uvOffsetArr, 2));
    geometry.setAttribute('instColor', new THREE.InstancedBufferAttribute(instColorArr, 3));
    geometry.setAttribute('instOpacity', new THREE.InstancedBufferAttribute(instOpacityArr, 1));
    geometry.setAttribute('instScale', new THREE.InstancedBufferAttribute(instScaleArr, 1));

    const atlasCanvas = buildAtlasCanvas();
    atlasTexture = new THREE.CanvasTexture(atlasCanvas);
    atlasTexture.generateMipmaps = true;
    atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    atlasTexture.magFilter = THREE.LinearFilter;
    atlasTexture.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    atlasTexture.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
      vertexShader: FIELD_VERTEX,
      fragmentShader: FIELD_FRAGMENT,
      uniforms: {
        uAtlas: { value: atlasTexture },
        uCellScale: { value: new THREE.Vector2(CELL_SCALE_X, CELL_SCALE_Y) }
      },
      transparent: true,
      depthWrite: false,
      depthTest: true
    });

    mesh = new THREE.InstancedMesh(geometry, material, count);
    const mArr = mesh.instanceMatrix.array;
    for (let i = 0; i < count; i++) {
      const base = i * 16;
      mArr[base] = 1;
      mArr[base + 5] = 1;
      mArr[base + 10] = 1;
      mArr[base + 15] = 1;
      mArr[base + 12] = posX[i];
      mArr[base + 13] = posY[i];
      mArr[base + 14] = posZ[i];
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  function update(dt, t) {
    progressSmoothed += (progress - progressSmoothed) * Math.min(1, dt * 3);

    const camY = THREE.MathUtils.lerp(2.2, -0.8, progressSmoothed) + Math.sin(t * 0.12) * 0.15;
    const camZ = THREE.MathUtils.lerp(3, -20, progressSmoothed);
    const camX = Math.sin(t * 0.05) * 1.2;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, THREE.MathUtils.lerp(-2, -6, progressSmoothed), camZ - 40);

    const swayX = Math.sin(t * 0.05) * 3;
    const mArr = mesh.instanceMatrix.array;

    for (let i = ORANGE_COUNT; i < count; i++) {
      let x = posX[i] + velX[i] * dt;
      let y = posY[i] + velY[i] * dt;
      let z = posZ[i] + velZ[i] * dt;
      if (z > 8) {
        z -= 95;
        x = rand(-30, 30);
        y = rand(-17, 17);
      }
      if (x > 32) x -= 64;
      else if (x < -32) x += 64;
      if (y > 19) y -= 38;
      else if (y < -19) y += 38;
      posX[i] = x;
      posY[i] = y;
      posZ[i] = z;
      const base = i * 16;
      mArr[base + 12] = x + swayX;
      mArr[base + 13] = y;
      mArr[base + 14] = z;
    }

    for (let i = 0; i < ORANGE_COUNT; i++) {
      posZ[i] += (orangeZFront[i] - posZ[i]) * Math.min(1, dt * 0.6);
      const bob = Math.sin(t * orangeFreq[i] + orangePhase[i]) * 0.55;
      const railPull = Math.min(1, THREE.MathUtils.clamp(t * 0.04, 0, 0.4) + progressSmoothed * 0.7);
      const targetY = THREE.MathUtils.lerp(baseY[i], -6, railPull);
      posY[i] = targetY + bob;
      posX[i] = baseX[i] + Math.sin(t * 0.15 + orangePhase[i]) * 1.4 + swayX * 0.4;
      const base = i * 16;
      mArr[base + 12] = posX[i];
      mArr[base + 13] = posY[i];
      mArr[base + 14] = posZ[i];
    }

    mesh.instanceMatrix.needsUpdate = true;
  }

  function render(t) {
    renderer.clear();
    renderer.render(scene, camera);
    grainMaterial.uniforms.uTime.value = t;
    renderer.render(grainScene, grainCamera);
  }

  function animate(now) {
    if (destroyed) return;
    if (document.hidden || !inView) {
      rafId = null;
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    update(dt, now / 1000);
    render(now / 1000);
    rafId = requestAnimationFrame(animate);
  }

  function renderOnce() {
    if (!mesh) return;
    camera.position.set(0, 1.3, 4);
    camera.lookAt(0, -3, -40);
    render(0);
  }

  async function start() {
    resize();
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (e) {
      // ignore font loading failures, fall back stack still applies
    }
    if (destroyed) return;
    setupInstances();

    if (reducedMotion) {
      renderOnce();
      return;
    }

    io = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView && !document.hidden && rafId === null && !destroyed) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(animate);
      }
    }, { threshold: 0 });
    io.observe(canvas);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);

    lastTime = performance.now();
    rafId = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', onResize);
  start();

  return {
    setProgress(p) {
      if (destroyed) return;
      progress = THREE.MathUtils.clamp(p, 0, 1);
      if (reducedMotion) renderOnce();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      if (atlasTexture) atlasTexture.dispose();
      grainScene.remove(grainMesh);
      grainMesh.geometry.dispose();
      grainMesh.material.dispose();
      renderer.dispose();
    }
  };
}
