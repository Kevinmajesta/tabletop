// Istirahat karakter (Short/Long Rest) dalam satu tempat, dipakai tombol di sheet dan tombol Rest milik DM.
// Mengikuti aturan 2024: Long Rest memulihkan HP, semua spell slot, semua kemampuan, dan semua Hit Dice.
// Short Rest memulihkan kemampuan "short rest" (dan slot Pact Magic Warlock); HP dipulihkan dengan memakai Hit Dice.
import { resources } from './resources.js';
import type { Character } from './characters.js';

export type RestKind = 'short' | 'long';
export type RestResult = {
  name: string; kind: RestKind; hpBefore: number; hpAfter: number; maxHp: number;
  slots: number; restored: string[]; hitDice: { die: number; con: number; rolls: number[]; healed: number } | null;
};

const usedSlots = (c: Character) => Object.values(c.spellSlotsUsed || {}).reduce((a, b) => a + (b || 0), 0) + (c.slotsUsed || 0);
export const hitDiceLeft = (c: Character) => Math.max(0, c.sheet.level - (c.resourcesUsed?.['hit-dice'] || 0));

// Pakai Hit Dice satu per satu sampai jumlah yang diminta, Hit Dice habis, atau HP penuh.
export function spendHitDice(c: Character, count: number, die: number, roll: (sides: number) => number) {
  const rolls: number[] = [];
  let healed = 0;
  const con = c.sheet.modifiers.con;
  while (rolls.length < count && hitDiceLeft(c) > 0 && c.hp < c.sheet.hp) {
    const r = roll(die);
    const gain = Math.max(1, r + con);
    const before = c.hp;
    c.hp = Math.min(c.sheet.hp, c.hp + gain);
    healed += c.hp - before;
    rolls.push(r);
    c.resourcesUsed ||= {};
    c.resourcesUsed['hit-dice'] = (c.resourcesUsed['hit-dice'] || 0) + 1;
  }
  return rolls.length ? { die, con, rolls, healed } : null;
}

export function applyRest(c: Character, kind: RestKind, opts: { hitDice?: number; die?: number; roll?: (sides: number) => number } = {}): RestResult {
  const hpBefore = c.hp;
  const restored: string[] = [];
  c.resourcesUsed ||= {};
  for (const resource of resources(c.build, c.sheet)) {
    const used = c.resourcesUsed[resource.id] || 0;
    if (!used) continue;
    let next = used;
    if (kind === 'long' || resource.shortRest) next = 0;
    else if (resource.shortRecovery) next = Math.max(0, used - resource.shortRecovery);
    if (next !== used) { c.resourcesUsed[resource.id] = next; restored.push(resource.name); }
  }
  let slots = 0;
  if (kind === 'long' || c.build.classId === 'warlock') {
    slots = usedSlots(c);
    c.spellSlotsUsed = {};
    c.slotsUsed = 0;
  }
  if (kind === 'long') {
    c.hp = c.sheet.hp;
    c.tempHp = 0;
    c.deathSuccess = 0;
    c.deathFailure = 0;
    c.concentration = '';
    c.concentrationSaveDC = undefined;
  }
  const hitDice = kind === 'short' && opts.hitDice && opts.die && opts.roll ? spendHitDice(c, Math.min(20, opts.hitDice), opts.die, opts.roll) : null;
  return { name: c.sheet.name, kind, hpBefore, hpAfter: c.hp, maxHp: c.sheet.hp, slots, restored, hitDice };
}

// Ringkasan untuk chat, mis. "Rana · HP 12 → 30, 3 spell slot, Rage pulih".
export function restSummary(r: RestResult) {
  const parts: string[] = [];
  if (r.hpAfter !== r.hpBefore) parts.push(`HP ${r.hpBefore} → ${r.hpAfter}/${r.maxHp}`);
  if (r.hitDice) parts.push(`${r.hitDice.rolls.length} Hit Dice d${r.hitDice.die} [${r.hitDice.rolls.join(', ')}]${r.hitDice.con ? ` ${r.hitDice.con > 0 ? '+' : '−'}${Math.abs(r.hitDice.con)}/dadu` : ''} = +${r.hitDice.healed} HP`);
  const recovered = [...(r.slots ? [`${r.slots} spell slot`] : []), ...r.restored];
  if (recovered.length) parts.push(`${recovered.join(', ')} pulih`);
  if (!parts.length && r.hpAfter < r.maxHp) parts.push(`HP ${r.hpAfter}/${r.maxHp} · bisa pakai Hit Dice untuk memulihkan HP`);
  return `${r.name} · ${parts.length ? parts.join(' · ') : 'sudah segar, tidak ada yang perlu dipulihkan'}`;
}
