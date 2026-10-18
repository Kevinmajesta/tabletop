import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, gameAction, gameView, gameCatalog } from '../dist-server/minigames.js';
const source = JSON.parse(readFileSync(new URL('../server/tts-pilihan-source.json', import.meta.url))).puzzle;
test('TTS-Pilihan matches every reference cell, clue and number; validates and hides answers', () => {
  assert.equal(gameCatalog.ttspilihan?.name, 'TTS-Pilihan');
  const game = newGame('tts', 'ttspilihan');
  assert.equal(gameAction(game, 'gm', true, { type: 'start' }), null);
  assert.equal(game.crosswordColumns, 15);
  assert.equal(game.crosswordLetters.length, source.grid.flat().length);
  const cells = new Map();
  for (const [direction, suffix] of [['across', 'M'], ['down', 'T']]) {
    source.clues[direction].forEach((clue, index) => {
      const expected = source.grid.flat().filter(c => c[direction]?.index === index);
      const entry = game.crosswordEntries.find(e => e.id === `${clue.numeral}${suffix}`);
      assert.equal(entry.clue, clue.text);
      assert.deepEqual(entry.cells, expected.map(c => c.row * 15 + c.col));
      assert.equal(entry.answer, expected.map(c => c.fill).join(''));
      entry.cells.forEach((cell, i) => cells.set(cell, entry.answer[i]));
    });
  }
  assert.equal(cells.size, source.grid.flat().filter(c => c.fill).length);
  for (const dm of [false, true]) assert.ok(gameView(game, 'player', dm).crosswordEntries.every(e => !('answer' in e)));
  const entry = game.crosswordEntries[0];
  assert.ok(gameAction(game, 'player', false, { type: 'crossword:answer', id: entry.id, answer: 'SALAH' }));
  for (const e of game.crosswordEntries) assert.equal(gameAction(game, 'player', false, { type: 'crossword:answer', id: e.id, answer: e.answer.toLowerCase() }), null);
  assert.equal(game.phase, 'finished');
  assert.equal(gameAction(game, 'gm', true, { type: 'reset' }), null);
  assert.equal(gameAction(game, 'gm', true, { type: 'start' }), null);
  assert.ok(game.crosswordLetters.every(c => c === ''));
  assert.deepEqual(game.crosswordSolved, []);
});
