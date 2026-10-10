import revisedSnapshot from "./catalog/srd-2024.json" with { type: "json" };
import {
  phbSubclasses,
  phbFeatures,
  extraSubclassSpells,
} from "./catalog/subclasses-2024.js";
import {
  metamagic,
  invocations,
  maneuvers,
} from "./catalog/class-options-2024.js";
import { generalFeats } from "./catalog/feats-2024.js";
import {
  backgrounds2024,
  originFeats,
  toolSets,
} from "./catalog/backgrounds-2024.js";

export const abilities = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof abilities)[number];
type Ref = { index: string; name: string; url?: string };
export type ApiOption = {
  option_type?: string;
  unit?: string;
  item?: Ref;
  of?: Ref;
  count?: number;
  choice?: ApiChoice;
  items?: ApiOption[];
  string?: string;
  ability_score?: Ref;
  bonus?: number;
};
export type ApiChoice = {
  choose: number;
  desc?: string;
  type?: string;
  from: {
    option_set_type: string;
    options?: (ApiOption | string)[];
    equipment_category?: Ref;
  };
};
export type LevelData = {
  level: number;
  features: Ref[];
  prof_bonus?: number;
  ability_score_bonuses?: number;
  spellcasting?: Record<string, number>;
  class_specific?: Record<string, unknown>;
};
type Progression = {
  levels?: LevelData[];
  description?: string;
  subspecies?: Ref[];
  ability_scores?: Ref[];
  feat?: Ref;
  equipment_options?: ApiChoice[];
  type?: string;
};
export type Entry = Ref & {
  spells?: (Ref | { spell: Ref })[];
  description?: string;
  higher_level?: string | string[];
  equipment_categories?: Ref[];
  desc?: string[];
  proficiencies?: Ref[];
  ability_bonuses?: { ability_score: Ref; bonus: number }[];
  traits?: Ref[];
  racial_traits?: Ref[];
  subraces?: Ref[];
  race?: Ref;
  speed?: number;
  languages?: Ref[];
  language_options?: ApiChoice;
  ability_bonus_options?: ApiChoice;
  proficiency_choices?: ApiChoice[] | ApiChoice;
  starting_equipment?: { equipment: Ref; quantity: number }[];
  starting_equipment_options?: ApiChoice[];
  saving_throws?: Ref[];
  hit_die?: number;
  class?: Ref;
  subclass?: Ref;
  parent?: Ref;
  level?: number;
  levelOne?: {
    features: Ref[];
    spellcasting?: {
      cantrips_known?: number;
      spells_known?: number;
      spell_slots_level_1?: number;
    };
  };
  spellcasting?: { level: number; spellcasting_ability: Ref };
  feature_specific?: {
    subfeature_options?: ApiChoice;
    enemy_type_options?: ApiChoice;
    terrain_type_options?: ApiChoice;
  };
  trait_specific?: { spell_options?: ApiChoice; subtrait_options?: ApiChoice };
  equipment?: Ref[];
  equipment_category?: Ref;
  armor_category?: string;
  armor_class?: { base: number; dex_bonus: boolean; max_bonus?: number };
  str_minimum?: number;
  weapon_category?: string;
  weapon_range?: string;
  properties?: Ref[];
  damage?: { damage_dice: string; damage_type: Ref };
  classes?: Ref[];
  casting_time?: string;
  range?: string;
  duration?: string;
  components?: string[];
  feature?: { name: string; desc: string[] };
  starting_proficiencies?: Ref[];
};
export type Background = {
  id: string;
  name: string;
  source: string;
  sourceId: string;
  desc: string;
  skills: string[][];
  languageCount: number;
  fixedLanguages: string[];
  equipmentText: string;
  toolsText: string;
  feature: string;
  featureDesc: string;
  licenseUrl: string;
  available: boolean;
};
export type Catalog = {
  version: number;
  ruleset: string;
  classes: Entry[];
  races: Entry[];
  subraces: Entry[];
  skills: Entry[];
  equipment: Entry[];
  categories: Entry[];
  spells: Entry[];
  features: Entry[];
  traits: Entry[];
  subclasses: Entry[];
  languages: Entry[];
  backgrounds: Background[];
};
export type Ruleset = "srd-2014" | "srd-2024";

export type ChoiceGroup = {
  key: string;
  name: string;
  count: number;
  options: {
    id: string;
    name: string;
    equipment?: { id: string; count: number }[];
  }[];
  kind:
    | "skill"
    | "language"
    | "tool"
    | "feature"
    | "equipment"
    | "ability"
    | "spell";
};
export type BuildInput = {
  ruleset?: Ruleset;
  level?: number;
  subclassId?: string;
  levelFourFeat?: string;
  asi?: Record<string, Ability[]>;
  name: string;
  race: string;
  subrace: string;
  classId: string;
  background: string;
  backgroundName: string;
  method: "standard" | "point-buy" | "manual";
  scores: Record<Ability, number>;
  choices: Record<string, string[]>;
  cantrips: string[];
  spells: string[];
  prepared: string[];
  armor: string;
  shield: boolean;
  notes: string;
};
export type Character = {
  id: string;
  ownerId: string;
  revision: number;
  ruleset: Ruleset;
  build: BuildInput;
  sheet: Sheet;
  hp: number;
  tempHp: number;
  slotsUsed: number;
  spellSlotsUsed?: Record<string, number>;
  resourcesUsed?: Record<string, number>;
  concentration?: string;
  concentrationSaveDC?: number;
  deathSuccess: number;
  deathFailure: number;
  conditions: string[];
};
export type Sheet = {
  name: string;
  className: string;
  subclassName?: string;
  raceName: string;
  backgroundName: string;
  level: number;
  scores: Record<Ability, number>;
  modifiers: Record<Ability, number>;
  hp: number;
  ac: number;
  speed: number;
  initiative: number;
  proficiency: number;
  skills: {
    id: string;
    name: string;
    bonus: number;
    proficient: boolean;
    expertise: boolean;
  }[];
  saves: { id: Ability; bonus: number; proficient: boolean }[];
  passivePerception: number;
  equipment: { id: string; name: string; count: number }[];
  attacks: { id: string; name: string; bonus: number; damage: string }[];
  languages: string[];
  proficiencies: string[];
  features: { name: string; desc: string[] }[];
  cantrips: string[];
  spells: string[];
  prepared: string[];
  spellAbility?: Ability;
  spellAttack?: number;
  spellDC?: number;
  slots: number;
  slotsByLevel?: Record<string, number>;
  equipmentNotes: string;
  toolsNotes: string;
};
export const modifier = (score: number) => Math.floor((score - 10) / 2);
export const standardArray = [15, 14, 13, 12, 10, 8];
export const pointCost = (score: number) =>
  ({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 })[score] ?? 999;
const revisedRaw = revisedSnapshot as unknown as Catalog;
export const revisedCatalog: Catalog = {
  ...revisedRaw,
  traits: revisedRaw.traits.map((trait) => ({
    ...trait,
    desc: [
      ...(trait.desc?.length
        ? trait.desc
        : trait.description
          ? [trait.description]
          : []),
      ...(trait.spells || [])
        .flatMap((ref) => {
          const index = "spell" in ref ? ref.spell.index : ref.index;
          const spell = revisedRaw.spells.find((s) => s.index === index);
          return spell
            ? [spell.description || spell.desc?.join("\n") || ""]
            : [];
        })
        .filter(Boolean),
    ],
  })),
  spells: revisedRaw.spells.map((spell) => ({
    ...spell,
    desc: [
      ...(spell.desc?.length
        ? spell.desc
        : spell.description
          ? [spell.description]
          : []),
      ...(spell.higher_level
        ? [
            `Using a Higher-Level Spell Slot: ${Array.isArray(spell.higher_level) ? spell.higher_level.join("\n") : spell.higher_level}`,
          ]
        : []),
    ],
  })),
  subclasses: [...revisedRaw.subclasses, ...phbSubclasses],
  equipment: revisedRaw.equipment.map((e) => ({
    ...e,
    equipment_category: e.equipment_categories?.[0],
    armor_category:
      e.index === "shield"
        ? "Shield"
        : e.equipment_categories?.some((c) => c.index === "heavy-armor")
          ? "Heavy"
          : e.equipment_categories?.some((c) => c.index === "medium-armor")
            ? "Medium"
            : e.equipment_categories?.some((c) => c.index === "light-armor")
              ? "Light"
              : undefined,
    weapon_category: e.equipment_categories?.some(
      (c) => c.index === "martial-weapons",
    )
      ? "Martial"
      : e.equipment_categories?.some((c) => c.index === "simple-weapons")
        ? "Simple"
        : undefined,
    weapon_range: e.equipment_categories?.some(
      (c) => c.index === "ranged-weapons",
    )
      ? "Ranged"
      : "Melee",
  })),
  races: revisedRaw.races.map((r) => ({
    ...r,
    subraces: (r as Entry & Progression).subspecies || [],
  })),
  subraces: revisedRaw.subraces.map((r) => ({
    ...r,
    racial_traits: r.traits || [],
  })),
  features: [
    ...revisedRaw.features.map((f) => ({
      ...f,
      desc: f.desc || [(f as Entry & Progression).description || ""],
    })),
    ...phbFeatures,
  ],
  backgrounds: backgrounds2024.map((b) => ({
    id: `srd-2024:${b.index}`,
    name: b.name,
    source: "D&D 2024",
    sourceId: "srd-2024",
    desc: b.desc.join("\n"),
    skills: b.proficiencies
      .filter((p) => p.index.startsWith("skill-"))
      .map((p) => [p.index.slice(6)]),
    languageCount: 0,
    fixedLanguages: [],
    equipmentText: b.equipment_options[0].from
      .options!.map(equipmentLabel)
      .join(" atau "),
    toolsText:
      b.proficiencies
        .filter((p) => !p.index.startsWith("skill-"))
        .map((p) => p.name)
        .join(", ") || "Pilih satu tool pada langkah Proficiency.",
    feature: b.feat.name,
    featureDesc: originFeats[b.feat.index],
    licenseUrl: "",
    available: true,
  })),
};
export function catalogFor(build: Pick<BuildInput, "ruleset">): Catalog {
  return revisedCatalog;
}
export const catalog = revisedCatalog;
export function levelFor(build: BuildInput) {
  return Math.max(1, Math.min(5, Math.trunc(build.level || 1)));
}
export function subclassFor(build: BuildInput) {
  return catalogFor(build).subclasses.find(
    (s) =>
      s.class?.index === build.classId &&
      levelFor(build) >= 3 &&
      s.index === build.subclassId,
  );
}
export const levelFourFeats = [
  ...revisedSnapshot.feats.filter(
    (f) => f.type === "general" && f.index !== "ability-score-improvement",
  ),
  ...generalFeats,
];
export function progression(build: BuildInput): LevelData | undefined {
  return (
    catalogFor(build).classes.find((c) => c.index === build.classId) as Entry &
      Progression
  )?.levels?.find((l) => l.level === levelFor(build));
}
export function asiLevels(build: BuildInput) {
  return [4, ...(build.classId === "fighter" ? [6] : [])].filter(
    (l) => l <= levelFor(build),
  );
}
export function emptyBuild(): BuildInput {
  return {
    ruleset: "srd-2024",
    level: 1,
    name: "",
    race: "human",
    subrace: "",
    classId: "fighter",
    background: "srd-2024:acolyte",
    backgroundName: "",
    method: "standard",
    scores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    choices: {},
    cantrips: [],
    spells: [],
    prepared: [],
    armor: "",
    shield: false,
    notes: "",
  };
}
export function equipmentGroups(
  choice: ApiChoice,
  key: string,
  catalog: Catalog = catalogFor({}),
): ChoiceGroup[] {
  if (choice.from.option_set_type === "equipment_category") {
    const category = catalog.categories.find(
      (c) => c.index === choice.from.equipment_category?.index,
    );
    return [
      {
        key,
        name: choice.desc || category?.name || "Equipment",
        count: choice.choose,
        kind: "equipment",
        options: (category?.equipment || []).map((e) => ({
          id: e.index,
          name: e.name,
          equipment: [{ id: e.index, count: 1 }],
        })),
      },
    ];
  }
  return [
    {
      key,
      name: choice.desc || "Pilihan equipment",
      count: choice.choose,
      kind: "equipment",
      options: (choice.from.options || []).map((option, i) => ({
        id: String(i),
        name: equipmentLabel(option),
        equipment: equipmentFixed(option),
      })),
    },
  ];
}
function equipmentLabel(option: ApiOption | string): string {
  if (typeof option === "string") return option;
  if (option.option_type === "money")
    return `${option.count || 0} ${(option.unit || "gp").toUpperCase()}`;
  if (option.choice)
    return (
      option.choice.desc ||
      `${option.choice.choose} ${option.choice.from.equipment_category?.name || "pilihan"}`
    );
  if (option.items) return option.items.map(equipmentLabel).join(" + ");
  return `${option.count || 1} × ${option.of?.name || option.item?.name || "Equipment"}`;
}
function equipmentFixed(
  option: ApiOption | string,
): { id: string; count: number }[] {
  if (typeof option === "string" || option.choice) return [];
  if (option.option_type === "money")
    return [{ id: option.unit || "gp", count: option.count || 0 }];
  if (option.items) return option.items.flatMap(equipmentFixed);
  const ref = option.of || option.item;
  return ref ? [{ id: ref.index, count: option.count || 1 }] : [];
}
function selectedEquipmentGroups(
  choice: ApiChoice,
  key: string,
  build: BuildInput,
): ChoiceGroup[] {
  const result = equipmentGroups(choice, key, catalogFor(build));
  if (choice.from.option_set_type !== "options_array") return result;
  for (const selected of build.choices[key] || []) {
    const option = choice.from.options?.[Number(selected)];
    const nested = (
      value: ApiOption | string | undefined,
      path: string,
    ): void => {
      if (!value || typeof value === "string") return;
      if (value.choice)
        result.push(...selectedEquipmentGroups(value.choice, path, build));
      value.items?.forEach((item, i) => nested(item, `${path}.${i}`));
    };
    nested(option, `${key}.${selected}`);
  }
  return result;
}
function references(
  choice: ApiChoice | undefined,
): { id: string; name: string }[] {
  return (choice?.from.options || []).flatMap((o) =>
    typeof o === "string"
      ? [{ id: o, name: o }]
      : o.choice
        ? references(o.choice)
        : o.item
          ? [{ id: o.item.index, name: o.item.name }]
          : o.ability_score
            ? [{ id: o.ability_score.index, name: o.ability_score.name }]
            : [],
  );
}
export function buildGroups(build: BuildInput): ChoiceGroup[] {
  build = { ...build, ruleset: "srd-2024" };
  const catalog = catalogFor(build),
    level = levelFor(build);
  const klass = catalog.classes.find((c) => c.index === build.classId),
    race = catalog.races.find((r) => r.index === build.race),
    sub = catalog.subraces.find((r) => r.index === build.subrace),
    bg = catalog.backgrounds.find((b) => b.id === build.background);
  const groups: ChoiceGroup[] = [];
  const add = (
    key: string,
    name: string,
    count: number,
    options: ChoiceGroup["options"],
    kind: ChoiceGroup["kind"],
  ) => groups.push({ key, name, count, options, kind });
  bg?.skills.forEach((options, i) =>
    add(
      `background.skill.${i}`,
      `Background: skill ${i + 1}`,
      1,
      options.map((id) => ({
        id,
        name: catalog.skills.find((s) => s.index === id)?.name || id,
      })),
      "skill",
    ),
  );
  if (build.background === "custom")
    for (let i = 0; i < 2; i++)
      add(
        `background.skill.${i}`,
        `Custom background: skill ${i + 1}`,
        1,
        catalog.skills.map((s) => ({ id: s.index, name: s.name })),
        "skill",
      );
  const proficiencyChoices = Array.isArray(klass?.proficiency_choices)
    ? klass.proficiency_choices
    : [];
  proficiencyChoices.forEach((c, i) => {
    const options = references(c),
      skills =
        options.length > 0 && options.every((o) => o.id.startsWith("skill-"));
    add(
      `class.proficiency.${i}`,
      c.desc || "Class proficiency",
      c.choose,
      options.map((o) => ({ ...o, id: skills ? o.id.slice(6) : o.id })),
      skills ? "skill" : "tool",
    );
  });
  const traits = [...(race?.traits || []), ...(sub?.racial_traits || [])]
    .map((ref) => catalog.traits.find((t) => t.index === ref.index))
    .filter((t): t is Entry => !!t);
  for (const trait of traits) {
    const choice = !Array.isArray(trait.proficiency_choices)
      ? trait.proficiency_choices
      : undefined;
    if (choice)
      add(
        `trait.${trait.index}`,
        trait.name,
        choice.choose,
        references(choice).map((o) => ({
          ...o,
          id: o.id.startsWith("skill-") ? o.id.slice(6) : o.id,
        })),
        trait.index === "skill-versatility" ? "skill" : "tool",
      );
    if (trait.trait_specific?.spell_options)
      add(
        `trait.spell.${trait.index}`,
        trait.name,
        1,
        references(trait.trait_specific.spell_options),
        "spell",
      );
    if (trait.trait_specific?.subtrait_options)
      add(
        `trait.option.${trait.index}`,
        trait.name,
        trait.trait_specific.subtrait_options.choose,
        references(trait.trait_specific.subtrait_options),
        "feature",
      );
  }
  if (race?.ability_bonus_options)
    add(
      "race.ability",
      "Bonus ability race",
      race.ability_bonus_options.choose,
      references(race.ability_bonus_options),
      "ability",
    );
  const languageOptions = (excluded: string[]) =>
    catalog.languages
      .filter((l) => !excluded.includes(l.index))
      .map((l) => ({ id: l.index, name: l.name }));
  const fixedLanguages = [
    ...(race?.languages || []),
    ...(bg?.fixedLanguages.map((id) => ({ index: id })) || []),
  ].map((l) => l.index);
  if (race?.language_options)
    add(
      "race.languages",
      "Bahasa tambahan race",
      race.language_options.choose,
      references(race.language_options),
      "language",
    );
  if (sub?.index === "high-elf")
    add(
      "subrace.languages",
      "Bahasa tambahan High Elf",
      1,
      languageOptions(fixedLanguages),
      "language",
    );
  if (bg?.languageCount)
    add(
      "background.languages",
      "Bahasa background",
      bg.languageCount,
      languageOptions(fixedLanguages),
      "language",
    );
  if (build.background === "custom")
    add(
      "background.languages",
      "Custom background: dua bahasa",
      2,
      languageOptions(fixedLanguages),
      "language",
    );
  const subclass = subclassFor(build);
  const featureRefs = [
    ...((klass as Entry & Progression)?.levels
      ?.filter((l) => l.level <= level)
      .flatMap((l) => l.features) ||
      klass?.levelOne?.features ||
      []),
    ...((subclass as Entry & Progression)?.levels
      ?.filter((l) => l.level <= level)
      .flatMap((l) => l.features) || []),
  ];
  for (const ref of featureRefs) {
    const feature = catalog.features.find((f) => f.index === ref.index);
    const choice =
      feature?.feature_specific?.subfeature_options ||
      feature?.feature_specific?.enemy_type_options ||
      feature?.feature_specific?.terrain_type_options;
    if (choice)
      add(
        `feature.${ref.index}`,
        ref.name,
        choice.choose,
        references(choice),
        "feature",
      );
  }
  if (build.classId === "sorcerer") {
    const f = catalog.features.find((f) => f.index === "dragon-ancestor");
    if (f?.feature_specific?.subfeature_options)
      add(
        "feature.dragon-ancestor",
        "Dragon ancestor",
        1,
        references(f.feature_specific.subfeature_options),
        "feature",
      );
  }
  if (build.classId === "rogue")
    add(
      "class.expertise",
      "Expertise (pilih dua skill, atau skill + thieves tools)",
      2,
      [
        ...catalog.skills
          .filter((s) =>
            groups.some(
              (g) =>
                g.kind === "skill" && build.choices[g.key]?.includes(s.index),
            ),
          )
          .map((s) => ({ id: s.index, name: s.name })),
        ...(build.ruleset !== "srd-2024"
          ? [{ id: "thieves-tools", name: "Thieves' tools" }]
          : []),
      ],
      "feature",
    );
  if (
    (build.classId === "rogue" && level >= 6) ||
    (build.classId === "bard" &&
      level >= (build.ruleset === "srd-2024" ? 2 : 3))
  )
    add(
      "class.expertise.later",
      "Expertise tambahan (dua skill)",
      2,
      catalog.skills
        .filter(
          (s) =>
            groups.some(
              (g) =>
                g.kind === "skill" && build.choices[g.key]?.includes(s.index),
            ) && !build.choices["class.expertise"]?.includes(s.index),
        )
        .map((s) => ({ id: s.index, name: s.name })),
      "feature",
    );
  if (
    build.classId === "bard" &&
    level >= 3 &&
    (build.ruleset !== "srd-2024" || subclass?.index === "college-of-lore")
  )
    add(
      "subclass.lore.skills",
      "College of Lore: tiga skill tambahan",
      3,
      catalog.skills
        .filter(
          (s) =>
            !groups.some(
              (g) =>
                g.kind === "skill" && build.choices[g.key]?.includes(s.index),
            ),
        )
        .map((s) => ({ id: s.index, name: s.name })),
      "skill",
    );
  if (build.ruleset === "srd-2024") {
    const feat =
      level >= 4
        ? generalFeats.find((f) => f.index === build.levelFourFeat)
        : undefined;
    if (feat)
      add(
        "level4.ability",
        `${feat.name}: ability +1`,
        1,
        feat.abilities.map((id) => ({ id, name: id.toUpperCase() })),
        "ability",
      );
    const allSkills = catalog.skills.map((s) => ({
      id: s.index,
      name: s.name,
    }));
    if (feat?.index === "skill-expert") {
      add("level4.skill", "Skill Expert: proficiency", 1, allSkills, "skill");
      add(
        "level4.expertise",
        "Skill Expert: expertise",
        1,
        catalog.skills
          .filter((s) =>
            groups.some(
              (g) =>
                g.kind === "skill" && build.choices[g.key]?.includes(s.index),
            ),
          )
          .map((s) => ({ id: s.index, name: s.name })),
        "feature",
      );
    }
    if (feat?.index === "keen-mind" || feat?.index === "observant")
      add(
        "level4.knowledge",
        `${feat.name}: skill`,
        1,
        allSkills.filter((s) =>
          (feat.index === "keen-mind"
            ? ["arcana", "history", "investigation", "nature", "religion"]
            : ["insight", "investigation", "perception"]
          ).includes(s.id),
        ),
        "feature",
      );
    if (feat?.index === "elemental-adept")
      add(
        "level4.element",
        "Elemental Adept: damage type",
        1,
        ["acid", "cold", "fire", "lightning", "thunder"].map((id) => ({
          id,
          name: id,
        })),
        "feature",
      );
    if (["fey-touched", "shadow-touched"].includes(feat?.index || ""))
      add(
        "level4.spell",
        `${feat!.name}: spell level 1`,
        1,
        catalog.spells
          .filter(
            (s) =>
              s.level === 1 &&
              (feat!.index === "fey-touched"
                ? ["divination", "enchantment"]
                : ["illusion", "necromancy"]
              ).includes((s as Entry & { school?: Ref }).school?.index || ""),
          )
          .map((s) => ({ id: s.index, name: s.name })),
        "spell",
      );
    if (feat?.index === "ritual-caster")
      add(
        "level4.rituals",
        "Ritual Caster: ritual level 1",
        level >= 5 ? 3 : 2,
        catalog.spells
          .filter(
            (s) => s.level === 1 && (s as Entry & { ritual?: boolean }).ritual,
          )
          .map((s) => ({ id: s.index, name: s.name })),
        "spell",
      );
    if (build.classId === "sorcerer" && level >= 2)
      add(
        "class.metamagic",
        "Metamagic: dua pilihan",
        2,
        metamagic.map(([id, name]) => ({ id, name })),
        "feature",
      );
    if (build.classId === "warlock") {
      const selected = build.choices["class.invocations"] || [];
      add(
        "class.invocations",
        "Eldritch Invocations",
        level >= 5 ? 5 : level >= 2 ? 3 : 1,
        invocations
          .filter(
            ([id, , minimum]) =>
              minimum <= level &&
              (id !== "thirsting-blade" ||
                selected.includes("pact-of-the-blade")) &&
              (id !== "investment-of-the-chain-master" ||
                selected.includes("pact-of-the-chain")),
          )
          .map(([id, name]) => ({ id, name })),
        "feature",
      );
      for (const id of ["agonizing-blast", "eldritch-spear", "repelling-blast"])
        if (selected.includes(id))
          add(
            `invocation.${id}`,
            `${invocations.find((i) => i[0] === id)![1]}: cantrip`,
            1,
            catalog.spells
              .filter(
                (s) =>
                  build.cantrips.includes(s.index) &&
                  (s as Entry & { damage?: unknown }).damage,
              )
              .map((s) => ({ id: s.index, name: s.name })),
            "spell",
          );
      if (selected.includes("pact-of-the-tome")) {
        add(
          "invocation.tome.cantrips",
          "Book of Shadows: tiga cantrip",
          3,
          catalog.spells
            .filter((s) => s.level === 0 && !build.cantrips.includes(s.index))
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
        add(
          "invocation.tome.rituals",
          "Book of Shadows: dua ritual level 1",
          2,
          catalog.spells
            .filter(
              (s) =>
                s.level === 1 && (s as Entry & { ritual?: boolean }).ritual,
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
      }
    }
    if (subclass?.index === "battle-master") {
      add(
        "subclass.maneuvers",
        "Battle Master: tiga maneuver",
        3,
        maneuvers.map((name) => ({ id: name, name })),
        "feature",
      );
      add(
        "subclass.student.tool",
        "Student of War: artisan tool",
        1,
        toolSets.artisan.map((id) => ({
          id,
          name: catalog.equipment.find((e) => e.index === id)?.name || id,
        })),
        "tool",
      );
      add(
        "subclass.student.skill",
        "Student of War: skill",
        1,
        references(
          Array.isArray(klass?.proficiency_choices)
            ? klass.proficiency_choices[0]
            : undefined,
        ).map((o) => ({ ...o, id: o.id.replace(/^skill-/, "") })),
        "skill",
      );
    }
    if (subclass?.index === "beast-master")
      add(
        "subclass.companion",
        "Primal Companion",
        1,
        ["land", "sea", "sky"].map((id) => ({ id, name: id })),
        "feature",
      );
    if (subclass?.index === "hunter")
      add(
        "subclass.hunter.prey",
        "Hunter's Prey",
        1,
        [
          { id: "colossus-slayer", name: "Colossus Slayer" },
          { id: "horde-breaker", name: "Horde Breaker" },
        ],
        "feature",
      );
    if (subclass?.index === "circle-of-the-land")
      add(
        "subclass.land",
        "Circle of the Land: medan",
        1,
        ["arid", "polar", "temperate", "tropical"].map((id) => ({
          id,
          name: id,
        })),
        "feature",
      );
    if (
      subclass &&
      ["evoker", "abjurer", "diviner", "illusionist"].includes(subclass.index)
    ) {
      const school = {
        evoker: "evocation",
        abjurer: "abjuration",
        diviner: "divination",
        illusionist: "illusion",
      }[subclass.index as "evoker"];
      const options = catalog.spells
        .filter(
          (s) =>
            s.level &&
            s.level <= 2 &&
            s.classes?.some((c) => c.index === "wizard") &&
            (s as Entry & { school?: Ref }).school?.index === school,
        )
        .map((s) => ({ id: s.index, name: s.name }));
      add(
        "subclass.savant",
        "Evocation Savant: dua spell bonus level 1–2",
        2,
        options.filter((o) => !build.spells.includes(o.id)),
        "spell",
      );
      if (level >= 5)
        add(
          "subclass.savant.5",
          "Savant: spell bonus level 3",
          1,
          catalog.spells
            .filter(
              (s) =>
                s.level === 3 &&
                !build.spells.includes(s.index) &&
                s.classes?.some((c) => c.index === "wizard") &&
                (s as Entry & { school?: Ref }).school?.index === school,
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
    }
    const skillOptions = (ids?: string[]) =>
      catalog.skills
        .filter(
          (s) =>
            (!ids || ids.includes(s.index)) &&
            groups.some(
              (g) =>
                g.kind === "skill" && build.choices[g.key]?.includes(s.index),
            ),
        )
        .map((s) => ({ id: s.index, name: s.name }));
    if (build.classId === "wizard" && level >= 2)
      add(
        "class.scholar",
        "Scholar: expertise",
        1,
        skillOptions([
          "arcana",
          "history",
          "investigation",
          "medicine",
          "nature",
          "religion",
        ]),
        "feature",
      );
    if (build.classId === "ranger" && level >= 2) {
      add(
        "class.deft.expertise",
        "Deft Explorer: expertise",
        1,
        skillOptions(),
        "feature",
      );
      add(
        "class.deft.languages",
        "Deft Explorer: dua bahasa",
        2,
        catalog.languages
          .filter(
            (l) =>
              l.index !== "common" &&
              !build.choices["character.languages"]?.includes(l.index),
          )
          .map((l) => ({ id: l.index, name: l.name })),
        "language",
      );
    }
    if (build.classId === "cleric")
      add(
        "class.order",
        "Divine Order",
        1,
        [
          {
            id: "protector",
            name: "Protector: martial weapons dan heavy armor",
          },
          {
            id: "thaumaturge",
            name: "Thaumaturge: cantrip dan bonus Arcana/Religion",
          },
        ],
        "feature",
      );
    if (build.classId === "druid")
      add(
        "class.order",
        "Primal Order",
        1,
        [
          { id: "warden", name: "Warden: martial weapons dan medium armor" },
          { id: "magician", name: "Magician: cantrip dan bonus Arcana/Nature" },
        ],
        "feature",
      );
    if (
      build.classId === "fighter" ||
      (["paladin", "ranger"].includes(build.classId) && level >= 2)
    ) {
      add(
        "class.fighting-style",
        "Fighting Style",
        1,
        [
          ...revisedSnapshot.feats
            .filter((f) => f.type === "fighting-style")
            .map((f) => ({ id: f.index, name: f.name })),
          ...(build.classId === "paladin"
            ? [{ id: "blessed-warrior", name: "Blessed Warrior" }]
            : build.classId === "ranger"
              ? [{ id: "druidic-warrior", name: "Druidic Warrior" }]
              : []),
        ],
        "feature",
      );
      if (
        ["blessed-warrior", "druidic-warrior"].includes(
          build.choices["class.fighting-style"]?.[0],
        )
      )
        add(
          "class.style.cantrips",
          "Warrior: dua cantrip",
          2,
          catalog.spells
            .filter(
              (s) =>
                s.level === 0 &&
                s.classes?.some(
                  (c) =>
                    c.index ===
                    (build.classId === "paladin" ? "cleric" : "druid"),
                ),
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
    }
    if (level >= 4 && build.levelFourFeat === "grappler")
      add(
        "level4.ability",
        "Grappler: ability +1",
        1,
        ["str", "dex"].map((id) => ({ id, name: id.toUpperCase() })),
        "ability",
      );
    const origin = backgrounds2024.find(
      (b) => `srd-2024:${b.index}` === build.background,
    );
    if (origin) {
      add(
        "background.bonus.mode",
        "Bonus background",
        1,
        [
          { id: "split", name: "+2 dan +1" },
          { id: "three", name: "+1 pada tiga ability" },
        ],
        "feature",
      );
      if (build.choices["background.bonus.mode"]?.[0] === "split") {
        add(
          "background.bonus.two",
          "Ability +2",
          1,
          (origin.ability_scores || []).map((a) => ({
            id: a.index,
            name: a.name,
          })),
          "ability",
        );
        add(
          "background.bonus.one",
          "Ability +1",
          1,
          (origin.ability_scores || [])
            .filter(
              (a) => !build.choices["background.bonus.two"]?.includes(a.index),
            )
            .map((a) => ({ id: a.index, name: a.name })),
          "ability",
        );
      }
      (Array.isArray(origin.proficiency_choices)
        ? origin.proficiency_choices
        : []
      ).forEach((c, i) =>
        add(
          `background.tool.${i}`,
          c.desc || "Tool background",
          c.choose,
          references(c),
          "tool",
        ),
      );
      (origin.equipment_options || []).forEach((c, i) =>
        groups.push(
          ...selectedEquipmentGroups(c, `background.equipment.${i}`, build),
        ),
      );
      if (origin.feat?.index === "magic-initiate") {
        const spellClass = origin.spellClass;
        add(
          "origin.cantrips",
          "Magic Initiate: dua cantrip",
          2,
          catalog.spells
            .filter(
              (s) =>
                s.level === 0 && s.classes?.some((c) => c.index === spellClass),
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
        add(
          "origin.spell",
          "Magic Initiate: spell level 1",
          1,
          catalog.spells
            .filter(
              (s) =>
                s.level === 1 && s.classes?.some((c) => c.index === spellClass),
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
        add(
          "origin.ability",
          "Ability Magic Initiate",
          1,
          ["int", "wis", "cha"].map((id) => ({ id, name: id.toUpperCase() })),
          "ability",
        );
      }
      const existingSkills = groups
        .filter((g) => g.kind === "skill")
        .flatMap((g) => build.choices[g.key] || []);
      existingSkills.push(...(build.choices["human.skill"] || []));
      if (origin.feat.index === "skilled")
        add(
          "origin.skills",
          "Skilled: tiga skill atau tool",
          3,
          [
            ...catalog.skills
              .filter((s) => !existingSkills.includes(s.index))
              .map((s) => ({ id: s.index, name: s.name })),
            ...catalog.equipment
              .filter(
                (e) =>
                  catalog.categories
                    .find((c) => c.index === "tools")
                    ?.equipment?.some((t) => t.index === e.index) &&
                  !origin.proficiencies.some((p) => p.index === e.index),
              )
              .map((e) => ({ id: `tool:${e.index}`, name: e.name })),
          ],
          "feature",
        );
      if (origin.feat.index === "crafter" || origin.feat.index === "musician")
        add(
          "origin.tools",
          `${origin.feat.name}: tiga tool`,
          3,
          toolSets[
            origin.feat.index === "crafter" ? "artisan" : "instrument"
          ].map((id) => ({
            id,
            name: catalog.equipment.find((e) => e.index === id)?.name || id,
          })),
          "tool",
        );
      if (
        origin.extraGamingEquipment &&
        build.choices["background.equipment.0"]?.includes("0")
      )
        add(
          "background.gaming",
          "Gaming set dalam paket equipment",
          1,
          toolSets.gaming.map((id) => ({
            id,
            name: catalog.equipment.find((e) => e.index === id)?.name || id,
            equipment: [{ id, count: 1 }],
          })),
          "equipment",
        );
    }
    add(
      "character.languages",
      "Dua bahasa tambahan",
      2,
      catalog.languages
        .filter((l) => l.index !== "common")
        .map((l) => ({ id: l.index, name: l.name })),
      "language",
    );
    if (build.race === "human") {
      add(
        "human.feat",
        "Human: origin feat tambahan",
        1,
        Object.keys(originFeats)
          .filter(
            (id) =>
              id !== origin?.feat.index ||
              ["skilled", "magic-initiate"].includes(id),
          )
          .map((id) => ({
            id,
            name: id
              .split("-")
              .map((w) => w[0].toUpperCase() + w.slice(1))
              .join(" "),
          })),
        "feature",
      );
      const humanFeat = build.choices["human.feat"]?.[0];
      if (humanFeat === "skilled")
        add(
          "human.skilled",
          "Human Skilled: tiga skill atau tool",
          3,
          [
            ...catalog.skills
              .filter(
                (s) =>
                  !groups.some(
                    (g) =>
                      g.kind === "skill" &&
                      build.choices[g.key]?.includes(s.index),
                  ) && !build.choices["origin.skills"]?.includes(s.index),
              )
              .map((s) => ({ id: s.index, name: s.name })),
            ...(catalog.categories
              .find((c) => c.index === "tools")
              ?.equipment?.map((e) => ({
                id: `tool:${e.index}`,
                name: e.name,
              })) || []),
          ],
          "feature",
        );
      if (humanFeat === "magic-initiate") {
        add(
          "human.magic.list",
          "Human Magic Initiate: daftar spell",
          1,
          ["cleric", "druid", "wizard"]
            .filter((id) => id !== origin?.spellClass)
            .map((id) => ({ id, name: id })),
          "feature",
        );
        const spellClass = build.choices["human.magic.list"]?.[0];
        add(
          "human.magic.cantrips",
          "Human Magic Initiate: dua cantrip",
          2,
          catalog.spells
            .filter(
              (s) =>
                s.level === 0 && s.classes?.some((c) => c.index === spellClass),
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
        add(
          "human.magic.spell",
          "Human Magic Initiate: spell level 1",
          1,
          catalog.spells
            .filter(
              (s) =>
                s.level === 1 && s.classes?.some((c) => c.index === spellClass),
            )
            .map((s) => ({ id: s.index, name: s.name })),
          "spell",
        );
        add(
          "human.magic.ability",
          "Human Magic Initiate: ability",
          1,
          ["int", "wis", "cha"].map((id) => ({ id, name: id.toUpperCase() })),
          "ability",
        );
      }
      if (humanFeat === "crafter" || humanFeat === "musician")
        add(
          "human.tools",
          `Human ${humanFeat}: tiga tool`,
          3,
          toolSets[humanFeat === "crafter" ? "artisan" : "instrument"].map(
            (id) => ({
              id,
              name: catalog.equipment.find((e) => e.index === id)?.name || id,
            }),
          ),
          "tool",
        );
    }
    if (build.race === "human")
      add(
        "human.skill",
        "Human: satu skill",
        1,
        catalog.skills.map((s) => ({ id: s.index, name: s.name })),
        "skill",
      );
  }
  (klass?.starting_equipment_options || []).forEach((c, i) =>
    groups.push(...selectedEquipmentGroups(c, `equipment.${i}`, build)),
  );
  return groups;
}
export function spellLimits(
  build: BuildInput,
  scores?: Record<Ability, number>,
) {
  build = { ...build, ruleset: "srd-2024" };
  const catalog = catalogFor(build),
    level = levelFor(build),
    data = progression(build);
  const klass = catalog.classes.find((c) => c.index === build.classId);
  const subclassCaster =
    build.ruleset === "srd-2024" &&
    !!subclassFor(build) &&
    ["eldritch-knight", "arcane-trickster"].includes(build.subclassId || "");
  const spellClass = subclassCaster ? "wizard" : build.classId;
  const ability: Ability | undefined = subclassCaster
    ? "int"
    : klass?.spellcasting && klass.spellcasting.level <= level
      ? (klass.spellcasting.spellcasting_ability.index as Ability)
      : undefined;
  const modifiers = scores || finalScores(build);
  const slotsByLevel = Object.fromEntries(
    [1, 2, 3, 4].map((l) => [
      l,
      data?.spellcasting?.[`spell_slots_level_${l}`] || 0,
    ]),
  );
  if (subclassCaster) slotsByLevel[1] = level === 3 ? 2 : 3;
  const maxSpellLevel = Math.max(
    0,
    ...Object.entries(slotsByLevel)
      .filter(([, slots]) => slots > 0)
      .map(([l]) => Number(l)),
  );
  return {
    ability,
    spellClass,
    cantrips:
      (subclassCaster ? 2 : data?.spellcasting?.cantrips_known || 0) +
      (build.ruleset === "srd-2024" &&
      ["thaumaturge", "magician"].includes(build.choices["class.order"]?.[0])
        ? 1
        : 0),
    spells: subclassCaster
      ? level === 3
        ? 3
        : 4
      : build.classId === "wizard"
        ? 6 + (level - 1) * 2
        : build.ruleset === "srd-2024"
          ? data?.spellcasting?.prepared_spells || 0
          : ["cleric", "druid", "paladin"].includes(build.classId) && ability
            ? Math.max(
                1,
                modifier(modifiers[ability]) +
                  (build.classId === "paladin" ? Math.floor(level / 2) : level),
              )
            : data?.spellcasting?.spells_known || 0,
    prepared:
      build.classId === "wizard"
        ? build.ruleset === "srd-2024"
          ? data?.spellcasting?.prepared_spells || 0
          : Math.max(1, modifier(modifiers.int) + level)
        : 0,
    slots: slotsByLevel[1],
    slotsByLevel,
    maxSpellLevel,
  };
}
export function finalScores(build: BuildInput) {
  build = { ...build, ruleset: "srd-2024" };
  const catalog = catalogFor(build);
  const result = { ...build.scores };
  const race = catalog.races.find((r) => r.index === build.race),
    sub = catalog.subraces.find((r) => r.index === build.subrace);
  for (const bonus of [
    ...(race?.ability_bonuses || []),
    ...(sub?.ability_bonuses || []),
  ])
    result[bonus.ability_score.index as Ability] += bonus.bonus;
  for (const id of build.choices["race.ability"] || [])
    if (abilities.includes(id as Ability)) result[id as Ability]++;
  if (build.ruleset === "srd-2024") {
    const origin = backgrounds2024.find(
      (b) => `srd-2024:${b.index}` === build.background,
    );
    if (build.choices["background.bonus.mode"]?.[0] === "three")
      origin?.ability_scores.forEach((a) => result[a.index as Ability]++);
    else {
      for (const id of build.choices["background.bonus.two"] || [])
        if (abilities.includes(id as Ability)) result[id as Ability] += 2;
      for (const id of build.choices["background.bonus.one"] || [])
        if (abilities.includes(id as Ability)) result[id as Ability]++;
    }
  }
  for (const level of asiLevels(build))
    for (const id of build.ruleset === "srd-2024" &&
    build.levelFourFeat &&
    build.levelFourFeat !== "ability-score-improvement"
      ? []
      : build.asi?.[level] || [])
      if (abilities.includes(id)) result[id]++;
  if (
    build.ruleset === "srd-2024" &&
    levelFor(build) >= 4 &&
    build.levelFourFeat === "grappler"
  )
    for (const id of build.choices["level4.ability"] || [])
      if (id === "str" || id === "dex") result[id]++;
  if (
    levelFor(build) >= 4 &&
    generalFeats.some((f) => f.index === build.levelFourFeat)
  )
    for (const id of build.choices["level4.ability"] || [])
      if (abilities.includes(id as Ability)) result[id as Ability]++;
  return result;
}
export function validateBuild(input: unknown): {
  build?: BuildInput;
  errors: string[];
  sheet?: Sheet;
} {
  const errors: string[] = [];
  if (!input || typeof input !== "object")
    return { errors: ["Data karakter tidak valid."] };
  const p = input as Record<string, unknown>,
    clean = (v: unknown, max: number) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";
  const catalog = catalogFor({
    ruleset: "srd-2024",
  });
  const list = (v: unknown) =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter(
              (s): s is string => typeof s === "string" && s.length <= 120,
            ),
          ),
        ].slice(0, 30)
      : [];
  const scores = {} as Record<Ability, number>;
  for (const ability of abilities) {
    const value = (p.scores as Record<string, unknown>)?.[ability];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 3 ||
      value > 18
    )
      errors.push(`Score ${ability.toUpperCase()} harus 3–18.`);
    scores[ability] =
      typeof value === "number" && Number.isFinite(value) ? value : 10;
  }
  const choices: Record<string, string[]> = Object.create(null);
  if (p.choices && typeof p.choices === "object")
    for (const [key, value] of Object.entries(p.choices).slice(0, 80))
      if (
        key.length <= 120 &&
        !["__proto__", "constructor", "prototype"].includes(key)
      )
        choices[key] = list(value);
  const build: BuildInput = {
    name: clean(p.name, 60),
    race: clean(p.race, 80),
    subrace: clean(p.subrace, 80),
    classId: clean(p.classId, 80),
    background: clean(p.background, 120),
    backgroundName: clean(p.backgroundName, 60),
    method:
      p.method === "point-buy" || p.method === "manual" ? p.method : "standard",
    scores,
    choices,
    cantrips: list(p.cantrips),
    spells: list(p.spells),
    prepared: list(p.prepared),
    armor: clean(p.armor, 80),
    shield: p.shield === true,
    notes: clean(p.notes, 4000),
  };
  build.ruleset = "srd-2024";
  if (p.ruleset !== undefined && p.ruleset !== "srd-2024")
    errors.push(
      "Ruleset harus D&D 2024. Buat ulang karakter lama dengan pilihan 2024.",
    );
  build.subclassId = clean(p.subclassId, 80);
  build.levelFourFeat =
    clean(p.levelFourFeat, 80) || "ability-score-improvement";
  if (
    p.level !== undefined &&
    (typeof p.level !== "number" ||
      !Number.isInteger(p.level) ||
      p.level < 1 ||
      p.level > (build.ruleset === "srd-2024" ? 5 : 7))
  )
    errors.push(
      build.ruleset === "srd-2024" ? "Level harus 1–5." : "Level harus 1–7.",
    );
  build.level =
    typeof p.level === "number" &&
    Number.isInteger(p.level) &&
    p.level >= 1 &&
    p.level <= 7
      ? p.level
      : 1;
  build.asi = {};
  for (const level of asiLevels(build)) {
    if (
      build.ruleset === "srd-2024" &&
      build.levelFourFeat !== "ability-score-improvement"
    )
      continue;
    const values = (p.asi as Record<string, unknown>)?.[level];
    if (
      !Array.isArray(values) ||
      values.length !== 2 ||
      values.some((v) => !abilities.includes(v))
    )
      errors.push(
        `ASI level ${level}: pilih dua peningkatan +1 (boleh ability sama).`,
      );
    else build.asi[level] = values as Ability[];
  }
  if (!build.name) errors.push("Isi nama karakter.");
  const klass = catalog.classes.find((c) => c.index === build.classId),
    race = catalog.races.find((r) => r.index === build.race),
    bg = catalog.backgrounds.find((b) => b.id === build.background);
  if (!klass) errors.push("Class tidak tersedia.");
  if (build.ruleset === "srd-2024") {
    if (levelFor(build) >= 3 && !subclassFor(build))
      errors.push("Pilih subclass sesuai class pada level 3.");
    if (levelFor(build) < 3) build.subclassId = "";
    if (
      levelFor(build) >= 4 &&
      build.levelFourFeat !== "ability-score-improvement"
    ) {
      if (!levelFourFeats.some((f) => f.index === build.levelFourFeat))
        errors.push("Feat level 4 tidak tersedia.");
    }
  }
  if (!race) errors.push("Race tidak tersedia.");
  if (
    race &&
    (race.subraces?.length
      ? !race.subraces.some((s) => s.index === build.subrace)
      : !!build.subrace)
  )
    errors.push("Pilih subrace yang sesuai.");
  if (build.background !== "custom" && !bg?.available)
    errors.push("Background tidak tersedia pada ruleset karakter.");
  if (build.background === "custom" && !build.backgroundName)
    errors.push("Isi nama custom background.");
  if (
    build.method === "standard" &&
    JSON.stringify(Object.values(scores).sort((a, b) => b - a)) !==
      JSON.stringify(standardArray)
  )
    errors.push(
      "Standard array harus memakai 15, 14, 13, 12, 10, 8 masing-masing sekali.",
    );
  if (
    build.method === "point-buy" &&
    (Object.values(scores).some((v) => v < 8 || v > 15) ||
      Object.values(scores).reduce((total, v) => total + pointCost(v), 0) > 27)
  )
    errors.push("Point buy: score 8–15, maksimal 27 poin.");
  const groups = buildGroups(build);
  const activeKeys = new Set(groups.map((g) => g.key));
  for (const key of Object.keys(choices))
    if (!activeKeys.has(key)) delete choices[key];
  for (const group of groups) {
    const selected = choices[group.key] || [];
    if (
      selected.length !== group.count ||
      selected.some((id) => !group.options.some((o) => o.id === id))
    )
      errors.push(`${group.name}: pilih ${group.count} opsi yang valid.`);
  }
  const selectedSkills = groups
    .filter((g) => g.kind === "skill")
    .flatMap((g) => choices[g.key] || []);
  if (abilities.some((a) => finalScores(build)[a] > 20))
    errors.push("Ability setelah peningkatan maksimal 20.");
  if (
    build.ruleset === "srd-2024" &&
    levelFor(build) >= 4 &&
    build.levelFourFeat === "grappler"
  ) {
    const values = finalScores({
      ...build,
      levelFourFeat: "ability-score-improvement",
      asi: {},
    });
    if (values.str < 13 && values.dex < 13)
      errors.push(
        "Grappler membutuhkan STR atau DEX minimal 13 sebelum bonus feat.",
      );
  }
  const generalFeat =
    levelFor(build) >= 4
      ? generalFeats.find((f) => f.index === build.levelFourFeat)
      : undefined;
  if (generalFeat) {
    const base = finalScores({
      ...build,
      levelFourFeat: "ability-score-improvement",
      asi: {},
    });
    if (
      generalFeat.minimum &&
      !generalFeat.minimum.some((a) => base[a as Ability] >= 13)
    )
      errors.push(`${generalFeat.name}: ability prasyarat minimal 13.`);
    if (generalFeat.requires === "spellcasting" && !spellLimits(build).ability)
      errors.push(
        `${generalFeat.name} memerlukan Spellcasting atau Pact Magic.`,
      );
    const martial =
      klass?.proficiencies?.some((p) => p.index === "martial-weapons") ||
      ["protector", "warden"].includes(build.choices["class.order"]?.[0]) ||
      build.subclassId === "college-of-valor";
    if (generalFeat.requires === "martial" && !martial)
      errors.push(
        `${generalFeat.name} memerlukan proficiency Martial weapons.`,
      );
    const medium =
      klass?.proficiencies?.some((p) => p.index === "medium-armor") ||
      build.choices["class.order"]?.[0] === "warden" ||
      build.subclassId === "college-of-valor";
    if (
      ["medium-armor-master", "heavily-armored"].includes(generalFeat.index) &&
      !medium
    )
      errors.push(`${generalFeat.name} memerlukan Medium armor training.`);
    if (
      generalFeat.index === "heavy-armor-master" &&
      !klass?.proficiencies?.some((p) => p.index === "heavy-armor") &&
      build.choices["class.order"]?.[0] !== "protector"
    )
      errors.push("Heavy Armor Master memerlukan Heavy armor training.");
    if (
      generalFeat.index === "moderately-armored" &&
      !klass?.proficiencies?.some((p) => p.index === "light-armor")
    )
      errors.push("Moderately Armored memerlukan Light armor training.");
    if (
      generalFeat.index === "shield-master" &&
      !klass?.proficiencies?.some((p) => p.index === "shields") &&
      build.subclassId !== "college-of-valor"
    )
      errors.push("Shield Master memerlukan Shield training.");
    if (
      generalFeat.index === "resilient" &&
      klass?.saving_throws?.some(
        (s) => s.index === build.choices["level4.ability"]?.[0],
      )
    )
      errors.push("Resilient: pilih saving throw yang belum proficient.");
  }
  selectedSkills.push(
    ...(choices["origin.skills"] || []).filter((id) => !id.startsWith("tool:")),
  );
  selectedSkills.push(
    ...(choices["human.skilled"] || []).filter((id) => !id.startsWith("tool:")),
  );
  const traitIds = [
    ...(race?.traits || []),
    ...(catalog.subraces.find((s) => s.index === build.subrace)
      ?.racial_traits || []),
  ].map((t) => t.index);
  const fixedSkills = catalog.traits
    .filter((t) => traitIds.includes(t.index))
    .flatMap((t) => t.proficiencies || [])
    .filter((p) => p.index.startsWith("skill-"))
    .map((p) => p.index.slice(6));
  if (
    new Set([...selectedSkills, ...fixedSkills]).size !==
    selectedSkills.length + fixedSkills.length
  )
    errors.push(
      "Skill proficiency ganda. Pilih skill lain; proficiency tetap tidak ditumpuk.",
    );
  const languages = groups
    .filter((g) => g.kind === "language")
    .flatMap((g) => choices[g.key] || []);
  if (new Set(languages).size !== languages.length)
    errors.push("Bahasa tambahan tidak boleh sama.");
  const limits = spellLimits(build);
  if (
    build.subclassId === "arcane-trickster" &&
    build.cantrips.includes("mage-hand")
  )
    errors.push("Mage Hand diberikan otomatis; pilih dua cantrip lainnya.");
  for (const [key, level, count] of [
    ["cantrips", 0, limits.cantrips],
    ["spells", 1, limits.spells],
  ] as const) {
    if (
      build[key].length !== count ||
      build[key].some(
        (id) =>
          !catalog.spells.some(
            (s) =>
              s.index === id &&
              (level === 0
                ? s.level === 0
                : !!s.level && s.level <= limits.maxSpellLevel) &&
              s.classes?.some((c) => c.index === limits.spellClass),
          ),
      )
    )
      errors.push(
        `${key}: pilih ${count} spell dari daftar class dan level yang tersedia.`,
      );
  }
  const spellbook = [
    ...build.spells,
    ...(build.choices["subclass.savant"] || []),
    ...(build.choices["subclass.savant.5"] || []),
  ];
  if (
    build.prepared.length !== Math.min(limits.prepared, spellbook.length) ||
    build.prepared.some((id) => !spellbook.includes(id))
  )
    errors.push(
      `Prepared spells: pilih ${Math.min(limits.prepared, build.spells.length)} dari spellbook.`,
    );
  const sheet = deriveSheet(build);
  if (
    build.armor &&
    !sheet.equipment.some(
      (e) =>
        e.id === build.armor &&
        catalog.equipment.find((item) => item.index === e.id)
          ?.armor_category !== "Shield",
    )
  )
    errors.push("Armor harus berasal dari equipment karakter.");
  if (build.shield && !sheet.equipment.some((e) => e.id === "shield"))
    errors.push("Shield belum dimiliki.");
  return { build, errors, sheet };
}
export function deriveSheet(build: BuildInput): Sheet {
  build = { ...build, ruleset: "srd-2024" };
  const catalog = catalogFor(build),
    level = levelFor(build),
    data = progression(build),
    proficiency = data?.prof_bonus || (level >= 5 ? 3 : 2);
  const klass = catalog.classes.find((c) => c.index === build.classId),
    race = catalog.races.find((r) => r.index === build.race),
    sub = catalog.subraces.find((s) => s.index === build.subrace),
    bg = catalog.backgrounds.find((b) => b.id === build.background);
  const scores = finalScores(build),
    modifiers = Object.fromEntries(
      abilities.map((a) => [a, modifier(scores[a])]),
    ) as Record<Ability, number>;
  const groups = buildGroups(build),
    traitIds = [...(race?.traits || []), ...(sub?.racial_traits || [])].map(
      (t) => t.index,
    );
  const traits = catalog.traits.filter(
    (t) =>
      traitIds.includes(t.index) &&
      (t.index !== "lineage-spell-longstrider" || level >= 3) &&
      (t.index !== "lineage-spell-pass-without-trace" || level >= 5),
  );
  const skills = new Set([
    ...groups
      .filter((g) => g.kind === "skill")
      .flatMap((g) => build.choices[g.key] || []),
    ...traits
      .flatMap((t) => t.proficiencies || [])
      .filter((p) => p.index.startsWith("skill-"))
      .map((p) => p.index.slice(6)),
  ]);
  if (subclassFor(build)?.index === "warrior-of-mercy") {
    skills.add("insight");
    skills.add("medicine");
  }
  (build.choices["origin.skills"] || [])
    .filter((id) => !id.startsWith("tool:"))
    .forEach((id) => skills.add(id));
  (build.choices["human.skilled"] || [])
    .filter((id) => !id.startsWith("tool:"))
    .forEach((id) => skills.add(id));
  const knowledge = build.choices["level4.knowledge"]?.[0];
  const knowledgeExpertise =
    knowledge && skills.has(knowledge) ? knowledge : undefined;
  if (knowledge) skills.add(knowledge);
  const origin =
    build.ruleset === "srd-2024"
      ? backgrounds2024.find((b) => `srd-2024:${b.index}` === build.background)
      : undefined;
  const featureChoices = groups
    .filter((g) => g.kind === "feature")
    .flatMap((g) => build.choices[g.key] || []);
  const subclass = subclassFor(build);
  const features = [
    ...((klass as Entry & Progression)?.levels
      ?.filter((l) => l.level <= level)
      .flatMap((l) => l.features) ||
      klass?.levelOne?.features ||
      []),
    ...((subclass as Entry & Progression)?.levels
      ?.filter((l) => l.level <= level)
      .flatMap((l) => l.features) || []),
    ...catalog.features.filter((f) => featureChoices.includes(f.index)),
  ].map(
    (ref) =>
      catalog.features.find((f) => f.index === ref.index) || (ref as Entry),
  );
  const equipment: Sheet["equipment"] = [];
  const addEquipment = (id: string, count: number) => {
    const previous = equipment.find((e) => e.id === id);
    if (previous) previous.count += count;
    else
      equipment.push({
        id,
        count,
        name: catalog.equipment.find((e) => e.index === id)?.name || id,
      });
  };
  if (
    origin?.selectedToolEquipment &&
    build.choices["background.equipment.0"]?.includes("0")
  )
    (build.choices["background.tool.0"] || []).forEach((id) =>
      addEquipment(id, 1),
    );
  klass?.starting_equipment?.forEach((e) =>
    addEquipment(e.equipment.index, e.quantity),
  );
  if (build.background === "wotc-srd:acolyte") {
    addEquipment("clothes-common", 1);
    addEquipment("pouch", 1);
  }
  for (const group of groups.filter((g) => g.kind === "equipment"))
    for (const id of build.choices[group.key] || [])
      group.options
        .find((o) => o.id === id)
        ?.equipment?.forEach((e) => addEquipment(e.id, e.count));
  const armor = equipment.some((e) => e.id === build.armor)
    ? catalog.equipment.find((e) => e.index === build.armor)
    : undefined;
  const shield = build.shield && equipment.some((e) => e.id === "shield");
  let ac = 10 + modifiers.dex;
  if (build.classId === "barbarian" && !armor) ac += modifiers.con;
  if (build.classId === "monk" && !armor && !shield) ac += modifiers.wis;
  if (build.classId === "sorcerer" && !armor && build.ruleset !== "srd-2024")
    ac = 13 + modifiers.dex;
  if (!armor && subclass?.index === "draconic-sorcery")
    ac = 10 + modifiers.dex + modifiers.cha;
  if (armor?.armor_class)
    ac =
      armor.armor_class.base +
      (armor.armor_class.dex_bonus
        ? Math.min(modifiers.dex, armor.armor_class.max_bonus ?? 99)
        : 0);
  if (shield) ac += 2;
  if (armor && featureChoices.includes("fighter-fighting-style-defense")) ac++;
  const proficiencies = [
    ...(klass?.proficiencies || []),
    ...traits.flatMap((t) => t.proficiencies || []),
  ].map((p) => p.index);
  proficiencies.push(
    ...(origin?.proficiencies
      .filter((p) => !p.index.startsWith("skill-"))
      .map((p) => p.index) || []),
    ...(build.choices["origin.skills"] || [])
      .filter((id) => id.startsWith("tool:"))
      .map((id) => id.slice(5)),
  );
  proficiencies.push(
    ...groups
      .filter((g) => g.kind === "tool")
      .flatMap((g) => build.choices[g.key] || []),
  );
  if (build.classId === "rogue") proficiencies.push("thieves-tools");
  if (subclass?.index === "college-of-valor")
    proficiencies.push("martial-weapons", "medium-armor", "shields");
  if (subclass?.index === "warrior-of-mercy")
    proficiencies.push("herbalism-kit");
  if (subclass?.index === "assassin")
    proficiencies.push("disguise-kit", "poisoners-kit");
  if (build.levelFourFeat === "martial-weapon-training")
    proficiencies.push("martial-weapons");
  if (build.levelFourFeat === "lightly-armored")
    proficiencies.push("light-armor", "shields");
  if (build.levelFourFeat === "moderately-armored")
    proficiencies.push("medium-armor");
  if (build.levelFourFeat === "heavily-armored")
    proficiencies.push("heavy-armor");
  if (build.levelFourFeat === "poisoner") proficiencies.push("poisoners-kit");
  proficiencies.push(
    ...(build.choices["human.skilled"] || [])
      .filter((id) => id.startsWith("tool:"))
      .map((id) => id.slice(5)),
  );
  if (
    build.classId === "cleric" &&
    (build.ruleset !== "srd-2024" || level >= 3)
  )
    proficiencies.push("heavy-armor");
  if (
    build.ruleset === "srd-2024" &&
    ["protector", "warden"].includes(build.choices["class.order"]?.[0])
  )
    proficiencies.push(
      "martial-weapons",
      build.choices["class.order"][0] === "protector"
        ? "heavy-armor"
        : "medium-armor",
    );
  if (armor && build.choices["class.fighting-style"]?.includes("defense")) ac++;
  const attacks = equipment.flatMap((e) => {
    const weapon = catalog.equipment.find((w) => w.index === e.id);
    if (!weapon?.damage) return [];
    const finesse = weapon.properties?.some((p) => p.index === "finesse"),
      ranged = weapon.weapon_range === "Ranged";
    const ability =
      finesse ||
      (build.classId === "monk" &&
        (weapon.index === "shortsword" ||
          (weapon.weapon_category === "Simple" &&
            !weapon.properties?.some((p) =>
              ["heavy", "two-handed"].includes(p.index),
            ))))
        ? Math.max(modifiers.str, modifiers.dex)
        : ranged
          ? modifiers.dex
          : modifiers.str;
    const proficient =
      proficiencies.includes(weapon.index) ||
      proficiencies.includes(`${weapon.index}s`) ||
      proficiencies.includes(
        `${weapon.weapon_category?.toLowerCase()}-weapons`,
      ) ||
      (build.classId === "monk" && weapon.index === "shortsword");
    const damage =
      ability +
      (featureChoices.includes("fighter-fighting-style-dueling") &&
      !ranged &&
      !weapon.properties?.some((p) => p.index === "two-handed")
        ? 2
        : 0);
    return [
      {
        id: weapon.index,
        name: weapon.name,
        bonus:
          ability +
          (proficient ? proficiency : 0) +
          (ranged &&
          (featureChoices.includes("fighter-fighting-style-archery") ||
            build.choices["class.fighting-style"]?.includes("archery"))
            ? 2
            : 0),
        damage: `${weapon.damage.damage_dice}${damage >= 0 ? "+" : ""}${damage}`,
      },
    ];
  });
  const unarmedAbility =
    build.classId === "monk"
      ? Math.max(modifiers.str, modifiers.dex)
      : modifiers.str;
  attacks.push({
    id: "unarmed-strike",
    name: "Unarmed Strike",
    bonus: unarmedAbility + proficiency,
    damage:
      build.classId === "monk"
        ? `1d${level >= 5 ? 8 : 6}${unarmedAbility >= 0 ? "+" : ""}${unarmedAbility}`
        : origin?.feat.index === "tavern-brawler" ||
            build.choices["human.feat"]?.includes("tavern-brawler")
          ? `1d4${unarmedAbility >= 0 ? "+" : ""}${unarmedAbility}`
          : String(Math.max(0, 1 + unarmedAbility)),
  });
  if (subclass?.index === "soulknife")
    attacks.push({
      id: "psychic-blade",
      name: "Psychic Blade",
      bonus: Math.max(modifiers.str, modifiers.dex) + proficiency,
      damage: `1d6${Math.max(modifiers.str, modifiers.dex) >= 0 ? "+" : ""}${Math.max(modifiers.str, modifiers.dex)}`,
    });
  const skillRows = catalog.skills.map((s) => {
    const expertise = [
      ...(build.choices["class.expertise"] || []),
      ...(build.choices["class.expertise.later"] || []),
      ...(build.choices["class.scholar"] || []),
      ...(build.choices["class.deft.expertise"] || []),
      ...(build.choices["level4.expertise"] || []),
      ...(knowledgeExpertise ? [knowledgeExpertise] : []),
    ].includes(s.index);
    return {
      id: s.index,
      name: s.name,
      proficient: skills.has(s.index),
      expertise,
      bonus:
        modifiers[
          (s as Entry & { ability_score: Ref }).ability_score.index as Ability
        ] +
        (skills.has(s.index)
          ? expertise
            ? proficiency * 2
            : proficiency
          : build.classId === "bard" && level >= 2
            ? Math.floor(proficiency / 2)
            : 0) +
        (build.ruleset === "srd-2024" &&
        ((build.choices["class.order"]?.[0] === "thaumaturge" &&
          ["arcana", "religion"].includes(s.index)) ||
          (build.choices["class.order"]?.[0] === "magician" &&
            ["arcana", "nature"].includes(s.index)))
          ? Math.max(1, modifiers.wis)
          : 0),
    };
  });
  const limits = spellLimits(build, scores);
  const spells = [...build.spells];
  const extra = subclass && extraSubclassSpells[subclass.index];
  if (extra)
    spells.push(...extra.three, ...(level >= 5 ? extra.five || [] : []));
  const subclassSpells: Record<string, string[][]> = {
    "life-domain": [
      ["aid", "bless", "cure-wounds", "lesser-restoration"],
      ["mass-healing-word", "revivify"],
    ],
    "draconic-sorcery": [
      ["alter-self", "chromatic-orb", "command", "dragons-breath"],
      ["fear", "fly"],
    ],
    "fiend-patron": [
      ["burning-hands", "command", "scorching-ray", "suggestion"],
      ["fireball", "stinking-cloud"],
    ],
    "oath-of-devotion": [
      ["protection-from-evil-and-good", "shield-of-faith"],
      ["aid", "zone-of-truth"],
    ],
  };
  if (subclass && subclassSpells[subclass.index])
    spells.push(
      ...subclassSpells[subclass.index][0],
      ...(level >= 5 ? subclassSpells[subclass.index][1] : []),
    );
  if (build.ruleset === "srd-2024" && build.classId === "ranger")
    spells.push("hunters-mark");
  if (build.ruleset === "srd-2024" && build.classId === "paladin" && level >= 2)
    spells.push("divine-smite");
  if (build.classId === "cleric" && build.ruleset !== "srd-2024")
    spells.push("bless", "cure-wounds");
  const racialCantrips = groups
    .filter(
      (g) =>
        g.kind === "spell" &&
        ![
          "origin.spell",
          "human.magic.spell",
          "invocation.tome.rituals",
          "level4.spell",
          "level4.rituals",
        ].includes(g.key) &&
        !g.key.startsWith("subclass.savant") &&
        !g.key.startsWith("invocation.ag") &&
        !g.key.startsWith("invocation.eldritch") &&
        !g.key.startsWith("invocation.repelling"),
    )
    .flatMap((g) => build.choices[g.key] || []);
  if (extra?.cantrips) racialCantrips.push(...extra.cantrips);
  for (const trait of traits)
    for (const ref of trait.spells || []) {
      const id = "spell" in ref ? ref.spell.index : ref.index;
      const s = catalog.spells.find((s) => s.index === id);
      if (s?.level === 0) racialCantrips.push(id);
      else if (s) spells.push(id);
    }
  if (
    subclass?.index === "arcane-trickster" &&
    !racialCantrips.includes("mage-hand") &&
    !build.cantrips.includes("mage-hand")
  )
    racialCantrips.push("mage-hand");
  if (!armor && !shield && subclass?.index === "college-of-dance")
    ac = 10 + modifiers.dex + modifiers.cha;
  spells.push(...(build.choices["origin.spell"] || []));
  spells.push(
    ...(build.choices["human.magic.spell"] || []),
    ...(build.choices["invocation.tome.rituals"] || []),
  );
  spells.push(
    ...(build.choices["level4.spell"] || []),
    ...(build.choices["level4.rituals"] || []),
  );
  if (build.levelFourFeat === "fey-touched") spells.push("misty-step");
  if (build.levelFourFeat === "shadow-touched") spells.push("invisibility");
  if (build.levelFourFeat === "telepathic") spells.push("detect-thoughts");
  if (build.levelFourFeat === "telekinetic") racialCantrips.push("mage-hand");
  spells.push(
    ...(build.choices["subclass.savant"] || []),
    ...(build.choices["subclass.savant.5"] || []),
  );
  if (subclass?.index === "circle-of-the-land") {
    const land: Record<string, string[][]> = {
      arid: [["fire-bolt"], ["blur", "burning-hands"], ["fireball"]],
      polar: [["ray-of-frost"], ["fog-cloud", "hold-person"], ["sleet-storm"]],
      temperate: [
        ["shocking-grasp"],
        ["misty-step", "sleep"],
        ["lightning-bolt"],
      ],
      tropical: [
        ["acid-splash"],
        ["ray-of-sickness", "web"],
        ["stinking-cloud"],
      ],
    };
    const id = build.choices["subclass.land"]?.[0];
    const selected = Object.hasOwn(land, id || "") ? land[id] : undefined;
    if (selected) {
      racialCantrips.push(...selected[0]);
      spells.push(...selected[1], ...(level >= 5 ? selected[2] : []));
    }
  }
  if (build.race === "tiefling") racialCantrips.push("thaumaturgy");
  return {
    name: build.name,
    className: klass?.name || "",
    subclassName: subclass?.name,
    raceName: sub?.name || race?.name || "",
    backgroundName: bg?.name || build.backgroundName,
    level,
    scores,
    modifiers,
    hp: Math.max(
      1,
      (klass?.hit_die || 8) +
        modifiers.con +
        (build.subrace === "hill-dwarf" ? 1 : 0) +
        (build.ruleset !== "srd-2024" && build.classId === "sorcerer" ? 1 : 0) +
        (level - 1) *
          Math.max(
            1,
            Math.floor((klass?.hit_die || 8) / 2) + 1 + modifiers.con,
          ) +
        (subclass?.index === "draconic-sorcery" ? level : 0) +
        (origin?.feat.index === "tough" ||
        build.choices["human.feat"]?.includes("tough")
          ? level * 2
          : 0),
    ),
    ac,
    speed:
      Math.max(race?.speed || 30,...traits.map(t=>t.speed || 0)) +
      (build.levelFourFeat==='speedy'?10:0) +
      (build.classId === "monk" && level >= 2 && !armor && !shield ? 10 : 0) +
      (build.classId === "barbarian" &&
      level >= 5 &&
      armor?.armor_category !== "Heavy"
        ? 10
        : 0),
    initiative:
      modifiers.dex +
      (origin?.feat.index === "alert" ||
      build.choices["human.feat"]?.includes("alert")
        ? proficiency
        : 0) +
      (subclass?.index === "gloom-stalker" ? modifiers.wis : 0),
    proficiency,
    skills: skillRows,
    saves: abilities.map((id) => ({
      id,
      proficient: !!klass?.saving_throws?.some((s) => s.index === id) || build.levelFourFeat==='resilient' && build.choices['level4.ability']?.includes(id),
      bonus:
        modifiers[id] +
        (klass?.saving_throws?.some((s) => s.index === id) || build.levelFourFeat==='resilient' && build.choices['level4.ability']?.includes(id) ? proficiency : 0),
    })),
    passivePerception:
      10 + (skillRows.find((s) => s.id === "perception")?.bonus || 0),
    equipment,
    attacks,
    languages: [
      ...new Set([
        ...(build.ruleset === "srd-2024" ? ["common"] : []),
        ...(race?.languages?.map((l) => l.index) || []),
        ...(bg?.fixedLanguages || []),
        ...groups
          .filter((g) => g.kind === "language")
          .flatMap((g) => build.choices[g.key] || []),
      ]),
    ].map((id) => catalog.languages.find((l) => l.index === id)?.name || id),
    proficiencies: [
      ...new Set(
        proficiencies.map((id) => (id.startsWith("tool-") ? id.slice(5) : id)),
      ),
    ],
    features: [
      ...(build.choices["human.feat"] || []).map((id) => ({
        name: `Human: ${id}`,
        desc: [originFeats[id] || ""],
      })),
      ...metamagic
        .filter(([id]) => build.choices["class.metamagic"]?.includes(id))
        .map(([, name, desc]) => ({ name, desc: [desc] })),
      ...invocations
        .filter(([id]) => build.choices["class.invocations"]?.includes(id))
        .map(([, name, , desc]) => ({ name, desc: [desc] })),
      ...revisedSnapshot.feats
        .filter(
          (f) =>
            build.ruleset === "srd-2024" &&
            build.choices["class.fighting-style"]?.includes(f.index),
        )
        .map((f) => ({ name: f.name, desc: [f.description] })),
      ...(build.ruleset === "srd-2024" && level >= 4
        ? [
            {
              name:
                levelFourFeats.find((f) => f.index === build.levelFourFeat)
                  ?.name || "Ability Score Improvement",
              desc: [
                generalFeats.find((f) => f.index === build.levelFourFeat)
                  ?.description ||
                  revisedSnapshot.feats.find(
                    (f) =>
                      f.index ===
                      (build.levelFourFeat || "ability-score-improvement"),
                  )?.description ||
                  "",
              ],
            },
          ]
        : []),
      ...(bg ? [{ name: `Background: ${bg.name}`, desc: [bg.desc] }] : []),
      ...features.map((f) => ({ name: f.name, desc: f.desc || [] })),
      ...traits.map((t) => ({ name: t.name, desc: t.desc || [] })),
      ...(bg ? [{ name: bg.feature, desc: [bg.featureDesc] }] : []),
    ],
    cantrips: [...new Set([...build.cantrips, ...racialCantrips])],
    spells: [...new Set(spells)],
    prepared:
      build.classId === "wizard"
        ? [
            ...new Set([
              ...build.prepared,
              ...(build.choices["origin.spell"] || []),
              ...(build.choices["human.magic.spell"] || []),
              ...(build.choices['level4.spell'] || []),...(build.choices['level4.rituals'] || []),
              ...(build.levelFourFeat==='fey-touched'?['misty-step']:build.levelFourFeat==='shadow-touched'?['invisibility']:build.levelFourFeat==='telepathic'?['detect-thoughts']:[]),
            ]),
          ]
        : [...new Set(spells)],
    spellAbility: limits.ability,
    spellAttack: limits.ability
      ? proficiency + modifiers[limits.ability]
      : undefined,
    spellDC: limits.ability
      ? 8 + proficiency + modifiers[limits.ability]
      : undefined,
    slots: limits.slots,
    slotsByLevel: limits.slotsByLevel,
    equipmentNotes: bg?.equipmentText || "",
    toolsNotes: bg?.toolsText || "",
  };
}
