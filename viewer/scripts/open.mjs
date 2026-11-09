#!/usr/bin/env node
// One command to see a second brain: starts the live viewer in the background (or reuses one
// already showing this brain) and opens it in the browser. No npm install needed: the viewer
// ships prebuilt in viewer/dist and this script only uses Node's standard library.
//
// Usage:
//   node viewer/scripts/open.mjs [brain-folder] [--port 4747] [--no-open]
//   node viewer/scripts/open.mjs --stop [brain-folder]
// brain-folder defaults to the current directory. Set SECOND_BRAIN_NO_OPEN=1 to skip the browser.
import { spawn } from 'node:child_process';
import { existsSync, statSync, openSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const portIdx = args.indexOf('--port');
const firstPort = portIdx >= 0 ? Number(args[portIdx + 1]) : 4747;
const folderArg = args.find((a, i) => !a.startsWith('--') && !(portIdx >= 0 && i === portIdx + 1));
const root = resolve(folderArg || process.cwd());
const noOpen = flag('--no-open') || process.env.SECOND_BRAIN_NO_OPEN === '1';
const same = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);

async function main() {
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Not a folder: ${root}`);
  { process.exitCode = 1; return; }
}
if (!existsSync(join(here, '..', 'dist', 'index.html'))) {
  console.error('The prebuilt viewer (viewer/dist) is missing. Re-download the repo, or run "npm install && npm run build" in viewer/.');
  { process.exitCode = 1; return; }
}

async function status(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(800) });
    const j = await r.json();
    return j.app === 'second-brain-viewer' ? j : { busy: true };
  } catch (e) {
    return e?.cause?.code === 'ECONNREFUSED' ? null : { busy: true };
  }
}

function openBrowser(url) {
  if (noOpen) return;
  const [cmd, cmdArgs] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true, windowsHide: true }).unref(); } catch { /* print the URL anyway */ }
}

const ports = Array.from({ length: 20 }, (_, i) => firstPort + i);

if (flag('--stop')) {
  for (const p of ports) {
    const s = await status(p);
    if (s?.root && same(s.root, root)) {
      await fetch(`http://127.0.0.1:${p}/shutdown`, { method: 'POST' }).catch(() => {});
      console.log(`Stopped the viewer for ${root} (port ${p}).`);
      return;
    }
  }
  console.log('No viewer running for this folder.');
  return;
}

let freePort = null;
for (const p of ports) {
  const s = await status(p);
  if (s?.root && same(s.root, root)) {
    const url = `http://localhost:${p}`;
    console.log(`Already running: ${url}  (${s.name})`);
    openBrowser(url);
    return;
  }
  if (!s && freePort === null) freePort = p;
}
if (freePort === null) { console.error(`No free port between ${ports[0]} and ${ports.at(-1)}.`); { process.exitCode = 1; return; } }

// Start the live server detached, so it keeps running after this command (and Claude's session) ends.
const logDir = join(tmpdir(), 'second-brain-viewer');
mkdirSync(logDir, { recursive: true });
const log = openSync(join(logDir, `live-${freePort}.log`), 'a');
spawn(process.execPath, [join(here, 'live.mjs'), root, '--port', String(freePort)], {
  detached: true, stdio: ['ignore', log, log], windowsHide: true,
}).unref();

const url = `http://localhost:${freePort}`;
for (let i = 0; i < 40; i++) {
  const s = await status(freePort);
  if (s?.root) {
    console.log(`Second brain viewer: ${url}  (${s.name})`);
    console.log('It updates by itself when files change, and keeps running in the background.');
    console.log(`Stop it with: node "${join(here, 'open.mjs')}" --stop "${root}"`);
    openBrowser(url);
    return;
  }
  await new Promise((r) => setTimeout(r, 250));
}
console.error(`The viewer did not start. See the log: ${join(logDir, `live-${freePort}.log`)}`);
{ process.exitCode = 1; return; }

}

await main();
