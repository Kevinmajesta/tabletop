import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cryptexChambers, newCryptex, checkCryptex, normalizeCryptexAnswer, cryptexView } from '../dist-server/cryptex.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const fixed = n => () => n;
const seeded = seed => { let s = seed; return max => (s = (s * 1664525 + 1013904223) >>> 0) % max; };
const act = (g, id, type, data = {}, dm = false, rnd) => gameAction(g, id, dm, { type, ...data }, rnd);

test('all cryptex chambers have required fields, non-empty ciphers, and correct answers', () => {
  assert.equal(cryptexChambers.length, 4);
  for (const chamber of cryptexChambers) {
    assert.ok(chamber.id);
    assert.ok(chamber.title);
    assert.ok(chamber.lore);
    assert.ok(chamber.method);
    assert.ok(chamber.clue);
    assert.ok(chamber.cipher);
    assert.ok(chamber.answer);
    assert.ok(chamber.reward);
    assert.equal(checkCryptex({ chamber, attempts: 0 }, chamber.answer), true);
    assert.equal(checkCryptex({ chamber, attempts: 0 }, chamber.answer.toLowerCase()), true);
    assert.equal(checkCryptex({ chamber, attempts: 0 }, chamber.answer.replace(/\s+/g, '')), true);
  }
});

test('Rail Fence chamber (pagar) decodes correctly to KUNCI EMAS', () => {
  const chamber = cryptexChambers.find(c => c.id === 'pagar');
  assert.ok(chamber);
  assert.equal(chamber.answer, 'KUNCI EMAS');
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'kunci emas'), true);
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'KUNCIEMAS'), true);
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'KUNCI PERAK'), false);
});

test('Mirror chamber (cermin) decodes correctly to PEDANG PERAK KUNO', () => {
  const chamber = cryptexChambers.find(c => c.id === 'cermin');
  assert.ok(chamber);
  assert.equal(chamber.answer, 'PEDANG PERAK KUNO');
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'pedang perak kuno'), true);
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'PEDANGPERAKKUNO'), true);
});

test('Acrostic chamber (akrostik) decodes correctly to MAHKOTA', () => {
  const chamber = cryptexChambers.find(c => c.id === 'akrostik');
  assert.ok(chamber);
  assert.equal(chamber.answer, 'MAHKOTA');
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'mahkota'), true);
  const initials = chamber.verse.map(line => line.trim()[0]).join('');
  assert.equal(initials, 'MAHKOTA');
});

test('Skip / odd-position chamber (ganjil) decodes correctly to TONGKAT SIHIR', () => {
  const chamber = cryptexChambers.find(c => c.id === 'ganjil');
  assert.ok(chamber);
  assert.equal(chamber.answer, 'TONGKAT SIHIR');
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'tongkat sihir'), true);
  assert.equal(checkCryptex({ chamber, attempts: 0 }, 'TONGKATSIHIR'), true);
});

test('secret answer and reward never leak to players before solve', () => {
  for (let i = 0; i < cryptexChambers.length; i++) {
    const c = newCryptex(fixed(i));
    const playerView = cryptexView(c, false, false);
    assert.equal(playerView.chamber.answer, undefined);
    assert.equal(playerView.chamber.reward, undefined);
    assert.ok(playerView.chamber.cipher);

    const dmView = cryptexView(c, true, false);
    assert.equal(dmView.chamber.answer, c.chamber.answer);
    assert.equal(dmView.chamber.reward, c.chamber.reward);

    const finishedView = cryptexView(c, false, true);
    assert.equal(finishedView.chamber.answer, c.chamber.answer);
    assert.equal(finishedView.chamber.reward, c.chamber.reward);
  }
});

test('cryptex round flow: openParty start, wrong guesses counted, right guess wins and finishes, reset clears', () => {
  const g = newGame('cryp-1', 'cryptex');
  assert.equal(g.phase, 'waiting');

  // Player cannot start the round, only GM
  assert.ok(act(g, 'player1', 'start'));
  assert.equal(act(g, 'gm', 'start', {}, true, fixed(0)), null);
  assert.equal(g.phase, 'open');
  assert.ok(g.cryptex);

  // Player view does not leak the answer
  const pView = gameView(g, 'player1', false);
  assert.equal(pView.cryptex.chamber.answer, undefined);
  assert.equal(pView.cryptex.chamber.reward, undefined);

  // Malformed guesses rejected
  assert.ok(act(g, 'player1', 'cryptex:guess', { guess: '' }));
  assert.ok(act(g, 'player1', 'cryptex:guess', { guess: 123 }));

  // Wrong guess counts attempt
  assert.equal(act(g, 'player1', 'cryptex:guess', { guess: 'SALAH BESAR' }), null);
  assert.equal(g.phase, 'open');
  assert.equal(g.cryptex.attempts, 1);
  assert.equal(g.result, 'wrong');

  // Correct guess wins and awards score
  assert.equal(act(g, 'player1', 'cryptex:guess', { guess: 'kunci emas' }), null);
  assert.equal(g.phase, 'finished');
  assert.equal(g.result, 'player1');
  assert.equal(g.scores['player1'], 1);

  // Solved view shows the answer & reward
  const solvedView = gameView(g, 'player1', false);
  assert.equal(solvedView.cryptex.chamber.answer, 'KUNCI EMAS');
  assert.ok(solvedView.cryptex.chamber.reward);

  // GM can reset
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.phase, 'waiting');
  assert.equal(g.cryptex, undefined);
});
