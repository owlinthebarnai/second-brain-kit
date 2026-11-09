// Places graph nodes inside a brain shape: CLAUDE.md in the core, each folder in its own lobe,
// files clustered around their folder, then a short relaxation so nothing overlaps.

export const BRAIN = { rx: 1.15, ry: 0.92, rz: 1.42 };

// Lobe anchors, alternating hemispheres (x<0 left, x>0 right). Units are fractions of BRAIN radii.
const LOBES = [
  [-0.5, 0.42, 0.62], [0.5, 0.42, 0.62], // frontal
  [-0.55, 0.62, -0.12], [0.55, 0.62, -0.12], // parietal
  [-0.72, -0.12, 0.22], [0.72, -0.12, 0.22], // temporal
  [-0.42, 0.22, -0.72], [0.42, 0.22, -0.72], // occipital
  [-0.3, 0.72, 0.28], [0.3, 0.72, 0.28], // upper
  [-0.62, -0.32, -0.42], [0.62, -0.32, -0.42], // lower back
  [-0.3, -0.42, 0.58], [0.3, -0.42, 0.58],
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function fib(i, n) {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const t = Math.PI * (3 - Math.sqrt(5)) * i;
  return [Math.cos(t) * r, y, Math.sin(t) * r];
}

function insideBrain(p, margin = 0.9) {
  const [x, y, z] = p;
  const d = Math.sqrt((x / BRAIN.rx) ** 2 + (y / BRAIN.ry) ** 2 + (z / BRAIN.rz) ** 2);
  if (d > margin) { p[0] *= margin / d; p[1] *= margin / d; p[2] *= margin / d; }
  return p;
}

function keepHemisphere(p, side) {
  if (side < 0 && p[0] > -0.07) p[0] = -0.07 - Math.abs(p[0]) * 0.2;
  if (side > 0 && p[0] < 0.07) p[0] = 0.07 + Math.abs(p[0]) * 0.2;
  return p;
}

export function layoutBrain(brain) {
  const pos = new Map();
  const side = new Map();
  const byRegion = new Map();
  for (const n of brain.nodes) {
    if (!byRegion.has(n.region)) byRegion.set(n.region, []);
    byRegion.get(n.region).push(n);
  }

  // Order: rules and skills get the frontal lobes, then root files, then folders by size.
  const order = [...byRegion.keys()].filter((r) => r !== 'core').sort((a, b) => {
    const rank = (r) => (r === '.claude/rules' ? 0 : r === '.claude/skills' ? 1 : r === '(root)' ? 2 : 3);
    return rank(a) - rank(b) || byRegion.get(b).length - byRegion.get(a).length || a.localeCompare(b);
  });

  const anchors = new Map();
  order.forEach((r, i) => {
    let a;
    if (i < LOBES.length) a = LOBES[i];
    else { const f = fib(i, order.length + 4); a = [f[0] * 0.7, f[1] * 0.6, f[2] * 0.7]; }
    anchors.set(r, [a[0] * BRAIN.rx, a[1] * BRAIN.ry, a[2] * BRAIN.rz]);
  });

  for (const n of brain.nodes) {
    if (n.type === 'core') { pos.set(n.id, [0, 0.05, 0]); side.set(n.id, 0); }
  }

  for (const r of order) {
    const a = anchors.get(r);
    const s = Math.sign(a[0]) || 1;
    const members = byRegion.get(r);
    const hub = members.find((n) => n.hub);
    if (hub) { pos.set(hub.id, [...a]); side.set(hub.id, s); }

    if (r === '.claude/skills') {
      // Skill groups: entry SKILL.md around the hub, playbooks around their entry.
      const entries = members.filter((n) => n.type === 'skill');
      entries.forEach((e, i) => {
        const f = fib(i, Math.max(entries.length, 2));
        const p = keepHemisphere(insideBrain([a[0] + f[0] * 0.3, a[1] + f[1] * 0.26, a[2] + f[2] * 0.3]), s);
        pos.set(e.id, p); side.set(e.id, s);
        const books = members.filter((n) => n.type === 'playbook' && n.path.startsWith(e.path.replace(/SKILL\.md$/i, '')));
        books.forEach((b, j) => {
          const g = fib(j, Math.max(books.length, 2));
          pos.set(b.id, keepHemisphere(insideBrain([p[0] + g[0] * 0.17, p[1] + g[1] * 0.15, p[2] + g[2] * 0.17]), s));
          side.set(b.id, s);
        });
      });
      continue;
    }

    const rest = members.filter((n) => !n.hub);
    const radius = 0.16 + 0.045 * Math.sqrt(rest.length);
    rest.forEach((n, i) => {
      const f = fib(i, Math.max(rest.length, 2));
      const jitter = 0.85 + hash(n.id) * 0.3;
      const p = [a[0] + f[0] * radius * jitter, a[1] + f[1] * radius * 0.8 * jitter, a[2] + f[2] * radius * jitter];
      pos.set(n.id, keepHemisphere(insideBrain(p), s));
      side.set(n.id, s);
    });
  }

  // Relax: push apart nodes that are too close, pull gently back to their target.
  const ids = [...pos.keys()];
  const target = new Map(ids.map((id) => [id, [...pos.get(id)]]));
  const minD = 0.11;
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < ids.length; i++) {
      const p = pos.get(ids[i]);
      for (let j = i + 1; j < ids.length; j++) {
        const q = pos.get(ids[j]);
        const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        if (d < minD) {
          const k = ((minD - d) / d) * 0.5;
          const pc = ids[i] === 'CLAUDE.md' ? 0 : 1, qc = ids[j] === 'CLAUDE.md' ? 0 : 1;
          p[0] += dx * k * pc; p[1] += dy * k * pc; p[2] += dz * k * pc;
          q[0] -= dx * k * qc; q[1] -= dy * k * qc; q[2] -= dz * k * qc;
        }
      }
    }
    for (const id of ids) {
      const p = pos.get(id), t = target.get(id);
      for (let k = 0; k < 3; k++) p[k] += (t[k] - p[k]) * 0.04;
      if (id !== 'CLAUDE.md') { insideBrain(p, 0.93); const s = side.get(id); if (s) keepHemisphere(p, s); }
    }
  }
  return pos;
}

// Points on the brain surface with folds (gyri), a midline gap and a cerebellum.
export function brainShell(count = 6000) {
  const pts = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  while (pts.length < count * 3) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    let x = r * Math.cos(th), y = u, z = r * Math.sin(th);
    const cerebellum = rnd() < 0.12;
    if (cerebellum) {
      x *= 0.55 * BRAIN.rx; y = y * 0.32 * BRAIN.ry - 0.62 * BRAIN.ry; z = z * 0.42 * BRAIN.rz - 0.62 * BRAIN.rz;
      if (y > -0.35) continue;
    } else {
      // Gyri: keep points on the ridges of a warped stripe pattern so the surface reads as folded.
      const g = Math.sin(x * 9 + Math.sin(z * 6 + y * 3) * 1.8) * Math.cos(z * 8 + Math.sin(y * 7 + x * 2) * 1.8);
      if (g < -0.15 && rnd() < 0.85) continue;
      const fold = 1 + 0.035 * g;
      x *= BRAIN.rx * fold; y *= BRAIN.ry * fold; z *= BRAIN.rz * fold;
      if (y < -0.45 * BRAIN.ry) { y = -0.45 * BRAIN.ry + (y + 0.45 * BRAIN.ry) * 0.35; }
      if (Math.abs(x) < 0.05 && y > -0.2) continue; // longitudinal fissure
      x += Math.sign(x) * 0.04;
    }
    pts.push(x, y, z);
  }
  return new Float32Array(pts);
}
