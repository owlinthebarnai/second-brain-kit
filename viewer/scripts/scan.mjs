#!/usr/bin/env node
// Scan a second-brain folder once and write the graph JSON the viewer loads.
// Usage: node scripts/scan.mjs <brain-folder> [output.json]
// Default output: public/brain.local.json (gitignored, never published).
// For a view that updates by itself, use live.mjs instead.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBrainFolder } from './read-brain.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const [, , dirArg, outArg] = process.argv;
if (!dirArg) {
  console.error('Usage: node scripts/scan.mjs <brain-folder> [output.json]');
  process.exit(1);
}
const root = resolve(dirArg);
const out = resolve(outArg || join(here, '..', 'public', 'brain.local.json'));

const brain = readBrainFolder(root);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(brain));
console.log(`${brain.name}: ${brain.nodes.length} nodes, ${brain.links.length} links -> ${relative(process.cwd(), out)}`);
for (const c of brain.checks.filter((c) => c.status !== 'pass')) console.log(`  [${c.status}] ${c.label}${c.detail ? ': ' + c.detail : ''}`);
