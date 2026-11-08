// Lantai Ubin (2 pemain, asimetris): Pejalan melihat wajah ubin (lambang, angka, warna) tapi hanya yang bersebelahan (kabut)
// dan tidak tahu aturannya; Pemandu memegang aturan zona tapi tidak melihat ubin. Tiap langkah dibatasi waktu.
// Aturan dipakai server untuk menilai tiap langkah; jalur tidak pernah dikirim ke pemain. Jatuh/waktu habis = nyawa -1, papan diacak ulang.
export const tileCols = 6;
export const tileRows = 7;
export const tileLives = 3;
export const stepSecs = [50, 40, 30]; // batas waktu per langkah menurut zona Pejalan (countdown ala Knightmare)
export const tileGlyphs = ['●', '■', '▲', '◆', '✚', '★'];
export const tileNames = ['Lingkaran', 'Kotak', 'Segitiga', 'Wajik', 'Plus', 'Bintang'];
export const tileColors = ['Merah', 'Biru', 'Hijau', 'Kuning'];
export type Face = { s: number; n: number; c: number };
type NumRule = 'even' | 'odd' | 'm3' | 'gt5' | 'prime';
export type Cond = { k: 'sym'; v: number[] } | { k: 'num'; v: NumRule } | { k: 'col'; v: number[]; neg?: boolean } | { k: 'row'; v: 'even' | 'odd' };
export type Rule = Cond[]; // semua syarat harus terpenuhi (DAN)
export type TileState = { rules: Rule[]; faces: (Face | null)[]; path: number[]; pos: number; lives: number; falls: number; steps: number; lastWrong?: Face; visited: number[]; deadline: number; ruleTexts?: string[]; band?: number; now?: number };

const numOk: Record<NumRule, (n: number) => boolean> = { even: n => n % 2 === 0, odd: n => n % 2 === 1, m3: n => n % 3 === 0, gt5: n => n > 5, prime: n => [2, 3, 5, 7].includes(n) };
const numText: Record<NumRule, string> = { even: 'angkanya genap', odd: 'angkanya ganjil', m3: 'angkanya kelipatan 3', gt5: 'angkanya lebih dari 5', prime: 'angkanya bilangan prima' };
const numRules = Object.keys(numOk) as NumRule[];
export const rowNo = (cell: number) => tileRows - Math.floor(cell / tileCols); // nomor baris dari bawah: 1..7

export const condOk = (c: Cond, f: Face, cell: number) =>
  c.k === 'sym' ? c.v.includes(f.s) : c.k === 'num' ? numOk[c.v](f.n) : c.k === 'col' ? c.v.includes(f.c) !== !!c.neg : ((f.n + rowNo(cell)) % 2 === 0) === (c.v === 'even');
export const ruleOk = (r: Rule, f: Face, cell: number) => r.every(c => condOk(c, f, cell));
const condText = (c: Cond) => c.k === 'sym' ? `berlambang ${c.v.map(s => tileNames[s]).join(' atau ')}`
  : c.k === 'num' ? numText[c.v]
  : c.k === 'col' ? `${c.neg ? 'bukan ' : ''}berwarna ${c.v.map(x => tileColors[x]).join(' atau ')}`
  : `angkanya ditambah nomor baris (dari bawah) hasilnya ${c.v === 'even' ? 'genap' : 'ganjil'}`;
export const ruleText = (r: Rule) => r.map(condText).join(' DAN ');

// Zona dari bawah: 2 baris (1 syarat), 2 baris (2 syarat), 3 baris (3 syarat).
export const bandOf = (cell: number) => Math.min(2, (tileRows - 1 - Math.floor(cell / tileCols)) >> 1);
export const isSafe = (t: TileState, cell: number) => ruleOk(t.rules[bandOf(cell)], t.faces[cell]!, cell);
// Zona tertinggi yang bisa dinilai pada langkah berikutnya (ubin sebelah, termasuk ke atas). Pemandu harus sudah memegang aturannya, kalau tidak langkah tak adil.
export const reachBand = (pos: number) => Math.max(bandOf(pos), bandOf(Math.max(0, pos - tileCols)));
export const armTimer = (t: TileState) => { t.deadline = Date.now() + stepSecs[bandOf(t.pos)] * 1000; };

type Rnd = (max: number) => number;
const pick = (randomInt: Rnd, n: number, k: number) => { const a = Array.from({ length: n }, (_, i) => i); const out: number[] = []; while (out.length < k) out.push(a.splice(randomInt(a.length), 1)[0]); return out.sort(); };

function makePath(randomInt: Rnd) {
  const path: number[] = [];
  let col = randomInt(tileCols);
  for (let r = tileRows - 1; r >= 0; r--) {
    path.push(r * tileCols + col);
    if (r === 0) break;
    const to = randomInt(tileCols);
    while (col !== to) { col += Math.sign(to - col); path.push(r * tileCols + col); }
  }
  return path;
}

// Ubin jalur memenuhi semua syarat; 70% ubin jebakan "hampir benar" (melanggar tepat satu syarat) supaya tidak bisa disaring dengan satu atribut.
function makeFace(randomInt: Rnd, rule: Rule, cell: number, want: boolean): Face {
  const near = !want && rule.length > 1 && randomInt(10) < 7;
  for (let i = 0; i < 400; i++) {
    const f = { s: randomInt(6), n: 1 + randomInt(9), c: randomInt(4) };
    const hit = rule.filter(c => condOk(c, f, cell)).length;
    if (want ? hit === rule.length : hit < rule.length && (!near || hit === rule.length - 1)) return f;
  }
  for (let s = 0; s < 6; s++) for (let n = 1; n <= 9; n++) for (let c = 0; c < 4; c++) if (ruleOk(rule, { s, n, c }, cell) === want) return { s, n, c };
  throw new Error('aturan tidak punya wajah yang cocok');
}

export function rebuildBoard(t: TileState, randomInt: Rnd) {
  t.path = makePath(randomInt);
  t.faces = Array.from({ length: tileCols * tileRows }, (_, i) => makeFace(randomInt, t.rules[bandOf(i)], i, t.path.includes(i)));
  t.pos = t.path[0]; t.visited = [t.pos]; delete t.lastWrong;
  armTimer(t);
}

const sym = (r: Rnd, k: number): Cond => ({ k: 'sym', v: pick(r, 6, k) });
const col = (r: Rnd, k: number, neg = false): Cond => ({ k: 'col', v: pick(r, 4, k), ...(neg ? { neg: true } : {}) });
const num = (r: Rnd): Cond => ({ k: 'num', v: numRules[r(numRules.length)] });
const row = (r: Rnd): Cond => ({ k: 'row', v: r(2) ? 'even' : 'odd' });
// Tiap zona: satu pola dipilih acak dari kumpulan, jadi ronde berbeda-beda jenisnya (bukan "lambang -> angka -> semua" terus).
const patterns: ((r: Rnd) => Rule)[][] = [
  [r => [sym(r, 2)], r => [sym(r, 3)], r => [col(r, 2)], r => [col(r, 1, true)], r => [num(r)]],
  [r => [num(r), col(r, 1, true)], r => [sym(r, 3), num(r)], r => [col(r, 2), row(r)], r => [sym(r, 2), col(r, 1, true)], r => [num(r), row(r)]],
  [r => [sym(r, 3), row(r), col(r, 2)], r => [num(r), col(r, 2), sym(r, 4)], r => [num(r), row(r), col(r, 1, true)], r => [sym(r, 3), num(r), col(r, 1, true)], r => [col(r, 2), num(r), row(r)]],
];
// Aturan harus bisa dipenuhi di SETIAP ubin zonanya (syarat nomor baris bergantung pada barisnya, mis. "angka genap" + "angka+baris ganjil" mustahil di baris genap).
const satisfiable = (rule: Rule, band: number) => Array.from({ length: tileCols * tileRows }, (_, c) => c).filter(c => bandOf(c) === band).every(cell => {
  for (let s = 0; s < 6; s++) for (let n = 1; n <= 9; n++) for (let c = 0; c < 4; c++) if (ruleOk(rule, { s, n, c }, cell)) return true;
  return false;
});

export function newTiles(randomInt: Rnd): TileState {
  const rules: Rule[] = patterns.map((zone, band) => { for (let i = 0; i < 80; i++) { const r = zone[randomInt(zone.length)](randomInt); if (satisfiable(r, band)) return r; } return zone[0](randomInt); });
  const t: TileState = { rules, faces: [], path: [], pos: 0, lives: tileLives, falls: 0, steps: 0, visited: [], deadline: 0 };
  rebuildBoard(t, randomInt);
  return t;
}

// wrong kosong = waktu habis. Gagal di nyawa terakhir mengakhiri ronde.
export function tileFall(g: { phase: string; result: string }, t: TileState, randomInt: Rnd, wrong?: Face) {
  t.falls++; t.lives--;
  if (t.lives <= 0) { g.phase = 'finished'; g.result = 'lost'; } else { g.result = wrong ? 'fall' : 'timeout'; rebuildBoard(t, randomInt); }
  t.lastWrong = wrong;
}

export const adjacent = (a: number, b: number) =>
  Math.abs(Math.floor(a / tileCols) - Math.floor(b / tileCols)) + Math.abs((a % tileCols) - (b % tileCols)) === 1;

// Pejalan: hanya wajah ubin di sekitarnya (kabut). Pemandu: teks aturan sampai zona Pejalan saja. Penonton: tanpa rahasia. GM / ronde selesai: semuanya.
export function tilesView(t: TileState, role: 'guide' | 'walker' | 'other', dm: boolean, finished: boolean) {
  const now = Date.now();
  if (dm || finished) return { ...t, now, ruleTexts: t.rules.map(ruleText) };
  const { rules: _rules, faces, path: _path, ...open } = t;
  if (role === 'walker') return { ...open, now, faces: faces.map((f, i) => i === t.pos || adjacent(t.pos, i) ? f : null), band: bandOf(t.pos) };
  if (role === 'guide') return { ...open, now, band: bandOf(t.pos), ruleTexts: t.rules.slice(0, reachBand(t.pos) + 1).map(ruleText) };
  return { ...open, now };
}
