# Builder audit mechanics fixes

## Fixed
- Elf Keen Senses is classified from its actual skill IDs, grants sheet proficiency, and participates in duplicate-skill validation.
- Human uses the existing `human.skill` choice only; removed the redundant `trait.skillful` prompt without changing saved Human skill selections.
- High Elf exposes `trait.spell.high-elf-cantrip-versatility` with the runtime Wizard cantrip list. Its selection replaces the lineage Prestidigitation source only; an independently learned class Prestidigitation remains. Innate casting uses `race.spell-ability`; levelled lineage spells remain always prepared outside the class quota.
- Wizard normal learned spellbooks enforce cumulative acquisition limits, separate from Savant bonus choices. At level 5, at least eight of the fourteen normal learned spells must be level 1, no more than six level 2+, and no more than two level 3. Lower-level spells can still be chosen in later acquisitions.
- Validation issues now target Ability/`asi.4` (or the relevant ASI level), Spell/`cantrips`, Spell/`spells`, and Spell/`prepared`. Progression errors also target Spell/`spells`. Prepared error counts include Savant book spells.

## Scope and compatibility
`buildGroups`, `validateBuild`, and `deriveSheet` are the shared root used by the builder, server save validation, and rest-time prepared-spell updates. No storage/schema migration or destructive operation. Existing invalid generated Wizard spellbooks will require correction when resubmitted, not be silently rewritten.

The current builder has an exact normal-learned count and separate Savant selections; it has no copied-spell field, UI, or documented copied-spell acquisition mode. This change does not add one or claim that the normal-learning cap applies to all legal Wizard spellbooks. Savant spells remain separate and prepareable. Supporting copied spells later requires an explicit acquisition field and corresponding UI/rest-time caller handling rather than weakening normal generation validation.

Six feat martial prerequisites are catalog-data-driven (`generalFeat.requires`), not hardcoded to the six IDs in server logic. A regression test checks all six and retains ability minimum validation; catalog agent owns the data correction. Human Small catalog/choice work and UI navigation are owned by the other agents.

## Verification
Added `tests/builder-audit-fixes.test.mjs`; observed red failures before each mechanics/metadata fix. Focused server/lineage/navigation/background/MotM tests and both TypeScript projects are run; final results are recorded in the handoff.

Sources: audit reproductions in `audit-phb-origins-detail.md` and `audit-sheet-e2e.md`; official origins https://www.dndbeyond.com/sources/dnd/free-rules/character-origins ; licensed 2024 Wizard text https://roll20.net/compendium/dnd5e/Classes:Wizard?expansion=32231 (six level-1 initial spells, two per Wizard level thereafter, slot-level restriction). Official class extraction returned incomplete text, so the licensed class text was used to confirm the progression rule.

Skipped: new copied-spell/import mode, UI edits, production-data migration, combat automation, full build and full suite (parent owns final integration). Risk: invalid old generated spellbooks will be rejected on subsequent save; unrestricted copied books remain unsupported, as before.
