import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const repository = '5etools-mirror-3/5etools-src';
const commit = '8790755429c346d20020eed7826d312d484c393f';
const destination = resolve('resources/5etools-xphb');
const shared = new Set(['actions', 'backgrounds', 'conditionsdiseases', 'feats', 'items-base', 'items', 'languages', 'optionalfeatures', 'races', 'senses', 'skills', 'variantrules'].map(name => `data/${name}.json`));
const classes = new Set('barbarian bard cleric druid fighter monk paladin ranger rogue sorcerer warlock wizard'.split(' ').map(name => `data/class/class-${name}.json`));

async function fetchChecked(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}

// Keep existing downloads untouched; use a new directory for another snapshot.
try {
  await access(destination);
  throw new Error(`Destination already exists: ${destination}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const tree = await (await fetchChecked(`https://api.github.com/repos/${repository}/git/trees/${commit}?recursive=1`)).json();
if (tree.truncated) throw new Error('GitHub tree is incomplete.');
const paths = tree.tree.filter(entry => entry.type === 'blob' && entry.path.startsWith('data/') && entry.path.endsWith('.json') && (entry.path.includes('xphb') || shared.has(entry.path) || classes.has(entry.path))).map(entry => entry.path).sort();
if (paths.length !== 29) throw new Error(`Unexpected file inventory: ${paths.length}`);
const files = [];
for (const path of paths) {
  const bytes = Buffer.from(await (await fetchChecked(`https://raw.githubusercontent.com/${repository}/${commit}/${path}`)).arrayBuffer());
  const data = JSON.parse(bytes.toString('utf8'));
  const xphbCounts = Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.filter(entry => entry?.source === 'XPHB').length]).filter(([, count]) => count));
  const target = resolve(destination, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
  files.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), xphbCounts });
  console.log(`Downloaded ${path} (${bytes.length} bytes)`);
}
await writeFile(resolve(destination, 'manifest.json'), JSON.stringify({ repository, commit, source: 'XPHB', note: 'Unmodified upstream JSON. Shared files contain other editions and require filtering and reference resolution before application use. Availability is not a license grant.', files }, null, 2) + '\n', { flag: 'wx' });
console.log(`Saved ${files.length} JSON files to ${destination}`);
