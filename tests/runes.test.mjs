import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runeExamples, runeTasks, runeAnswers, runeKeys, normalizeRunes } from '../dist-server/runes.js';
import { newGame, gameAction, gameView } from '../dist-server/minigames.js';

// Tata bahasa ditulis ulang di sini secara terpisah, lalu semua contoh dan jawaban dibangkitkan darinya.
const noun = { raja: 'ᚱᚨᚲ', naga: 'ᚦᚢᚱ', kurcaci: 'ᛞᚹᛖ', harta: 'ᚷᛟᛚ', gerbang: 'ᛒᚨᚱ' };
const verb = { tidur: 'ᛊᛚᛖ', menjaga: 'ᚹᚨᚱ', membuka: 'ᛟᛈᛖ', mencuri: 'ᛏᚺᚠ' };
const np = ({ n, pl, of }) => noun[n] + (pl ? 'ᛁ' : '') + (of ? ' ' + np(of) + 'ᛊ' : '');
function sentence({ v, neg, past, subj, obj }) {
  const V = (neg ? 'ᛜ' : '') + verb[v] + (past ? 'ᛞ' : '');
  const parts = !obj ? [V, np(subj)] : neg ? [V, np(obj), np(subj)] : [V, np(subj), np(obj)];
  return parts.join(' ');
}
const examples = [
  { v: 'membuka', past: true, subj: { n: 'raja' }, obj: { n: 'gerbang', pl: true } },
  { v: 'tidur', subj: { n: 'raja' } },
  { v: 'menjaga', neg: true, subj: { n: 'kurcaci', pl: true }, obj: { n: 'gerbang' } },
  { v: 'menjaga', subj: { n: 'naga' }, obj: { n: 'harta' } },
  { v: 'tidur', neg: true, subj: { n: 'naga' } },
  { v: 'mencuri', past: true, subj: { n: 'kurcaci' }, obj: { n: 'harta' } },
  { v: 'tidur', subj: { n: 'kurcaci', pl: true } },
  { v: 'mencuri', neg: true, subj: { n: 'raja' }, obj: { n: 'harta' } },
  { v: 'membuka', subj: { n: 'naga' }, obj: { n: 'gerbang', of: { n: 'kurcaci', pl: true } } },
];
const tasks = [
  { v: 'tidur', subj: { n: 'naga', pl: true } },
  { v: 'membuka', neg: true, subj: { n: 'raja', pl: true }, obj: { n: 'gerbang' } },
  { v: 'membuka', past: true, subj: { n: 'kurcaci' }, obj: { n: 'gerbang', pl: true, of: { n: 'raja' } } },
  { v: 'menjaga', neg: true, subj: { n: 'naga', pl: true }, obj: { n: 'harta', of: { n: 'kurcaci', pl: true } } },
];

test('setiap contoh dan jawaban patuh pada satu tata bahasa yang sama', () => {
  assert.equal(runeExamples.length, examples.length);
  examples.forEach((e, i) => assert.equal(runeExamples[i].runes, sentence(e), runeExamples[i].meaning));
  assert.equal(runeAnswers.length, runeTasks.length);
  tasks.forEach((t, i) => assert.equal(runeAnswers[i], sentence(t), runeTasks[i]));
});

test('semua akar kata dan imbuhan di jawaban sudah muncul di contoh, dan semua rune ada di papan', () => {
  const seen = runeExamples.map(e => e.runes).join(' ');
  for (const root of [...Object.values(noun), ...Object.values(verb)]) {
    const inAnswers = runeAnswers.some(a => a.includes(root));
    if (inAnswers) assert.ok(seen.includes(root), `akar ${root} belum pernah dicontohkan`);
  }
  for (const [affix, label] of [['ᛁ', 'jamak'], ['ᛜ', 'sangkal'], ['ᛞ', 'lampau'], ['ᛊ', 'milik']]) assert.ok(seen.includes(affix), label);
  // Urutan Kerja–Objek–Subjek pada kalimat sangkal transitif dicontohkan dua kali.
  assert.equal(examples.filter(e => e.neg && e.obj).length, 2);
  for (const ch of runeAnswers.join('').replace(/ /g, '')) assert.ok(runeKeys.includes(ch), ch);
});

const act = (game, id, type, data = {}) => gameAction(game, id, false, { type, ...data });

test('alur bermain: ukir, salah tanpa batas, spasi dirapikan, empat pintu terbuka', () => {
  const game = newGame('r1', 'runes');
  assert.equal(gameAction(game, 'dm', true, { type: 'start' }), null);
  assert.equal(gameView(game, 'p1', false).runes.answers, undefined);
  assert.deepEqual(gameView(game, 'dm', true).runes.answers, runeAnswers);
  assert.match(act(game, 'p1', 'runes:draft', { text: 'abc' }), /Hanya rune/);
  assert.match(act(game, 'p1', 'runes:submit'), /Ukir/);
  for (let i = 0; i < 10; i++) {
    assert.equal(act(game, 'p1', 'runes:draft', { text: 'ᛊᛚᛖ ᚦᚢᚱ' }), null);
    assert.equal(act(game, 'p1', 'runes:submit'), null);
  }
  assert.equal(game.runes.misses, 10);
  assert.equal(game.phase, 'open');
  assert.equal(normalizeRunes('  ᛊᛚᛖ   ᚦᚢᚱᛁ '), runeAnswers[0]);
  assert.equal(act(game, 'p2', 'runes:draft', { text: '  ᛊᛚᛖ   ᚦᚢᚱᛁ ' }), null);
  assert.equal(act(game, 'p2', 'runes:submit'), null);
  assert.equal(game.runes.task, 1);
  assert.deepEqual(gameView(game, 'p1', false).runes.solved, [runeAnswers[0]]);
  for (const a of runeAnswers.slice(1)) {
    assert.equal(act(game, 'p1', 'runes:draft', { text: a }), null);
    assert.equal(act(game, 'p1', 'runes:submit'), null);
  }
  assert.equal(game.phase, 'finished');
  assert.ok(gameView(game, 'p2', false).runes.reward.length > 0);
});
