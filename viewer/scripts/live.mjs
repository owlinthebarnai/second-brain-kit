#!/usr/bin/env node
// Live viewer: serves the viewer and your brain, and updates the page when files change.
// Usage: node scripts/live.mjs <brain-folder> [--port 4747]
// Listens on 127.0.0.1 only, so the brain is never visible to other devices.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { join, resolve, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { readBrainFolder, isWatched } from './read-brain.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 4747;
const dirArg = args.find((a, i) => !a.startsWith('--') && !(portIdx >= 0 && i === portIdx + 1));
if (!dirArg || !existsSync(dirArg) || !statSync(dirArg).isDirectory()) {
  console.error('Usage: node scripts/live.mjs <brain-folder> [--port 4747]');
  process.exit(1);
}
const root = resolve(dirArg);
const dist = join(here, '..', 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.log('Building the viewer once...');
  execSync('npm run build', { cwd: join(here, '..'), stdio: 'inherit' });
}

let brain = null;
let version = 0;
function rescan() {
  const t = Date.now();
  brain = readBrainFolder(root);
  brain.live = { version: ++version, folder: root.split(sep).pop() };
  console.log(`[${new Date().toLocaleTimeString()}] ${brain.name}: ${brain.nodes.length} nodes, ${brain.links.length} links (${Date.now() - t} ms)`);
}
rescan();

// Server-sent events: every open page gets a ping when the brain changes.
const clients = new Set();
let timer = null;
watch(root, { recursive: true }, (_event, file) => {
  if (file && !isWatched(String(file))) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    rescan();
    for (const res of clients) res.write(`data: ${version}\n\n`);
  }, 300);
});
setInterval(() => { for (const res of clients) res.write(': keep-alive\n\n'); }, 25000);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/brain.json') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(brain));
  }
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`data: ${version}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url.pathname === '/status') {
    // Lets open.mjs find a server that is already showing this brain.
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ app: 'second-brain-viewer', root, version, name: brain.name }));
  }
  if (url.pathname === '/shutdown' && req.method === 'POST') {
    res.writeHead(200); res.end('bye');
    console.log('Stopped.');
    return setTimeout(() => process.exit(0), 50);
  }
  if (url.pathname === '/brain.local.json') { res.writeHead(404); return res.end(); }
  const rel = normalize(decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)).replace(/^([/\\])+/, '');
  const file = join(dist, rel);
  if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => {
  console.log(`Live viewer: http://localhost:${port}  (watching ${root})`);
});
