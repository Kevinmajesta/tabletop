import { test } from 'node:test';
import { generalFeats } from '../dist-server/catalog/feats-2024.js';
// PHB findings/evidence: docs/audit-phb-origins-detail.json, audit-phb-origins-ledger.json;
// retrieved full feat text: audit-origins-roll20-feats.json and audit-origins-retry.json.
// Licensed Roll20 evidence is distinct from publisher Free Rules (Human size).
const feat = id => generalFeats.find(f => f.index === id);
test('sharpshooter has no invented martial prerequisite', () => { assert.notEqual(feat('sharpshooter').requires, 'martial'); });
test('sentinel has no invented martial prerequisite', () => { assert.notEqual(feat('sentinel').requires, 'martial'); });
test('polearm-master has no invented martial prerequisite', () => { assert.notEqual(feat('polearm-master').requires, 'martial'); });
test('great-weapon-master has no invented martial prerequisite', () => { assert.notEqual(feat('great-weapon-master').requires, 'martial'); });
test('dual-wielder has no invented martial prerequisite', () => { assert.notEqual(feat('dual-wielder').requires, 'martial'); });
test('crossbow-expert has no invented martial prerequisite', () => { assert.notEqual(feat('crossbow-expert').requires, 'martial'); });
test('War Caster Reactive Spell requires leaving reach and one action', () => { assert.match(feat('war-caster').description,/meninggalkan reach.*casting time 1 action.*hanya makhluk itu/); });
test('Skulker protects any hidden missed attack roll', () => { assert.match(feat('skulker').description,/attack roll meleset saat hidden/); assert.doesNotMatch(feat('skulker').description,/ranged miss/); });
test('Sentinel Guardian triggers on hits and is an Opportunity Attack', () => { const d=feat('sentinel').description; assert.match(d,/Segera setelah makhluk dalam 5 ft memakai Disengage atau mengenai target selain dirimu dengan attack, dapat Opportunity Attack/); assert.match(d,/Speed target 0 sampai akhir giliran saat ini/); });
test('Poisoner includes application potency DC damage and duration', () => { const d=feat('poisoner').description; for (const p of [/bonus action/i,/1 menit atau sampai item memberi damage/,/CON save DC 8\+PB\+modifier ability yang dinaikkan feat ini/,/2d8 Poison/,/Poisoned sampai akhir giliranmu berikutnya/]) assert.match(d,p); });
test('Mounted Combatant preserves range mount size and incapacitation limits', () => { const d=feat('mounted-combatant').description; for (const p of [/Advantage attack roll/,/tidak mounted dalam 5 ft dari mount/,/minimal satu ukuran lebih kecil/,/keduanya tidak incapacitated/,/setengah jika gagal/,/hit pada mount menjadi hit padamu jika kamu tidak incapacitated/]) assert.match(d,p); });
test('Heavy Armor Master only reduces damage from an attack hit', () => { assert.match(feat('heavy-armor-master').description,/damage dari attack yang mengenaimu/); });
test('Crossbow Expert permits loading without a free hand', () => { assert.match(feat('crossbow-expert').description,/tanpa tangan kosong/); });
test('Actor Mimicry has Insight DC without a listening duration', () => { assert.doesNotMatch(feat('actor').description,/1 menit/); assert.match(feat('actor').description,/Insight\) check DC 8\+CHA\+PB/); });
import assert from 'node:assert/strict';
import { motmSpecies, motmTraits } from '../dist-server/catalog/motm.js';
import { speciesGuide } from '../dist-server/catalog/species-guide.js';
import * as phb from '../dist-server/catalog/phb-species.js';
test('PHB Human supports Small and Medium per official Origins source', () => assert.deepEqual(phb.phbSpeciesSizes?.human, ['Medium','Small']));
const text = id => motmSpecies.find(s => s.id === id).text;
test('MOTM-05 guide uses valid selected size, rejecting stale invalid selections', () => { for (const s of motmSpecies.filter(s=>s.sizes?.length>1)) { const catalog={races:[{index:`motm:${s.id}`,name:s.name}],subraces:[],traits:[]}; assert.equal(speciesGuide({race:`motm:${s.id}`,choices:{'motm.size':['Small']}},catalog).size,'Small'); assert.equal(speciesGuide({race:`motm:${s.id}`,choices:{'motm.size':['Invalid']}},catalog).size,'Medium / Small'); } });
test('Eladrin does not need sleep independently of magical sleep immunity', () => { assert.match(text('eladrin'), /Tidak perlu tidur; Trance sadar 4 jam/); });
test('all MotM Darkvision includes dim as bright and grayscale darkness', () => { for (const s of motmSpecies.filter(s=>s.dark)) assert.match(motmTraits.find(t=>t.index===`motm:${s.id}`).desc[0], /redup menjadi terang, gelap menjadi redup; dalam gelap hanya gradasi abu-abu/); });
test('Raven Queen teleport requires a visible unoccupied destination', () => { assert.match(text('shadar-kai'), /teleport ke ruang kosong yang terlihat dalam 30 ft/); });
test('Fey Step requires a visible unoccupied destination', () => { assert.match(text('eladrin'), /Fey Step: bonus action teleport ke ruang kosong yang terlihat dalam 30 ft/); });
test('Spring allows a willing neutral creature and constrained destination', () => { assert.match(text('eladrin'), /Spring sentuh makhluk rela dalam 5 ft.*ruang kosong pilihanmu yang terlihat dalam 30 ft/); });
// MOTM-01..06; secondary source evidence: docs/audit-motm-detail.json + audit-motm-ledger.json.
test('MOTM-01 Shroud includes seeing non-allies, not only enemies', () => {
  assert.match(text('aasimar'), /makhluk selain sekutu yang melihat dalam 10 ft/);
});
