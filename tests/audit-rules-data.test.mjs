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
test('War Caster Reactive Spell requires leaving reach and one action', () => {
 const d=feat('war-caster').description;
 assert.match(d,/provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack/);
 assert.match(d,/casting time of one action and must target only that creature/);
});
test('Skulker protects any hidden missed attack roll', () => {
 assert.match(feat('skulker').description,/If you make an attack roll while hidden and the roll misses, making the attack roll doesn't reveal your location/);
 assert.doesNotMatch(feat('skulker').description,/ranged (?:attack|miss)/i);
});
test('Sentinel Guardian triggers on hits and is an Opportunity Attack', () => {
 const d=feat('sentinel').description;
 assert.match(d,/Immediately after a creature within 5 feet of you takes the Disengage action or hits a target other than you with an attack, you can make an Opportunity Attack against that creature/);
 assert.match(d,/When you hit a creature with an Opportunity Attack, the creature's Speed becomes 0 for the rest of the current turn/);
});
test('Poisoner includes application potency DC damage and duration', () => {
 const d=feat('poisoner').description;
 for (const p of [/As a Bonus Action, you can apply a poison dose to a weapon or piece of ammunition/,/retains its potency for 1 minute or until you deal damage with the poisoned item, whichever is shorter/,/Constitution saving throw \(8 plus the modifier of the ability increased by this feat and your Proficiency Bonus\)/,/or take 2d8 Poison damage and have the Poisoned condition until the end of your next turn/]) assert.match(d,p);
});
test('Mounted Combatant preserves range mount size and incapacitation limits', () => {
 const d=feat('mounted-combatant').description;
 for (const p of [/While mounted, you have Advantage on attack rolls against any unmounted creature within 5 feet of your mount that is at least one size smaller than the mount/,/Dexterity saving throw to take only half damage, it instead takes no damage if it succeeds on the saving throw and only half damage if it fails/,/you must be riding it, and neither of you can have the Incapacitated condition/,/While mounted, you can force an attack that hits your mount to hit you instead if you don't have the Incapacitated condition/]) assert.match(d,p);
});
test('Heavy Armor Master only reduces damage from an attack hit', () => {
 assert.match(feat('heavy-armor-master').description,/When you're hit by an attack while you're wearing Heavy armor, any Bludgeoning, Piercing, and Slashing damage dealt to you by that attack is reduced by an amount equal to your Proficiency Bonus/);
});
test('Crossbow Expert permits loading without a free hand', () => {
 assert.match(feat('crossbow-expert').description,/If you're holding one of them, you can load a piece of ammunition into it even if you lack a free hand/);
});
test('Actor Mimicry has Insight DC without a listening duration', () => {
 assert.doesNotMatch(feat('actor').description,/(?:1|one) (?:menit|minute)/i);
 assert.match(feat('actor').description,/Wisdom \(Insight\) check to determine the effect is faked \(8 plus your Charisma modifier and Proficiency Bonus\)/);
});
import assert from 'node:assert/strict';
import { motmSpecies, motmTraits } from '../dist-server/catalog/motm.js';
import { speciesGuide } from '../dist-server/catalog/species-guide.js';
import * as phb from '../dist-server/catalog/phb-species.js';
test('PHB Human supports Small and Medium per official Origins source', () => assert.deepEqual(phb.phbSpeciesSizes?.human, ['Medium','Small']));
const text = id => motmSpecies.find(s => s.id === id).text;
test('MOTM-05 guide uses valid selected size, rejecting stale invalid selections', () => { for (const s of motmSpecies.filter(s=>s.sizes?.length>1)) { const catalog={races:[{index:`motm:${s.id}`,name:s.name}],subraces:[],traits:[]}; assert.equal(speciesGuide({race:`motm:${s.id}`,choices:{'motm.size':['Small']}},catalog).size,'Small'); assert.equal(speciesGuide({race:`motm:${s.id}`,choices:{'motm.size':['Invalid']}},catalog).size,'Medium / Small'); } });
test('Eladrin does not need sleep independently of magical sleep immunity', () => { assert.match(text('eladrin'), /(?:Tidak perlu tidur; Trance sadar 4 jam|You don't need to sleep, and magic can't put you to sleep\. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness)/); });
test('all MotM Darkvision includes dim as bright and grayscale darkness', () => { for (const s of motmSpecies.filter(s=>s.dark)) assert.match(motmTraits.find(t=>t.index===`motm:${s.id}`).desc.join(' '), /(?:redup menjadi terang, gelap menjadi redup; dalam gelap hanya gradasi abu-abu|dim light within \d+ feet of you as if it were bright light and in darkness as if it were dim light\. You discern colors in that darkness only as shades of gray)/); });
test('Raven Queen teleport requires a visible unoccupied destination', () => { assert.match(text('shadar-kai'), /(?:teleport ke ruang kosong yang terlihat dalam 30 ft|teleport up to 30 feet to an unoccupied space you can see)/); });
test('Fey Step requires a visible unoccupied destination', () => { assert.match(text('eladrin'), /(?:Fey Step: bonus action teleport ke ruang kosong yang terlihat dalam 30 ft|Fey Step\s+As a bonus action, you can magically teleport up to 30 feet to an unoccupied space you can see)/); });
test('Spring allows a willing neutral creature and constrained destination', () => { assert.match(text('eladrin'), /(?:Spring sentuh makhluk rela dalam 5 ft.*ruang kosong pilihanmu yang terlihat dalam 30 ft|Spring\s+When you use your Fey Step, you can touch one willing creature within 5 feet of you\. That creature then teleports instead of you, appearing in an unoccupied space of your choice that you can see within 30 feet of you)/); });
// MOTM-01..06; secondary source evidence: docs/audit-motm-detail.json + audit-motm-ledger.json.
test('MOTM-01 Shroud includes seeing non-allies, not only enemies', () => {
  assert.match(text('aasimar'), /(?:makhluk selain sekutu yang melihat dalam 10 ft|Creatures other than your allies within 10 feet of you that can see you)/);
});
