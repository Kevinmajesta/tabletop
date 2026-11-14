// Mengimpor Monster Manual 2024 (XMM) dari salinan lokal 5etools menjadi stat block ringkas.
// Pemakaian: node scripts/import-5etools-bestiary.mjs [D:/5etools-src]
// Hasil: server/catalog/monsters-xmm.json (hanya untuk dipakai sendiri; teks non-SRD adalah hak cipta Wizards of the Coast).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'D:/5etools-src');
const source = JSON.parse(readFileSync(path.join(root, 'data/bestiary/bestiary-xmm.json'), 'utf8'));
const out = path.resolve('server/catalog/monsters-xmm.json');

const abilityName = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const sizeName = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
const tokenSize = { T: 1, S: 1, M: 1, L: 2, H: 3, G: 4 };
const alignWord = { L: 'Lawful', C: 'Chaotic', N: 'Neutral', G: 'Good', E: 'Evil', U: 'Unaligned', A: 'Any alignment' };
const crXp = { 0: 10, '1/8': 25, '1/4': 50, '1/2': 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
const crNumber = (cr) => (cr.includes('/') ? Number(cr.split('/')[0]) / Number(cr.split('/')[1]) : Number(cr));
const profFor = (cr) => Math.max(2, Math.ceil(Math.max(1, crNumber(cr)) / 4) + 1);
const typeColor = { aberration: '#6a5a8c', beast: '#8f6b45', celestial: '#c9a45c', construct: '#7c8288', dragon: '#c0453a', elemental: '#4f8fa8', fey: '#6fae7f', fiend: '#b0403a', giant: '#b0703f', humanoid: '#c9a45c', monstrosity: '#8e6aa8', ooze: '#7a9a3a', plant: '#5f8f4e', undead: '#a7b8a0' };
const mod = (n) => Math.floor((n - 10) / 2);
const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Ubah tag 5etools ({@hit 4}, {@damage 1d6 + 2}, ...) jadi teks biasa.
function plain(text) {
  let s = String(text);
  for (let i = 0; i < 4 && s.includes('{@'); i++) {
    s = s.replace(/\{@(\w+)\s*([^{}]*)\}/g, (_, tag, body) => {
      const parts = body.split('|');
      switch (tag) {
        case 'atkr': return `${body.split(',').map((t) => (t.trim() === 'm' ? 'Melee' : 'Ranged')).join(' or ')} Attack Roll:`;
        case 'atk': return `${/m/.test(body) ? 'Melee' : ''}${/m/.test(body) && /r/.test(body) ? ' or ' : ''}${/r/.test(body) ? 'Ranged' : ''} Attack:`;
        case 'hit': return `${Number(body) >= 0 ? '+' : ''}${body}`;
        case 'h': return 'Hit: ';
        case 'hom': return 'Hit or Miss: ';
        case 'dc': return `DC ${parts[0]}`;
        case 'actSave': return `${abilityName[body] || cap(body)} Saving Throw:`;
        case 'actSaveFail': return parts[0] ? `Failure by ${parts[0]} or More:` : 'Failure:';
        case 'actSaveFailBy': return `Failure by ${parts[0]} or More:`;
        case 'actSaveSuccess': return 'Success:';
        case 'actSaveSuccessOrFail': return 'Failure or Success:';
        case 'actTrigger': return 'Trigger:';
        case 'actResponse': return 'Response:';
        case 'recharge': return `(Recharge ${parts[0] ? `${parts[0]}–6` : '6'})`;
        default: return parts[2] || parts[0];
      }
    });
  }
  return s.replace(/\s+/g, ' ').trim();
}
// Gabungkan entries bertingkat (list, entries bernama) jadi satu teks.
function flatten(entries) {
  return (entries || []).map((e) => {
    if (typeof e === 'string') return plain(e);
    if (e.type === 'list') return (e.items || []).map((it) => `• ${typeof it === 'string' ? plain(it) : `${it.name ? `${plain(it.name)}. ` : ''}${flatten(it.entries || [it.entry || ''])}`}`).join('\n');
    if (e.entries) return `${e.name ? `${plain(e.name)}. ` : ''}${flatten(e.entries)}`;
    if (e.entry) return plain(e.entry);
    return '';
  }).filter(Boolean).join('\n');
}
function block(entry) {
  const raw = JSON.stringify(entry.entries || []);
  let name = plain(entry.name || '');
  let usage;
  const recharge = (entry.name || '').match(/\{@recharge\s*(\d?)\}/);
  if (recharge) { usage = `Recharge ${recharge[1] ? `${recharge[1]}–6` : '6'}`; name = name.replace(/\s*\(Recharge[^)]*\)/, ''); }
  const out = { name, desc: flatten(entry.entries) };
  const hit = raw.match(/\{@hit (-?\d+)\}/);
  if (hit) out.attack = Number(hit[1]);
  const damage = [...raw.matchAll(/\{@damage ([^}]+)\}\)?\s*([A-Za-z]+)? ?damage/gi)].map((m) => ({ dice: m[1].replace(/\s+/g, ''), type: (m[2] || '').toLowerCase() }));
  const extra = [...raw.matchAll(/\{@damage ([^}]+)\}/g)].map((m) => m[1].replace(/\s+/g, '')).filter((d) => !damage.some((x) => x.dice === d));
  const all = [...damage, ...extra.map((dice) => ({ dice, type: '' }))].filter((d) => /^\d+d\d+([+-]\d+)?$/.test(d.dice));
  if (all.length) out.damage = all.slice(0, 4);
  const dc = raw.match(/\{@dc (\d+)\}/);
  if (dc) {
    const save = raw.match(/\{@actSave (\w+)\}/);
    out.dc = { ability: save ? save[1].toUpperCase() : undefined, value: Number(dc[1]) };
  }
  if (usage) out.usage = usage;
  return out;
}
function spellcasting(sc) {
  const lines = [flatten(sc.headerEntries || [])];
  if (sc.will) lines.push(`At will: ${sc.will.map(plain).join(', ')}`);
  for (const [n, list] of Object.entries(sc.daily || {})) lines.push(`${n.replace('e', '')}/day${n.endsWith('e') ? ' each' : ''}: ${list.map(plain).join(', ')}`);
  for (const [lvl, data] of Object.entries(sc.spells || {})) lines.push(`${lvl === '0' ? 'Cantrips' : `Level ${lvl}`}${data.slots ? ` (${data.slots} slot)` : ''}: ${(data.spells || []).map(plain).join(', ')}`);
  if (sc.footerEntries) lines.push(flatten(sc.footerEntries));
  const raw = JSON.stringify(sc);
  const dc = raw.match(/\{@dc (\d+)\}/);
  return { name: plain(sc.name || 'Spellcasting'), desc: lines.filter(Boolean).join('\n'), ...(dc ? { dc: { ability: undefined, value: Number(dc[1]) } } : {}), displayAs: sc.displayAs || 'trait' };
}
const damageList = (list, key) => (list || []).map((x) => (typeof x === 'string' ? x : x.special ? plain(x.special) : `${(x[key] || []).map((y) => (typeof y === 'string' ? y : '')).filter(Boolean).join(', ')}${x.note ? ` ${x.note}` : ''}${x.cond ? '' : ''}`)).filter(Boolean).map(plain).join('; ');
function alignment(a) {
  if (!a?.length) return 'unaligned';
  if (typeof a[0] === 'object') return a.map((x) => x.special || x.alignment?.map((c) => alignWord[c]).join(' ')).join(' or ').toLowerCase();
  if (a.length === 1) return (a[0] === 'N' ? 'Neutral' : alignWord[a[0]]).toLowerCase();
  if (a.length > 2) return 'any alignment';
  return a.map((c) => alignWord[c]).join(' ').toLowerCase();
}

const result = {};
for (const m of source.monster) {
  if (m._copy) continue;
  const key = `xmm:${slug(m.name)}`;
  const type = typeof m.type === 'string' ? m.type : m.type?.type?.choose ? m.type.type.choose.join('/') : m.type?.type || 'monster';
  const tags = typeof m.type === 'object' && m.type.tags ? m.type.tags.map((t) => (typeof t === 'string' ? t : t.tag)).join(', ') : '';
  const size = (m.size || ['M'])[0];
  const ac = Array.isArray(m.ac) ? m.ac[0] : m.ac;
  const acValue = typeof ac === 'number' ? ac : ac?.ac ?? 10;
  const cr = typeof m.cr === 'object' ? m.cr.cr : m.cr || '0';
  const prof = profFor(cr);
  const init = mod(m.dex) + (typeof m.initiative === 'object' ? (m.initiative.proficiency || 0) * prof : typeof m.initiative === 'number' ? m.initiative : 0);
  const casting = (m.spellcasting || []).map(spellcasting);
  const speed = Object.entries(m.speed || {}).filter(([k]) => k !== 'canHover' && k !== 'choose').map(([k, v]) => {
    const n = typeof v === 'object' ? `${v.number} ft.${v.condition ? ` ${plain(v.condition)}` : ''}` : `${v} ft.`;
    return k === 'walk' ? n : `${k} ${n}`;
  }).join(', ') + (m.speed?.canHover ? ' (hover)' : '');
  result[key] = {
    name: m.name, source: `XMM p.${m.page}`, srd: !!m.srd52,
    group: cap(type), tokenSize: tokenSize[size] || 1, color: typeColor[type] || '#7c8288',
    meta: `${sizeName[size] || size} ${type}${tags ? ` (${tags})` : ''}, ${alignment(m.alignment)}`,
    ac: acValue, acNote: typeof ac === 'object' && ac.from ? ac.from.map(plain).join(', ') : '',
    hp: m.hp?.average ?? 1, hitDice: m.hp?.formula || m.hp?.special || '',
    speed,
    abilities: { str: m.str, dex: m.dex, con: m.con, int: m.int, wis: m.wis, cha: m.cha },
    saves: Object.entries(m.save || {}).map(([k, v]) => [k.toUpperCase(), Number(String(v).replace(/[^-\d]/g, ''))]),
    skills: Object.entries(m.skill || {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => [cap(k), Number(String(v).replace(/[^-\d]/g, ''))]),
    vulnerabilities: damageList(m.vulnerable, 'vulnerable'),
    resistances: damageList(m.resist, 'resist'),
    immunities: damageList(m.immune, 'immune'),
    conditionImmunities: (m.conditionImmune || []).map((x) => (typeof x === 'string' ? x : (x.conditionImmune || []).join(', '))).join(', '),
    senses: [...(m.senses || []).map(plain), `passive Perception ${m.passive ?? 10 + mod(m.wis)}`].join(', '),
    languages: (m.languages || []).map(plain).join(', ') || '—',
    cr, xp: crXp[cr] ?? 0, prof, init,
    traits: [...(m.trait || []).map((t) => ({ name: plain(t.name), desc: flatten(t.entries) })), ...casting.filter((c) => c.displayAs === 'trait').map(({ displayAs, ...c }) => c)],
    actions: [...(m.action || []).map(block), ...casting.filter((c) => c.displayAs === 'action').map(({ displayAs, ...c }) => c)],
    bonus: [...(m.bonus || []).map(block), ...casting.filter((c) => c.displayAs === 'bonus').map(({ displayAs, ...c }) => c)],
    reactions: (m.reaction || []).map((t) => ({ name: plain(t.name), desc: flatten(t.entries) })),
    legendary: (m.legendary || []).map((t) => ({ name: plain(t.name), desc: flatten(t.entries) })),
  };
}
writeFileSync(out, JSON.stringify(result));
console.log(`${Object.keys(result).length} monster → ${path.relative(process.cwd(), out)} (${Math.round(JSON.stringify(result).length / 1024)} KB)`);
