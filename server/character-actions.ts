import { deriveSheet, spellLimits, catalogFor, validateBuild, type Character } from './characters.js';

export function adjustHealth(character: Character, kind: 'damage' | 'heal', amount: number) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) throw new Error('Jumlah harus bilangan bulat 1–9999.');
  if (kind === 'damage') {
    const absorbed = Math.min(character.tempHp, amount);
    character.tempHp -= absorbed;
    character.hp = Math.max(0, character.hp - (amount - absorbed));
    if (character.concentration) character.concentrationSaveDC = Math.min(30, Math.max(10, Math.floor(amount / 2)));
  } else character.hp = Math.min(character.sheet.hp, character.hp + amount);
  if (character.hp === 0) { character.concentration = ''; character.concentrationSaveDC = undefined; }
  else if (kind === 'heal') { character.deathSuccess = 0; character.deathFailure = 0; }
}

export function updatePrepared(character: Character, submitted: unknown) {
  if (!['wizard','cleric','druid','paladin'].includes(character.build.classId)) throw new Error('Class ini mengganti prepared spells lewat naik level.');
  if (!Array.isArray(submitted) || submitted.some(id => typeof id !== 'string') || new Set(submitted).size !== submitted.length) throw new Error('Daftar spell tidak valid.');
  const build = structuredClone(character.build), limits = spellLimits(build), catalog = catalogFor(build);
  const bonusBook = [...build.choices['subclass.savant'] || [], ...build.choices['subclass.savant.5'] || []];
  if (build.classId === 'wizard') {
    if (submitted.length !== limits.prepared || submitted.some(id => ![...build.spells,...bonusBook].includes(id))) throw new Error(`Pilih ${limits.prepared} spell dari spellbook.`);
    build.prepared = submitted;
  } else {
    if (submitted.length !== limits.spells || submitted.some(id => !catalog.spells.some(s => s.index === id && s.level && s.level <= limits.maxSpellLevel && s.classes?.some(c => c.index === build.classId)))) throw new Error(`Pilih ${limits.spells} spell dari daftar class.`);
    build.spells = submitted;
  }
  const result = validateBuild(build);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  character.build = result.build!;
  character.sheet = deriveSheet(result.build!);
}
