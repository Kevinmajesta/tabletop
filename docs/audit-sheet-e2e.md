# Sheet wizard browser audit — PHB 2024 / MotM

## Outcome
Three new audit-only characters were created and edited through the real wizard, saved by the running server and recovered in an authenticated Socket.IO `room:state` response. No application or test code was edited, no commits were made, no existing characters were deleted. Existing working-tree changes were preserved.

Client: http://localhost:5183; backend: http://localhost:3027. Isolated DATA_DIR: `C:/Users/USER/AppData/Local/hermes/cache/scratch/audit-sheet-data-3027`. Named browser session: `audit-sheet`. The original localhost:5173 start screen was inspected only; its Start/Reset buttons were not used.

## Real coverage (not exhaustive)
- **3 saved characters; 2/12 classes E2E:** Fighter and Wizard.
- PHB Aasimar Fighter 1 / Acolyte: create, standard array, Magic Initiate, proficiency overlap validation and correction, equipment, save, reload, rename, save.
- MotM Aasimar Champion Fighter 3 / Soldier: create, Revelation, background bonuses/tool, equipment, save, reopen/edit/rename/save. PHB `aasimar` and MotM `motm:aasimar` remain distinct in authoritative response.
- MotM Fairy Evoker Wizard 5 / Sage: create, Scholar, ASI, spellbook, nine prepared spells, Savant, Magic Initiate, save; change innate ability INT→CHA and save. Saved spell display uses CHA DC10/+2 for innate spells while class uses INT DC13/+5.
- **33/33 MotM species selected in identity/card menu only**, with captured card text; **2/33 MotM species E2E**, not 33.
- **12/12 class identity/subclass menus** exercised at level3; not all class builds.
- Source filter preserved Human when switched PHB→MotM and Fairy when switched MotM→PHB, without deliberate species selection.
- Duplicate Insight error focused `character-choice-class.proficiency.0` (editable class alternatives); incomplete Scholar expertise focused `character-choice-class.scholar`.
- Sea Elf + Sailor background Perception conflict exposes alternative background skill choices. This combination was not saved.
- Desktop 1262×568 and 1440×1000; mobile emulation390×844. Mobile document width390, no document horizontal overflow. Main/options/attribution are independently scrollable; scrolling main to bottom exposes Kembali/Lanjut at y729–773 within viewport844. Initial screenshot clipping alone is therefore not classified as a blocking mobile bug.

## Reproduced defects

### SHEET-01 — High — Wizard spellbook progression validation accepts impossible initial acquisition distribution
**Steps:** Create Wizard5, Evoker, Fairy, Sage. Fill required choices. On Spell select the first fourteen alphabetic spellbook entries: Acid Arrow, Alarm, Alter Self, Animate Dead, Arcane Lock, Arcanist’s Magic Aura, Augury, Bestow Curse, Blindness/Deafness, Blink, Blur, Burning Hands, Charm Person, Chromatic Orb. Choose required cantrips, prepared spells and separate Savant bonuses. Review, save, reload.

**Expected:** An ordinary newly generated level5 Wizard spellbook respects initial six level1 spells and level-up acquisition limits (or explicitly identifies learned/copied extra spells with separate handling).
**Actual:** Review says all required choices complete; server saves base14 containing only four level1 spells and three level3 spells. The separate level5 Savant bonus is Fireball. Initial six level1 spells cannot be represented by this saved progression; base level5 acquisition only supplies two level3 spells. No copied-spell acquisition mechanism was used in this wizard.

Evidence: `D:/DND/docs/audit-sheet-server-state.json` (actual authenticated server response, Fairy build spells/prepared and Savant choices); `D:/DND/docs/audit-sheet-evidence/wizard-review-desktop.png` (ready-to-save review). If unrestricted pre-existing/copied spellbooks are intentional, clarify that mode rather than silently treating this as normal generated progression.

### SHEET-02 — Medium — Some Review errors have no Perbaiki navigation
**Steps:** Edit saved Fairy Wizard5; clear first ASI ability in Ability; uncheck a selected class cantrip in Spell; open Tinjau. Also observable when class spellbook is incomplete.
**Expected:** Every actionable required-selection error offers a correction jump to its relevant section, consistent with proficiency errors.
**Actual:** `ASI level 4: pilih dua peningkatan +1 ...` and `cantrips: pilih 4 spell ...` render `<li><span>...</span> </li>` with no button; `spells:` likewise lacks a jump. Other errors contain a Perbaiki button. User must infer the correct step manually.
Evidence: `D:/DND/docs/audit-sheet-evidence/missing-correction-links.png`. Contrast working jumps: `D:/DND/docs/audit-sheet-evidence/overlap-jump.png` and `D:/DND/docs/audit-sheet-evidence/expertise-jump.png`.

### SHEET-03 — Low — MotM choices show internal keys rather than readable labels
**Steps:** Select MotM Aasimar3; open Proficiency. Select Fairy and view innate ability choice.
**Actual:** Revelation options display `necrotic-shroud`, `radiant-consumption`, `radiant-soul`; ability options `int`, `wis`, `cha`, unlike uppercase ability labels elsewhere. Functional but rough user-facing copy. Server response confirms the Revelation key chosen; menu coverage JSON records cards, not these option labels.

## Evidence inventory
- `D:/DND/docs/audit-sheet-results.json` — structured counts/passes/defects/limits.
- `D:/DND/docs/audit-sheet-menu-coverage.json` — actual text collected for 12 class menus and 33 MotM cards.
- `D:/DND/docs/audit-sheet-server-state.json` — authoritative rejoin response for all3 saved builds; excludes member credentials.
- `D:/DND/docs/audit-sheet-server-frames.json` — captured browser WS messages (does not contain the initial room state because transport upgraded after polling).
- `D:/DND/docs/audit-sheet-server-responses.json` — fetch capture; token-screen only, **not** persistence proof. Socket rejoin above provides that proof.
- Screenshots: `D:/DND/docs/audit-sheet-evidence/review-overlap.png`, `overlap-jump.png`, `expertise-jump.png`, `missing-correction-links.png`, `wizard-review-desktop.png`, `mobile-sheet.png`, `mobile-wizard.png`, `mobile-bottom-scroll.png`. `mobile-sheet.png` captured the transient loading state; do not treat it as completed-sheet evidence. `motm-aasimar-sheet.png` may exist from a timed-out capture; not relied on.

## Blockers and omissions
Initial isolated Vite setup hit plugin resolution/bundling issues; fixed only the scratch config. Port3011 was occupied, so used3027 without touching its occupant. Screenshot calls occasionally timed out; `Page.bringToFront` plus direct capture recovered. Desktop/mobile screenshot inspection used auxiliary vision; visible clipped content was checked against actual scrollability before reporting.

Only standard array and ASI were exercised; point buy/manual, other feats, other10 classes’ complete builds, all16 backgrounds, all33 MotM complete builds, every PHB species, combat/rest/conditional mechanics and comprehensive keyboard/accessibility checks were not done. Fairy level5 innate spells were verified; saved-sheet level1/3 innate gating remains unverified. Later window error listener returned no errors, but comprehensive console/network-error auditing was not captured. No build/test rerun; existing reported suite results were not substituted for browser coverage.

Risk: this is representative E2E coverage, not certification of all catalog combinations. Audit characters live only in the isolated scratch store; no production fixes were made.
