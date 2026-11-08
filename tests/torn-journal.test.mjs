import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalSource, smudged, newJournal, checkJournal, journalView } from '../dist-server/torn-journal.js';

const fixed = n => () => n;
const seeded = seed => { let s = seed; return max => (s = (s * 1664525 + 1013904223) >>> 0) % max; };

test('exactly one ordering satisfies every rule a player can read from the pages', () => {
  const n = journalSource.length, pages = journalSource;
  const firstWord = i => pages[i].first;
  // Rules derived ONLY from visible text: a visible "Lanjut: X" means the next page starts with X;
  // the last page has no footer; the smudged footers force deduction from moon/salt/fog wording.
  const visibleLink = i => pages[i].link && pages[i].link !== smudged ? pages[i].link : null;
  const solutions = [];
  const used = Array(n).fill(false), order = [];
  (function place() {
    if (order.length === n) { solutions.push([...order]); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const prev = order.at(-1);
      if (prev !== undefined) {
        const link = visibleLink(prev);
        if (link && firstWord(i) !== link) continue;               // readable footer must match
        const a = pages[prev], b = pages[i];
        if (b.salt > a.salt || b.moon < a.moon || b.fog > a.fog) continue; // story only moves forward
        if (!(b.salt < a.salt)) continue;                           // each page uses up salt
      }
      if (order.length === n - 1 && pages[i].link !== null) continue; // only the ending has no footer
      used[i] = true; order.push(i);
      place();
      order.pop(); used[i] = false;
    }
  })();
  assert.equal(solutions.length, 1);
  assert.deepEqual(solutions[0], [...Array(n).keys()]);
});

test('the two smudged footers are exactly the ones needing story deduction, and salt alone fixes their successor', () => {
  const idx = journalSource.map((p, i) => p.link === smudged ? i : -1).filter(i => i >= 0);
  assert.equal(idx.length, 2);
  for (const i of idx) {
    const next = journalSource.filter(p => p.salt === journalSource[i].salt - 1);
    assert.equal(next.length, 1);
  }
  assert.equal(new Set(journalSource.map(p => p.salt)).size, journalSource.length);
});

test('shuffled pages: letters A-J, never in true order, secret never leaks, answer verified server-side', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const j = newJournal(seeded(seed));
    assert.equal(j.pages.length, 10);
    assert.deepEqual(j.pages.map(p => p.id), [...'ABCDEFGHIJ']);
    assert.notDeepEqual(j.solution, [...'ABCDEFGHIJ']);
    const texts = j.solution.map(id => j.pages.find(p => p.id === id).text);
    assert.deepEqual(texts, journalSource.map(p => p.text));
    assert.equal(checkJournal(j, j.solution), 'right');
    assert.equal(checkJournal(j, [...j.solution].reverse()), 'wrong');
    const view = JSON.stringify(journalView(j, false, false));
    assert.ok(!view.includes('solution'));
  }
  const j = newJournal(fixed(0));
  assert.ok(JSON.stringify(journalView(j, true, false)).includes('solution'));
  assert.ok(JSON.stringify(journalView(j, false, true)).includes('solution'));
});

test('journal answer validation rejects malformed orders', () => {
  const j = newJournal(seeded(5));
  const ids = j.pages.map(p => p.id);
  // A rotation of the ten letters is a legal-but-wrong order, not malformed input.
  assert.equal(checkJournal(j, [...ids.slice(1), ids[0]]), j.solution.every((id, i) => id === [...ids.slice(1), ids[0]][i]) ? 'right' : 'wrong');
  for (const bad of [null, 'ABC', [], ids.slice(1), [...ids, 'A'], [...ids.slice(0, 9), 'Z'], [...ids.slice(0, 9), 5], { length: 10 }]) assert.equal(checkJournal(j, bad), 'invalid', JSON.stringify(bad));
});

import { newGame, gameAction, gameView } from '../dist-server/minigames.js';
const act = (g, id, type, data = {}, dm = false, rnd) => gameAction(g, id, dm, { type, ...data }, rnd);

test('journal round: secret hidden, wrong order counted without error, right order wins, reset clears', () => {
  const g = newGame('j', 'journal');
  assert.ok(act(g, 'p', 'start'));
  assert.equal(act(g, 'gm', 'start', {}, true, seeded(9)), null);
  assert.ok(act(g, 'p', 'journal:submit', { order: ['A'] }));
  assert.ok(!JSON.stringify(gameView(g, 'p', false)).includes('solution'));
  assert.ok(JSON.stringify(gameView(g, 'gm', true)).includes('solution'));
  const wrong = [...g.journal.solution].reverse();
  assert.equal(act(g, 'p', 'journal:submit', { order: wrong }), null);
  assert.equal(g.phase, 'open');
  assert.equal(g.journal.attempts, 1);
  assert.equal(g.result, 'wrong');
  assert.equal(act(g, 'p', 'journal:submit', { order: [...g.journal.solution] }), null);
  assert.equal(g.phase, 'finished');
  assert.ok(JSON.stringify(gameView(g, 'p', false)).includes('solution'));
  assert.ok(act(g, 'p', 'journal:submit', { order: [...g.journal.solution] }));
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.journal, undefined);
});

test('journal actions are rejected on other game kinds and before the round opens', () => {
  const g = newGame('j', 'journal');
  assert.ok(act(g, 'p', 'journal:submit', { order: [] }));
  const other = newGame('o', 'wallclock'); act(other, 'gm', 'start', {}, true, seeded(1));
  assert.ok(act(other, 'p', 'journal:submit', { order: [] }));
});
