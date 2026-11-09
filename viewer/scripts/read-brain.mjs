// Reads a second-brain folder from disk and returns the graph. Shared by scan.mjs and live.mjs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildBrain, isIncluded, MAX_FILES } from '../src/parse.js';

const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', '.next', '.vercel', '.venv', 'venv']);
const SKIP_ROOT_DIRS = new Set(['dist', 'build', 'out']);
const MAX_BYTES = 512 * 1024;

export function readBrainFolder(root) {
  const files = [];
  (function walk(dir) {
    let names;
    try { names = readdirSync(dir); } catch { return; }
    for (const name of names) {
      if (files.length >= MAX_FILES) return;
      const full = join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name) && !(dir === root && SKIP_ROOT_DIRS.has(name))) walk(full);
        continue;
      }
      const rel = relative(root, full).split('\\').join('/');
      if (isIncluded(rel) && st.size < MAX_BYTES) {
        try { files.push({ path: rel, text: readFileSync(full, 'utf8') }); } catch { /* file vanished mid-scan */ }
      }
    }
  })(root);
  return buildBrain(files);
}

// True for paths the viewer cares about (used to ignore noise from the file watcher).
export function isWatched(relPath) {
  const p = relPath.split('\\').join('/');
  if (/(^|\/)(node_modules|\.git)(\/|$)/.test(p)) return false;
  return isIncluded(p) || !/\.[a-z0-9]+$/i.test(p); // markdown files, or folders (renames/deletes)
}
