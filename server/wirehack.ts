// Retas Panel Kabel (1 pemain, ala peretasan tegangan GTA Online: Cayo Perico).
// Di kiri ada beberapa angka, di kanan ada pengali. Sambungkan setiap angka ke satu pengali dengan kabel,
// sampai jumlah semua hasil kali sama persis dengan tegangan target. Total sementara tidak ditampilkan:
// peretas harus menghitung sendiri, lalu menekan Kirim. Salah kirim atau waktu habis memicu alarm.
// Tiga panel dengan tingkat kesulitan naik. Tiga alarm berarti peretasan gagal.
export const wireStages = [
  { mults: [1, 2, 10], secs: 45 },
  { mults: [1, 5, 10], secs: 40 },
  { mults: [1, 2, 5, 10], secs: 50 },
];
export const wireLives = 3;

export type WirePanel = { values: number[]; mults: number[]; target: number };
export type WireState = {
  stage: number;
  panel: WirePanel;
  links: (number | null)[];  // links[i] = indeks pengali yang tersambung ke angka ke-i
  lives: number;
  deadline: number;
  now?: number;
  last?: { ok: boolean; got: number; target: number; reason: 'wrong' | 'timeout' };
  solution?: number[];       // hanya untuk GM
};

type Rnd = (max: number) => number;
type GameLike = { phase: string; result: string; players: string[]; scores: Record<string, number>; wirehack?: WireState };

const permutations = (n: number): number[][] => (n <= 1 ? [[0]] : permutations(n - 1).flatMap(p => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)])));
export const voltage = (panel: WirePanel, links: (number | null)[]) => panel.values.reduce((sum, v, i) => sum + (links[i] === null || links[i] === undefined ? 0 : v * panel.mults[links[i]!]), 0);

// Panel acak dengan tepat satu cara sambung yang benar, supaya peretas bisa menalar jawabannya.
export function makePanel(stage: number, r: Rnd): { panel: WirePanel; solution: number[] } {
  const base = wireStages[stage].mults;
  for (let tries = 0; tries < 500; tries++) {
    const mults = [...base];
    for (let i = mults.length - 1; i > 0; i--) { const j = r(i + 1); [mults[i], mults[j]] = [mults[j], mults[i]]; }
    const values = base.map(() => 1 + r(9));
    if (new Set(values).size !== values.length) continue;
    const perms = permutations(values.length);
    const solution = perms[r(perms.length)];
    const target = voltage({ values, mults, target: 0 }, solution);
    const matching = perms.filter(p => voltage({ values, mults, target }, p) === target);
    if (matching.length === 1) return { panel: { values, mults, target }, solution };
  }
  throw new Error('Panel kabel tidak bisa dibuat.');
}

function setupStage(t: WireState, stage: number, r: Rnd, now: number) {
  const { panel, solution } = makePanel(stage, r);
  t.stage = stage;
  t.panel = panel;
  t.solution = solution;
  t.links = panel.values.map(() => null);
  t.deadline = now + wireStages[stage].secs * 1000;
}

export function newWires(r: Rnd, now = Date.now()): WireState {
  const t = { stage: 0, panel: { values: [], mults: [], target: 0 }, links: [], lives: wireLives, deadline: 0 } as WireState;
  setupStage(t, 0, r, now);
  return t;
}

function alarm(game: GameLike, t: WireState, r: Rnd, reason: 'wrong' | 'timeout', now: number) {
  t.lives--;
  t.last = { ok: false, got: voltage(t.panel, t.links), target: t.panel.target, reason };
  if (t.lives <= 0) { game.phase = 'finished'; game.result = 'lost'; return; }
  game.result = reason;
  setupStage(t, t.stage, r, now); // panel baru di tahap yang sama
}

export function wireAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>, r: Rnd | undefined, now = Date.now()): string | null {
  const t = game.wirehack;
  if (!t || game.phase !== 'open') return 'Peretasan belum dimulai.';
  if (!r) return 'Pembuat acak tidak tersedia.';
  const hacker = game.players[0] === playerId;

  if (action.type === 'wire:timeout') {
    if (!hacker && !dm) return 'Hanya peretas yang bisa melaporkan waktu habis.';
    if (now < t.deadline - 300) return null; // laporan terlalu cepat, abaikan
    alarm(game, t, r, 'timeout', now);
    return null;
  }
  if (!hacker) return 'Hanya peretas yang memegang kabel.';
  if (now > t.deadline + 1500) { alarm(game, t, r, 'timeout', now); return null; }

  if (action.type === 'wire:link') {
    const from = action.from, to = action.to;
    if (typeof from !== 'number' || !Number.isInteger(from) || from < 0 || from >= t.links.length) return 'Terminal tidak dikenal.';
    if (to === null) { t.links[from] = null; return null; }
    if (typeof to !== 'number' || !Number.isInteger(to) || to < 0 || to >= t.panel.mults.length) return 'Terminal tidak dikenal.';
    // Satu pengali hanya menerima satu kabel: kabel lama di pengali itu dilepas.
    t.links = t.links.map((l, i) => (i !== from && l === to ? null : l));
    t.links[from] = to;
    game.result = 'link';
    return null;
  }

  if (action.type === 'wire:submit') {
    if (t.links.some(l => l === null)) return 'Sambungkan semua kabel dulu.';
    const got = voltage(t.panel, t.links);
    if (got !== t.panel.target) { alarm(game, t, r, 'wrong', now); return null; }
    t.last = { ok: true, got, target: t.panel.target, reason: 'wrong' };
    if (t.stage === wireStages.length - 1) {
      game.phase = 'finished';
      game.result = 'win';
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    } else {
      game.result = 'cracked';
      setupStage(t, t.stage + 1, r, now);
    }
    return null;
  }

  return 'Aksi tidak dikenal.';
}

export function wireView(t: WireState, dm: boolean, finished: boolean, now = Date.now()): WireState {
  const { solution, ...open } = t;
  return { ...open, links: [...t.links], panel: { ...t.panel, values: [...t.panel.values], mults: [...t.panel.mults] }, now, ...(dm || finished ? { solution } : {}) };
}
