/** A small, self-contained WebGL scene. Loaded only when the command core is near view. */
const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec4 aColor;
attribute float aGlow;
uniform mat4 uProjection;
uniform mat4 uModel;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 vColor;
varying float vGlow;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vNormal = mat3(uModel) * aNormal;
  vPosition = world.xyz;
  vColor = aColor;
  vGlow = aGlow;
  gl_Position = uProjection * vec4(world.xyz + vec3(0.0, -0.02, -5.5), 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 vColor;
varying float vGlow;
void main() {
  vec3 normal = normalize(vNormal);
  float key = max(dot(normal, normalize(vec3(-0.7, 0.9, 1.3))), 0.0);
  float violet = max(dot(normal, normalize(vec3(1.0, 0.2, -0.9))), 0.0);
  float rim = pow(1.0 - max(dot(normal, normalize(vec3(0.0, 0.0, 5.5) - vPosition)), 0.0), 3.0);
  vec3 lit = vColor.rgb * (0.28 + key * 0.94);
  lit += vec3(0.20, 0.055, 0.35) * violet + vec3(0.48, 0.18, 0.07) * rim;
  gl_FragColor = vec4(mix(lit, vColor.rgb * 1.18, vGlow), vColor.a);
}`;

const TAU = Math.PI * 2;
const amber = [1, 0.36, 0.075, 1];
const violet = [0.40, 0.18, 0.67, 1];
const gold = [1, 0.72, 0.29, 1];
const cream = [1, 0.86, 0.58, 1];

function normalOf(a, b, c) {
  const u = b.map((value, i) => value - a[i]);
  const v = c.map((value, i) => value - a[i]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(...n) || 1;
  return n.map(value => value / length);
}

function makeScene() {
  const solid = [];
  const glow = [];
  function triangle(a, b, c, color, emission = 0, target = solid) {
    const normal = normalOf(a, b, c);
    for (const position of [a, b, c]) target.push(...position, ...normal, ...color, emission);
  }
  function quad(a, b, c, d, color, emission = 0, target = solid) {
    triangle(a, b, c, color, emission, target);
    triangle(a, c, d, color, emission, target);
  }
  // Hand-built, flat-shaded lobes. Alternating rib depths catch the key light.
  const rings = 10;
  const sides = 24;
  function point(ring, side) {
    const latitude = Math.PI * ring / rings;
    const angle = TAU * side / sides;
    const rib = 1 + 0.09 * Math.cos(angle * 8);
    const radius = Math.sin(latitude) * 1.15 * rib;
    return [Math.cos(angle) * radius, Math.cos(latitude) * 0.96, Math.sin(angle) * radius];
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < sides; i++) {
      const shadowRib = i % 3 === 1;
      const shade = 0.73 + (j % 3) * 0.10;
      const color = shadowRib ? [0.48, 0.16, 0.10, 1] : [amber[0] * shade, amber[1] * shade, amber[2] * shade, 1];
      const a = point(j, i), b = point(j + 1, i), c = point(j + 1, i + 1), d = point(j, i + 1);
      quad(a, d, c, b, color);
    }
  }
  // Violet inset cap and an open crown with five sharp, asymmetrical tips.
  const crownCount = 10;
  for (let i = 0; i < crownCount; i++) {
    const a = TAU * i / crownCount;
    const b = TAU * (i + 1) / crownCount;
    const tip = i % 2 === 0 ? 1.70 : 1.25;
    const nextTip = (i + 1) % 2 === 0 ? 1.70 : 1.25;
    const lowerA = [Math.cos(a) * 0.42, 0.86, Math.sin(a) * 0.42];
    const lowerB = [Math.cos(b) * 0.42, 0.86, Math.sin(b) * 0.42];
    const upperA = [Math.cos(a) * 0.53, tip, Math.sin(a) * 0.53];
    const upperB = [Math.cos(b) * 0.53, nextTip, Math.sin(b) * 0.53];
    quad(lowerA, upperA, upperB, lowerB, i % 2 ? violet : [0.66, 0.32, 0.80, 1]);
    // A narrow golden lower band makes the crown readable against the body.
    quad(lowerA, [lowerA[0], 0.96, lowerA[2]], [lowerB[0], 0.96, lowerB[2]], lowerB, gold, 0.35);
  }
  // Raised, beveled command plate; its forward face is a dark violet hexagon.
  const plate = [[-0.64, 0.19], [-0.43, 0.49], [0.43, 0.49], [0.64, 0.19], [0.43, -0.46], [-0.43, -0.46]];
  for (let i = 0; i < plate.length; i++) {
    const p = plate[i], q = plate[(i + 1) % plate.length];
    triangle([0, 0, 1.31], [...q, 1.31], [...p, 1.31], [0.095, 0.055, 0.17, 1]);
    quad([...p, 1.31], [p[0] * 1.08, p[1] * 1.08, 1.26], [q[0] * 1.08, q[1] * 1.08, 1.26], [...q, 1.31], gold, 0.35);
  }
  function stroke(points, width, color, z = 1.325, emission = 1) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const x = (b[1] - a[1]) / length * width / 2;
      const y = -(b[0] - a[0]) / length * width / 2;
      quad([a[0] + x, a[1] + y, z], [a[0] - x, a[1] - y, z], [b[0] - x, b[1] - y, z], [b[0] + x, b[1] + y, z], color, emission);
    }
  }
  stroke([[-0.24, 0.21], [-0.43, 0.025], [-0.24, -0.16]], 0.055, cream);
  stroke([[0.24, 0.21], [0.43, 0.025], [0.24, -0.16]], 0.055, cream);
  stroke([[0.095, 0.26], [-0.095, -0.22]], 0.055, amber);
  // Orbit rings are actual tilted geometry, with depth occlusion behind the core.
  function ring(radius, width, height, tilt, color, start = 0, end = TAU) {
    const segments = Math.ceil((end - start) * 22);
    function p(angle, r) {
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      return [x, height + z * Math.sin(tilt), z * Math.cos(tilt)];
    }
    for (let i = 0; i < segments; i++) {
      const a = start + (end - start) * i / segments;
      const b = start + (end - start) * (i + 1) / segments;
      quad(p(a, radius - width), p(a, radius + width), p(b, radius + width), p(b, radius - width), color, 1, glow);
    }
  }
  ring(1.78, 0.009, -0.16, 0.42, [0.98, 0.49, 0.15, 0.65]);
  ring(1.85, 0.0035, -0.16, 0.42, [0.76, 0.39, 1, 0.4]);
  ring(1.62, 0.024, -0.15, 0.42, [1, 0.66, 0.28, 0.9], 3.55, 4.75);
  ring(1.40, 0.009, -1.32, 0, [0.65, 0.28, 0.94, 0.65]);
  ring(1.13, 0.016, -1.32, 0, [0.85, 0.37, 1, 0.3]);
  // Satellite crystals echo the crown facets without borrowing any brand asset.
  for (let i = 0; i < 7; i++) {
    const angle = i * TAU / 7 + 0.15;
    const x = Math.cos(angle) * (1.68 + i % 2 * 0.2);
    const y = Math.sin(angle) * 1.10 + 0.05;
    const z = Math.sin(angle * 2) * 0.45;
    const size = i % 3 === 0 ? 0.13 : 0.075;
    const center = [[x - size, y, z], [x, y, z + size], [x + size, y, z], [x, y, z - size]];
    for (let j = 0; j < 4; j++) {
      triangle([x, y + size * 1.9, z], center[j], center[(j + 1) % 4], i % 2 ? violet : gold, 0.18);
      triangle([x, y - size * 1.9, z], center[(j + 1) % 4], center[j], i % 2 ? violet : amber, 0.18);
    }
  }
  return { solid: new Float32Array(solid), glow: new Float32Array(glow) };
}

function modelMatrix(x, y, lift) {
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y);
  return new Float32Array([cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, lift, 0, 1]);
}

/** Mount once per host. destroy() is safe to call repeatedly. */
export function mountCore(host) {
  if (!host || !host.appendChild) return { destroy() {}, setProgress() {} };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return { destroy() {}, setProgress() {} };
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'command-core-canvas';
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: '0' });
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power', premultipliedAlpha: false });
  if (!gl) return { destroy() {}, setProgress() {} };
  let program;
  const shaders = [], buffers = [];
  let destroyed = false, failed = false, frame = 0, visible = true, lastFrame = -Infinity, elapsed = 0, progress = 0;
  let resizeObserver, intersectionObserver;
  const fallback = host.querySelector('.core-fallback');
  const previousFallbackVisibility = fallback?.style.visibility || '';
  function restoreFallback() {
    if (fallback) fallback.style.visibility = previousFallbackVisibility;
    canvas.style.opacity = '0';
    delete host.dataset.coreReady;
  }
  function release() {
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const shader of shaders) gl.deleteShader(shader);
    if (program) gl.deleteProgram(program);
  }
  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader unavailable');
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
    return shader;
  }
  let locations, meshes;
  try {
    program = gl.createProgram();
    if (!program) throw new Error('Program unavailable');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed');
    locations = {
      position: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal'),
      color: gl.getAttribLocation(program, 'aColor'), glow: gl.getAttribLocation(program, 'aGlow'),
      projection: gl.getUniformLocation(program, 'uProjection'), model: gl.getUniformLocation(program, 'uModel'),
    };
    meshes = Object.values(makeScene()).map(data => {
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('Buffer unavailable');
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { buffer, count: data.length / 11 };
    });
  } catch {
    release();
    return { destroy() {}, setProgress() {} };
  }
  function resize() {
    if (destroyed || failed) return;
    const rect = host.getBoundingClientRect();
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }
  function draw() {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    const aspect = canvas.width / canvas.height;
    const f = 1 / Math.tan(42 * Math.PI / 360);
    // Expand the field of view on narrow hosts so satellites remain within frame.
    const fitted = Math.min(1, aspect / 1.05);
    gl.uniformMatrix4fv(locations.projection, false, new Float32Array([f / aspect * fitted, 0, 0, 0, 0, f * fitted, 0, 0, 0, 0, -1.004, -1, 0, 0, -0.2004, 0]));
    gl.uniformMatrix4fv(locations.model, false, modelMatrix(0.10 + progress * 0.18 + Math.sin(elapsed * 0.23) * 0.035, -0.19 + Math.sin(elapsed * 0.21) * 0.21 + progress * 0.9, Math.sin(elapsed * 0.74) * 0.055 + progress * 0.1));
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (let index = 0; index < meshes.length; index++) {
      const mesh = meshes[index];
      gl.depthMask(index === 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      for (const [location, size, offset] of [[locations.position, 3, 0], [locations.normal, 3, 12], [locations.color, 4, 24], [locations.glow, 1, 40]]) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 44, offset);
      }
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
    gl.depthMask(true);
  }
  function canRun() { return !destroyed && !failed && visible && !document.hidden && !reducedMotion.matches; }
  function tick(timestamp) {
    frame = 0;
    if (!canRun()) return;
    if (timestamp - lastFrame >= 32) {
      elapsed += Number.isFinite(lastFrame) ? Math.min((timestamp - lastFrame) / 1000, 0.1) : 0;
      lastFrame = timestamp;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = -Infinity;
    if (reducedMotion.matches) restoreFallback();
    else if (!failed && !destroyed) {
      canvas.style.opacity = '1';
      if (fallback) fallback.style.visibility = 'hidden';
      host.dataset.coreReady = 'true';
    }
    if (canRun()) frame = requestAnimationFrame(tick);
  }
  function contextLost(event) {
    event.preventDefault();
    failed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    restoreFallback();
  }
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  window.addEventListener('resize', resize, { passive: true });
  host.appendChild(canvas);
  resize();
  try {
    draw();
    if (gl.isContextLost()) throw new Error('Context lost');
    sync();
  } catch {
    failed = true;
    restoreFallback();
  }
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  }
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { rootMargin: '40px' });
    intersectionObserver.observe(host);
  }
  return {
    setProgress(value) { progress = Math.min(1, Math.max(0, Number(value) || 0)); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      reducedMotion.removeEventListener('change', sync);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', contextLost);
      restoreFallback();
      release();
      canvas.remove();
    },
  };
}
