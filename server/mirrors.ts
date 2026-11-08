// Ruang Cermin Cahaya (kerja sama, 2–6 pemain).
// Party masuk ke tiga ruangan dungeon. Di tiap ruangan, berkas cahaya dari kristal sumber harus diarahkan
// ke rune di pintu dengan memutar cermin miring di lantai. Setiap cermin punya pemilik: hanya pemiliknya yang
// bisa memutarnya, dan cermin penting dibagi rata, jadi tidak ada yang bisa menyelesaikan ruangan sendirian.
// Tidak ada hukuman kalah: tiap ruangan diberi 1–3 bintang menurut hemat-tidaknya putaran cermin.
//
// Peta ruangan: '.' lantai, '#' pilar, 'M' cermin, 'C' kristal penguat (harus dilewati cahaya), 'T' rune pintu,
// 'R' 'L' 'U' 'D' kristal sumber yang memancar ke kanan/kiri/atas/bawah.
export type MirrorDir = '/' | '\\';
export type Room = { name: string; story: string; map: string[] };
export const mirrorRooms: Room[] = [
  {
    name: 'Lorong Kristal',
    story: 'Seberkas cahaya memancar dari kristal di dinding. Pintu batu di ujung lorong hanya terbuka bila runenya tersentuh cahaya.',
    map: [
      '.........',
      'R...M.#..',
      '......M..',
      '.......M.',
      '..M......',
      '....M...T',
      '.........',
    ],
  },
  {
    name: 'Aula Penguat',
    story: 'Cahaya dari sumber ini terlalu redup. Arahkan ia melewati kristal penguat di tengah aula sebelum mencapai pintu.',
    map: [
      '.......T.',
      '..M.C..M.',
      '.M.......',
      '....M#M..',
      '....#....',
      'R.M..M#..',
      '.........',
    ],
  },
  {
    name: 'Gerbang Kembar',
    story: 'Dua kristal, dua pintu. Gerbang terakhir hanya terbuka bila kedua rune menyala bersamaan.',
    map: [
      'D..M....T',
      '.#M..M#..',
      '.........',
      'M..MM...M',
      '.M....M..',
      '..#...#..',
      'T...M...U',
    ],
  },
];
export const mirrorMinPlayers = 2;
export const mirrorMaxPlayers = 6;

export type Mirror = { x: number; y: number; dir: MirrorDir; owner: number };
export type MirrorState = {
  room: number;
  mirrors: Mirror[];
  rotations: number;
  par: number;          // putaran minimum dari posisi awal ruangan ini
  cleared: boolean;
  stars: number[];      // bintang per ruangan yang sudah selesai
  log: string[];
};
export type Beam = { points: [number, number][]; hits: string[] }; // hits: 'T@x,y' dan 'C@x,y'

type Rnd = (max: number) => number;
type GameLike = { phase: string; result: string; players: string[]; scores: Record<string, number>; mirrors?: MirrorState };

const dirs: Record<string, [number, number]> = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
const reflect = (dir: MirrorDir, [dx, dy]: [number, number]): [number, number] => (dir === '/' ? [-dy, -dx] : [dy, dx]);
const cellAt = (map: string[], x: number, y: number) => map[y]?.[x];

// Telusuri semua berkas cahaya di ruangan. Cahaya berhenti di pilar, sumber, tepi ruangan, atau rune pintu.
export function traceBeams(map: string[], mirrors: { x: number; y: number; dir: MirrorDir }[]): Beam[] {
  const at = new Map(mirrors.map(m => [`${m.x},${m.y}`, m.dir]));
  const beams: Beam[] = [];
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!dirs[ch]) return;
    let [dx, dy] = dirs[ch];
    let cx = x, cy = y;
    const points: [number, number][] = [[x, y]];
    const hits: string[] = [];
    const seen = new Set<string>();
    for (let guard = 0; guard < 200; guard++) {
      cx += dx; cy += dy;
      const c = cellAt(map, cx, cy);
      if (c === undefined) { points.push([cx - dx * 0.5, cy - dy * 0.5]); break; }
      if (c === '#' || dirs[c]) { points.push([cx - dx * 0.5, cy - dy * 0.5]); break; }
      if (c === 'T') { points.push([cx, cy]); hits.push(`T@${cx},${cy}`); break; }
      if (c === 'C' && !hits.includes(`C@${cx},${cy}`)) hits.push(`C@${cx},${cy}`);
      const m = at.get(`${cx},${cy}`);
      if (m) {
        const key = `${cx},${cy},${dx},${dy}`;
        if (seen.has(key)) break;
        seen.add(key);
        points.push([cx, cy]);
        [dx, dy] = reflect(m, [dx, dy]);
      }
    }
    beams.push({ points, hits });
  }));
  return beams;
}

const targetsOf = (map: string[]) => map.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === 'T' ? [`T@${x},${y}`] : [])));
const crystalsOf = (map: string[]) => map.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === 'C' ? [`C@${x},${y}`] : [])));
// Ruangan selesai bila setiap rune pintu tersentuh cahaya dan setiap kristal penguat dilewati cahaya yang sampai ke pintu.
export function isSolved(map: string[], mirrors: { x: number; y: number; dir: MirrorDir }[]) {
  const beams = traceBeams(map, mirrors);
  const reaching = beams.filter(b => b.hits.some(h => h.startsWith('T@')));
  const lit = new Set(reaching.flatMap(b => b.hits));
  return targetsOf(map).every(t => lit.has(t)) && crystalsOf(map).every(c => lit.has(c));
}

const slotsOf = (map: string[]) => map.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === 'M' ? [{ x, y }] : [])));
const withBits = (slots: { x: number; y: number }[], bits: number) => slots.map((s, i) => ({ ...s, dir: ((bits >> i) & 1 ? '\\' : '/') as MirrorDir }));
// Semua susunan cermin yang menyelesaikan ruangan (cermin ≤ 12, jadi cukup dicoba semuanya).
export function solutions(map: string[]) {
  const slots = slotsOf(map);
  const out: number[] = [];
  for (let bits = 0; bits < 1 << slots.length; bits++) if (isSolved(map, withBits(slots, bits))) out.push(bits);
  return out;
}
const popcount = (n: number) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };

function setupRoom(t: MirrorState, room: number, players: number, r: Rnd) {
  const map = mirrorRooms[room].map;
  const slots = slotsOf(map);
  const sols = solutions(map);
  // Cermin kunci = cermin yang dilalui cahaya pada susunan jawaban pertama. Dibagi rata ke semua pemain.
  const key = new Set(traceBeams(map, withBits(slots, sols[0])).flatMap(b => b.points.map(([x, y]) => `${x},${y}`)));
  const keyIdx = slots.map((s, i) => (key.has(`${s.x},${s.y}`) ? i : -1)).filter(i => i >= 0);
  const owners = slots.map(() => r(players));
  const offset = r(players);
  keyIdx.map(i => ({ i, k: r(1000) })).sort((a, b) => a.k - b.k).forEach(({ i }, n) => { owners[i] = (n + offset) % players; });
  // Posisi awal acak, tapi minimal tiga putaran dari jawaban terdekat supaya tidak selesai tanpa berpikir.
  let bits = 0, par = 0;
  for (let tries = 0; tries < 500; tries++) {
    bits = r(1 << slots.length);
    par = Math.min(...sols.map(s => popcount(s ^ bits)));
    if (par >= Math.min(3, keyIdx.length)) break;
  }
  t.room = room;
  t.mirrors = withBits(slots, bits).map((m, i) => ({ ...m, owner: owners[i] }));
  t.rotations = 0;
  t.par = par;
  t.cleared = false;
}

export function newMirrors(players: number, r: Rnd): MirrorState {
  const t: MirrorState = { room: 0, mirrors: [], rotations: 0, par: 0, cleared: false, stars: [], log: [] };
  setupRoom(t, 0, players, r);
  return t;
}

export const starsFor = (rotations: number, par: number) => (rotations <= par + 2 ? 3 : rotations <= par + 6 ? 2 : 1);
function note(t: MirrorState, text: string) { t.log = [text, ...t.log].slice(0, 10); }

export function mirrorAction(game: GameLike, playerId: string, action: Record<string, unknown>, r: Rnd | undefined, name: (i: number) => string): string | null {
  const t = game.mirrors;
  if (!t || game.phase !== 'open') return 'Ruangan belum dibuka.';
  const me = game.players.indexOf(playerId);
  if (me < 0) return 'Kamu bukan peserta penjelajahan ini.';

  if (action.type === 'mirror:rotate') {
    if (t.cleared) return 'Pintu sudah terbuka. Lanjut ke ruangan berikutnya.';
    const i = action.index;
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= t.mirrors.length) return 'Cermin tidak dikenal.';
    if (t.mirrors[i].owner !== me) return 'Itu cermin milik temanmu. Minta dia yang memutarnya.';
    t.mirrors[i].dir = t.mirrors[i].dir === '/' ? '\\' : '/';
    t.rotations++;
    if (isSolved(mirrorRooms[t.room].map, t.mirrors)) {
      t.cleared = true;
      const stars = starsFor(t.rotations, t.par);
      t.stars[t.room] = stars;
      note(t, `${name(me)} memutar cermin terakhir. Pintu ${mirrorRooms[t.room].name} terbuka dengan ${stars} bintang!`);
      if (t.room === mirrorRooms.length - 1) {
        game.phase = 'finished';
        game.result = 'win';
        const total = t.stars.reduce((a, b) => a + b, 0);
        for (const id of game.players) game.scores[id] = (game.scores[id] || 0) + total;
      } else game.result = 'cleared';
    } else game.result = 'rotate';
    return null;
  }

  if (action.type === 'mirror:next') {
    if (!t.cleared || t.room >= mirrorRooms.length - 1) return 'Pintu ruangan ini belum terbuka.';
    if (!r) return 'Pembuat acak tidak tersedia.';
    setupRoom(t, t.room + 1, game.players.length, r);
    note(t, `Party memasuki ${mirrorRooms[t.room].name}.`);
    game.result = 'next';
    return null;
  }

  return 'Aksi tidak dikenal.';
}
