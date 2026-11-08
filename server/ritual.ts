// Ritual Lingkaran Sihir (party, kerja sama, informasi terbagi).
// Delapan lilin melingkari altar, bernomor 1..8 searah jarum jam. Tiap lilin punya warna dan rune.
// Ritual = lima lilin yang harus dinyalakan berurutan. Tiap langkah dipegang satu pemain (bergiliran),
// dan pemain hanya melihat SALAH SATU ciri lilin: warna atau rune. Petunjuk sering menyebut ciri yang
// tidak terlihat oleh pemegangnya, jadi party harus saling bicara.
// Salah menyalakan = ritual meledak: semua lilin padam dan satu segel hilang. Tiga segel habis = gagal.
export const candleCount = 8;
export const ritualSteps = 5;
export const ritualSeals = 3;
export const candleColors = ['Merah', 'Biru', 'Hijau', 'Ungu', 'Emas'];
export const candleRunes = ['Api', 'Air', 'Bumi', 'Angin', 'Bulan', 'Matahari', 'Bintang', 'Petir'];
export const runeGlyphs = ['▲', '≈', '◆', '∿', '☾', '☀', '★', 'ϟ'];

export type Candle = { color: number; rune: number };
export type Vision = 'color' | 'rune' | 'all' | 'none';
export type RitualState = {
  candles: Candle[];
  order: number[];        // indeks lilin untuk tiap langkah (rahasia)
  clues: string[];        // teks petunjuk tiap langkah (dibagikan per pemain)
  lit: number[];          // lilin yang sudah menyala, berurutan
  seals: number;
  backfires: number;
  lastWrong?: number;     // lilin yang salah dinyalakan terakhir kali
};
export type RitualView = {
  candles: { color: number | null; rune: number | null; lit: boolean; wrong: boolean }[];
  vision: Vision;
  myClues: { step: number; text: string }[];
  holders: number[];      // indeks pemain (urutan game.players) yang memegang tiap langkah
  progress: number;
  steps: number;
  seals: number;
  backfires: number;
  order?: number[];       // hanya untuk GM atau setelah ronde selesai
};

type Rnd = (max: number) => number;
const num = (i: number) => i + 1;
const cw = (i: number, d: number) => (i + d + candleCount) % candleCount;

// Tiap jenis petunjuk: buat kalimat dan daftar lilin yang cocok. Petunjuk hanya dipakai kalau cocok dengan tepat satu lilin.
type ClueMaker = (c: Candle[], prev: number | undefined, r: Rnd) => { text: string; matches: number[] } | null;
const clueMakers: ClueMaker[] = [
  // Rune langsung: unik karena tiap rune hanya dipakai sekali.
  (c, _p, r) => {
    const rune = r(candleRunes.length);
    return { text: `Nyalakan lilin ber-rune ${candleRunes[rune]}.`, matches: c.flatMap((x, i) => (x.rune === rune ? [i] : [])) };
  },
  // Warna dengan nomor terkecil.
  (c, _p, r) => {
    const color = r(candleColors.length);
    const hits = c.flatMap((x, i) => (x.color === color ? [i] : []));
    if (!hits.length) return null;
    return { text: `Nyalakan lilin ${candleColors[color]} dengan nomor paling kecil.`, matches: [hits[0]] };
  },
  // Warna + nomor ganjil/genap.
  (c, _p, r) => {
    const color = r(candleColors.length);
    const odd = r(2) === 0;
    return {
      text: `Nyalakan satu-satunya lilin ${candleColors[color]} yang bernomor ${odd ? 'ganjil' : 'genap'}.`,
      matches: c.flatMap((x, i) => (x.color === color && num(i) % 2 === (odd ? 1 : 0) ? [i] : [])),
    };
  },
  // Di antara dua rune.
  (c, _p, r) => {
    const i = r(candleCount);
    const a = c[cw(i, -1)].rune, b = c[cw(i, 1)].rune;
    return { text: `Nyalakan lilin yang diapit lilin ber-rune ${candleRunes[a]} dan ${candleRunes[b]}.`, matches: [i] };
  },
  // Di antara dua warna yang sama.
  (c, _p, r) => {
    const color = r(candleColors.length);
    return {
      text: `Nyalakan satu-satunya lilin yang diapit dua lilin ${candleColors[color]}.`,
      matches: c.flatMap((_x, i) => (c[cw(i, -1)].color === color && c[cw(i, 1)].color === color ? [i] : [])),
    };
  },
  // Relatif terhadap langkah sebelumnya.
  (c, p, r) => {
    if (p === undefined) return null;
    const kind = r(3);
    if (kind === 0) return { text: 'Nyalakan lilin tepat di seberang lilin langkah sebelumnya.', matches: [cw(p, candleCount / 2)] };
    const steps = 1 + r(2);
    const clockwise = kind === 1;
    return {
      text: `Dari lilin langkah sebelumnya, maju ${steps} lilin ${clockwise ? 'searah' : 'berlawanan arah'} jarum jam.`,
      matches: [cw(p, clockwise ? steps : -steps)],
    };
  },
  // Rune relatif terhadap warna.
  (c, _p, r) => {
    const color = r(candleColors.length);
    const clockwise = r(2) === 0;
    return {
      text: `Nyalakan lilin tepat ${clockwise ? 'searah' : 'berlawanan arah'} jarum jam dari satu-satunya lilin ${candleColors[color]}.`,
      matches: c.flatMap((x, i) => (x.color === color ? [cw(i, clockwise ? 1 : -1)] : [])),
    };
  },
];

function shuffle<T>(items: T[], r: Rnd) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = r(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function newRitual(r: Rnd): RitualState {
  for (let attempt = 0; attempt < 200; attempt++) {
    const runes = shuffle([...Array(candleCount).keys()], r);
    // Setiap warna muncul minimal sekali supaya petunjuk warna bervariasi.
    const colors = shuffle([...Array(candleColors.length).keys(), ...Array.from({ length: candleCount - candleColors.length }, () => r(candleColors.length))], r);
    const candles = runes.map((rune, i) => ({ rune, color: colors[i] }));
    const order: number[] = [];
    const clues: string[] = [];
    let lastKind = -1;
    for (let step = 0; step < ritualSteps; step++) {
      let found = false;
      for (let tries = 0; tries < 120 && !found; tries++) {
        const kind = r(clueMakers.length);
        if (kind === lastKind) continue; // jangan dua jenis petunjuk sama berturut-turut
        const clue = clueMakers[kind](candles, order.at(-1), r);
        if (!clue || clue.matches.length !== 1 || order.includes(clue.matches[0])) continue;
        order.push(clue.matches[0]);
        clues.push(clue.text);
        lastKind = kind;
        found = true;
      }
      if (!found) break;
    }
    if (order.length === ritualSteps) return { candles, order, clues, lit: [], seals: ritualSeals, backfires: 0 };
  }
  throw new Error('Ritual tidak bisa dibuat.');
}

// Pemain ke-0, 2, 4 melihat warna; ke-1, 3, 5 melihat rune. Pemain tunggal melihat semuanya.
export function visionOf(index: number, playerCount: number): Vision {
  if (index < 0) return 'none';
  if (playerCount === 1) return 'all';
  return index % 2 === 0 ? 'color' : 'rune';
}
export const holderOf = (step: number, playerCount: number) => step % Math.max(1, playerCount);

type GameLike = { phase: string; result: string; players: string[]; scores: Record<string, number>; ritual?: RitualState };

export function ritualLight(game: GameLike, playerId: string, candle: unknown): string | null {
  const t = game.ritual;
  if (!t || game.phase !== 'open') return 'Ritual belum dimulai.';
  if (!game.players.includes(playerId)) return 'Hanya peserta ritual yang boleh menyalakan lilin.';
  if (typeof candle !== 'number' || !Number.isInteger(candle) || candle < 0 || candle >= candleCount) return 'Lilin tidak dikenal.';
  if (t.lit.includes(candle)) return 'Lilin itu sudah menyala.';
  if (t.order[t.lit.length] === candle) {
    t.lit.push(candle);
    delete t.lastWrong;
    if (t.lit.length === ritualSteps) {
      game.phase = 'finished';
      game.result = 'win';
      for (const id of game.players) game.scores[id] = (game.scores[id] || 0) + 1;
    } else game.result = 'lit';
    return null;
  }
  t.lit = [];
  t.seals--;
  t.backfires++;
  t.lastWrong = candle;
  if (t.seals <= 0) { game.phase = 'finished'; game.result = 'lost'; }
  else game.result = 'backfire';
  return null;
}

export function ritualView(t: RitualState, playerIndex: number, playerCount: number, dm: boolean, finished: boolean): RitualView {
  const vision: Vision = dm || finished ? 'all' : visionOf(playerIndex, playerCount);
  const showColor = vision === 'all' || vision === 'color';
  const showRune = vision === 'all' || vision === 'rune';
  const holders = t.clues.map((_c, step) => holderOf(step, playerCount));
  return {
    candles: t.candles.map((c, i) => ({ color: showColor ? c.color : null, rune: showRune ? c.rune : null, lit: t.lit.includes(i), wrong: t.lastWrong === i })),
    vision,
    myClues: t.clues.flatMap((text, step) => (dm || finished || holders[step] === playerIndex ? [{ step, text }] : [])),
    holders,
    progress: t.lit.length,
    steps: ritualSteps,
    seals: t.seals,
    backfires: t.backfires,
    ...(dm || finished ? { order: [...t.order] } : {}),
  };
}
