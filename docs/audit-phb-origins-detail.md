# PHB 2024 origins and feats — per-entry source audit

## Outcome
- Coverage: **10 species, 16 backgrounds, 63 feat catalog entries**. Of feats, 56 are distinct selectable entries (41 level-4 general + ASI + 10 origin + 4 fighting styles); 7 epic boons are catalog-only. Counts asserted in Python against dynamic runtime inventory.
- Entries with verified source/code discrepancies: **14**. No app/test changes or commits.
- Status is scoped: checked-no-defect-found is not a promise of complete automation. Manual resources/actions are deliberate, not defects.
- Official Free Rules supplies nine species and four backgrounds, not full paid PHB coverage.[1]
- A prerequisite must actually be listed in the feat; builder adds martial weapon training to six feats whose licensed prerequisites do not include it.[2]

## Verified defects
### species: elf
- Keen Senses choices are kind tool at characters.ts:606, so chosen skill is absent from sheet skill proficiency. Runtime confirms group kind tool.[1]
- High Elf long-rest Wizard cantrip replacement not offered: high-elf-cantrip-versatility has spell_choices, while buildGroups only reads trait_specific.spell_options; runtime has no trait spell group.[1]
- Code: server/catalog/srd-2024.json#/races/elf; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64
### species: human
- Human Small option missing: snapshot size Medium; no human size choice. Official Human allows Small or Medium.[1]
- Redundant trait.skillful group is incorrectly kind tool while human.skill separately grants the actual single skill. UI asks two unrelated choices for the one trait; first does not grant a skill.[1]
- Code: server/catalog/srd-2024.json#/races/human; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64
### feat: actor
- Description incorrectly requires listening for 1 minute (2014 carry-over); retrieved 2024 Mimicry has no such prerequisite and supplies Insight DC 8+CHA+PB.[3]
- Code: server/catalog/feats-2024.ts:3; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: crossbow-expert
- Incorrect martial-weapons prerequisite rejects otherwise eligible rogues; actual prerequisites are level 4 and DEX 13. Description omits loading ammunition without a free hand.[6]
- Code: server/catalog/feats-2024.ts:6; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: dual-wielder
- Incorrect martial-weapons prerequisite; actual prerequisites level 4 and STR or DEX 13.[9]
- Code: server/catalog/feats-2024.ts:9; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: great-weapon-master
- Incorrect martial-weapons prerequisite; actual prerequisites level 4 and STR 13.[13]
- Code: server/catalog/feats-2024.ts:13; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: heavy-armor-master
- Description applies reduction to all B/P/S damage while armored; source limits it to damage dealt by an attack that hits.[15]
- Code: server/catalog/feats-2024.ts:15; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: mounted-combatant
- Description restricts advantage to melee attacks; source applies attack rolls versus unmounted creatures within 5 ft of mount and smaller than mount. Omits incapacitation constraints.[23]
- Code: server/catalog/feats-2024.ts:23; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: poisoner
- Material description omission: no bonus-action application, 1-minute potency, save DC using increased ability, 2d8 damage or Poisoned duration; cannot adjudicate feat from builder description.[26]
- Code: server/catalog/feats-2024.ts:26; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: polearm-master
- Incorrect martial-weapons prerequisite; actual prerequisites level 4 and STR or DEX 13.[27]
- Code: server/catalog/feats-2024.ts:27; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: sentinel
- Incorrect martial-weapons prerequisite; actual prerequisites level 4 and STR or DEX 13. Description says attacking another target instead of hitting another target, and calls Guardian a melee reaction rather than an Opportunity Attack (thus hides its interaction with Halt).[30]
- Code: server/catalog/feats-2024.ts:30; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: sharpshooter
- Incorrect martial-weapons prerequisite; actual prerequisites level 4 and DEX 13.[32]
- Code: server/catalog/feats-2024.ts:32; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: skulker
- Description restricts hidden missed-attack benefit to ranged attacks; source applies any attack roll.[35]
- Code: server/catalog/feats-2024.ts:35; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419
### feat: war-caster
- Material description omission: Reactive Spell only triggers when leaving reach and spell must have casting time one action; description just says one-target spell replaces opportunity attack.[41]
- Code: server/catalog/feats-2024.ts:41; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419

## Per-entry coverage

| Kind | Entry | Status | Checks and code | Sources |
|---|---|---|---|---|
| species | aasimar | licensed-match-official-gap | celestial-resistance, darkvision, healing-hands, light-bearer, celestial-revelation; server/catalog/phb-species.ts; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [70] |
| species | dragonborn | checked-no-defect-found | darkvision-60, draconic-flight, draconic-breath-weapon-acid, draconic-damage-resistance-acid, draconic-breath-weapon-lightning, draconic-damage-resistance-lightning, draconic-breath-weapon-fire, draconic-damage-resistance-fire, draconic-breath-weapon-poison, draconic-damage-resistance-poison, draconic-breath-weapon-cold, draconic-damage-resistance-cold; server/catalog/srd-2024.json#/races/dragonborn; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | dwarf | checked-no-defect-found | darkvision-120, dwarven-resilience, dwarven-toughness, stonecunning; server/catalog/srd-2024.json#/races/dwarf; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | elf | defect | darkvision-60, elven-lineage, fey-ancestry, keen-senses, trance, darkvision-120, lineage-spell-dancing-lights, lineage-spell-faerie-fire, lineage-spell-darkness, high-elf-cantrip-versatility, lineage-spell-detect-magic, lineage-spell-misty-step, wood-elf-speed-increase, lineage-spell-longstrider, lineage-spell-pass-without-trace; server/catalog/srd-2024.json#/races/elf; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | gnome | checked-no-defect-found | darkvision-60, gnomish-cunning, gnomish-lineage, gnomish-lineage-forest-gnome, lineage-spell-minor-illusion, gnomish-lineage-rock-gnome, lineage-spell-mending; server/catalog/srd-2024.json#/races/gnome; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | goliath | checked-no-defect-found | giant-ancestry, large-form, powerful-build, giant-ancestry-clouds-jaunt, giant-ancestry-fires-burn, giant-ancestry-frosts-chill, giant-ancestry-hills-tumble, giant-ancestry-stones-endurance, giant-ancestry-storms-thunder; server/catalog/srd-2024.json#/races/goliath; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | halfling | checked-no-defect-found | brave, halfling-nimbleness, luck, naturally-stealthy; server/catalog/srd-2024.json#/races/halfling; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | human | defect | resourceful, skillful, versatile; server/catalog/srd-2024.json#/races/human; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | orc | checked-no-defect-found | adrenaline-rush, darkvision-120, relentless-endurance; server/catalog/srd-2024.json#/races/orc; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| species | tiefling | checked-no-defect-found | darkvision-60, fiendish-legacy, otherworldly-presence, lineage-resistance-poison, lineage-spell-poison-spray, lineage-spell-ray-of-sickness, lineage-spell-hold-person, lineage-resistance-necrotic, lineage-spell-chill-touch, lineage-spell-false-life, lineage-spell-ray-of-enfeeblement, lineage-resistance-fire, lineage-spell-fire-bolt, lineage-spell-hellish-rebuke, lineage-spell-darkness; server/catalog/srd-2024.json#/races/tiefling; server/characters.ts:551-553,590-624,1907-1915,2174-2179; src/SpeciesCard.tsx:16-26; server/catalog/species-guide.ts:51-64 | [1] |
| background | acolyte | checked-no-defect-found | {"ability_scores": "int wis cha", "origin_feat": "magic-initiate", "spell_class": "Cleric", "skills": "insight religion", "tool": "calligraphers-supplies", "package_A_items": "calligraphers-supplies book holy-symbols parchment:10 robe", "package_A_gp": 8, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [1] |
| background | artisan | licensed-match-official-gap | {"ability_scores": "str dex int", "origin_feat": "crafter", "spell_class": "", "skills": "investigation persuasion", "tool": "artisan", "package_A_items": "pouch:2 clothes-travelers", "package_A_gp": 32, "package_B_gp": 50, "selected_tool_in_A": true, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [44] |
| background | charlatan | licensed-match-official-gap | {"ability_scores": "dex con cha", "origin_feat": "skilled", "spell_class": "", "skills": "deception sleight-of-hand", "tool": "forgery-kit", "package_A_items": "forgery-kit costume clothes-fine", "package_A_gp": 15, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [45] |
| background | criminal | checked-no-defect-found | {"ability_scores": "dex con int", "origin_feat": "alert", "spell_class": "", "skills": "sleight-of-hand stealth", "tool": "thieves-tools", "package_A_items": "dagger:2 thieves-tools crowbar pouch:2 clothes-travelers", "package_A_gp": 16, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [1] |
| background | entertainer | licensed-match-official-gap | {"ability_scores": "str dex cha", "origin_feat": "musician", "spell_class": "", "skills": "acrobatics performance", "tool": "instrument", "package_A_items": "costume:2 mirror-steel perfume clothes-travelers", "package_A_gp": 11, "package_B_gp": 50, "selected_tool_in_A": true, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [47] |
| background | farmer | licensed-match-official-gap | {"ability_scores": "str con wis", "origin_feat": "tough", "spell_class": "", "skills": "animal-handling nature", "tool": "carpenters-tools", "package_A_items": "sickle carpenters-tools healers-kit pot-iron shovel clothes-travelers", "package_A_gp": 30, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [49] |
| background | guard | licensed-match-official-gap | {"ability_scores": "str int wis", "origin_feat": "alert", "spell_class": "", "skills": "athletics perception", "tool": "gaming", "package_A_items": "spear crossbow-light crossbow-bolt:20 lantern-hooded manacles quiver clothes-travelers", "package_A_gp": 12, "package_B_gp": 50, "selected_tool_in_A": true, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [50] |
| background | guide | licensed-match-official-gap | {"ability_scores": "dex con wis", "origin_feat": "magic-initiate", "spell_class": "Druid", "skills": "stealth survival", "tool": "cartographer-tools", "package_A_items": "shortbow arrow:20 cartographers-tools bedroll quiver tent-two-person clothes-travelers", "package_A_gp": 3, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [52] |
| background | hermit | licensed-match-official-gap | {"ability_scores": "con wis cha", "origin_feat": "healer", "spell_class": "", "skills": "medicine religion", "tool": "herbalism-kit", "package_A_items": "quarterstaff herbalism-kit bedroll book lamp oil-flask:3 clothes-travelers", "package_A_gp": 16, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [48] |
| background | merchant | licensed-match-official-gap | {"ability_scores": "con int cha", "origin_feat": "lucky", "spell_class": "", "skills": "animal-handling persuasion", "tool": "navigators-tools", "package_A_items": "navigators-tools pouch:2 clothes-travelers", "package_A_gp": 22, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [51] |
| background | noble | licensed-match-official-gap | {"ability_scores": "str int cha", "origin_feat": "skilled", "spell_class": "", "skills": "history persuasion", "tool": "gaming", "package_A_items": "clothes-fine perfume", "package_A_gp": 29, "package_B_gp": 50, "selected_tool_in_A": true, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [53] |
| background | sailor | licensed-match-official-gap | {"ability_scores": "str dex wis", "origin_feat": "tavern-brawler", "spell_class": "", "skills": "acrobatics perception", "tool": "navigators-tools", "package_A_items": "dagger navigators-tools rope-hempen clothes-travelers", "package_A_gp": 20, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [54] |
| background | sage | checked-no-defect-found | {"ability_scores": "con int wis", "origin_feat": "magic-initiate", "spell_class": "Wizard", "skills": "arcana history", "tool": "calligraphers-supplies", "package_A_items": "quarterstaff calligraphers-supplies book parchment:8 robe", "package_A_gp": 8, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [1] |
| background | scribe | licensed-match-official-gap | {"ability_scores": "dex int wis", "origin_feat": "skilled", "spell_class": "", "skills": "investigation perception", "tool": "calligraphers-supplies", "package_A_items": "calligraphers-supplies clothes-fine lamp oil-flask:3 parchment:12", "package_A_gp": 23, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [56] |
| background | soldier | checked-no-defect-found | {"ability_scores": "str dex con", "origin_feat": "savage-attacker", "spell_class": "", "skills": "athletics intimidation", "tool": "gaming", "package_A_items": "spear shortbow arrow:20 healers-kit quiver clothes-travelers", "package_A_gp": 14, "package_B_gp": 50, "selected_tool_in_A": true, "extra_gaming_set": false}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [1] |
| background | wayfarer | licensed-match-official-gap | {"ability_scores": "dex wis cha", "origin_feat": "lucky", "spell_class": "", "skills": "insight stealth", "tool": "thieves-tools", "package_A_items": "dagger:2 thieves-tools bedroll pouch:2 clothes-travelers", "package_A_gp": 16, "package_B_gp": 50, "selected_tool_in_A": false, "extra_gaming_set": true}; server/catalog/backgrounds-2024.ts:37-214,263-326; server/characters.ts:1240-1292,1973-1985 | [58] |
| feat | ability-score-improvement | partial-review | general; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/ability-score-improvement; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | alert | checked-no-defect-found | origin; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/alert; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | archery | checked-no-defect-found | fighting-style; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/archery; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-combat-prowess | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-combat-prowess; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-dimensional-travel | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-dimensional-travel; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-fate | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-fate; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-irresistible-offense | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-irresistible-offense; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-spell-recall | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-spell-recall; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-the-night-spirit | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-the-night-spirit; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | boon-of-truesight | catalog-only | epic-boon; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/boon-of-truesight; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | defense | checked-no-defect-found | fighting-style; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/defense; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | grappler | partial-review | general; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/grappler; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | great-weapon-fighting | checked-no-defect-found | fighting-style; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/great-weapon-fighting; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | magic-initiate | checked-no-defect-found | origin; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/magic-initiate; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | savage-attacker | checked-no-defect-found | origin; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/savage-attacker; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | skilled | checked-no-defect-found | origin; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/skilled; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | two-weapon-fighting | checked-no-defect-found | fighting-style; prerequisite/description and builder pathways; server/catalog/srd-2024.json#/feats/two-weapon-fighting; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [2] |
| feat | actor | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:3; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [3] |
| feat | athlete | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:4; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [4] |
| feat | charger | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:5; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [5] |
| feat | crossbow-expert | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:6; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [6] |
| feat | crusher | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:7; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [7] |
| feat | defensive-duelist | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:8; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [8] |
| feat | dual-wielder | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:9; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [9] |
| feat | durable | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:10; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [10] |
| feat | elemental-adept | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:11; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [11] |
| feat | fey-touched | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:12; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [12] |
| feat | great-weapon-master | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:13; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [13] |
| feat | heavily-armored | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:14; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [14] |
| feat | heavy-armor-master | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:15; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [15] |
| feat | inspiring-leader | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:16; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [16] |
| feat | keen-mind | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:17; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [18] |
| feat | lightly-armored | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:18; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [17] |
| feat | mage-slayer | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:19; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [19] |
| feat | martial-weapon-training | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:20; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [20] |
| feat | medium-armor-master | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:21; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [21] |
| feat | moderately-armored | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:22; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [22] |
| feat | mounted-combatant | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:23; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [23] |
| feat | observant | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:24; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [24] |
| feat | piercer | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [25] |
| feat | poisoner | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:26; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [26] |
| feat | polearm-master | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:27; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [27] |
| feat | resilient | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:28; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [28] |
| feat | ritual-caster | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:29; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [29] |
| feat | sentinel | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:30; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [30] |
| feat | shadow-touched | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:31; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [31] |
| feat | sharpshooter | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:32; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [32] |
| feat | shield-master | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:33; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [33] |
| feat | skill-expert | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:34; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [34] |
| feat | skulker | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:35; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [35] |
| feat | slasher | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:36; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [37] |
| feat | speedy | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:37; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [36] |
| feat | spell-sniper | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:38; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [38] |
| feat | telekinetic | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:39; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [39] |
| feat | telepathic | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:40; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [40] |
| feat | war-caster | defect | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:41; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [41] |
| feat | weapon-master | partial-review | general; prerequisite/description and builder pathways; server/catalog/feats-2024.ts:42; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [42] |
| feat | crafter | partial-review | origin; prerequisite/description and builder pathways; server/catalog/backgrounds-2024.ts:4-25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [60] |
| feat | healer | partial-review | origin; prerequisite/description and builder pathways; server/catalog/backgrounds-2024.ts:4-25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [61] |
| feat | lucky | partial-review | origin; prerequisite/description and builder pathways; server/catalog/backgrounds-2024.ts:4-25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [62] |
| feat | musician | partial-review | origin; prerequisite/description and builder pathways; server/catalog/backgrounds-2024.ts:4-25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [64] |
| feat | tavern-brawler | partial-review | origin; prerequisite/description and builder pathways; server/catalog/backgrounds-2024.ts:4-25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [67] |
| feat | tough | partial-review | origin; prerequisite/description and builder pathways; server/catalog/backgrounds-2024.ts:4-25; server/characters.ts:770-880,1104-1155,1742-1800,2037-2045,2247-2259,2401-2419 | [69] |

## Execution and limits
node --import tsx docs/audit-origins-probe.mjs exited 0; 87 lineage/level observations; six wrong martial-prerequisite rejections reproduced. Targeted elf Perception probe confirmed proficient false.

- No publisher-owned paid PHB full-text comparison for Aasimar, twelve backgrounds, or most general/origin feats.
- Not a MotM item audit; separate delegated scope.
- No browser interaction or accessibility pass of live wizard. SpeciesCard source inspected; it renders catalog traits unfiltered by level while sheet innateSpells are level filtered; not categorized as rule violation because reference card can show future abilities.
- No combat simulation or rest/resource automation certification. Deliberate manual tracking not classified as a defect.
- No rerun of entire existing test suite: this is source-fidelity review; pre-existing passing tests cannot certify rules accuracy.
- INT and CHA lineage selections not individually runtime-probed.
- Some licensed extracts remain partial (notably Keen Mind, Observant, Aasimar in persisted retrieval); these are not certified full matches.

The JSON companion includes each trait description, every lineage trait with minimum level, per-background ASI/feat/skills/tool/equipment/GP, per-feat source excerpts, and runtime spell ability/DC evidence.

Skipped: paid-book access, live wizard interaction, full regression tests, combat automation. Risk: partial-review entries are not full official-source certifications.

## Sources

[1] https://www.dndbeyond.com/sources/dnd/free-rules/character-origins — Official Free Rules Origins
[2] https://www.dndbeyond.com/sources/dnd/free-rules/feats — Official Free Rules Feats
[3] https://roll20.net/compendium/dnd5e/Feats:Actor?expansion=32231 — Actor | D&D 2024 | Roll20 Compendium
[4] https://roll20.net/compendium/dnd5e/Feats:Athlete?expansion=32231 — Athlete | D&D 2024 | Roll20 Compendium
[5] https://roll20.net/compendium/dnd5e/Feats:Charger?expansion=32231 — Charger | D&D 2024 | Roll20 Compendium
[6] https://roll20.net/compendium/dnd5e/Feats:Crossbow%20Expert?expansion=32231 — Crossbow Expert | D&D 2024 | Roll20 Compendium
[7] https://roll20.net/compendium/dnd5e/Feats:Crusher?expansion=32231 — Crusher | D&D 2024 | Roll20 Compendium
[8] https://roll20.net/compendium/dnd5e/Feats:Defensive%20Duelist?expansion=32231 — Defensive Duelist | D&D 2024
[9] https://roll20.net/compendium/dnd5e/Feats:Dual%20Wielder?expansion=32231 — Dual Wielder | D&D 2024
[10] https://roll20.net/compendium/dnd5e/Feats:Durable?expansion=32231 — Durable | D&D 2024 | Roll20 Compendium
[11] https://roll20.net/compendium/dnd5e/Feats:Elemental%20Adept?expansion=32231 — Elemental Adept | D&D 2024
[12] https://roll20.net/compendium/dnd5e/Feats:Fey-Touched?expansion=32231 — Fey-Touched | D&D 2024 | Roll20 Compendium
[13] https://roll20.net/compendium/dnd5e/Feats:Great%20Weapon%20Master?expansion=32231 — Great Weapon Master | D&D 2024
[14] https://roll20.net/compendium/dnd5e/Feats:Heavily%20Armored?expansion=32231 — Heavily Armored | D&D 2024 | Roll20 Compendium
[15] https://roll20.net/compendium/dnd5e/Feats:Heavy%20Armor%20Master?expansion=32231 — Heavy Armor Master | D&D 2024 | Roll20 Compendium
[16] https://roll20.net/compendium/dnd5e/Feats:Inspiring%20Leader?expansion=32231 — Inspiring Leader | D&D 2024 | Roll20 Compendium
[17] https://roll20.net/compendium/dnd5e/Feats:Lightly%20Armored?expansion=32231 — Lightly Armored | D&D 2024 | Roll20 Compendium
[18] https://roll20.net/compendium/dnd5e/Feats:Keen%20Mind?expansion=32231 — Keen Mind | D&D 2024 | Roll20 Compendium
[19] https://roll20.net/compendium/dnd5e/Feats:Mage%20Slayer?expansion=32231 — Mage Slayer | D&D 2024
[20] https://roll20.net/compendium/dnd5e/Feats:Martial%20Weapon%20Training?expansion=32231 — Martial Weapon Training | D&D 2024
[21] https://roll20.net/compendium/dnd5e/Feats:Medium%20Armor%20Master?expansion=32231 — Medium Armor Master | D&D 2024
[22] https://roll20.net/compendium/dnd5e/Feats:Moderately%20Armored?expansion=32231 — Moderately Armored | D&D 2024
[23] https://roll20.net/compendium/dnd5e/Feats:Mounted%20Combatant?expansion=32231 — Mounted Combatant | D&D 2024
[24] https://roll20.net/compendium/dnd5e/Feats:Observant?expansion=32231 — Observant | D&D 2024 | Roll20 Compendium
[25] https://roll20.net/compendium/dnd5e/Feats:Piercer?expansion=32231 — Piercer | D&D 2024 | Roll20 Compendium
[26] https://roll20.net/compendium/dnd5e/Feats:Poisoner?expansion=32231 — Poisoner | D&D 2024 | Roll20 Compendium
[27] https://roll20.net/compendium/dnd5e/Feats:Polearm%20Master?expansion=32231 — Polearm Master | D&D 2024 | Roll20 Compendium
[28] https://roll20.net/compendium/dnd5e/Feats:Resilient?expansion=32231 — Resilient | D&D 2024 | Roll20 Compendium
[29] https://roll20.net/compendium/dnd5e/Feats:Ritual%20Caster?expansion=32231 — Ritual Caster
[30] https://roll20.net/compendium/dnd5e/Feats:Sentinel?expansion=32231 — Sentinel | D&D 2024 | Roll20 Compendium
[31] https://roll20.net/compendium/dnd5e/Feats:Shadow-Touched?expansion=32231 — Shadow-Touched | D&D 2024 | Roll20 Compendium
[32] https://roll20.net/compendium/dnd5e/Feats:Sharpshooter?expansion=32231 — Sharpshooter | D&D 2024 | Roll20 Compendium
[33] https://roll20.net/compendium/dnd5e/Feats:Shield%20Master?expansion=32231 — Shield Master | D&D 2024 | Roll20 Compendium
[34] https://roll20.net/compendium/dnd5e/Feats:Skill%20Expert?expansion=32231 — Skill Expert | D&D 2024 | Roll20 Compendium
[35] https://roll20.net/compendium/dnd5e/Feats:Skulker?expansion=32231 — Skulker | D&D 2024 | Roll20 Compendium
[36] https://roll20.net/compendium/dnd5e/Feats:Speedy?expansion=32231 — Speedy | D&D 2024 | Roll20 Compendium
[37] https://roll20.net/compendium/dnd5e/Feats:Slasher?expansion=32231 — Slasher | D&D 2024 | Roll20 Compendium
[38] https://roll20.net/compendium/dnd5e/Feats:Spell%20Sniper?expansion=32231 — Spell Sniper | D&D 2024
[39] https://roll20.net/compendium/dnd5e/Feats:Telekinetic?expansion=32231 — Telekinetic | D&D 2024 | Roll20 Compendium
[40] https://roll20.net/compendium/dnd5e/Feats:Telepathic?expansion=32231 — Telepathic | D&D 2024 | Roll20 Compendium
[41] https://roll20.net/compendium/dnd5e/Feats:War%20Caster?expansion=32231 — War Caster
[42] https://roll20.net/compendium/dnd5e/Feats:Weapon%20Master?expansion=32231 — Weapon Master | D&D 2024
[44] https://roll20.net/compendium/dnd5e/Backgrounds:Artisan?expansion=32231 — Artisan | D&D 2024 | Roll20 Compendium
[45] https://roll20.net/compendium/dnd5e/Backgrounds:Charlatan?expansion=32231 — Charlatan | D&D 2024 | Roll20 Compendium
[47] https://roll20.net/compendium/dnd5e/Backgrounds:Entertainer?expansion=32231 — Entertainer | D&D 2024 | Roll20 Compendium
[48] https://roll20.net/compendium/dnd5e/Backgrounds:Hermit?expansion=32231 — Hermit | D&D 2024 | Roll20 Compendium
[49] https://roll20.net/compendium/dnd5e/Backgrounds:Farmer?expansion=32231 — Farmer | D&D 2024 | Roll20 Compendium
[50] https://roll20.net/compendium/dnd5e/Backgrounds:Guard?expansion=32231 — Guard | D&D 2024 | Roll20 Compendium
[51] https://roll20.net/compendium/dnd5e/Backgrounds:Merchant?expansion=32231 — Merchant | D&D 2024 | Roll20 Compendium
[52] https://roll20.net/compendium/dnd5e/Backgrounds:Guide?expansion=32231 — Guide | D&D 2024 | Roll20 Compendium
[53] https://roll20.net/compendium/dnd5e/Backgrounds:Noble?expansion=32231 — Noble | D&D 2024 | Roll20 Compendium
[54] https://roll20.net/compendium/dnd5e/Backgrounds:Sailor?expansion=32231 — Sailor | D&D 2024 | Roll20 Compendium
[56] https://roll20.net/compendium/dnd5e/Backgrounds:Scribe?expansion=32231 — Scribe | D&D 2024 | Roll20 Compendium
[58] https://roll20.net/compendium/dnd5e/Backgrounds:Wayfarer?expansion=32231 — Wayfarer | D&D 2024 | Roll20 Compendium
[60] https://roll20.net/compendium/dnd5e/Feats:Crafter?expansion=32231 — Crafter | D&D 2024 | Roll20 Compendium
[61] https://roll20.net/compendium/dnd5e/Feats:Healer?expansion=32231 — Healer | D&D 2024 | Roll20 Compendium
[62] https://roll20.net/compendium/dnd5e/Feats:Lucky?expansion=32231 — Lucky | D&D 2024 | Roll20 Compendium
[64] https://roll20.net/compendium/dnd5e/Feats:Musician?expansion=32231 — Musician | D&D 2024 | Roll20 Compendium
[67] https://roll20.net/compendium/dnd5e/Feats:Tavern%20Brawler?expansion=32231 — Tavern Brawler | D&D 2024 | Roll20 Compendium
[69] https://roll20.net/compendium/dnd5e/Feats:Tough?expansion=32231 — Tough | D&D 2024 | Roll20 Compendium
[70] https://roll20.net/compendium/dnd5e/Races:Aasimar?expansion=32231 — Aasimar | D&D 2024 | Roll20 Compendium
