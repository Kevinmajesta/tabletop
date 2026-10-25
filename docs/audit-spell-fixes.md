# Spell catalog repair report

## Outcome

Repaired all **10 confirmed spell findings** in `audit-phb-classes-spells-detail.md`. The expanded scan additionally repaired Arcane Lock's material delimiter, Augury's material delimiter, and Protection from Evil and Good's broken material price punctuation. **11 distinct spell entries, 20 fields changed**. All non-spell snapshot sections are byte-for-value unchanged (JSON comparison against HEAD); spell inventory remains 217 unique snapshot entries and 218 unique runtime entries.

| Entries | Repaired fields |
|---|---|
| Divine Smite, Find Steed, Guidance, Resistance, Searing Smite, Sorcerous Burst | Clean range and restored V / V,S components (12 fields) |
| Protection from Evil and Good | concentration=true; duration normalized to `up to 10 minutes`; material `25+ GP` punctuation (3 fields) |
| Augury | Complete four-outcome omen table, including Weal/Good; material delimiter (2 fields) |
| Confusion | Complete behavior table, restoring 1 and 7–8 with all movement, direction, melee-target, and no-target instructions (1 field) |
| Control Water | Removed unrelated Control Weather prose, all three weather tables, and Counterspell heading; restored continuous Whirlpool dimensions and spelling (1 field) |
| Arcane Lock | Removed unmatched material opening delimiter (1 field) |

No upstream ingestion script exists in this repository: the application imports a checked-in API snapshot. Repairing that shared snapshot fixes its consumers without UI special cases. Tests exercise both that file and the live `revisedCatalog` source import through the installed tsx API; they do not depend on stale compiled output or a build race.

## Independent source and retained evidence

Official source: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf (SRD 5.2.1), independently retrieved during the original audit, not the catalog API. Rehashed the retained PDF: **8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87**, matching the audit matrix.

The retained `C:/Users/USER/AppData/Local/hermes/cache/scratch/phb-audit-srd.pdf`, `phb-audit-srd-flow.txt`, and `phb-audit-spell-diagnostics.json` were inspected for source headers and spell bodies. Scratch may be pruned. The permanent `tests/fixtures/spell-audit-srd.json` retains the three repaired descriptions, independently assembled from the official extraction (whitespace/line wrapping normalized, table columns paired in source order, numeric ranges rendered with ASCII hyphens). It is a regression reference, not API-derived expected data.

Short header evidence: the source has `Range: Self Component: V` for Divine/Searing Smite; `30 feet Component: V, S` for Find Steed; `Touch Component: V, S` for Guidance/Resistance; `120 feet Component: V, S` for Sorcerous Burst. Protection's source says `Duration: Concentration up to 10 minutes`. Source material headers confirm `gold dust worth 25+ GP`, Augury's `tokens worth 25+ GP`, and Holy Water `worth 25+ GP, which the spell consumes`.

Attribution: This work includes material from the System Reference Document 5.2.1 (SRD 5.2.1) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode. Changes: extracted text reformatted as noted above and catalog extraction errors repaired.

## Verification

Real RED/GREEN cycles:

- Singular Component regression: 1 test, 0 pass, 1 fail (`Self Component: V` != `Self`); after repairs, 1 pass.
- Concentration regression: 2 tests, 1 pass, 1 fail (`false !== true`); after repair and restricting the global consistency scan to source-covered snapshot entries, 2 pass.
- Complete descriptions/table regression: 6 tests, 2 pass, 4 fail (missing rows and neighboring weather text); after repair, 6 pass.
- Material regression: 7 tests, 6 pass, 1 fail (Arcane Lock opening delimiter); after repair, 7 pass.

Final command: `node --test tests/spell-catalog-audit.test.mjs`

```text
✔ spell inventories retain unique entries after repairs
✔ material text excludes extraction parentheses and broken GP punctuation
✔ augury retains its complete official text without neighboring spell contamination
✔ confusion retains its complete official text without neighboring spell contamination
✔ control-water retains its complete official text without neighboring spell contamination
✔ restored omen and confusion tables include every outcome
✔ Protection from Evil and Good requires concentration with a clean duration
✔ singular Component headers retain clean ranges and every component in snapshot and runtime
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

`git diff --check -- server/catalog/srd-2024.json` passed. No dependencies, commits, character/UI changes, or build output generated.

## Expanded scan and limitations

Scanned all 217 snapshot spell ranges/components, concentration-duration contradictions, and malformed material delimiters/prices. Exactly six singular-component errors and one concentration contradiction were found. Compared all source-covered description/higher-level bodies for normalized content gaps; beyond the three repaired descriptions, remaining differences were formatting, repeated higher-level labels, embedded stat-block titles/order, and the final source block containing post-spell book content. No additional missing tables or neighboring-column contamination was confirmed.

Skipped: full suite/build (parent owns final verification), browser/casting execution, full structured damage scaling, ambiguous Find Steed/Giant Insect stat-block placement, and paid/non-SRD source verification.
Risk: runtime-only Blade Ward has a concentration-bearing duration but no concentration boolean; it remains unverified against the independent SRD and lives outside this task's owned file, so it was not silently changed. The upstream API may reintroduce these defects if the snapshot is regenerated without source validation.
