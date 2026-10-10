import { writeFileSync } from 'node:fs';
const url = 'https://api.open5e.com/v1/backgrounds/?limit=100&format=json';
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Open5e: HTTP ${response.status}`);
const data = await response.json();
if (data.next || !Array.isArray(data.results)) throw new Error('Unexpected pagination or payload');
writeFileSync(new URL('../server/catalog/backgrounds-open5e.json', import.meta.url), JSON.stringify({ source: url, fetchedAt: new Date().toISOString(), results: data.results }, null, 2) + '\n');
console.log(`Background snapshot: ${data.results.length} entries`);
