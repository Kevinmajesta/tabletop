import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journalQuestions, newJournal, checkJournal, journalView, normalizeAnswer } from '../dist-server/torn-journal.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

const act = (g, id, type, data = {}, dm = false) => gameAction(g, id, dm, { type, ...data });
const pdf = readFileSync(new URL('../public/manual/jurnal-terkoyak.pdf', import.meta.url), 'latin1');

test('PDF has 10 pages and its text supports every answer', () => {
  assert.equal((pdf.match(/\/Type \/Page /g) || []).length, 10);
  // Each content stream: lines = [header, title, ...body, page number]
  const lines = pdf.split('>>\nstream\n').slice(1).map(s => [...s.slice(0, s.indexOf('endstream')).matchAll(/\((.*)\) Tj/g)].map(m => m[1]));
  assert.equal(lines.length, 10);
  lines.forEach((l, i) => assert.match(l[1], new RegExp(`^Halaman ${i + 1} - `)));
  // Q1: first letter of the first body word of each page
  assert.equal(lines.map(l => l[2][0]).join(''), journalQuestions[0].answers[0]);
  // Q3: Caesar shift -3 of the cave inscription printed on page 6
  assert.ok(lines[5].includes('S X U Q D P D'));
  const shifted = [...'SXUQDPD'].map(c => String.fromCharCode((c.charCodeAt(0) - 65 - 3 + 26) % 26 + 65)).join('');
  assert.equal(shifted, journalQuestions[2].answers[0]);
  // Q4: riddle printed on page 7
  assert.ok(lines[6].includes('Semakin banyak kau ambil dariku,'));
  // Q2: salt 12 -1 (ikan) -2 (jembatan) +1 (hadiah) -3 (tali) -1 (tangga) -2 (lonceng); Q5: days 1+2+2+1+3+2+2
  assert.equal(12 - 1 - 2 + 1 - 3 - 1 - 2, Number(journalQuestions[1].answers[0]));
  assert.equal(1 + 2 + 2 + 1 + 3 + 2 + 2, Number(journalQuestions[4].answers[0]));
});

test('answers are normalized and never leak to players until finished', () => {
  assert.equal(normalizeAnswer(' Kaki  Menara! '), 'KAKIMENARA');
  const j = newJournal();
  assert.equal(j.questions.length, 5);
  assert.equal(checkJournal(j, 0, 'kaki menara'), 'right');
  assert.equal(checkJournal(j, 0, 'salah'), 'wrong');
  for (const bad of [[-1, 'x'], [5, 'x'], [1.5, 'x'], ['0', 'x'], [0, 5], [0, 'x'.repeat(61)]]) assert.equal(checkJournal(j, ...bad), 'invalid', JSON.stringify(bad));
  assert.ok(!JSON.stringify(journalView(j, false, false)).includes('KAKIMENARA'));
  assert.ok(JSON.stringify(journalView(j, true, false)).includes('KAKIMENARA'));
  assert.ok(JSON.stringify(journalView(j, false, true)).includes('KAKIMENARA'));
});

test('journal round: wrong answers counted without error, all five right wins, reset clears', () => {
  const g = newGame('j', 'journal');
  assert.ok(act(g, 'p', 'journal:answer', { index: 0, text: 'x' }));
  assert.equal(act(g, 'gm', 'start', {}, true), null);
  assert.ok(act(g, 'p', 'journal:answer', { index: 9, text: 'x' }));
  assert.equal(act(g, 'p', 'journal:answer', { index: 0, text: 'ngawur' }), null);
  assert.equal(g.journal.attempts, 1);
  assert.equal(g.result, 'wrong');
  assert.ok(!JSON.stringify(gameView(g, 'p', false)).includes('KAKIMENARA'));
  journalQuestions.forEach((q, i) => {
    assert.equal(g.phase, 'open');
    assert.equal(act(g, 'p', 'journal:answer', { index: i, text: q.answers[0] }), null);
  });
  assert.equal(g.phase, 'finished');
  assert.equal(g.scores.p, 1);
  assert.ok(JSON.stringify(gameView(g, 'p', false)).includes('KAKIMENARA'));
  assert.ok(act(g, 'p', 'journal:answer', { index: 0, text: 'KAKIMENARA' }));
  assert.equal(act(g, 'gm', 'reset', {}, true), null);
  assert.equal(g.journal, undefined);
});

test('a solved question cannot be answered twice and other kinds reject journal actions', () => {
  const g = newGame('j', 'journal');
  act(g, 'gm', 'start', {}, true);
  assert.equal(act(g, 'p', 'journal:answer', { index: 1, text: 'empat' }), null);
  assert.ok(act(g, 'p', 'journal:answer', { index: 1, text: 'empat' }));
  const other = newGame('o', 'wallclock'); act(other, 'gm', 'start', {}, true, () => 0);
  assert.ok(act(other, 'p', 'journal:answer', { index: 0, text: 'x' }));
});
