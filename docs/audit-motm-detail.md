# Audit detail MotM — 33 species

Tanggal: 19 Oktober 2026. Snapshot source saat audit; repository memiliki perubahan belum di-commit dan dapat diedit paralel.

## Kesimpulan

33/33 species diperiksa, 165 kombinasi species-level 1–5 dieksekusi langsung dari TypeScript source. 6 temuan teks/presentasi; tidak ada klaim semua mekanik otomatis.

Indeks buku resmi dapat diambil, tetapi kedua bab aturan resmi dialihkan ke halaman toko. Detail aturan di bawah bersumber dari Wikidot **sekunder/tidak resmi**, bukan konfirmasi buku resmi. `verifiedMotMSection` pada manifest lama tidak membuktikan otoritas atau kelengkapan.

Integrasi sengaja memakai background ASI 2024 dan spell versi 2024. Ini bukan reproduksi murni MotM 2022; tidak dinilai bug otomatis. Semua full spell-body (target/range/action/duration/concentration/scaling) belum dibandingkan independen. Level unlock, casting ability, free-use/recharge, dan pengecualian trait diperiksa terpisah.

## Prioritas / reproduksi

### MOTM-01 P2 — Necrotic Shroud changes non-allies into enemies
Repro: Select motm:aasimar level 3 / necrotic-shroud; read trait; neutral non-ally within 10 ft is excluded by musuh wording.
Expected: Applies to seeing creatures other than allies, not only enemies.[2]
Actual: musuh yang melihat
Code: `server/catalog/motm.ts:7`

### MOTM-02 P2 — Spring Fey Step incorrectly requires ally
Repro: Select motm:eladrin level 3 / spring; willing neutral creature within 5 ft.
Expected: Any willing creature, not necessarily an ally; visible unoccupied destination within 30 ft chosen by user.[8]
Actual: sentuh sekutu rela; destination restrictions not repeated
Code: `server/catalog/motm.ts:13`

### MOTM-03 P2 — Teleport summaries omit unoccupied destination constraint
Repro: Read Fey Step / Blessing of the Raven Queen; occupied visible square is not prohibited by local text.
Expected: Destination is unoccupied and visible within 30 ft.[8][28]
Actual: Only visible / 30 ft stated
Code: `server/catalog/motm.ts:13`, `server/catalog/motm.ts:33`

### MOTM-04 P3 — Shared Darkvision summary omits dim-light-as-bright-light benefit
Repro: Open trait details for any MotM species with Darkvision.
Expected: Dim light counts as bright and darkness as dim within range.[2]
Actual: Only darkness-to-dim and lack of color stated; no senses automation.
Code: `server/catalog/motm.ts:47`

### MOTM-05 P3 — Species card shows possible sizes instead of selected size
Repro: Set motm.size=[Small], call speciesGuide or open SpeciesCard.
Expected: Selected Small is clear in stats (may separately list options).[2]
Actual: guide.size remains Medium / Small; tested directly at all levels.
Code: `server/catalog/species-guide.ts:60`, `src/SpeciesCard.tsx:17`

### MOTM-06 P3 — Trance summary omits no-need-to-sleep clause
Repro: Open motm:eladrin trait; compare Sea Elf/Shadar-kai.
Expected: No need for sleep, separate from magic sleep immunity.[8]
Actual: Only sleep immunity and 4-hour conscious trance stated.
Code: `server/catalog/motm.ts:13`

## Lintas pipeline / pembacaan hasil

- `motm.ts:49–74`: size/skill/legacy/season/revelation/tool/casting choices and spell unlocks. Choices tidak berarti action/rest otomatis.
- `characters.ts:2009–2011,2138–2139,2346–2349`: AC, natural attacks, swim/climb/armor-gated flight, innate spell DC/attack/use labels, Harengon initiative.
- `characters.ts:2422–2423`: trait manual dan pilihan diteruskan ke sheet. Resistance/immunity/advantage/resource counters tidak dijadikan state.
- `SpeciesCard.tsx:17–26`: metadata, movement, satu trait gabungan per species, dan innate spell labels. `Characters.tsx:1454`: secara eksplisit manual, slot/free casts dicatat pemain.
- Tortle barbarian DEX/CON tinggi menghasilkan AC 18; **bukan temuan** karena formula unarmored alternatif dapat dipilih. Jangan keliru menuntut shell selalu menimpa formula alternatif.
- `species-guide.ts` overview naratif, bukan sumber rule. Trait count UI adalah satu entri gabungan, bukan jumlah kemampuan individual.

## Matriks per species

### Aarakocra (`aarakocra`)
Code: server/catalog/motm.ts:6. Sumber sekunder: [1].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Flight | walking-speed flight; medium/heavy armor blocks it — automated movement. | mixed_automated_and_manual |
| Talons | d6 STR slashing unarmed attack — sheet attack automated. | mixed_automated_and_manual |
| Wind Caller | Gust of Wind at character 3; INT/WIS/CHA; free once/LR then slots 2+; no material — level/ability/use text implemented; component exception manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Aasimar (`aasimar`)
Code: server/catalog/motm.ts:7. Sumber sekunder: [2].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Celestial Resistance | necrotic/radiant — correct manual. | accurate_manual |
| Healing Hands | action touch, PB d4 healing, once/LR — correct manual. | accurate_manual |
| Light Bearer | Light with CHA — automated known spell/DC. | mixed_automated_and_manual |
| Celestial Revelation | choose at 3, BA, minute, once/LR, BA end; own-turn single-target PB extra attack/spell damage — manual. | accurate_manual |
| Necrotic Shroud | CHA DC 8+PB+CHA, non-allies seeing within 10 ft, frightened through next-turn end — text wrongly narrows non-allies to enemies. | wrong_or_incomplete_text |
| Radiant Consumption | light 10+10 ft; end-turn PB radiant to creatures in 10 ft; own-turn PB rider — correct manual. | accurate_manual |
| Radiant Soul | walking-speed flight plus own-turn PB radiant rider — correct manual, no active flight state. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Bugbear (`bugbear`)
Code: server/catalog/motm.ts:8. Sumber sekunder: [3].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Fey Ancestry | avoid/end charmed advantage — manual. | accurate_manual |
| Long-Limbed | melee reach +5 ft on own turn only — manual. | accurate_manual |
| Powerful Build | carrying and push/drag/lift one size larger — manual. | accurate_manual |
| Sneaky | Stealth proficiency plus Small-space movement/stopping without squeeze — skill automated, space manual. | mixed_automated_and_manual |
| Surprise Attack | each attack-roll hit before target has taken combat turn gains 2d6 — manual, no once/turn cap incorrectly imposed. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Centaur (`centaur`)
Code: server/catalog/motm.ts:9. Sumber sekunder: [4].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Fey", "speed": 40}, "derivedSpeed": 40} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Charge | straight approach >=30 ft then same-turn melee-weapon hit permits immediate BA hoof attack against that target — manual; immediacy/target not explicit in compressed text. | accurate_manual_with_summary_caveat |
| Equine Build | larger carrying/push/drag; hand-and-foot climbing costs 4 extra feet — correct manual. | accurate_manual |
| Hooves | d6 STR bludgeoning unarmed — automated damage row; dice/STR in sheet, not trait prose. | mixed_automated_and_manual |
| Natural Affinity | one Animal Handling/Medicine/Nature/Survival — choice/skill automated. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Changeling (`changeling`)
Code: server/catalog/motm.ts:10. Sumber sekunder: [5].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Fey", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Changeling Instincts | choose two from Deception/Insight/Intimidation/Performance/Persuasion — automated. | mixed_automated_and_manual |
| Shapechanger | action appearance/voice/Small-or-Medium; seen-individual restriction, same limb arrangement, unchanged equipment/stats; action revert/death — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Deep Gnome (`deep-gnome`)
Code: server/catalog/motm.ts:11. Sumber sekunder: [6].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 120 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Gift of the Svirfneblin | Disguise Self at 3, Nondetection at 5; INT/WIS/CHA; each once/LR or slots; only Nondetection lacks material — known spells/use label automated, exception manual. | mixed_automated_and_manual |
| Gnomish Magic Resistance | INT/WIS/CHA saves against spells, not all magical effects — correct manual. | accurate_manual |
| Svirfneblin Camouflage | Stealth advantage PB/LR — manual; before-roll addition is not sourced explicitly by this trait. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Duergar (`duergar`)
Code: server/catalog/motm.ts:12. Sumber sekunder: [7].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 120 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Duergar Magic | self-only Enlarge/Reduce at 3 and Invisibility at 5, no material, each once/LR or slots, INT/WIS/CHA — unlock/use/DC automated; component/target manual. | mixed_automated_and_manual |
| Dwarven Resilience | poison resistance and advantage avoid/end poisoned — correct manual. | accurate_manual |
| Psionic Fortitude | advantage avoid/end charmed/stunned — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Eladrin (`eladrin`)
Code: server/catalog/motm.ts:13. Sumber sekunder: [8].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Fey Ancestry | advantage avoid/end charmed — manual. | accurate_manual |
| Fey Step | BA teleport visible unoccupied destination <=30 ft PB/LR; DC uses INT/WIS/CHA — manual; unoccupied qualifier absent in summary. | wrong_or_incomplete_text |
| Autumn | from 3, after teleport <=2 visible targets within 10 ft, WIS save charm minute, damage by self/companions ends — manual. | accurate_manual |
| Winter | from 3, visible target within 5 ft before teleport, WIS save frighten until next-turn end — manual. | accurate_manual |
| Spring | from 3, willing creature within 5 ft teleports instead, chosen visible unoccupied destination <=30 ft — text incorrectly requires ally and omits destination qualifications. | wrong_or_incomplete_text |
| Summer | from 3, after teleport chosen visible creatures within 5 ft take PB fire — correct manual. | accurate_manual |
| Keen Senses | Perception proficiency — automated. | mixed_automated_and_manual |
| Trance | conscious 4-hour LR, no need for sleep, magic cannot cause sleep, change season, two not-already-owned PHB weapons/tools until next LR — choices automated, rest manual; no-need-to-sleep clause omitted in this species text. | wrong_or_incomplete_text |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Fairy (`fairy`)
Code: server/catalog/motm.ts:14. Sumber sekunder: [9].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Small", "type": "Fey", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Fairy Magic | Druidcraft at 1, Faerie Fire at 3, Enlarge/Reduce at 5; INT/WIS/CHA; leveled spells each once/LR or slots — level/DC/use labels automated. | mixed_automated_and_manual |
| Flight | walking-speed flight except medium/heavy armor — movement automated. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Firbolg (`firbolg`)
Code: server/catalog/motm.ts:15. Sumber sekunder: [10].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Firbolg Magic | Detect Magic and Disguise Self at 1, latter permits +/-3 ft; INT/WIS/CHA; each once/LR or slots — unlock/DC/use automated; disguise manual. | mixed_automated_and_manual |
| Hidden Step | BA invisibility until next-turn start or attack/damage roll/forced save, PB/LR — correct manual. | accurate_manual |
| Powerful Build | carrying/push/drag/lift one size larger — correct manual. | accurate_manual |
| Speech of Beast and Leaf | Beasts/Plants/vegetation understand words, not reverse; CHA influence advantage — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Air Genasi (`genasi-air`)
Code: server/catalog/motm.ts:16. Sumber sekunder: [11].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 35}, "derivedSpeed": 35} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Unending Breath | unlimited hold breath unless incapacitated — correct manual. | accurate_manual |
| Lightning Resistance | lightning — correct manual. | accurate_manual |
| Mingle with the Wind | Shocking Grasp at 1, Feather Fall at 3, Levitate at 5; latter two no material, each once/LR or slots; INT/WIS/CHA — known-spell/DC/use automated, components manual. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Earth Genasi (`genasi-earth`)
Code: server/catalog/motm.ts:17. Sumber sekunder: [12].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Earth Walk | ignore difficult-terrain movement cost while walking ground/floor — correct manual. | accurate_manual |
| Merge with Stone | Blade Ward at 1 with extra BA casting PB/LR; Pass Without Trace at 5 no material once/LR or slots 2+; INT/WIS/CHA — known spells/DC/use labels automated; BA counter manual; explicitly uses 2024 Blade Ward, not MotM-era spell. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Fire Genasi (`genasi-fire`)
Code: server/catalog/motm.ts:18. Sumber sekunder: [13].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Fire Resistance | fire — correct manual. | accurate_manual |
| Reach to the Blaze | Produce Flame at 1, Burning Hands at 3, Flame Blade at 5; Flame Blade no material; leveled spells each once/LR or slots; INT/WIS/CHA — spell/DC/use automated, component manual. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Water Genasi (`genasi-water`)
Code: server/catalog/motm.ts:19. Sumber sekunder: [14].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Acid Resistance | acid — correct manual. | accurate_manual |
| Amphibious | air/water breathing — correct manual. | accurate_manual |
| Call to the Wave | Acid Splash at 1, Create or Destroy Water at 3, Water Walk at 5; Water Walk no material; leveled spells each once/LR or slots; INT/WIS/CHA — unlock/DC/use automated. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Githyanki (`githyanki`)
Code: server/catalog/motm.ts:20. Sumber sekunder: [15].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Astral Knowledge | one skill plus one PHB weapon/tool per LR until next LR — choices/proficiencies automated, refresh manual. | mixed_automated_and_manual |
| Githyanki Psionics | invisible Mage Hand at 1, Jump at 3, Misty Step at 5, INT/WIS/CHA, all component-free, leveled each once/LR or slots — known-spell/DC/use automated, invisibility/components manual. | mixed_automated_and_manual |
| Psychic Resilience | psychic resistance — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Githzerai (`githzerai`)
Code: server/catalog/motm.ts:21. Sumber sekunder: [16].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Githzerai Psionics | invisible Mage Hand at 1, Shield at 3, Detect Thoughts at 5, INT/WIS/CHA, no components, leveled each once/LR or slots — known-spell/DC/use automated, exceptions manual. | mixed_automated_and_manual |
| Mental Discipline | advantage avoid/end charmed/frightened — manual. | accurate_manual |
| Psychic Resilience | psychic resistance — manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Goblin (`goblin`)
Code: server/catalog/motm.ts:22. Sumber sekunder: [17].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Fey Ancestry | advantage avoid/end charmed — manual. | accurate_manual |
| Fury of the Small | damage larger creature with attack/spell, +PB, once/turn and PB/LR — correct manual. | accurate_manual |
| Nimble Escape | Hide/Disengage BA — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Goliath (`goliath`)
Code: server/catalog/motm.ts:23. Sumber sekunder: [18].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Little Giant | Athletics and larger carrying/push/drag/lift — skill automated, capacities manual. | mixed_automated_and_manual |
| Mountain Born | cold resistance and altitude acclimatization including >20,000 ft — correct manual. | accurate_manual |
| Stone’s Endurance | reaction on damage reduces d12+CON, PB/LR — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Harengon (`harengon`)
Code: server/catalog/motm.ts:24. Sumber sekunder: [19].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Hare-Trigger | PB initiative — automated. | mixed_automated_and_manual |
| Leporine Senses | Perception — automated. | mixed_automated_and_manual |
| Lucky Footwork | failed DEX save reaction +d4, not prone or speed 0 — correct manual. | accurate_manual |
| Rabbit Hop | BA 5*PB ft, no OA, speed >0, PB/LR — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Hobgoblin (`hobgoblin`)
Code: server/catalog/motm.ts:25. Sumber sekunder: [20].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Fey Ancestry | advantage avoid/end charmed — manual. | accurate_manual |
| Fey Gift | BA Help PB/LR; from 3 choose Hospitality d6+PB temp HP to both, Passage +10 walk to both until next-turn start, Spite first assisted hit before next-turn start imposes disadvantage on next attack within minute — correct manual. | accurate_manual |
| Fortune from the Many | after missed attack/failed check/save, bonus visible allies within 30 ft capped +3, PB/LR — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Kenku (`kenku`)
Code: server/catalog/motm.ts:26. Sumber sekunder: [21].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Expert Duplication | advantage checks for exact writing/craft duplicate — manual. | accurate_manual |
| Kenku Recall | any two skills, and before-roll advantage on proficient-skill check PB/LR — skill choices automated, advantage/counter manual. | mixed_automated_and_manual |
| Mimicry | heard sounds/voices; Wisdom Insight detects vs 8+PB+CHA — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Kobold (`kobold`)
Code: server/catalog/motm.ts:27. Sumber sekunder: [22].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Draconic Cry | BA audible enemies within 10 ft grant self/allies attack advantage until next-turn start, PB/LR — correct manual. | accurate_manual |
| Kobold Legacy | Craftiness one of five skills, Defiance avoid/end frightened advantage, or sorcerer cantrip INT/WIS/CHA — choices and cantrip/DC automated, advantage manual. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Lizardfolk (`lizardfolk`)
Code: server/catalog/motm.ts:28. Sumber sekunder: [23].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Bite | d6 STR slashing unarmed — automated. | mixed_automated_and_manual |
| Hold Breath | 15 minutes — manual. | accurate_manual |
| Hungry Jaws | BA Bite, normal damage and PB temp HP on hit, PB/LR — correct manual. | accurate_manual |
| Natural Armor | choose 13+DEX over worse armor; shield allowed — automated AC. | mixed_automated_and_manual |
| Nature’s Intuition | two of Animal Handling/Medicine/Nature/Perception/Stealth/Survival — automated choices/skills. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Minotaur (`minotaur`)
Code: server/catalog/motm.ts:29. Sumber sekunder: [24].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Horns | d6 STR piercing unarmed — automated. | mixed_automated_and_manual |
| Goring Rush | immediately after own-turn Dash and >=20 ft movement, BA Horns attack — manual; timing abbreviated. | accurate_manual_with_summary_caveat |
| Hammering Horns | immediately after own-turn melee hit in Attack action, BA push creature <=5 ft and <=one size larger; STR DC 8+PB+STR, up to 10 ft away — manual; immediacy/away/up-to abbreviated. | accurate_manual_with_summary_caveat |
| Labyrinthine Recall | always north and Survival navigate/track advantage — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Orc (`orc`)
Code: server/catalog/motm.ts:30. Sumber sekunder: [25].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Adrenaline Rush | BA Dash, PB temp HP, PB/LR — correct manual. | accurate_manual |
| Powerful Build | larger carrying/push/drag/lift — manual. | accurate_manual |
| Relentless Endurance | drop to 1 instead of 0 unless outright death, once/LR — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Satyr (`satyr`)
Code: server/catalog/motm.ts:31. Sumber sekunder: [26].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Fey", "speed": 35}, "derivedSpeed": 35} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Ram | d6 STR bludgeoning unarmed — automated. | mixed_automated_and_manual |
| Magic Resistance | advantage saves against spells only — correct manual. | accurate_manual |
| Mirthful Leaps | +d8 feet on long/high jumps including standing; movement still spent — correct manual. | accurate_manual |
| Reveler | Performance/Persuasion plus one musical instrument — automated. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Sea Elf (`sea-elf`)
Code: server/catalog/motm.ts:32. Sumber sekunder: [27].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Child of the Sea | air/water breathing plus cold resistance — manual. | accurate_manual |
| Fey Ancestry | advantage avoid/end charmed — manual. | accurate_manual |
| Friend of the Sea | simple words to swimming Beasts, not reciprocal — correct manual. | accurate_manual |
| Keen Senses | Perception — automated. | mixed_automated_and_manual |
| Trance | conscious 4-hour LR, no sleep requirement/magical sleep; two unowned PHB weapon/tool proficiencies until next LR — choices automated, rest manual. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Shadar-kai (`shadar-kai`)
Code: server/catalog/motm.ts:33. Sumber sekunder: [28].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Blessing of the Raven Queen | BA visible unoccupied teleport <=30 ft PB/LR, from 3 all-damage resistance until next-turn start — manual; unoccupied destination absent from summary. | wrong_or_incomplete_text |
| Fey Ancestry | advantage avoid/end charmed — manual. | accurate_manual |
| Keen Senses | Perception — automated. | mixed_automated_and_manual |
| Necrotic Resistance | necrotic — manual. | accurate_manual |
| Trance | conscious 4-hour LR, no sleep requirement/magical sleep; two unowned PHB weapon/tools until next LR — choices automated, rest manual. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Shifter (`shifter`)
Code: server/catalog/motm.ts:34. Sumber sekunder: [29].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Bestial Instincts | one Acrobatics/Athletics/Intimidation/Survival — automated. | mixed_automated_and_manual |
| Shifting | BA minute or death/BA end, 2*PB temp HP, PB/LR — correct manual. | accurate_manual |
| Beasthide | extra d6 temp HP and +1 AC while shifted — correct manual; no active-state AC. | accurate_manual |
| Longtooth | fang unarmed d6 STR piercing when shifting and BA on other shifted turns — correct manual; no stateful attack. | accurate_manual |
| Swiftstride | +10 walking while shifted; reaction 10 ft after creature ends turn within 5 ft, no OA — correct manual. | accurate_manual |
| Wildhunt | shifted WIS-check advantage; attackers within 30 ft cannot gain advantage unless self incapacitated — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Tabaxi (`tabaxi`)
Code: server/catalog/motm.ts:35. Sumber sekunder: [30].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Cat’s Claws | d6 STR slashing unarmed — automated. | mixed_automated_and_manual |
| Cat’s Talent | Perception/Stealth — automated. | mixed_automated_and_manual |
| Feline Agility | double speed during own combat turn; reuse after 0-movement own turn — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Tortle (`tortle`)
Code: server/catalog/motm.ts:36. Sumber sekunder: [31].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata; selected_size_display_gap |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Claws | d6 STR slashing unarmed — automated. | mixed_automated_and_manual |
| Hold Breath | one hour — manual. | accurate_manual |
| Natural Armor | base 17 without DEX, armor forbidden, shield allowed — implemented; higher alternative unarmored formula is not itself a bug. | accurate_manual |
| Nature’s Intuition | one of six nature-related skills — automated. | mixed_automated_and_manual |
| Shell Defense | action, +4 AC, STR/CON save advantage, prone/speed locked 0/DEX save disadvantage/no reactions, only BA emerge — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | not_applicable |

### Triton (`triton`)
Code: server/catalog/motm.ts:37. Sumber sekunder: [32].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Amphibious | air/water breathing — manual. | accurate_manual |
| Control Air and Water | Fog Cloud at 1, Gust of Wind at 3, Water Walk at 5; INT/WIS/CHA; each once/LR or slots — known-spell/DC/use automated. | mixed_automated_and_manual |
| Emissary of the Sea | simple words to swimming Beast/Elemental/Monstrosity, no reverse understanding — correct manual. | accurate_manual |
| Guardian of the Depths | cold resistance — correct manual. | accurate_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

### Yuan-ti (`yuan-ti`)
Code: server/catalog/motm.ts:38. Sumber sekunder: [33].
| Detail | Hasil / batas | Status |
|---|---|---|
| type_size_speed | MotM type/size/walking speed; subtype prerequisites where present{"guide": {"size": "Medium / Small", "type": "Humanoid", "speed": 30}, "derivedSpeed": 30} | accurate_metadata |
| ASI_languages | MotM ASI +2/+1 or three +1; Common + one agreed language | intentional_2024_integration_not_pure_MotM |
| Darkvision | 60 ft; dim as bright, dark as dim, grayscale | incomplete_manual |
| Magic Resistance | spell saving-throw advantage, not all magical effects — correct manual. | accurate_manual |
| Poison Resilience | poison resistance (not immunity) and advantage avoid/end poisoned — correct manual. | accurate_manual |
| Serpentine Spellcasting | Poison Spray at 1, unlimited snake-only Animal Friendship at 1, Suggestion at 3 once/LR or slots 2+, INT/WIS/CHA — known-spell/DC/use automated, targets manual. | mixed_automated_and_manual |
| sheet_builder_levels_1_5 | Spells unlock at source character levels; correct casting ability, uses; fixed movement/skills/attacks/AC/initiative derive; lihat runtime JSON | runtime_exercised_not_full_valid_build |
| spell_bodies_targets_durations_scaling | Each spell full body, range, target, action, concentration and scaling must use agreed 2024/2014 version | unverified_spell_bodies |

## Verifikasi dan yang tidak diperiksa

Coverage JSON: 273 checks; 15 species dengan full spell-body belum diverifikasi. Jumlah 33 dan uniqueness dicek dengan assert, runtime 165 kasus selesai exit 0.

Tidak menjalankan combat automation, browser visual, seluruh build valid, semua pilihan legacy/season/trance/armor edge cases, atau seluruh test suite. Risiko: sumber sekunder dapat keliru; versi spell 2024 dapat mengubah detail dibanding spell 2014 yang dirujuk MotM. Tidak ada aplikasi/test/commit yang diubah.

## Sources

[1] https://dnd5e.wikidot.com/lineage:aarakocra — Wikidot secondary: aarakocra
[2] https://dnd5e.wikidot.com/lineage:aasimar — Wikidot secondary: aasimar
[3] https://dnd5e.wikidot.com/lineage:bugbear — Wikidot secondary: bugbear
[4] https://dnd5e.wikidot.com/lineage:centaur — Wikidot secondary: centaur
[5] https://dnd5e.wikidot.com/lineage:changeling — Wikidot secondary: changeling
[6] https://dnd5e.wikidot.com/lineage:deep-gnome — Wikidot secondary: deep-gnome
[7] https://dnd5e.wikidot.com/lineage:duergar — Wikidot secondary: duergar
[8] https://dnd5e.wikidot.com/lineage:eladrin — Wikidot secondary: eladrin
[9] https://dnd5e.wikidot.com/lineage:fairy — Wikidot secondary: fairy
[10] https://dnd5e.wikidot.com/lineage:firbolg — Wikidot secondary: firbolg
[11] https://dnd5e.wikidot.com/lineage:genasi-air — Wikidot secondary: genasi-air
[12] https://dnd5e.wikidot.com/lineage:genasi-earth — Wikidot secondary: genasi-earth
[13] https://dnd5e.wikidot.com/lineage:genasi-fire — Wikidot secondary: genasi-fire
[14] https://dnd5e.wikidot.com/lineage:genasi-water — Wikidot secondary: genasi-water
[15] https://dnd5e.wikidot.com/lineage:githyanki — Wikidot secondary: githyanki
[16] https://dnd5e.wikidot.com/lineage:githzerai — Wikidot secondary: githzerai
[17] https://dnd5e.wikidot.com/lineage:goblin — Wikidot secondary: goblin
[18] https://dnd5e.wikidot.com/lineage:goliath — Wikidot secondary: goliath
[19] https://dnd5e.wikidot.com/lineage:harengon — Wikidot secondary: harengon
[20] https://dnd5e.wikidot.com/lineage:hobgoblin — Wikidot secondary: hobgoblin
[21] https://dnd5e.wikidot.com/lineage:kenku — Wikidot secondary: kenku
[22] https://dnd5e.wikidot.com/lineage:kobold — Wikidot secondary: kobold
[23] https://dnd5e.wikidot.com/lineage:lizardfolk — Wikidot secondary: lizardfolk
[24] https://dnd5e.wikidot.com/lineage:minotaur — Wikidot secondary: minotaur
[25] https://dnd5e.wikidot.com/lineage:orc — Wikidot secondary: orc
[26] https://dnd5e.wikidot.com/lineage:satyr — Wikidot secondary: satyr
[27] https://dnd5e.wikidot.com/lineage:sea-elf — Wikidot secondary: sea-elf
[28] https://dnd5e.wikidot.com/lineage:shadar-kai — Wikidot secondary: shadar-kai
[29] https://dnd5e.wikidot.com/lineage:shifter — Wikidot secondary: shifter
[30] https://dnd5e.wikidot.com/lineage:tabaxi — Wikidot secondary: tabaxi
[31] https://dnd5e.wikidot.com/lineage:tortle — Wikidot secondary: tortle
[32] https://dnd5e.wikidot.com/lineage:triton — Wikidot secondary: triton
[33] https://dnd5e.wikidot.com/lineage:yuan-ti — Wikidot secondary: yuan-ti
