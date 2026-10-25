# Currency wallet backend

Implemented in `server/characters.ts` and `server/index.ts`. Frontend ownership stays with the UI agent; no frontend files were edited here. Exact integration API: [currency-wallet-contract.json](currency-wallet-contract.json).

## State and action

`Character.currency?: Currency`, with lowercase `cp`, `sp`, `ep`, `gp`, `pp` balances. New characters initialize once from the existing structured coin entries in `result.sheet.equipment` (the default Fighter/Acolyte fixture starts with 12 GP). No text parsing or inferred wealth. Saved characters without a wallet receive all zero on load to avoid re-awarding starting money. The migration is stored on the next normal room save.

Use existing `character:action` with `{type: 'currency', id, revision, currency: {cp, sp, ep, gp, pp}}`. This is full-wallet replacement, not a delta. All five keys are required; extra keys, missing keys, arrays, negative values, fractions, strings, nonfinite or unsafe integers fail atomically without incrementing revision. Owner/DM authorization, stale revision rejection, room filtering, rate limit, success acknowledgement, room broadcast and persistence are the existing runtime-action path. Extra top-level forged fields do not mutate owner/HP/build. Rebuild and rest preserve currency. No exchange, automatic purchase, item consumption, or starting-money re-award.

The derived `sheet.equipment` remains build history, including its original coin rows. UI should filter coin-id rows when showing the mutable wallet to avoid implying those balances are additional money.

## Verification

- RED verified missing `startingCurrency`; GREEN verified structured initialization.
- RED verified new characters lacked currency; GREEN exercised real socket server with owner, DM and unrelated player.
- `npx tsc -p tsconfig.server.json && node --test tests/currency-wallet.test.mjs tests/character-actions.test.mjs`: 4 passed.
- Wallet integration covers create forged-wallet ignored, initial structured money, unauthorized/missing character, malformed values, stale revisions, owner and DM updates, peer visibility/privacy, forged owner/HP ignored, rebuild/rest preservation, disk write, server restart roundtrip and legacy migration.
- `npm run build`: passed (existing Vite large-chunk warning).
- `npm test`: 114 passed / 118 total. Four unrelated failures: three `levels-2024.test.mjs` Wizard fixtures rejected by existing acquisition-level validation; one `tabletop.test.mjs` dice cooldown timing assertion. Left untouched, as these are outside currency ownership.
- `git diff --check`: no whitespace errors (existing LF/CRLF warnings in unrelated files).

Skipped browser/UI verification because another agent owns it. Existing legacy balances intentionally default to zero; players/DM must enter any current holdings manually.
