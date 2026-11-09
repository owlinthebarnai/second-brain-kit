#!/usr/bin/env node
// Scan a second-brain folder and write the graph JSON the viewer loads.
// Usage: node scripts/scan.mjs <brain-folder> [output.json]
// Default output: public/brain.local.json (gitignored, never published).
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBrain, isIncluded, MAX_FILES } from '../src/parse.js';

const here = dirname(fileURLToPath(import.meta.url));
const [, , dirArg, outArg] = process.argv;
if (!dirArg) {
  console.error('Usage: node scripts/scan.mjs <brain-folder> [output.json]');
  process.exit(1);
}
const root = resolve(dirArg);
const out = resolve(outArg || join(here, '..', 'public', 'brain.local.json'));
const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', '.next', '.vercel', '.venv', 'venv']);
const SKIP_ROOT_DIRS = new Set(['dist', 'build', 'out']);

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (files.length >= MAX_FILES) return;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name) && !(dir === root && SKIP_ROOT_DIRS.has(name))) walk(full); continue; }
    const rel = relative(root, full).split('\\').join('/');
    if (isIncluded(rel) && st.size < 512 * 1024) files.push({ path: rel, text: readFileSync(full, 'utf8') });
  }
})(root);

const brain = buildBrain(files);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(brain));
const fails = brain.checks.filter((c) => c.status !== 'pass');
console.log(`${brain.name}: ${brain.nodes.length} nodes, ${brain.links.length} links -> ${relative(process.cwd(), out)}`);
for (const c of fails) console.log(`  [${c.status}] ${c.label}${c.detail ? ': ' + c.detail : ''}`);
