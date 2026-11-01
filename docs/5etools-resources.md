# Local rule resource imports

Source checkout: `D:/5etools-src`, repository `5etools-mirror-3/5etools-src`, revision `8790755429c346d20020eed7826d312d484c393f`.

Regenerate application snapshots from the local checkout:

- `node scripts/import-5etools-spells.mjs D:/5etools-src`
- `node scripts/generate-progression-xphb.mjs D:/5etools-src`
- `node scripts/import-5etools-resources.mjs D:/5etools-src`
- `node scripts/compact-rule-runtime.mjs` after regenerating source snapshots

Runtime modules use the `*-runtime.json` snapshots to avoid shipping duplicate raw prose to browsers. Full snapshots remain available for source audits; regenerate both together.

Application snapshots live in `server/catalog`. They are imported locally; players do not fetch resources from GitHub. The separate `resources/5etools-xphb` directory is an unmodified source download, not the runtime catalog.

Scope: PHB 2024 (`XPHB`) character resources and level 1–20 single-class progression; MPMM species resources under the separate MotM species picker. Source records include revision/page provenance. Rich source descriptions are English; existing concise Indonesian guidance remains separate.

Resource coverage does not certify complete rules automation. Conditional effects, optional-feature prerequisites/selections, later feat effects, variable subclass spell grants, and copied Wizard spells require explicit implementation/verification. No multiclassing is implied. Do not treat descriptions alone as executed combat mechanics.

Local availability does not grant redistribution rights. Check the rights for source material before publishing downloaded book content.

No campaign data has been deleted by these importers. Back up saved room data before intentionally clearing old characters; do not delete rooms/maps/tokens just to refresh a rule catalog.
