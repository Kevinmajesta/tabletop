# Audit rules data fixes

## Changes

- `motm.ts`: fixed MOTM-01 through MOTM-04 and MOTM-06 (non-allies, willing neutral Spring target, visible unoccupied teleport destinations, complete Darkvision light rules, Eladrin no-sleep clause). Evidence and authority: `audit-motm-detail.json` bugs and `audit-motm-ledger.json` sources 2, 3, 8, 28. These are secondary Wikidot comparisons; official detailed MotM chapters remained inaccessible, not publisher verification.
- `species-guide.ts`: fixed MOTM-05 for all ten selectable-size MotM species, using only valid selected sizes; stale invalid selections fall back to allowed sizes. Also reads PHB `race.size` for Human/Aasimar.
- `phb-species.ts`: exports `phbSpeciesSizes` for Human and Aasimar. Human allows Medium or Small.[1]
- `feats-2024.ts`: removed the invented martial requirement from Crossbow Expert, Dual Wielder, Great Weapon Master, Polearm Master, Sentinel, and Sharpshooter while preserving ability minima (the other three prerequisite sources are ledger entries 27, 30, and 32).[6][9][13]
- Actor: removed 2014 listening-duration restriction, supplied Insight DC; Crossbow Expert: loading without a free hand; Heavy Armor Master: attack-hit damage only.[3][6][15]
- Mounted Combatant: all attack rolls, unmounted smaller target within 5 ft of mount, precise mount DEX-save benefit and incapacitation restrictions; Poisoner: kit/materials/doses, bonus-action application, potency, DC, damage, condition duration.[23][26]
- Sentinel: immediate hit/Disengage trigger, Opportunity Attack and current-turn Halt; Skulker: any missed hidden attack roll; War Caster: reach-leaving trigger, one-action spell, only triggering creature.[30][35][41]

## Verification

`npx tsc -p tsconfig.server.json && node --test tests/audit-rules-data.test.mjs`

22/22 passed. Every corrective slice was first run RED against compiled pre-fix data, then GREEN after its minimal change. One Actor test regex was corrected to allow the natural `WIS (Insight) check` wording after it caught the original listening-duration error.

`npx tsc -p tsconfig.server.json && node --test tests/audit-rules-data.test.mjs tests/motm.test.mjs tests/motm-mechanics.test.mjs tests/species-guide.test.mjs tests/lineage-audit.test.mjs`

37/37 passed, including all 33 MotM species at levels 1–5 and every 2024 background. No dependencies, commits, combat-state automation, snapshot JSON edits, or UI edits.

## Integration / limits

Server owner must wire `phbSpeciesSizes` into Human catalog metadata and `race.size` choice generation in `characters.ts` (same key as Aasimar). Elf choices, redundant Human Skillful choice, and any additional server prerequisite logic belong to the server agent, not this data patch. Full-suite/integrated browser verification belongs to the parent agent.

Source availability caveats in both audits remain: licensed Roll20 PHB pages are not publisher pages; partial/unavailable paid entries and unverified full spell bodies are not newly certified. No new claims of complete rules automation.

## Sources

[1] https://www.dndbeyond.com/sources/dnd/free-rules/character-origins — Official Free Rules Origins
[3] https://roll20.net/compendium/dnd5e/Feats:Actor?expansion=32231 — Actor | D&D 2024 | Roll20 Compendium
[6] https://roll20.net/compendium/dnd5e/Feats:Crossbow%20Expert?expansion=32231 — Crossbow Expert | D&D 2024 | Roll20 Compendium
[9] https://roll20.net/compendium/dnd5e/Feats:Dual%20Wielder?expansion=32231 — Dual Wielder | D&D 2024
[13] https://roll20.net/compendium/dnd5e/Feats:Great%20Weapon%20Master?expansion=32231 — Great Weapon Master | D&D 2024
[15] https://roll20.net/compendium/dnd5e/Feats:Heavy%20Armor%20Master?expansion=32231 — Heavy Armor Master | D&D 2024 | Roll20 Compendium
[23] https://roll20.net/compendium/dnd5e/Feats:Mounted%20Combatant?expansion=32231 — Mounted Combatant | D&D 2024
[26] https://roll20.net/compendium/dnd5e/Feats:Poisoner?expansion=32231 — Poisoner | D&D 2024 | Roll20 Compendium
[30] https://roll20.net/compendium/dnd5e/Feats:Sentinel?expansion=32231 — Sentinel | D&D 2024 | Roll20 Compendium
[35] https://roll20.net/compendium/dnd5e/Feats:Skulker?expansion=32231 — Skulker | D&D 2024 | Roll20 Compendium
[41] https://roll20.net/compendium/dnd5e/Feats:War%20Caster?expansion=32231 — War Caster
