import snapshot from "./srd-2024.json" with { type: "json" };
import type { ApiChoice } from "../characters.js";

export const originFeats: Record<string, string> = {
  alert:
    "Tambahkan proficiency bonus pada initiative. Setelah roll initiative, boleh bertukar initiative dengan sekutu yang bersedia dan tidak incapacitated.",
  crafter:
    "Proficiency tiga artisan tools. Diskon 20% untuk barang nonmagis. Saat long rest, buat barang sementara dari daftar Fast Crafting menggunakan tool yang sesuai; barang bertahan sampai long rest berikutnya.",
  healer:
    "Dengan Utilize dan satu penggunaan Healer’s Kit, makhluk dalam 5 ft boleh memakai satu Hit Die untuk pulih sebesar roll + proficiency bonus. Saat penyembuhan memakai spell atau manfaat ini, ulang hasil 1 pada die penyembuhan.",
  lucky:
    "Luck Points sebanyak proficiency bonus, pulih saat long rest. Pakai satu untuk advantage pada D20 Test sendiri atau disadvantage pada attack roll terhadapmu.",
  "magic-initiate":
    "Pilih INT, WIS, atau CHA untuk dua cantrip dan satu spell level 1 dari daftar terkait. Spell level 1 selalu prepared, dapat dipakai sekali tanpa slot per long rest dan dengan slot yang tersedia. Saat naik level, boleh mengganti satu spell dengan spell level sama dari daftar itu.",
  musician:
    "Proficiency tiga musical instruments. Setelah short atau long rest, beri Heroic Inspiration kepada sekutu yang mendengar permainanmu, maksimal sebanyak proficiency bonus.",
  "savage-attacker":
    "Sekali per turn saat serangan senjata mengenai target, roll weapon damage dice dua kali dan pilih salah satu hasil.",
  skilled:
    "Pilih tiga proficiency tambahan, kombinasi skill dan tool. Feat dapat diambil berulang.",
  "tavern-brawler":
    "Unarmed Strike dapat memakai 1d4 + STR untuk damage. Ulang hasil 1 pada damage die Unarmed Strike. Proficiency improvised weapons. Sekali per turn, Unarmed Strike sebagai bagian Attack action yang mengenai target dapat mendorong target 5 ft.",
  tough:
    "HP maksimum bertambah dua kali level karakter. Setiap level berikutnya menambah 2 HP maksimum.",
};
type Spec = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
];
const specs: Spec[] = [
  [
    "acolyte",
    "int wis cha",
    "magic-initiate",
    "insight religion",
    "calligraphers-supplies",
    "Cleric",
    "calligraphers-supplies book holy-symbols parchment:10 robe",
    8,
    "Tumbuh dalam komunitas keagamaan, mempelajari ritual dan pelayanan.",
  ],
  [
    "artisan",
    "str dex int",
    "crafter",
    "investigation persuasion",
    "artisan",
    "",
    "pouch:2 clothes-travelers",
    32,
    "Terlatih membuat barang, menilai detail, dan melayani pelanggan.",
  ],
  [
    "charlatan",
    "dex con cha",
    "skilled",
    "deception sleight-of-hand",
    "forgery-kit",
    "",
    "forgery-kit costume clothes-fine",
    15,
    "Mencari nafkah melalui penyamaran, tipu daya, dan dokumen palsu.",
  ],
  [
    "criminal",
    "dex con int",
    "alert",
    "sleight-of-hand stealth",
    "thieves-tools",
    "",
    "dagger:2 thieves-tools crowbar pouch:2 clothes-travelers",
    16,
    "Terbiasa bergerak diam-diam dan bekerja di luar hukum.",
  ],
  [
    "entertainer",
    "str dex cha",
    "musician",
    "acrobatics performance",
    "instrument",
    "",
    "costume:2 mirror-steel perfume clothes-travelers",
    11,
    "Mengasah kemampuan panggung dan memahami penonton.",
  ],
  [
    "farmer",
    "str con wis",
    "tough",
    "animal-handling nature",
    "carpenters-tools",
    "",
    "sickle carpenters-tools healers-kit pot-iron shovel clothes-travelers",
    30,
    "Menjalani pekerjaan ladang, merawat hewan, dan menghadapi alam.",
  ],
  [
    "guard",
    "str int wis",
    "alert",
    "athletics perception",
    "gaming",
    "",
    "spear crossbow-light crossbow-bolt:20 lantern-hooded manacles quiver clothes-travelers",
    12,
    "Berpengalaman menjaga tempat dan mengenali ancaman.",
  ],
  [
    "guide",
    "dex con wis",
    "magic-initiate",
    "stealth survival",
    "cartographer-tools",
    "Druid",
    "shortbow arrow:20 cartographers-tools bedroll quiver tent-two-person clothes-travelers",
    3,
    "Menuntun orang melintasi alam liar dan membaca medan.",
  ],
  [
    "hermit",
    "con wis cha",
    "healer",
    "medicine religion",
    "herbalism-kit",
    "",
    "quarterstaff herbalism-kit bedroll book lamp oil-flask:3 clothes-travelers",
    16,
    "Hidup menyendiri untuk merenung, belajar, dan merawat kehidupan.",
  ],
  [
    "merchant",
    "con int cha",
    "lucky",
    "animal-handling persuasion",
    "navigators-tools",
    "",
    "navigators-tools pouch:2 clothes-travelers",
    22,
    "Terbiasa berdagang, bepergian, dan membangun hubungan bisnis.",
  ],
  [
    "noble",
    "str int cha",
    "skilled",
    "history persuasion",
    "gaming",
    "",
    "clothes-fine perfume",
    29,
    "Dibesarkan dalam lingkungan berpengaruh, dengan pendidikan dan kewajiban sosial.",
  ],
  [
    "sailor",
    "str dex wis",
    "tavern-brawler",
    "acrobatics perception",
    "navigators-tools",
    "",
    "dagger navigators-tools rope-hempen clothes-travelers",
    20,
    "Bekerja di kapal, menghadapi badai dan kehidupan pelabuhan.",
  ],
  [
    "sage",
    "con int wis",
    "magic-initiate",
    "arcana history",
    "calligraphers-supplies",
    "Wizard",
    "quarterstaff calligraphers-supplies book parchment:8 robe",
    8,
    "Mendalami pengetahuan lewat buku, penelitian, dan bimbingan guru.",
  ],
  [
    "scribe",
    "dex int wis",
    "skilled",
    "investigation perception",
    "calligraphers-supplies",
    "",
    "calligraphers-supplies clothes-fine lamp oil-flask:3 parchment:12",
    23,
    "Menyalin tulisan, meneliti dokumen, dan menjaga ketelitian catatan.",
  ],
  [
    "soldier",
    "str dex con",
    "savage-attacker",
    "athletics intimidation",
    "gaming",
    "",
    "spear shortbow arrow:20 healers-kit quiver clothes-travelers",
    14,
    "Terlatih dalam disiplin militer, pertempuran, dan kerja regu.",
  ],
  [
    "wayfarer",
    "dex wis cha",
    "lucky",
    "insight stealth",
    "thieves-tools",
    "",
    "dagger:2 thieves-tools bedroll pouch:2 clothes-travelers",
    16,
    "Bertahan dengan membaca orang, mencari peluang, dan berpindah tempat.",
  ],
];
const title = (id: string) =>
  id
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
const aliases: Record<string, string> = { 'cartographers-tools': 'cartographer-tools', 'mirror-steel': 'mirror', 'crossbow-bolt': 'bolts', arrow: 'arrows', 'tent-two-person': 'tent', 'oil-flask': 'oil', 'rope-hempen': 'rope', 'dice-set': 'dice', 'dragonchess-set': 'dragonchess', 'playing-card-set': 'playing-cards', 'three-dragon-ante-set': 'three-dragon-ante' };
const equipmentId = (id: string) => aliases[id] || id;
const equipmentName = (id: string) =>
  snapshot.equipment.find((e) => e.index === id)?.name || title(id);
export const toolSets = {
  artisan: [
    "alchemists-supplies",
    "brewers-supplies",
    "calligraphers-supplies",
    "carpenters-tools",
    "cartographer-tools",
    "cobblers-tools",
    "cooks-utensils",
    "glassblowers-tools",
    "jewelers-tools",
    "leatherworkers-tools",
    "masons-tools",
    "painters-supplies",
    "potters-tools",
    "smiths-tools",
    "tinkers-tools",
    "weavers-tools",
    "woodcarvers-tools",
  ],
  instrument: [
    "bagpipes",
    "drum",
    "dulcimer",
    "flute",
    "horn",
    "lute",
    "lyre",
    "pan-flute",
    "shawm",
    "viol",
  ],
  gaming: [
    "dice-set",
    "dragonchess-set",
    "playing-card-set",
    "three-dragon-ante-set",
  ],
};
export const backgrounds2024 = specs.map(
  ([index, scores, feat, skills, tool, spellClass, items, gp, description]) => {
    const set = toolSets[tool as keyof typeof toolSets];
    const equipment = items.split(" ").map((token) => {
      const [rawId, count] = token.split(":");
      const id = equipmentId(rawId);
      return {
        option_type: "counted_reference",
        count: Number(count || 1),
        of: { index: id, name: equipmentName(id) },
      };
    });
    const toolChoice: ApiChoice[] = set
      ? [
          {
            choose: 1,
            desc: "Tool background",
            from: {
              option_set_type: "options_array",
              options: set.map((id) => ({
                item: { index: equipmentId(id), name: equipmentName(equipmentId(id)) },
              })),
            },
          },
        ]
      : [];
    const equipmentChoice: ApiChoice = {
      choose: 1,
      desc: "Equipment background: paket A atau 50 GP",
      from: {
        option_set_type: "options_array",
        options: [
          {
            items: [
              ...equipment,
              { option_type: "money", count: gp, unit: "gp" },
            ],
          },
          { option_type: "money", count: 50, unit: "gp" },
        ],
      },
    };
    return {
      index,
      name: title(index),
      desc: [description],
      ability_scores: scores
        .split(" ")
        .map((id) => ({ index: id, name: id.toUpperCase() })),
      feat: { index: feat, name: title(feat) },
      spellClass: spellClass.toLowerCase(),
      proficiencies: [
        ...skills
          .split(" ")
          .map((id) => ({ index: `skill-${id}`, name: title(id) })),
        ...(!set ? [{ index: equipmentId(tool), name: equipmentName(equipmentId(tool)) }] : []),
      ],
      proficiency_choices: toolChoice,
      equipment_options: [equipmentChoice],
      selectedToolEquipment: !!set,
      extraGamingEquipment: index === "wayfarer",
    };
  },
);
