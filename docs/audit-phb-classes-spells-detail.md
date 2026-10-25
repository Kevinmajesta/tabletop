# PHB 2024 classes, subclasses and spells — detail audit

## Verdict

**Partial audit, not a clean bill of health.** All runtime inventory entries have a status; not all entries have source verification. Implementation was read-only. Existing uncommitted work was retained.

Official SRD 5.2.1 PDF was downloaded in full, extracted locally, and used independently of the catalog API. It covers the twelve base classes and twelve open subclasses, not the complete paid PHB.[1]

This work includes material from the System Reference Document 5.2.1 (SRD 5.2.1) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

## Inventory and exact coverage

Raw snapshot: 12 classes, 12 subclasses, 217 spells. Runtime catalog: 12 classes, 48 subclasses, 218 spells (adds Blade Ward). Runtime was imported with Node/tsx; spellLimits was actually called for all 60 base-class/level pairs.

```json
{
  "counts": {
    "classes": {
      "manual": 12
    },
    "subclasses": {
      "manual": 12,
      "unverified": 36
    },
    "feature_rows": {
      "manual": 29,
      "pass": 92,
      "unverified": 63
    },
    "spells": {
      "unverified": 1,
      "pass": 202,
      "mismatch": 10,
      "manual": 5
    }
  },
  "inventory": {
    "raw_classes": 12,
    "runtime_classes": 12,
    "raw_subclasses": 12,
    "runtime_subclasses": 48,
    "raw_spells": 217,
    "runtime_spells": 218,
    "spell_level_counts": {
      "0": 28,
      "2": 57,
      "1": 57,
      "3": 42,
      "4": 34
    }
  }
}
```

Counts are asserted against the imported runtime catalog in Python. The JSON matrix enumerates every class, subclass, reachable feature reference at levels 1–5, and spell individually. Four statuses are used: pass (specified static check succeeded), mismatch (confirmed source difference), manual (incomplete comparison), unverified (required source not retrieved).

## Reproduced actionable findings

| Priority | Entries | Actual vs source | Reproduction / location |
|---|---|---|---|
| P2 | divine-smite | range polluted by Component label; V component omitted.[1] | Import catalog, find `divine-smite`; inspect fields at `server/catalog/srd-2024.json:24119`. |
| P2 | find-steed | range polluted by Component label; V/S components omitted.[1] | Import catalog, find `find-steed`; inspect fields at `server/catalog/srd-2024.json:24865`. |
| P2 | guidance | range polluted by Component label; V/S components omitted.[1] | Import catalog, find `guidance`; inspect fields at `server/catalog/srd-2024.json:25642`. |
| P2 | resistance | range polluted by Component label; V/S components omitted.[1] | Import catalog, find `resistance`; inspect fields at `server/catalog/srd-2024.json:28584`. |
| P2 | searing-smite | range polluted by Component label; V component omitted.[1] | Import catalog, find `searing-smite`; inspect fields at `server/catalog/srd-2024.json:28814`. |
| P2 | sorcerous-burst | range polluted by Component label; V/S components omitted.[1] | Import catalog, find `sorcerous-burst`; inspect fields at `server/catalog/srd-2024.json:29418`. |
| P1 | protection-from-evil-and-good | concentration=false despite source requiring concentration; risks concurrent concentration effects.[1] | Import catalog, find `protection-from-evil-and-good`; inspect fields at `server/catalog/srd-2024.json:28243`. |
| P2 | augury | omen table omits Weal/Good row.[1] | Import catalog, find `augury`; inspect fields at `server/catalog/srd-2024.json:21941`. |
| P2 | confusion | behavior table omits results 1 and 7-8.[1] | Import catalog, find `confusion`; inspect fields at `server/catalog/srd-2024.json:23001`. |
| P2 | control-water | description contaminated with Control Weather tables and Counterspell heading.[1] | Import catalog, find `control-water`; inspect fields at `server/catalog/srd-2024.json:23219`. |

All ten entry findings were reproduced by comparing actual runtime fields/text with the retrieved PDF spell headers/body. The six range/component failures share the singular `Component:` parsing pattern; fix the source ingestion boundary rather than special-casing only the UI. The concentration flag contradicts even its own duration string. Table rows and adjacent-column pollution need repaired ingestion and regression fixtures. No fix was applied.

## What the spell comparison actually checked

For all 217 SRD spell headings, compare casting time, range, duration, V/S/M components, material text presence, ritual and concentration flags, complete description occurrence and higher-level text occurrence. Complete normalized prose match includes damage, targets and 2024 cantrip upgrade wording, avoiding a blanket assumption that old 2014 text is valid. Header level, school and class lists also have individual statuses. Numeric damage-dice presence is checked where catalog damage exists; complete structured scaling-map correctness remains manual.

Find Steed has confirmed metadata mismatches; its higher-level stat-block text is additionally manual. Giant Insect is manual because stat blocks embedded in higher_level have PDF ordering/linebreak differences, not yet proven semantic changes. Fireball, Invisibility, Shield and Suggestion remain manual due to ambiguous first-occurrence header extraction, not confirmed bugs. Blade Ward is unverified: no matching entry in retrieved SRD. Level-4 spells remain inventoried even though ordinary class slots at builder level 5 reach only spell level 3.

## Classes and subclasses

All twelve hit dice and saving-throw-name presence checks passed against each Core Class Traits section. Skills have separate text-match statuses; failures are not automatically bugs (some lists differ in formatting). Complete feature descriptions were normalized and searched independently in the source, producing the feature-row counts above. This does NOT prove that missing feature rows do not exist, or that level placement and player choices are correct.

| Class | Hit die | Saves | Skills text | Whole class |
|---|---|---|---|---|
| Barbarian | pass | pass | pass | manual |
| Bard | pass | pass | manual | manual |
| Cleric | pass | pass | pass | manual |
| Druid | pass | pass | manual | manual |
| Fighter | pass | pass | manual | manual |
| Monk | pass | pass | manual | manual |
| Paladin | pass | pass | pass | manual |
| Ranger | pass | pass | pass | manual |
| Rogue | pass | pass | manual | manual |
| Sorcerer | pass | pass | pass | manual |
| Warlock | pass | pass | manual | manual |
| Wizard | pass | pass | manual | manual |

### All 48 subclass dispositions

| Subclass | Status |
|---|---|
| Champion | manual |
| Circle of the Land | manual |
| College of Lore | manual |
| Draconic Sorcery | manual |
| Evoker | manual |
| Fiend Patron | manual |
| Hunter | manual |
| Life Domain | manual |
| Oath of Devotion | manual |
| Path of the Berserker | manual |
| Thief | manual |
| Warrior of the Open Hand | manual |
| Archfey Patron | unverified |
| Celestial Patron | unverified |
| Great Old One Patron | unverified |
| Circle of the Moon | unverified |
| Circle of the Sea | unverified |
| Circle of the Stars | unverified |
| Battle Master | unverified |
| Eldritch Knight | unverified |
| Psi Warrior | unverified |
| Path of the Wild Heart | unverified |
| Path of the World Tree | unverified |
| Path of the Zealot | unverified |
| College of Dance | unverified |
| College of Glamour | unverified |
| College of Valor | unverified |
| Light Domain | unverified |
| Trickery Domain | unverified |
| War Domain | unverified |
| Warrior of Mercy | unverified |
| Warrior of Shadow | unverified |
| Warrior of the Elements | unverified |
| Oath of the Ancients | unverified |
| Oath of Glory | unverified |
| Oath of Vengeance | unverified |
| Beast Master | unverified |
| Fey Wanderer | unverified |
| Gloom Stalker | unverified |
| Arcane Trickster | unverified |
| Assassin | unverified |
| Soulknife | unverified |
| Aberrant Sorcery | unverified |
| Clockwork Sorcery | unverified |
| Wild Magic Sorcery | unverified |
| Abjurer | unverified |
| Diviner | unverified |
| Illusionist | unverified |

## Required follow-up / risk

- Retrieve legitimate paid PHB text for all 36 non-SRD subclasses. Their abbreviated Indonesian feature summaries and added subclass spell tables are NOT certified; this audit does not call them false merely because they cannot be sourced.
- Independently compare all 60 class progression rows: slots, prepared quotas, cantrips, class resources, restrictions, armor/weapon/tool sets, skill choices, HP at first and later levels; current matrix retains runtime outputs for follow-up, not a false pass.
- Validate subclass feature inventory completeness and level placement, subclass always-prepared spells, free-use resources, Wizard Savant additions, Arcane Trickster Mage Hand and all source restrictions.
- Exercise creation sheet and saved-character actions end-to-end. This run imported real functions but did not run browser character creation, HP builds, combat casting or full test suites.
- No multiclass support was audited (explicitly excluded). No application/test changes or commits were made.

## Artifacts and reproducibility

- `docs/audit-phb-classes-spells-matrix.json`: complete runtime inventory with per-entry status, source URLs, code references, field checks and captured spellLimits outputs.
- `docs/audit-phb-classes-ledger.json`: citation identity ledger.
- Full official PDF and extracted text plus comparison scripts retained in Hermes scratch (`phb-audit-*`); matrix records PDF SHA-256. Scratch may be pruned.

Skipped / not checked: paid PHB source for 36 subclasses, full choice/HP/progression execution, browser sheet QA, complete structured damage scaling.
Risk: partial static passes must not be presented as full PHB compliance; confirmed concentration and malformed spell metadata can affect actual play.

## Sources

[1] https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf — Official SRD 5.2.1
    > "The System Reference Document 5.2.1"
