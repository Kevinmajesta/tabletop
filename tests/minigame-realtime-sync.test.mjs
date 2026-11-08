import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const act = (g, id, type, data = {}, dm = false, rnd = () => 0) => gameAction(g, id, dm, { type, ...data }, rnd);

test('WallClock: clock:adjust syncs clock hands across players in realtime', () => {
  const g = newGame('wc', 'wallclock');
  assert.equal(act(g, 'gm', 'start', {}, true), null);
  assert.equal(g.phase, 'open');
  assert.deepEqual(g.clockTimes, ['12:00', '12:00', '12:00']);

  // Player A adjusts clock 0 to 2:45
  assert.equal(act(g, 'playerA', 'clock:adjust', { clock: 0, hour: 2, minute: 45 }), null);

  // Player B sees the updated clockTimes immediately
  const viewB = gameView(g, 'playerB', false);
  assert.equal(viewB.clockTimes[0], '2:45');
  assert.equal(viewB.board[0], ''); // not locked yet

  // Player B adjusts clock 1 to 8:15
  assert.equal(act(g, 'playerB', 'clock:adjust', { clock: 1, hour: 8, minute: 15 }), null);
  const viewA = gameView(g, 'playerA', false);
  assert.equal(viewA.clockTimes[1], '8:15');

  // Player A locks clock 0
  assert.equal(act(g, 'playerA', 'clock:set', { clock: 0, hour: 2, minute: 45 }), null);
  assert.equal(g.board[0], '2:45');

  // Locked clock cannot be adjusted
  assert.ok(act(g, 'playerB', 'clock:adjust', { clock: 0, hour: 3, minute: 0 }));
});

test('Crossword: crossword:letter syncs cell letters in realtime across players and auto-solves valid words', () => {
  const g = newGame('cw', 'crossword');
  assert.equal(act(g, 'gm', 'start', {}, true), null);
  assert.equal(g.phase, 'open');

  // 1M entry has cells [0, 1, 2, 3, 4] and answer RUMAH
  // Player A types 'R' in cell 0
  assert.equal(act(g, 'playerA', 'crossword:letter', { cell: 0, letter: 'r' }), null);

  // Player B immediately sees 'R' in cell 0
  const viewB = gameView(g, 'playerB', false);
  assert.equal(viewB.crosswordLetters[0], 'R');
  assert.equal(viewB.crosswordLetters[1], '');

  // Player B types 'U', 'M', 'A', 'H'
  act(g, 'playerB', 'crossword:letter', { cell: 1, letter: 'U' });
  act(g, 'playerB', 'crossword:letter', { cell: 2, letter: 'M' });
  act(g, 'playerB', 'crossword:letter', { cell: 3, letter: 'A' });
  act(g, 'playerB', 'crossword:letter', { cell: 4, letter: 'H' });

  // Word 1M auto-solves upon completion of correct letters
  assert.ok(g.crosswordSolved.includes('1M'));
  const viewA = gameView(g, 'playerA', false);
  assert.equal(viewA.crosswordLetters.slice(0, 5).join(''), 'RUMAH');
});

test('Cryptex: cryptex:draft syncs current entered text in realtime across players', () => {
  const g = newGame('cr', 'cryptex');
  assert.equal(act(g, 'gm', 'start', {}, true, () => 0), null);
  assert.equal(g.phase, 'open');

  // Player A types a draft
  assert.equal(act(g, 'playerA', 'cryptex:draft', { guess: 'kunci' }), null);

  // Player B sees the draft in realtime
  const viewB = gameView(g, 'playerB', false);
  assert.equal(viewB.cryptex.draft, 'KUNCI');
  assert.equal(viewB.cryptex.chamber.answer, undefined); // secret answer remains hidden
});

test('TornJournal: journal:order syncs placed pages in realtime across players', () => {
  const g = newGame('jn', 'journal');
  assert.equal(act(g, 'gm', 'start', {}, true, () => 0), null);
  assert.equal(g.phase, 'open');

  // Player A places page 'B' and 'A'
  assert.equal(act(g, 'playerA', 'journal:order', { order: ['B', 'A'] }), null);

  // Player B sees the placed order in realtime
  const viewB = gameView(g, 'playerB', false);
  assert.deepEqual(viewB.journal.order, ['B', 'A']);
});

test('RelicScale: scale:place syncs relics on scale pans in realtime across players', () => {
  const g = newGame('sc', 'relicscale');
  assert.equal(act(g, 'gm', 'start', {}, true, () => 0), null);
  assert.equal(g.phase, 'open');

  // Player A places relics [0, 1] on left and [2, 3] on right
  assert.equal(act(g, 'playerA', 'scale:place', { left: [0, 1], right: [2, 3] }), null);

  // Player B sees the relics on both pans in realtime
  const viewB = gameView(g, 'playerB', false);
  assert.deepEqual(viewB.scale.leftPan, [0, 1]);
  assert.deepEqual(viewB.scale.rightPan, [2, 3]);

  // Weighing clears the pans on server
  assert.equal(act(g, 'playerA', 'scale:weigh', { left: [0, 1], right: [2, 3] }), null);
  assert.deepEqual(g.scale.leftPan, []);
  assert.deepEqual(g.scale.rightPan, []);
});
