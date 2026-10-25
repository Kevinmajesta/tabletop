# Monsters of the Multiverse (2022)

33 playable species, checked against the official book index. `motm-sources.json` records each detailed public MotM reference and verified count; no monster/NPC entries. The book has a playable-race chapter and bestiary, not a new feat/spell chapter. Blade Ward was missing from the existing spell catalog and is added as an existing PHB 2024 spell reference.

IDs use `motm:`; existing PHB IDs and saved characters are not migrated. The species book picker filters options without changing the current build. Choosing another species clears species-specific choices, preserving class/background choices. Editing follows the saved species source. The catalog now has ten PHB species plus 33 MotM species. PHB Aasimar uses a distinct `aasimar` ID; its revelation form is chosen each activation, unlike MotM's saved revelation choice.

Mechanics are summarized in Indonesian, not reproduced as book prose. MotM ASI is intentionally not added on top of the builder's 2024 background increases. MotM uses Common plus one selected language. Fixed/selected skills, rest-selected weapon/tool proficiencies, size, Kobold Legacy, Shifting, season, Revelation, innate spell ability and level unlocks persist through build choices and server validation. Fixed racial/background skill overlap offers a replacement skill.

Derived sheet includes natural attacks, Lizardfolk/Tortle armor, Harengon initiative, and permanent swim/climb/fly speeds (flight unavailable in medium/heavy armor). Innate spells have their own ability/DC/attack readout, separate from class spellcasting.

## Deliberate limits

- Conditional effects, resistances, advantage, darkvision, carrying capacity, teleportation, shifting, healing, transformation, bonus damage, and per-rest racial uses are rules cards/manual play, not a combat automation engine. Rest-selected proficiencies/season are edited in the builder; rest does not open a new selection dialog.
- Racial spell free casts/at-will restrictions and slot expenditure are manual. They do not consume class known/prepared quotas. Class spell attack buttons are not generated for innate-only spells; use the separate species DC/attack readout.
- Spell definitions use existing 2024 spell versions (not a parallel 2014 spell catalog). This matters especially for Earth Genasi's Blade Ward: 2024 concentration/attack penalty differs from the original spell; the species card explicitly warns to agree with the DM.
- Existing builder level cap remains 5. Natural attack rows use the species STR formula; a monk using Martial Arts instead must apply that alternative manually.

Verification: failing tests observed before adding species and before mechanics/source picker/overlap fixes. Focused tests cover 33×levels 1–5, every innate unlock, all 33×16 backgrounds, armor, movement, initiative, validation, and source selection/reset helpers. Browser DOM check on an isolated server confirmed 9 PHB choices vs 33 MotM choices; changing the book left Human selected until a species was explicitly chosen. No pixel-level or full socket save/edit browser walkthrough was performed. Existing save validator/derived sheet tests exercise JSON roundtrip.
