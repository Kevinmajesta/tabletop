// Perjamuan Sang Lich (party, kerja sama, informasi terbagi).
// Delapan piala di meja: empat beracun, empat aman. Party harus menandai empat piala aman lalu bersulang.
// Tiap pemain punya SATU indra (Mata = warna, Hidung = aroma, Telinga = bunyi, Peraba = suhu) dan
// SATU halaman buku racun (dua dari delapan jenis minuman beserta cirinya).
// Tiap racun punya kembaran aman yang hanya berbeda di satu indra, jadi tanpa satu indra pun ada dua piala
// yang tidak bisa dibedakan. Salah bersulang tidak mengakhiri permainan: lich menyebut berapa piala beracun
// yang ikut diminum, lalu GM memberi efeknya di permainan D&D.
export const gobletCount = 8;
export const safeCount = 4;
export type Sense = "sight" | "smell" | "watch" | "touch";
export const senses: Sense[] = ["sight", "smell", "watch", "touch"];
export const senseInfo: Record<
  Sense,
  { title: string; body: string; attr: string }
> = {
  sight: {
    title: "Mata",
    attr: "Warna",
    body: "Kamu bisa melihat warna cairan di setiap piala.",
  },
  smell: {
    title: "Hidung",
    attr: "Aroma",
    body: "Kamu bisa mencium aroma setiap piala.",
  },
  watch: {
    title: "Telinga",
    attr: "Bunyi",
    body: "Kamu bisa mendengar bunyi cairan di setiap piala.",
  },
  touch: {
    title: "Peraba",
    attr: "Suhu",
    body: "Kamu bisa merasakan suhu setiap piala.",
  },
};
export const attrValues: Record<Sense, string[]> = {
  sight: ["Merah delima", "Ungu pekat", "Hijau zamrud", "Keemasan", "Bening"],
  smell: [
    "Buah beri",
    "Almond pahit",
    "Tanah basah",
    "Mawar layu",
    "Tak berbau",
  ],
  watch: ["Berdesis", "Menggelegak", "Berdenting", "Hening"],
  touch: ["Sedingin es", "Suhu ruang", "Hangat"],
};
export const drinkNames = [
  "Racun Nightshade",
  "Air Mata Wyvern",
  "Debu Kubur",
  "Darah Banshee",
  "Anggur Elf",
  "Mead Kurcaci",
  "Teh Akar Mandrake",
  "Air Kuil",
];
export const drinkLore = [
  "Membuat lidah mati rasa sebelum jantung berhenti.",
  "Tetes air mata naga kecil; manis di awal, membakar di akhir.",
  "Abu dari makam tua, larut tanpa jejak.",
  "Darah roh yang menjerit; peminumnya kehilangan suara selamanya.",
  "Anggur dari kebun bulan, aman dan harum.",
  "Mead kental kebanggaan kurcaci, aman meski kuat.",
  "Terdengar menyeramkan, tapi hanya teh penenang.",
  "Air yang diberkati pendeta, aman diminum siapa pun.",
];
export const isPoison = (drink: number) => drink < 4;
export const gobletMaterials = [
  "Emas",
  "Perak",
  "Perunggu",
  "Tulang",
  "Kristal",
  "Besi hitam",
  "Kayu ebony",
  "Giok",
];

export type Signature = Record<Sense, number>;
// Aturan di buku: pernyataan yang benar tentang ciri asli minuman. Dipakai untuk menyimpulkan ciri yang tidak tercatat.
export type LichRule =
  | { kind: "none"; group: "poison" | "safe"; sense: Sense; value: number }
  | { kind: "implies"; s1: Sense; v1: number; s2: Sense; v2: number }
  | { kind: "pair"; a: number; b: number; sense: Sense; same: boolean }
  | { kind: "not"; drink: number; sense: Sense; value: number }
  | { kind: "count"; sense: Sense; value: number; n: number }
  | { kind: "warmer"; a: number; b: number };
export type LichState = {
  signatures: Signature[]; // ciri asli per jenis minuman (indeks drinkNames)
  shown: Sense[][]; // ciri yang tercatat di buku untuk tiap minuman (dua indra)
  rules: LichRule[][]; // aturan per halaman buku
  goblets: number[]; // isi tiap piala (indeks minuman), rahasia
  pages: number[][]; // halaman buku: dua indeks minuman per halaman
  holders?: number[]; // indeks pemain (urutan game.players) yang memegang tiap indra, diatur GM
  marks: number[]; // piala yang ditandai aman (bersama)
  agreed: string[]; // pemain yang sudah menekan Setuju untuk tanda saat ini
  attempts: number;
  lastPoisoned?: number; // jumlah piala beracun di sulangan terakhir yang gagal
  history: { marks: number[]; poisoned: number }[];
};
export type LichView = {
  roles: { sense: Sense; page: number }[]; // peran milikku (pemain < 4 bisa punya lebih dari satu)
  observed: Partial<Record<Sense, number[]>>; // nilai indra yang kulihat per piala
  book: { drink: number; traits: Partial<Signature>; full?: Signature }[];
  rules: string[]; // aturan di halaman milikku
  holders: number[]; // indeks pemain per indra (urutan senses)
  marks: number[];
  agreed: string[];
  attempts: number;
  lastPoisoned?: number;
  history: { marks: number[]; poisoned: number }[];
  solution?: number[]; // GM / selesai: isi tiap piala
};

type Rnd = (max: number) => number;
const shuffle = <T>(a: T[], r: Rnd) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = r(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sigKey = (s: Signature) => senses.map((x) => s[x]).join(",");

const phrase = (s: Sense, v: number) => {
  const x = attrValues[s][v];
  if (s === "sight") return `berwarna ${x.toLowerCase()}`;
  if (s === "smell")
    return x === "Tak berbau" ? "tidak berbau" : `beraroma ${x.toLowerCase()}`;
  if (s === "watch") return x === "Hening" ? "tidak berbunyi" : `berbunyi ${x.toLowerCase()}`;
  return x === "Sedingin es"
    ? "disajikan sedingin es"
    : x === "Hangat"
      ? "disajikan hangat"
      : "disajikan bersuhu ruang";
};
const numberWord = [
  "nol",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
];
export function ruleText(rule: LichRule): string {
  switch (rule.kind) {
    case "none":
      return `Tidak ada ${rule.group === "poison" ? "racun" : "minuman aman"} yang ${phrase(rule.sense, rule.value)}.`;
    case "implies":
      return `Setiap minuman yang ${phrase(rule.s1, rule.v1)} pasti ${phrase(rule.s2, rule.v2)}.`;
    case "pair":
      return `${drinkNames[rule.a]} dan ${drinkNames[rule.b]} ${rule.same ? "memiliki" : "tidak memiliki"} ${senseInfo[rule.sense].attr.toLowerCase()} yang sama.`;
    case "not":
      return `${drinkNames[rule.drink]} tidak ${phrase(rule.sense, rule.value)}.`;
    case "count":
      return `Tepat ${numberWord[rule.n]} jenis minuman ${phrase(rule.sense, rule.value)}.`;
    case "warmer":
      return `${drinkNames[rule.a]} disajikan lebih hangat daripada ${drinkNames[rule.b]}.`;
  }
}
// sigs: ciri lengkap tiap minuman menurut sebuah dugaan penempatan.
export function ruleHolds(rule: LichRule, sigs: Signature[]): boolean {
  switch (rule.kind) {
    case "none":
      return sigs.every(
        (g, d) =>
          isPoison(d) !== (rule.group === "poison") ||
          g[rule.sense] !== rule.value,
      );
    case "implies":
      return sigs.every(
        (g) => g[rule.s1] !== rule.v1 || g[rule.s2] === rule.v2,
      );
    case "pair":
      return (
        (sigs[rule.a][rule.sense] === sigs[rule.b][rule.sense]) === rule.same
      );
    case "not":
      return sigs[rule.drink][rule.sense] !== rule.value;
    case "count":
      return sigs.filter((g) => g[rule.sense] === rule.value).length === rule.n;
    case "warmer":
      return sigs[rule.a].touch > sigs[rule.b].touch;
  }
}

function ruleCandidates(sigs: Signature[]): LichRule[] {
  const out: LichRule[] = [];
  const D = sigs.length;
  for (const s of senses)
    for (let v = 0; v < attrValues[s].length; v++) {
      const users = sigs.filter((g) => g[s] === v).length;
      for (const group of ["poison", "safe"] as const) {
        const r: LichRule = { kind: "none", group, sense: s, value: v };
        if (users && ruleHolds(r, sigs)) out.push(r);
      }
      if (users >= 1 && users <= 3)
        out.push({ kind: "count", sense: s, value: v, n: users });
      for (const s2 of senses)
        if (s2 !== s)
          for (let v2 = 0; v2 < attrValues[s2].length; v2++) {
            const r: LichRule = { kind: "implies", s1: s, v1: v, s2, v2 };
            if (users && ruleHolds(r, sigs)) out.push(r);
          }
    }
  for (let a = 0; a < D; a++)
    for (let b = a + 1; b < D; b++) {
      for (const s of senses)
        out.push({
          kind: "pair",
          a,
          b,
          sense: s,
          same: sigs[a][s] === sigs[b][s],
        });
      if (sigs[a].touch !== sigs[b].touch)
        out.push(
          sigs[a].touch > sigs[b].touch
            ? { kind: "warmer", a, b }
            : { kind: "warmer", a: b, b: a },
        );
    }
  for (let d = 0; d < D; d++)
    for (const s of senses)
      for (let v = 0; v < attrValues[s].length; v++)
        if (v !== sigs[d][s])
          out.push({ kind: "not", drink: d, sense: s, value: v });
  return out;
}

// Semua penempatan minuman -> piala (tiap minuman tepat satu piala) yang cocok dengan pengamatan, catatan buku, dan aturan.
// Mengembalikan jumlah penempatan dan jumlah himpunan racun berbeda (dibatasi supaya cepat).
export function lichSolutions(
  observed: Signature[],
  shown: Sense[][],
  truth: Signature[],
  rules: LichRule[],
  cap = 5000,
) {
  const n = observed.length;
  const cand = observed.map((o) =>
    truth
      .map((_t, d) => d)
      .filter((d) => shown[d].every((s) => truth[d][s] === o[s])),
  );
  const used = new Array(n).fill(false),
    assign = new Array(n).fill(-1);
  let count = 0;
  const poisonSets = new Set<string>();
  const walk = (g: number) => {
    if (count >= cap) return;
    if (g === n) {
      const sigs: Signature[] = new Array(n);
      assign.forEach((d, gi) => {
        sigs[d] = observed[gi];
      });
      if (rules.every((r) => ruleHolds(r, sigs))) {
        count++;
        poisonSets.add(assign.map((d) => (isPoison(d) ? 1 : 0)).join(""));
      }
      return;
    }
    for (const d of cand[g])
      if (!used[d]) {
        used[d] = true;
        assign[g] = d;
        walk(g + 1);
        used[d] = false;
      }
  };
  walk(0);
  return {
    count,
    poisonSets: poisonSets.size,
    direct: cand.filter((c) => c.length > 1).length,
  };
}

// Dengan ciri lengkap (tanpa buku): banyaknya status racun/aman yang konsisten dengan indra yang diketahui.
// Dipakai untuk membuktikan setiap indra wajib.
export function poisonReadings(
  state: Pick<LichState, "signatures" | "goblets">,
  known: Sense[],
): number {
  const options = state.goblets.map((d) => {
    const fits = state.signatures.flatMap((sig, i) =>
      known.every((s) => sig[s] === state.signatures[d][s]) ? [i] : [],
    );
    return [...new Set(fits.map(isPoison))];
  });
  let count = 0;
  const walk = (i: number, poison: number) => {
    if (poison > gobletCount - safeCount) return;
    if (i === options.length) {
      if (poison === gobletCount - safeCount) count++;
      return;
    }
    for (const p of options[i]) walk(i + 1, poison + (p ? 1 : 0));
  };
  walk(0, 0);
  return count;
}

export function newLich(r: Rnd): LichState {
  for (let attempt = 0; attempt < 400; attempt++) {
    const rand = (): Signature => ({
      sight: r(attrValues.sight.length),
      smell: r(attrValues.smell.length),
      watch: r(attrValues.watch.length),
      touch: r(attrValues.touch.length),
    });
    const poisons = [rand(), rand(), rand(), rand()];
    // Kembaran aman: sama dengan racun pasangannya kecuali di satu indra (indra diacak per pasangan).
    // Ini menjamin keempat indra wajib: tanpa indra k, racun dan kembarannya bisa saling bertukar tanpa ketahuan.
    const twinSense = shuffle([...senses], r);
    const safes = poisons.map((p, k) => {
      const s = twinSense[k],
        next = { ...p };
      next[s] = (p[s] + 1 + r(attrValues[s].length - 1)) % attrValues[s].length;
      return next;
    });
    const signatures = [...poisons, ...safes];
    if (new Set(signatures.map(sigKey)).size !== signatures.length) continue;
    const goblets = shuffle([...Array(gobletCount).keys()], r);
    const observed = goblets.map((d) => signatures[d]);
    // Buku hanya mencatat dua ciri per minuman. Ciri pembeda kembaran sengaja sering disembunyikan.
    const shown = signatures.map((_s, d) => {
      const twin = twinSense[d % 4];
      const pool = shuffle(
        senses.filter((s) => s !== twin),
        r,
      );
      return (r(4) === 0 ? [twin, pool[0]] : [pool[0], pool[1]]).sort(
        (a, b) => senses.indexOf(a) - senses.indexOf(b),
      );
    });
    const base = lichSolutions(observed, shown, signatures, []);
    if (base.direct < 5 || base.poisonSets < 4) continue; // pencocokan langsung harus jauh dari cukup
    // Pilih aturan acak (jenis yang menarik lebih sering) sampai himpunan racun tinggal satu.
    const weight: Record<LichRule["kind"], number> = {
      none: 4,
      implies: 4,
      warmer: 3,
      count: 3,
      pair: 2,
      not: 1,
    };
    const pool = shuffle(ruleCandidates(signatures), r)
      .map((rule) => ({ rule, key: r(100) * weight[rule.kind] }))
      .sort((a, b) => b.key - a.key)
      .map((x) => x.rule);
    let rules: LichRule[] = [];
    let current = base;
    for (const rule of pool) {
      if (current.poisonSets === 1 && current.count === 1) break;
      const next = lichSolutions(observed, shown, signatures, [...rules, rule]);
      if (next.count < current.count) {
        rules.push(rule);
        current = next;
      }
    }
    if (current.poisonSets !== 1) continue;
    // Buang aturan yang tidak dibutuhkan.
    for (const rule of [...rules]) {
      const without = rules.filter((x) => x !== rule);
      const res = lichSolutions(observed, shown, signatures, without);
      if (res.poisonSets === 1 && res.count === 1) rules = without;
    }
    if (rules.length < 4 || rules.length > 8) continue;
    // Halaman buku: pasangan racun dan kembarannya dipisah; aturan dibagi rata.
    const order = shuffle([...Array(gobletCount).keys()], r);
    let pages: number[][] = [];
    for (let tries = 0; tries < 50; tries++) {
      pages = [0, 1, 2, 3].map((i) =>
        [order[i * 2], order[i * 2 + 1]].sort((a, b) => a - b),
      );
      if (pages.every(([a, b]) => Math.abs(a - b) !== 4)) break;
      shuffle(order, r);
    }
    const ruleOrder = shuffle([...rules], r);
    const pageRules = [0, 1, 2, 3].map((p) =>
      ruleOrder.filter((_x, i) => i % 4 === p),
    );
    return {
      signatures,
      shown,
      rules: pageRules,
      goblets,
      pages,
      marks: [],
      agreed: [],
      attempts: 0,
      history: [],
    };
  }
  throw new Error("Perjamuan tidak bisa dibuat.");
}

// Pemegang tiap indra (beserta halaman bukunya). Bawaan: indra k untuk pemain k % jumlah pemain (maks. empat);
// GM mengaturnya lewat lich:seat (lihat minigames.ts). Satu pemain boleh memegang beberapa indra.
export function holdersOf(
  t: Pick<LichState, "holders">,
  playerCount: number,
): number[] {
  const n = Math.max(1, Math.min(playerCount, 4));
  const own = t.holders;
  if (
    own &&
    own.length === senses.length &&
    own.every((i) => Number.isInteger(i) && i >= 0 && i < playerCount)
  )
    return [...own];
  return senses.map((_s, k) => k % n);
}

type GameLike = {
  phase: string;
  result: string;
  players: string[];
  scores: Record<string, number>;
  lich?: LichState;
};

export function lichAction(
  game: GameLike,
  playerId: string,
  dm: boolean,
  action: Record<string, unknown>,
): string | null {
  const t = game.lich;
  if (!t || game.phase !== "open") return "Perjamuan belum dimulai.";
  if (!dm && !game.players.includes(playerId))
    return "Hanya tamu perjamuan yang boleh menyentuh piala.";
  if (action.type === "lich:mark") {
    const g = action.goblet;
    if (
      typeof g !== "number" ||
      !Number.isInteger(g) ||
      g < 0 ||
      g >= gobletCount
    )
      return "Piala tidak dikenal.";
    if (t.marks.includes(g)) t.marks = t.marks.filter((x) => x !== g);
    else {
      if (t.marks.length >= safeCount)
        return `Tandai tepat ${safeCount} piala. Lepas satu tanda dulu.`;
      t.marks = [...t.marks, g].sort((a, b) => a - b);
    }
    t.agreed = [];
    game.result = "";
    return null;
  }
  if (action.type === "lich:agree") {
    if (dm && !game.players.includes(playerId))
      return "GM tidak ikut bersulang.";
    if (t.marks.length !== safeCount)
      return `Tandai tepat ${safeCount} piala dulu.`;
    if (t.agreed.includes(playerId))
      t.agreed = t.agreed.filter((id) => id !== playerId);
    else t.agreed.push(playerId);
    if (game.players.every((id) => t.agreed.includes(id))) {
      const poisoned = t.marks.filter((g) => isPoison(t.goblets[g])).length;
      t.attempts++;
      t.history.push({ marks: [...t.marks], poisoned });
      t.agreed = [];
      if (!poisoned) {
        game.phase = "finished";
        game.result = "win";
        for (const id of game.players)
          game.scores[id] = (game.scores[id] || 0) + 1;
      } else {
        t.lastPoisoned = poisoned;
        game.result = "poisoned";
      }
    } else game.result = "";
    return null;
  }
  return "Aksi tidak dikenal.";
}

export function lichView(
  t: LichState,
  playerIndex: number,
  playerCount: number,
  dm: boolean,
  finished: boolean,
): LichView {
  const all = dm || finished;
  const holders = holdersOf(t, playerCount);
  const roles = all
    ? senses.map((sense, page) => ({ sense, page }))
    : senses.flatMap((sense, k) =>
        holders[k] === playerIndex ? [{ sense, page: k }] : [],
      );
  const observed: Partial<Record<Sense, number[]>> = {};
  for (const { sense } of roles)
    observed[sense] = t.goblets.map((d) => t.signatures[d][sense]);
  const pages = [...new Set(roles.map((r) => r.page))];
  return {
    roles,
    observed,
    // t.shown/t.rules bisa kosong pada ronde lama (sebelum buku tidak lengkap): tampilkan buku lengkap tanpa aturan.
    book: pages
      .flatMap((p) => t.pages[p])
      .sort((a, b) => a - b)
      .map((drink) => ({
        drink,
        traits: Object.fromEntries(
          (t.shown?.[drink] ?? senses).map((s) => [s, t.signatures[drink][s]]),
        ) as Partial<Signature>,
        ...(all ? { full: { ...t.signatures[drink] } } : {}),
      })),
    rules: pages.flatMap((p) => (t.rules?.[p] ?? []).map(ruleText)),
    holders,
    marks: [...t.marks],
    agreed: [...t.agreed],
    attempts: t.attempts,
    ...(t.lastPoisoned !== undefined ? { lastPoisoned: t.lastPoisoned } : {}),
    history: t.history.map((h) => ({
      marks: [...h.marks],
      poisoned: h.poisoned,
    })),
    ...(all ? { solution: [...t.goblets] } : {}),
  };
}
