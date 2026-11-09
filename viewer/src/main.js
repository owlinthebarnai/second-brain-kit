import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { marked } from 'marked';
import { buildBrain, isIncluded, TYPES } from './parse.js';
import { layoutBrain, brainShell } from './layout.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LINK_COLORS = { structure: '#3d82e0', reference: '#9b7bff', governs: '#ff7aa8', import: '#ffd166' };
const LINK_NAMES = { structure: 'contains', reference: 'mentions', governs: 'rule applies to', import: 'imports' };

// ---------- Three.js scene ----------
const canvas = $('#gl');
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// The composer's render targets are linear, so pass the background already converted.
renderer.setClearColor(new THREE.Color(0x04070f).convertSRGBToLinear(), 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
camera.position.set(3.0, 0.75, 1.25);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 9;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;
controls.enablePan = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.42, 0.22);
const bloomParam = new URLSearchParams(location.search).get('bloom');
if (bloomParam !== null) bloom.strength = Number(bloomParam);
if (bloom.strength > 0) composer.addPass(bloom);
composer.addPass(new OutputPass());

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const GLOW = glowTexture();

// Brain silhouette: a cloud of faint neurons on a folded surface.
const shellGeo = new THREE.BufferGeometry();
shellGeo.setAttribute('position', new THREE.BufferAttribute(brainShell(11000), 3));
const shellMat = new THREE.PointsMaterial({ size: 0.019, map: GLOW, color: 0x3d82e0, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
const shell = new THREE.Points(shellGeo, shellMat);
scene.add(shell);

// ---------- State ----------
let brain = null;
let byId = new Map();
let pos = new Map();
let graph = null; // THREE.Group for nodes, edges, pulses
let sprites = [];
let spriteById = new Map();
let edgeGeo = null;
let edgeInfo = []; // { link, start, count, color }
let neighbors = new Map();
let pulses = [];
let pulseGeo = null;
let selected = null;
let hovered = null;
let hiddenTypes = new Set();
let matchSet = null;
let labels = new Map();
let treeItems = new Map();
let flyTarget = null;
let flyDist = null;
let idleTimer = null;

function nodeSize(n) {
  if (n.type === 'core') return 0.26;
  if (n.hub) return 0.13;
  if (n.type === 'skill') return 0.11;
  if (n.type === 'focus') return 0.12;
  return 0.06 + Math.min(0.045, n.words / 6000) + Math.min(0.025, n.degree * 0.003);
}

function curvePoints(a, b, segs) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const ctrl = mid.clone().multiplyScalar(0.55);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, u = 1 - t;
    pts.push(new THREE.Vector3(
      u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
      u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
      u * u * a.z + 2 * u * t * ctrl.z + t * t * b.z,
    ));
  }
  return pts;
}

function disposeGraph() {
  if (!graph) return;
  graph.traverse((o) => { o.geometry?.dispose(); if (o.material && o.material !== shellMat) o.material.dispose(); });
  scene.remove(graph);
  graph = null;
  $('#labels').innerHTML = '';
  labels.clear();
}

function loadBrain(b, keep = false) {
  const prev = keep && brain ? {
    selected, hidden: hiddenTypes, query: $('#search').value, scroll: $('#reader').scrollTop,
    texts: new Map(brain.nodes.map((n) => [n.id, n.text])),
  } : null;
  disposeGraph();
  brain = b;
  byId = new Map(b.nodes.map((n) => [n.id, n]));
  const layout = layoutBrain(b);
  pos = new Map([...layout].map(([id, p]) => [id, new THREE.Vector3(...p)]));
  selected = null; hovered = null; matchSet = null; hiddenTypes = new Set();
  if (!prev) {
    $('#search').value = '';
    $('#reader').hidden = true;
    document.body.classList.remove('reading');
  }

  graph = new THREE.Group();
  scene.add(graph);

  neighbors = new Map(b.nodes.map((n) => [n.id, new Set()]));
  for (const l of b.links) { neighbors.get(l.source).add(l.target); neighbors.get(l.target).add(l.source); }

  // Edges as curved, glowing line segments.
  const SEGS = 18;
  const positions = [];
  edgeInfo = [];
  for (const l of b.links) {
    const pts = curvePoints(pos.get(l.source), pos.get(l.target), SEGS);
    const start = positions.length / 3;
    for (let i = 0; i < SEGS; i++) positions.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    edgeInfo.push({ link: l, start, count: SEGS * 2, color: new THREE.Color(LINK_COLORS[l.kind] || '#3d82e0'), pts });
  }
  edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  graph.add(edges);

  // Nodes as glowing sprites.
  sprites = [];
  spriteById = new Map();
  for (const n of b.nodes) {
    const mat = new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(TYPES[n.type]?.color || '#8fd8ff').multiplyScalar(n.type === 'core' ? 0.85 : 0.75), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos.get(n.id));
    const size = nodeSize(n);
    s.scale.setScalar(size);
    s.userData = { id: n.id, size };
    graph.add(s);
    sprites.push(s);
    spriteById.set(n.id, s);

    const el = document.createElement('div');
    el.className = 'lbl' + (n.type === 'core' ? ' core' : n.hub ? ' hub' : '');
    el.textContent = n.hub ? n.name : n.type === 'core' ? 'CLAUDE.md' : n.path.split('/').pop().replace(/\.md$/i, '') === 'SKILL' ? n.path.split('/')[2] : n.name.length > 34 ? n.name.slice(0, 32) + '…' : n.name;
    el.style.opacity = 0;
    $('#labels').appendChild(el);
    labels.set(n.id, el);
  }

  // Impulses travelling along the links.
  const P = Math.min(220, 40 + b.links.length * 2);
  pulses = Array.from({ length: P }, () => newPulse());
  pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(P * 3), 3));
  pulseGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(P * 3), 3));
  graph.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: 0.045, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  buildFilters();
  buildTree();
  buildChecks();
  const core = byId.get('CLAUDE.md');
  $('#brain-name').textContent = b.name;
  $('#stats').textContent = `${b.nodes.filter((n) => !n.hub).length} files · ${b.links.length} links${core ? ` · CLAUDE.md ${core.lines} lines` : ''}`;
  document.title = `${b.name} · Second Brain Viewer`;
  $('#loading').hidden = true;

  if (prev) {
    // Live update: keep filters, search, the open file and the camera; flash what changed.
    hiddenTypes = prev.hidden;
    for (const c of $('#filters').querySelectorAll('.chip')) c.classList.toggle('off', hiddenTypes.has(c.dataset.type));
    applySearch(prev.query);
    flashUntil = new Map();
    const now = clock.elapsedTime;
    for (const n of b.nodes) if (!n.hub && prev.texts.get(n.id) !== n.text) flashUntil.set(n.id, now + 2.5);
    if (prev.selected && byId.has(prev.selected)) {
      selected = prev.selected;
      openReader(byId.get(selected));
      $('#reader').scrollTop = prev.scroll;
    } else if (prev.selected) {
      $('#reader').hidden = true;
      document.body.classList.remove('reading');
    }
    pulses = pulses.map(() => newPulse());
    refresh();
    return;
  }
  refresh();
  flyTarget = new THREE.Vector3(0, 0, 0);
  flyDist = 3.35;
  controls.autoRotate = true;
}

// ---------- Live mode (served by scripts/live.mjs) ----------
let live = null;
let flashUntil = new Map();
function startLive() {
  if (live || !brain?.live) return;
  let last = brain.live.version;
  live = new EventSource('./events');
  $('#live').hidden = false;
  $('#live').title = `Updates as files change in ${brain.live.folder}`;
  live.onopen = () => $('#live').classList.remove('off');
  live.onerror = () => $('#live').classList.add('off');
  live.onmessage = async (e) => {
    const v = Number(e.data);
    if (v === last) return;
    last = v;
    try { loadBrain(await loadJson('./brain.json'), true); } catch { /* next change will retry */ }
  };
}
function stopLive() {
  live?.close();
  live = null;
  $('#live').hidden = true;
}

function visibleNode(id) {
  const n = byId.get(id);
  return n && !hiddenTypes.has(n.type);
}

function newPulse() {
  if (!brain || !edgeInfo.length) return { e: null, t: 0, v: 0 };
  let pool = edgeInfo.filter((e) => visibleNode(e.link.source) && visibleNode(e.link.target));
  if (selected) {
    const near = pool.filter((e) => e.link.source === selected || e.link.target === selected);
    if (near.length && Math.random() < 0.8) pool = near;
  }
  const e = pool[Math.floor(Math.random() * pool.length)] || null;
  const forward = Math.random() < 0.5;
  return { e, t: Math.random() * 0.3, v: 0.25 + Math.random() * 0.45, forward };
}

// Recolour edges and nodes for the current selection, filters and search.
function refresh() {
  if (!brain) return;
  const focus = selected ? new Set([selected, ...neighbors.get(selected)]) : null;
  const col = edgeGeo.getAttribute('color');
  for (const e of edgeInfo) {
    const { source, target } = e.link;
    let k = 0.32;
    if (!visibleNode(source) || !visibleNode(target)) k = 0;
    else if (selected) k = source === selected || target === selected ? 1.1 : 0.04;
    else if (matchSet) k = matchSet.has(source) && matchSet.has(target) ? 0.8 : 0.05;
    for (let i = 0; i < e.count; i++) col.setXYZ(e.start + i, e.color.r * k, e.color.g * k, e.color.b * k);
  }
  col.needsUpdate = true;

  for (const s of sprites) {
    const id = s.userData.id;
    let o = 1;
    if (!visibleNode(id)) o = 0;
    else if (focus) o = focus.has(id) ? 1 : 0.12;
    else if (matchSet) o = matchSet.has(id) ? 1 : 0.1;
    s.material.opacity = o;
    s.visible = o > 0;
    const scale = s.userData.size * (id === selected ? 1.6 : id === hovered ? 1.35 : 1);
    s.scale.setScalar(scale);
  }

  for (const [id, el] of treeItems) {
    el.classList.toggle('active', id === selected);
    el.classList.toggle('dim', (!!matchSet && !matchSet.has(id)) || !visibleNode(id));
  }
}

function labelVisible(n) {
  if (!visibleNode(n.id)) return false;
  if (n.id === selected || n.id === hovered) return true;
  if (selected) return neighbors.get(selected).has(n.id);
  if (matchSet) return matchSet.has(n.id) && matchSet.size <= 30;
  return n.type === 'core' || n.hub || n.type === 'skill' || n.type === 'focus';
}

const tmp = new THREE.Vector3();
function updateLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  for (const n of brain.nodes) {
    const el = labels.get(n.id);
    if (!labelVisible(n)) { if (el.style.opacity !== '0') el.style.opacity = 0; continue; }
    tmp.copy(pos.get(n.id)).project(camera);
    if (tmp.z > 1) { el.style.opacity = 0; continue; }
    el.style.left = `${((tmp.x + 1) / 2) * w}px`;
    el.style.top = `${((1 - tmp.y) / 2) * h}px`;
    const depth = camera.position.distanceTo(pos.get(n.id));
    el.style.opacity = Math.max(0.35, Math.min(1, 3.2 / depth - 0.2));
  }
}

// ---------- Interaction ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

function pick(ev) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(sprites.filter((s) => s.visible && s.material.opacity > 0.5), false);
  return hits.length ? hits[0].object.userData.id : null;
}

canvas.addEventListener('pointermove', (ev) => {
  if (!brain) return;
  const id = pick(ev);
  if (id !== hovered) { hovered = id; refresh(); }
  canvas.classList.toggle('pointer', !!id);
  const tip = $('#tooltip');
  if (id) {
    const n = byId.get(id);
    tip.innerHTML = `${esc(n.name)}<span class="mono muted">${esc(n.path)} · ${esc(TYPES[n.type]?.label || n.type)}</span>`;
    const r = stage.getBoundingClientRect();
    tip.style.left = `${ev.clientX - r.left + 14}px`;
    tip.style.top = `${ev.clientY - r.top + 14}px`;
    tip.hidden = false;
  } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { $('#tooltip').hidden = true; hovered = null; refresh(); });
canvas.addEventListener('pointerdown', (ev) => { downAt = [ev.clientX, ev.clientY]; });
canvas.addEventListener('pointerup', (ev) => {
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
  const id = pick(ev);
  if (id) select(id); else deselect();
});
controls.addEventListener('start', () => {
  flyTarget = null;
  controls.autoRotate = false;
  clearTimeout(idleTimer);
});
controls.addEventListener('end', () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!selected) controls.autoRotate = true; }, 9000);
});
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') deselect();
  if (ev.key === '/' && document.activeElement !== $('#search')) { ev.preventDefault(); $('#search').focus(); }
});

function select(id) {
  if (!byId.has(id)) return;
  selected = id;
  controls.autoRotate = false;
  flyTarget = pos.get(id).clone();
  flyDist = byId.get(id).type === 'core' ? 2.6 : 1.7;
  pulses = pulses.map(() => newPulse());
  openReader(byId.get(id));
  refresh();
  treeItems.get(id)?.scrollIntoView({ block: 'nearest' });
}

function deselect() {
  if (!selected && $('#reader').hidden) return;
  selected = null;
  $('#reader').hidden = true;
  document.body.classList.remove('reading');
  flyTarget = new THREE.Vector3(0, 0, 0);
  flyDist = 3.35;
  refresh();
}

// ---------- Reader panel ----------
marked.use({ gfm: true, breaks: true, renderer: { html: (token) => esc(token.text ?? token.raw ?? '') } });

function resolveRef(token, from) {
  let t = token.trim().replace(/^@/, '').replace(/^\.\//, '').replace(/[`*]/g, '');
  if (!t) return null;
  if (byId.has(t)) return t;
  if (/\/$/.test(t) && byId.has('dir:' + t.slice(0, -1))) return 'dir:' + t.slice(0, -1);
  if (byId.has('dir:' + t)) return 'dir:' + t;
  if (!/\.md$/i.test(t) && byId.has(t + '.md')) return t + '.md';
  const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '';
  if (byId.has(dir + t)) return dir + t;
  const baseName = t.split('/').pop().toLowerCase();
  const c = brain.nodes.filter((n) => !n.hub && n.path.split('/').pop().toLowerCase() === baseName);
  if (c.length === 1 && (!t.includes('/') || c[0].path.endsWith(t))) return c[0].id;
  return null;
}

function openReader(n) {
  const t = TYPES[n.type] || { label: n.type, color: '#fff' };
  $('#r-type').textContent = t.label;
  $('#r-type').style.color = t.color;
  $('#r-title').textContent = n.name;
  $('#r-path').textContent = n.path;
  $('#r-meta').textContent = n.hub ? `${[...neighbors.get(n.id)].length} connections` : `${n.lines} lines · ${n.words} words · ${neighbors.get(n.id).size} connections`;

  const out = [], inc = [];
  for (const l of brain.links) {
    if (l.source === n.id) out.push([l.target, l.kind]);
    else if (l.target === n.id) inc.push([l.source, l.kind]);
  }
  const chip = ([id, kind]) => `<button class="linkchip" data-id="${esc(id)}" title="${esc(LINK_NAMES[kind] || kind)}" style="border-left:3px solid ${LINK_COLORS[kind]}">${esc(byId.get(id).hub ? byId.get(id).name : byId.get(id).path.split('/').pop())}</button>`;
  $('#r-links').innerHTML =
    (out.length ? `<div class="group">Links to</div>${out.map(chip).join('')}` : '') +
    (inc.length ? `<div class="group">Linked from</div>${inc.map(chip).join('')}` : '');

  let body = n.text || '';
  let fm = '';
  const m = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    body = body.slice(m[0].length);
    fm = n.applies?.length ? `<div class="frontmatter">Loads only when Claude works in: ${n.applies.map(esc).join(', ')}</div>` : `<div class="frontmatter">${m[1].split('\n').map((l) => esc(l).replace(/^([\w-]+):/, '<b>$1:</b>')).join('<br>')}</div>`;
  }
  body = body.replace(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g, '`$1`');
  const comments = [];
  body = body.replace(/<!--([\s\S]*?)-->/g, (_, c) => { comments.push(c.trim()); return ''; });
  let html;
  if (n.hub) {
    const kids = [...neighbors.get(n.id)].map((id) => byId.get(id)).filter((k) => k.region === n.region && !k.hub);
    html = `<p class="empty">Folder with ${kids.length} file${kids.length === 1 ? '' : 's'}. Pick one below.</p><ul>${kids.map((k) => `<li><code>${esc(k.path)}</code> ${esc(k.name)}</li>`).join('')}</ul>`;
  } else if (n.missing) html = '<p class="empty">This skill group has playbooks but no SKILL.md entry file.</p>';
  else html = body.trim() ? marked.parse(body) : '<p class="empty">Empty file.</p>';
  $('#r-body').innerHTML = fm + comments.map((c) => `<p class="comment">${esc(c)}</p>`).join('') + html;
  for (const code of $('#r-body').querySelectorAll('code')) {
    const id = resolveRef(code.textContent, n.path);
    if (id && id !== n.id) { code.classList.add('ref'); code.dataset.id = id; }
  }
  $('#reader').hidden = false;
  $('#reader').scrollTop = 0;
  document.body.classList.add('reading');
}

$('#reader').addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-id]');
  if (el) select(el.dataset.id);
});
$('#r-close').addEventListener('click', deselect);

// ---------- Left panel: filters, tree, health ----------
function buildFilters() {
  const counts = {};
  for (const n of brain.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
  $('#filters').innerHTML = Object.entries(TYPES)
    .filter(([k]) => counts[k])
    .map(([k, t]) => `<button class="chip" data-type="${k}"><i style="color:${t.color};background:${t.color}"></i>${t.label}<b>${counts[k]}</b></button>`)
    .join('');
}
$('#filters').addEventListener('click', (ev) => {
  const b = ev.target.closest('.chip');
  if (!b) return;
  const t = b.dataset.type;
  if (hiddenTypes.has(t)) hiddenTypes.delete(t); else hiddenTypes.add(t);
  b.classList.toggle('off', hiddenTypes.has(t));
  if (selected && hiddenTypes.has(byId.get(selected).type)) deselect();
  refresh();
});

function buildTree() {
  treeItems = new Map();
  const files = brain.nodes.filter((n) => !n.hub && !n.missing);
  const fileEl = (n, top = false) => {
    const label = n.path.split('/').pop();
    return `<div class="file${top ? ' top' : ''}" data-id="${esc(n.id)}" title="${esc(n.path)}"><i style="background:${TYPES[n.type]?.color}"></i>${esc(label)}</div>`;
  };
  const groups = new Map();
  for (const n of files) {
    if (n.type === 'core' || n.region === '(root)') continue;
    let g = n.region;
    if (g === '.claude/skills') g = '.claude/skills/' + n.path.split('/')[2];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(n);
  }
  const sortFiles = (a, b) => (a.type === 'skill' ? -1 : b.type === 'skill' ? 1 : 0) || (a.type === 'template') - (b.type === 'template') || a.path.localeCompare(b.path);
  const keys = [...groups.keys()].sort((a, b) => (a.startsWith('.claude') - b.startsWith('.claude')) || a.localeCompare(b));
  let html = '';
  const core = files.find((n) => n.type === 'core');
  if (core) html += fileEl(core, true);
  for (const n of files.filter((f) => f.region === '(root)').sort(sortFiles)) html += fileEl(n, true);
  for (const k of keys) {
    const name = k.startsWith('.claude/skills/') ? `skill: ${k.split('/')[2]}` : k === '.claude/rules' ? 'rules' : k + '/';
    html += `<details open><summary>${esc(name)} <span class="muted">${groups.get(k).length}</span></summary>${groups.get(k).sort(sortFiles).map((n) => fileEl(n)).join('')}</details>`;
  }
  $('#tree').innerHTML = html;
  for (const el of $('#tree').querySelectorAll('.file')) treeItems.set(el.dataset.id, el);
}
$('#tree').addEventListener('click', (ev) => {
  const el = ev.target.closest('.file');
  if (el) select(el.dataset.id);
});

function buildChecks() {
  const icon = { pass: '✓', warn: '!', fail: '✕' };
  $('#checks').innerHTML = brain.checks
    .map((c, i) => `<li class="${c.status}" data-i="${i}" ${c.files?.length ? 'style="cursor:pointer"' : ''}><span class="st">${icon[c.status]}</span><span>${esc(c.label)}<small>${esc(c.detail)}</small></span></li>`)
    .join('');
  const bad = brain.checks.filter((c) => c.status !== 'pass').length;
  $('#health summary').textContent = bad ? `Health check · ${bad} to look at` : 'Health check · all good';
}
$('#checks').addEventListener('click', (ev) => {
  const li = ev.target.closest('li');
  const c = li && brain.checks[li.dataset.i];
  if (c?.files?.length && byId.has(c.files[0])) select(c.files[0]);
});

function applySearch(value) {
  const q = (value || '').trim().toLowerCase();
  matchSet = q ? new Set(brain.nodes.filter((n) => (n.path + ' ' + n.name + ' ' + n.text).toLowerCase().includes(q)).map((n) => n.id)) : null;
}
let searchTimer;
$('#search').addEventListener('input', (ev) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    applySearch(ev.target.value);
    if (matchSet && selected) deselect();
    refresh();
  }, 120);
});

// ---------- Loading brains ----------
async function loadJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error(url);
  return r.json();
}

async function boot() {
  const want = new URLSearchParams(location.search).get('brain');
  const tries = want === 'example' ? ['./example.json'] : want ? [want] : ['./brain.json', './brain.local.json', './example.json'];
  for (const url of tries) {
    try { loadBrain(await loadJson(url)); startLive(); return; } catch { /* try next */ }
  }
  $('#loading').textContent = 'No brain found. Use "Open folder" to load yours.';
}

function fromFiles(list) {
  const b = buildBrain(list);
  if (!b.nodes.length) { alert('No markdown files found in that folder.'); return; }
  stopLive();
  loadBrain(b);
}

$('#folder-input').addEventListener('change', async (ev) => {
  const files = [...ev.target.files];
  const list = [];
  for (const f of files) {
    const rel = (f.webkitRelativePath || f.name).split('/').slice(1).join('/');
    if (isIncluded(rel) && f.size < 512 * 1024) list.push({ path: rel, text: await f.text() });
  }
  ev.target.value = '';
  fromFiles(list);
});
$('#btn-example').addEventListener('click', async () => {
  try { stopLive(); loadBrain(await loadJson('./example.json')); } catch { alert('Example not found.'); }
});

async function readEntry(entry, path, out) {
  if (entry.isFile) {
    if (!isIncluded(path)) return;
    const f = await new Promise((res, rej) => entry.file(res, rej));
    if (f.size < 512 * 1024) out.push({ path, text: await f.text() });
  } else if (entry.isDirectory) {
    if (/^(node_modules|\.git)$/.test(entry.name)) return;
    const reader = entry.createReader();
    let batch;
    do {
      batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      for (const e of batch) await readEntry(e, path ? `${path}/${e.name}` : e.name, out);
    } while (batch.length);
  }
}
window.addEventListener('dragover', (ev) => { ev.preventDefault(); $('#drop').hidden = false; });
window.addEventListener('dragleave', (ev) => { if (!ev.relatedTarget) $('#drop').hidden = true; });
window.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  $('#drop').hidden = true;
  const entries = [...ev.dataTransfer.items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  const list = [];
  for (const e of entries) {
    if (e.isDirectory) await readEntry(e, '', list);
    else await readEntry(e, e.name, list);
  }
  fromFiles(list);
});

// ---------- Loop ----------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (flyTarget) {
    controls.target.lerp(flyTarget, 0.07);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const want = controls.target.clone().add(dir.multiplyScalar(flyDist));
    camera.position.lerp(want, 0.06);
    if (camera.position.distanceTo(want) < 0.01 && controls.target.distanceTo(flyTarget) < 0.01) flyTarget = null;
  }
  controls.update();

  shellMat.opacity = 0.68 + Math.sin(t * 0.8) * 0.1;

  if (brain && pulseGeo) {
    const p = pulseGeo.getAttribute('position');
    const c = pulseGeo.getAttribute('color');
    pulses.forEach((pl, i) => {
      if (!pl.e) { p.setXYZ(i, 0, 0, 0); c.setXYZ(i, 0, 0, 0); return; }
      pl.t += dt * pl.v;
      if (pl.t >= 1) { pulses[i] = newPulse(); return; }
      const pts = pl.e.pts;
      const tt = pl.forward ? pl.t : 1 - pl.t;
      const f = tt * (pts.length - 1);
      const k = Math.floor(f);
      const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
      const u = f - k;
      p.setXYZ(i, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
      const on = !selected || pl.e.link.source === selected || pl.e.link.target === selected;
      const fade = Math.sin(pl.t * Math.PI) * (on ? 1 : 0.15) * (visibleNode(pl.e.link.source) && visibleNode(pl.e.link.target) ? 1 : 0);
      c.setXYZ(i, (0.55 + pl.e.color.r * 0.6) * fade, (0.6 + pl.e.color.g * 0.6) * fade, (0.7 + pl.e.color.b * 0.5) * fade);
    });
    p.needsUpdate = true;
    c.needsUpdate = true;

    for (const [id, until] of flashUntil) {
      const s = spriteById.get(id);
      if (!s || t > until) { flashUntil.delete(id); if (s) s.scale.setScalar(s.userData.size * (id === selected ? 1.6 : 1)); continue; }
      s.scale.setScalar(s.userData.size * (1 + 1.2 * Math.abs(Math.sin((until - t) * 4)) * ((until - t) / 2.5)));
    }
    // Gentle breathing of the core.
    const core = spriteById.get('CLAUDE.md');
    if (core && selected !== 'CLAUDE.md') core.scale.setScalar(core.userData.size * (1 + Math.sin(t * 1.6) * 0.06));
    updateLabels();
  }

  composer.render();
  requestAnimationFrame(frame);
}

boot();
frame();
