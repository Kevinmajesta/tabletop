# Sheet UI fixes and verification

## Delivered
- Existing Review metadata/button routing now has focusable ASI level-4 and class cantrip/spellbook/prepared targets. Server agent supplied matching `asi.4`, `cantrips`, `spells`, `prepared` issue group keys; no server files edited here.
- Shared UI choice label formatter preserves catalog names, uppercases raw ability IDs, and title-cases hyphenated feature IDs. Revelation now reads Necrotic Shroud / Radiant Consumption / Radiant Soul.
- SpeciesCard reads the current build's `motm.size` or `race.size`; unset choices retain the possible-size overview. Existing sole caller already passes the current wizard build. Includes newly landed PHB Human choice shape (`race.size`).
- Equipment tab has five editable CP/SP/EP/GP/PP balances and explicit Simpan uang, using the backend's documented revision-protected `character:action` currency contract. Native integer/min/max validation plus safe-integer submit guard; existing request busy/error handling retained. Coin-ID equipment rows hidden to avoid displaying starting money as a second wallet; non-coin equipment preserved. No conversions/purchases.
- Existing quick-sheet/menu mutual-exclusion logic and user data untouched. No dependencies or commits.

## Scope reached
Characters.tsx, its single SpeciesCard render caller, new CurrencyWallet.tsx, character-labels.ts, characters.css, tests/character-ui-fixes.test.mjs. Existing species-card and validation-navigation tests run. No catalog/server edits.

## Automated verification
- RED observed: selected-size test failed against Medium / Small output; label helper initially absent; focus target test failed against missing ASI legend ID; wallet component initially absent.
- GREEN: `node --test tests/character-ui-fixes.test.mjs tests/species-card.test.mjs tests/character-validation-navigation.test.mjs`: **7/7 passed** (four new focused tests, three existing).
- `npm run build`: passed after wallet integration; existing Vite >500kB chunk warning only. Later `npx tsc -p tsconfig.server.json`: passed against current backend.
- `git diff --check`: passed; unrelated existing CRLF notices only.

## Actual browser coverage
Named isolated session `audit-fixes`; Vite http://localhost:5184; backend3028 with scratch-only DATA_DIR `C:/Users/USER/AppData/Local/hermes/cache/scratch/audit-fixes-data-3028`. No production characters used/deleted. Source data copied from prior audit export through the actual JSON import control; this is not a fresh click-by-click build of every selection.

- **1 audit character created/saved**, using prior PHB Aasimar Fighter1 sample with Small size. Reopened Edit, identity card showed Small.
- Switched source filter PHB→MotM without selecting: card remained Aasimar; then explicitly selected MotM Aasimar, chose Small and language, saved the edited character. Reopened Edit and observed Small. **This is one character edited across PHB/MotM, not two independent complete creations.**
- Wallet saved CP101/SP22/EP3/GP44/PP5. After backend restart/rejoin, then species rebuild/save/reopen, all five balances remained. Read scratch `rooms.json` independently: character `59824c08-e7f5-457d-84e9-cc201a676093`, revision3, race `motm:aasimar`, exact five balances persisted. No credentials copied to report.
- Review after raising level5: ASI Perbaiki activated Ability and actual `document.activeElement.id` was `character-choice-asi.4`.
- Revelation Perbaiki activated Proficiency and focused `character-choice-motm.revelation`; DOM labels were the three readable names.
- Switched working draft to Wizard5, Review: cantrips Perbaiki activated Spell with activeElement `character-choice-cantrips`; spellbook Perbaiki activated Spell with activeElement `character-choice-spells`. This invalid draft was discarded by selecting saved audit character.
- Desktop1262x568 and1440x1000; mobile390x844. Mobile document scrollWidth390, dialog x8/right382. Wallet all five inputs visible in wrapped 3+2 grid and save accessible; zero coin-ID equipment rows. Screenshot inspection confirmed no wallet overlap. Mobile spellbook target visible with focus outline; long spell lists remain scrollable, not all simultaneously visible.

## Evidence
- `docs/audit-sheet-ui-evidence/mobile-revelation-focus.png`
- `docs/audit-sheet-ui-evidence/mobile-spell-focus.png` (vision inspected)
- `docs/audit-sheet-ui-evidence/mobile-wallet.png` (vision inspected)
- `docs/audit-sheet-ui-evidence/desktop-wallet.png`

## Not checked / risk
No full all-class/all-species build matrix, newly generated valid Wizard5 save, prepared-only jump browser exercise, raw INT/WIS/CHA browser selection, comprehensive console capture, keyboard audit, or desktop screenshot vision inspection. Label unit test covers INT/WIS/CHA; focused source test covers prepared legend pattern. Previous audit's invalid Wizard sample is now correctly rejected by server progression validation, not silently reused as valid.
Wallet intentionally has no exchange/purchase feature. Inputs reset to authoritative values on character revision changes (including another authorized editor), so concurrent drafts are not retained; revision validation prevents stale overwrite. Action-economy labels are a separate agent's subsequent scope, not delivered or claimed here.
