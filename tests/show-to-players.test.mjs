import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

test('only a DM can show a campaign image to players', () => {
  assert.ok(server.includes('p.type === "image:show"'));
  assert.ok(server.includes('Hanya DM bisa menampilkan gambar.'));
  assert.ok(server.includes('allowedImages.has(p.url)'));
  assert.ok(server.includes('p.type === "image:hide"'));
});

test('player image overlay is dismissible locally by clicking its backdrop', () => {
  assert.ok(client.includes('className="player-image-overlay"'));
  assert.ok(client.includes('onClick={() => setImageOpen(false)}'));
  assert.ok(client.includes('event.stopPropagation()'));
});
