// Turns a list of markdown files into a brain graph: nodes, links and health checks.
// Pure JS (no DOM, no Node APIs) so both the browser and scripts/scan.mjs can use it.

const EXCLUDE = [
  /(^|\/)CLAUDE\.local\.md$/i,
  /(^|\/)\.env/i,
  /\.local\./i,
  /(^|\/)(node_modules|\.git|\.astro|\.next|\.vercel|\.venv|venv)\//,
  /^(dist|build|out)\//,
];

export const MAX_FILES = 800;

export function isIncluded(path) {
  return /\.(md|mdx|markdown)$/i.test(path) && !EXCLUDE.some((r) => r.test(path));
}

export const TYPES = {
  core: { label: 'CLAUDE.md (map)', color: '#eafcff' },
  focus: { label: 'Focus (now)', color: '#ffd166' },
  rule: { label: 'Rules', color: '#ff7aa8' },
  skill: { label: 'Skill groups', color: '#b69cff' },
  playbook: { label: 'Playbooks', color: '#d8ccff' },
  log: { label: 'Logs', color: '#4ee6a6' },
  folder: { label: 'Folders', color: '#4cc3ff' },
  note: { label: 'Notes', color: '#8fd8ff' },
  template: { label: 'Templates', color: '#6f86a6' },
  guide: { label: 'Guides', color: '#a9b7c9' },
};

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const base = (p) => p.split('/').pop();
const topDir = (p) => (p.includes('/') ? p.split('/')[0] : '');

function classify(path) {
  const b = base(path);
  if (path === 'CLAUDE.md') return 'core';
  if (/^\.claude\/rules\//.test(path) || (b === 'CLAUDE.md' && path !== 'CLAUDE.md')) return 'rule';
  if (/^\.claude\/skills\/[^/]+\/SKILL\.md$/i.test(path)) return 'skill';
  if (/^\.claude\/skills\//.test(path)) return 'playbook';
  if (/^now\.md$/i.test(b)) return 'focus';
  if (b === '_template.md') return 'template';
  if (/^(decisions|ledger|changelog)\.md$/i.test(b)) return 'log';
  if (/^readme/i.test(b)) return 'guide';
  return 'note';
}

function title(path, text) {
  if (/^\.claude\/skills\/[^/]+\/SKILL\.md$/i.test(path)) return path.split('/')[2] + ' (skill group)';
  const m = text.match(/^#\s+(.+)$/m);
  if (m) return m[1].replace(/[*_`]/g, '').trim();
  return base(path).replace(/\.md$/i, '');
}

function frontmatterPaths(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const out = [];
  let inPaths = false;
  for (const line of fm[1].split('\n')) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (/^paths:\s*\[/.test(line)) {
      out.push(...line.replace(/^paths:\s*\[|\]\s*$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')));
      continue;
    }
    if (inPaths) {
      const m = line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/);
      if (m) out.push(m[1]); else inPaths = false;
    }
  }
  return out.filter(Boolean);
}

export function buildBrain(inputFiles, fallbackName = 'Second brain') {
  const files = inputFiles
    .map((f) => ({ path: f.path.replace(/\\/g, '/').replace(/^\.\//, ''), text: f.text.replace(/\r\n/g, '\n') }))
    .filter((f) => isIncluded(f.path))
    .slice(0, MAX_FILES);

  const nodes = [];
  const byId = new Map();
  const add = (n) => { if (!byId.has(n.id)) { byId.set(n.id, n); nodes.push(n); } return byId.get(n.id); };

  for (const f of files) {
    const type = classify(f.path);
    const lines = f.text.length ? f.text.split('\n').length - (f.text.endsWith('\n') ? 1 : 0) : 0;
    const words = (f.text.match(/\S+/g) || []).length;
    let region;
    if (type === 'core') region = 'core';
    else if (f.path.startsWith('.claude/rules/')) region = '.claude/rules';
    else if (f.path.startsWith('.claude/skills/')) region = '.claude/skills';
    else region = topDir(f.path) || '(root)';
    add({ id: f.path, path: f.path, name: title(f.path, f.text), type, region, lines, words, text: f.text });
  }

  // Hub nodes: one per top-level folder, plus rules and skills hubs.
  const regions = [...new Set(nodes.map((n) => n.region))].filter((r) => r !== 'core' && r !== '(root)');
  for (const r of regions) {
    const label = r === '.claude/rules' ? 'rules' : r === '.claude/skills' ? 'skills' : r + '/';
    add({ id: 'dir:' + r, path: r + '/', name: label, type: 'folder', region: r, lines: 0, words: 0, text: '', hub: true });
  }
  // Skill groups without a SKILL.md still need a hub.
  for (const n of [...nodes]) {
    if (n.type !== 'playbook') continue;
    const g = n.path.split('/')[2];
    const entry = `.claude/skills/${g}/SKILL.md`;
    if (!byId.has(entry)) add({ id: entry, path: entry, name: g, type: 'skill', region: '.claude/skills', lines: 0, words: 0, text: '', missing: true });
  }

  const core = byId.get('CLAUDE.md');
  const links = [];
  const linkKey = new Set();
  const link = (s, t, kind) => {
    if (!s || !t || s === t) return;
    const k = [s, t].sort().join('|');
    if (linkKey.has(k)) return;
    linkKey.add(k);
    links.push({ source: s, target: t, kind });
  };

  // Structure.
  const root = core ? core.id : null;
  for (const n of nodes) {
    if (n.type === 'core') continue;
    if (n.hub) { link(root, n.id, 'structure'); continue; }
    if (n.type === 'playbook') { link(`.claude/skills/${n.path.split('/')[2]}/SKILL.md`, n.id, 'structure'); continue; }
    if (n.region === '(root)') { link(root, n.id, 'structure'); continue; }
    link('dir:' + n.region, n.id, 'structure');
  }

  // References between files: paths, file names, folders and [[wiki]] links.
  const byBase = new Map();
  for (const n of nodes) {
    if (n.hub) continue;
    const b = base(n.path).toLowerCase();
    byBase.set(b, [...(byBase.get(b) || []), n.id]);
  }
  const dirs = new Set(regions.filter((r) => !r.startsWith('.claude')));
  const unresolved = [];

  const resolve = (from, token) => {
    const t = token.replace(/^\.?\//, '');
    if (byId.has(t)) return t;
    const rel = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) + t : t;
    if (byId.has(rel)) return rel;
    const parts = t.split('/');
    if (parts.length > 1 && byId.has(parts.slice(-2).join('/'))) return parts.slice(-2).join('/');
    const cands = byBase.get(base(t).toLowerCase());
    if (cands && cands.length === 1 && (!t.includes('/') || cands[0].endsWith(t))) return cands[0];
    if (cands && cands.length > 1) {
      const sameDir = cands.find((c) => c.startsWith(from.slice(0, from.lastIndexOf('/') + 1)));
      if (sameDir && !t.includes('/')) return sameDir;
    }
    return null;
  };

  for (const n of nodes) {
    if (!n.text) continue;
    const body = n.text;
    for (const m of body.matchAll(/(@?)((?:\.{0,2}\/)?[\w.\-/]*[\w-]\.md)\b/g)) {
      const target = resolve(n.path, m[2]);
      if (target) link(n.id, target, m[1] ? 'import' : 'reference');
      else if (m[2].includes('/') && !/[A-Z]{2,}|<|_template/.test(m[2]) && dirs.has(topDir(m[2]))) unresolved.push({ from: n.path, token: m[2] });
    }
    for (const m of body.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) {
      const target = resolve(n.path, m[1].trim().endsWith('.md') ? m[1].trim() : m[1].trim() + '.md');
      if (target) link(n.id, target, 'reference');
    }
    for (const m of body.matchAll(/(?:^|[\s`(*])([\w-]+)\/(?=[\s`),:*]|$)/gm)) {
      if (dirs.has(m[1])) link(n.id, 'dir:' + m[1], 'reference');
    }
    if (n.type === 'rule') {
      for (const p of frontmatterPaths(body)) {
        const d = topDir(p.replace(/\*.*$/, 'x'));
        if (dirs.has(d)) link(n.id, 'dir:' + d, 'governs');
        n.applies = [...(n.applies || []), p];
      }
    }
  }

  // Degree for sizing.
  for (const n of nodes) n.degree = 0;
  for (const l of links) { byId.get(l.source).degree++; byId.get(l.target).degree++; }

  const name = core ? core.name.replace(/:\s*second brain.*$/i, '').trim() : fallbackName;
  return { name, generated: new Date().toISOString(), nodes, links, checks: healthChecks(nodes, byId, unresolved) };
}

function healthChecks(nodes, byId, unresolved) {
  const checks = [];
  const add = (status, label, detail = '', files = []) => checks.push({ status, label, detail, files });
  const core = byId.get('CLAUDE.md');

  if (!core) add('fail', 'CLAUDE.md exists', 'No CLAUDE.md at the root: Claude starts every session blind.');
  else {
    add(core.lines <= 150 ? 'pass' : 'fail', `CLAUDE.md is ${core.lines} lines`, core.lines <= 150 ? 'Under 150: a map, not a manual.' : 'Over 150: move folder rules to .claude/rules/ and procedures to skills.', ['CLAUDE.md']);
    const imports = [...core.text.matchAll(/(^|\s)@([\w.\-/]+\.md)/g)].map((m) => m[2]);
    add(imports.length <= 1 ? 'pass' : 'warn', `${imports.length} import${imports.length === 1 ? '' : 's'} in CLAUDE.md`, imports.length <= 1 ? 'Only the focus file loads every session.' : 'Every import loads every session: ' + imports.join(', '));
    add(/^##\s*common pitfalls/im.test(core.text) ? 'pass' : 'warn', 'Common pitfalls list', 'what broke -> the rule that prevents it');
  }
  add(nodes.some((n) => n.type === 'focus') ? 'pass' : 'warn', 'Focus file (now.md)', 'Where I stopped and the next step.');
  add(nodes.some((n) => /^decisions\.md$/i.test(base(n.path))) ? 'pass' : 'warn', 'Decision log', 'Every choice, with the reason.');

  const missing = [];
  for (const s of nodes.filter((n) => n.type === 'skill')) {
    if (s.missing) { missing.push(s.path); continue; }
    const dir = s.path.slice(0, s.path.lastIndexOf('/') + 1);
    for (const m of s.text.matchAll(/\b([\w-]+\.md)\b/g)) {
      if (m[1] !== 'SKILL.md' && !byId.has(dir + m[1]) && !byId.has(m[1])) missing.push(dir + m[1]);
    }
  }
  const skills = nodes.filter((n) => n.type === 'skill').length;
  if (skills) add(missing.length ? 'fail' : 'pass', `${skills} skill group${skills === 1 ? '' : 's'} route to existing playbooks`, missing.length ? 'Missing: ' + missing.join(', ') : 'Every playbook named in a routing table exists.', missing);

  const leaks = nodes.filter((n) => n.text && SECRET_PATTERNS.some((r) => r.test(n.text))).map((n) => n.path);
  add(leaks.length ? 'fail' : 'pass', 'No keys or tokens in files', leaks.length ? 'Something that looks like a key is in these files. Move it to an environment variable and rotate it.' : 'Nothing that looks like an API key, token or private key.', leaks);

  const uniq = [...new Map(unresolved.map((u) => [u.from + u.token, u])).values()];
  add(uniq.length ? 'warn' : 'pass', uniq.length ? `${uniq.length} link${uniq.length === 1 ? '' : 's'} to files that do not exist` : 'No links to missing files', uniq.length ? 'Possibly stale: ' + uniq.slice(0, 6).map((u) => `${u.token} (in ${u.from})`).join(', ') : 'Every file path mentioned resolves.', uniq.map((u) => u.from));
  return checks;
}
