// Data publik Segel Sang Alkemis: tabel periodik dan teks petunjuk. Dipakai server dan klien.
// Kunci jawaban sengaja tidak ada di sini (lihat alchemy.ts) supaya tidak ikut terkirim ke browser pemain.

const names: [string, string][] = [
  ['H', 'Hidrogen'], ['He', 'Helium'], ['Li', 'Litium'], ['Be', 'Berilium'], ['B', 'Boron'], ['C', 'Karbon'], ['N', 'Nitrogen'], ['O', 'Oksigen'], ['F', 'Fluorin'], ['Ne', 'Neon'],
  ['Na', 'Natrium'], ['Mg', 'Magnesium'], ['Al', 'Aluminium'], ['Si', 'Silikon'], ['P', 'Fosfor'], ['S', 'Belerang'], ['Cl', 'Klorin'], ['Ar', 'Argon'], ['K', 'Kalium'], ['Ca', 'Kalsium'],
  ['Sc', 'Skandium'], ['Ti', 'Titanium'], ['V', 'Vanadium'], ['Cr', 'Kromium'], ['Mn', 'Mangan'], ['Fe', 'Besi'], ['Co', 'Kobalt'], ['Ni', 'Nikel'], ['Cu', 'Tembaga'], ['Zn', 'Seng'],
  ['Ga', 'Galium'], ['Ge', 'Germanium'], ['As', 'Arsen'], ['Se', 'Selenium'], ['Br', 'Bromin'], ['Kr', 'Kripton'], ['Rb', 'Rubidium'], ['Sr', 'Stronsium'], ['Y', 'Itrium'], ['Zr', 'Zirkonium'],
  ['Nb', 'Niobium'], ['Mo', 'Molibdenum'], ['Tc', 'Teknesium'], ['Ru', 'Rutenium'], ['Rh', 'Rodium'], ['Pd', 'Paladium'], ['Ag', 'Perak'], ['Cd', 'Kadmium'], ['In', 'Indium'], ['Sn', 'Timah'],
  ['Sb', 'Antimon'], ['Te', 'Telurium'], ['I', 'Iodin'], ['Xe', 'Xenon'], ['Cs', 'Sesium'], ['Ba', 'Barium'], ['La', 'Lantanum'], ['Ce', 'Serium'], ['Pr', 'Praseodimium'], ['Nd', 'Neodimium'],
  ['Pm', 'Prometium'], ['Sm', 'Samarium'], ['Eu', 'Europium'], ['Gd', 'Gadolinium'], ['Tb', 'Terbium'], ['Dy', 'Disprosium'], ['Ho', 'Holmium'], ['Er', 'Erbium'], ['Tm', 'Tulium'], ['Yb', 'Iterbium'],
  ['Lu', 'Lutesium'], ['Hf', 'Hafnium'], ['Ta', 'Tantalum'], ['W', 'Wolfram'], ['Re', 'Renium'], ['Os', 'Osmium'], ['Ir', 'Iridium'], ['Pt', 'Platina'], ['Au', 'Emas'], ['Hg', 'Raksa'],
  ['Tl', 'Talium'], ['Pb', 'Timbal'], ['Bi', 'Bismut'], ['Po', 'Polonium'], ['At', 'Astatin'], ['Rn', 'Radon'], ['Fr', 'Fransium'], ['Ra', 'Radium'], ['Ac', 'Aktinium'], ['Th', 'Torium'],
  ['Pa', 'Protaktinium'], ['U', 'Uranium'], ['Np', 'Neptunium'], ['Pu', 'Plutonium'], ['Am', 'Amerisium'], ['Cm', 'Kurium'], ['Bk', 'Berkelium'], ['Cf', 'Kalifornium'], ['Es', 'Einsteinium'], ['Fm', 'Fermium'],
  ['Md', 'Mendelevium'], ['No', 'Nobelium'], ['Lr', 'Lawrensium'], ['Rf', 'Rutherfordium'], ['Db', 'Dubnium'], ['Sg', 'Seaborgium'], ['Bh', 'Bohrium'], ['Hs', 'Hasium'], ['Mt', 'Meitnerium'], ['Ds', 'Darmstadtium'],
  ['Rg', 'Roentgenium'], ['Cn', 'Kopernisium'], ['Nh', 'Nihonium'], ['Fl', 'Flerovium'], ['Mc', 'Moskovium'], ['Lv', 'Livermorium'], ['Ts', 'Tenesin'], ['Og', 'Oganeson'],
];

export type Category = 'alkali' | 'alkaline' | 'transition' | 'post' | 'metalloid' | 'nonmetal' | 'halogen' | 'noble' | 'lanthanide' | 'actinide';
export const categoryNames: Record<Category, string> = {
  alkali: 'Logam alkali', alkaline: 'Logam alkali tanah', transition: 'Logam transisi', post: 'Logam pasca-transisi', metalloid: 'Metaloid',
  nonmetal: 'Nonlogam', halogen: 'Halogen', noble: 'Gas mulia', lanthanide: 'Lantanida', actinide: 'Aktinida',
};
export type Element = { z: number; symbol: string; name: string; period: number; group: number | null; row: number; col: number; category: Category; state: 'padat' | 'cair' | 'gas' | 'tidak diketahui' };

const has = (list: number[], z: number) => list.includes(z);
function categoryOf(z: number): Category {
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if (has([3, 11, 19, 37, 55, 87], z)) return 'alkali';
  if (has([4, 12, 20, 38, 56, 88], z)) return 'alkaline';
  if (has([2, 10, 18, 36, 54, 86, 118], z)) return 'noble';
  if (has([9, 17, 35, 53, 85, 117], z)) return 'halogen';
  if (has([5, 14, 32, 33, 51, 52], z)) return 'metalloid';
  if (has([1, 6, 7, 8, 15, 16, 34], z)) return 'nonmetal';
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return 'transition';
  return 'post';
}
function placeOf(z: number): { period: number; group: number | null; row: number; col: number } {
  if (z <= 2) return { period: 1, group: z === 1 ? 1 : 18, row: 1, col: z === 1 ? 1 : 18 };
  const starts = [3, 11, 19, 37, 55, 87];
  const period = 2 + starts.filter(s => z >= s).length - 1;
  const i = z - starts[period - 2];
  if (period <= 3) { const group = i < 2 ? i + 1 : i + 11; return { period, group, row: period, col: group }; }
  if (period <= 5) return { period, group: i + 1, row: period, col: i + 1 };
  // Periode 6 dan 7: lantanida/aktinida dipisah ke dua baris bawah (baris 9 dan 10).
  if (i < 2) return { period, group: i + 1, row: period, col: i + 1 };
  if (i < 17) return { period, group: null, row: period + 3, col: i + 1 };
  return { period, group: i - 13, row: period, col: i - 13 };
}
const gases = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86];
export const elements: Element[] = names.map(([symbol, name], i) => {
  const z = i + 1;
  return { z, symbol, name, ...placeOf(z), category: categoryOf(z), state: gases.includes(z) ? 'gas' : z === 35 || z === 80 ? 'cair' : z >= 100 ? 'tidak diketahui' : 'padat' };
});

export type SealInfo = { title: string; intro: string; clues: string[]; slots: number };
export const sealInfo: SealInfo[] = [
  {
    title: 'Segel Pertama · Tiga Teka-teki',
    intro: 'Tiga unsur terkunci di segel ini. Temukan ketiganya, lalu susun dari nomor atom terkecil ke terbesar.',
    clues: [
      'Satu-satunya nonlogam padat di periode 2.',
      'Gas mulia yang berada tepat di bawah tetangga kanan fluorin.',
      'Halogen padat yang simbolnya hanya satu huruf.',
    ],
    slots: 3,
  },
  {
    title: 'Segel Kedua · Jejak Bersyarat',
    intro: 'Setiap baris memberi titik awal dan cara bergerak di tabel. Unsur tempat kalian berhenti adalah jawaban baris itu. Susun jawaban sesuai urutan baris.',
    clues: [
      'Mulai dari logam alkali di periode 5. Naiklah terus, dan berhentilah tepat sebelum kalian menginjak unsur yang bukan logam.',
      'Mulai dari tetangga kanan natrium. Naik satu kotak, lalu bergeraklah ke kiri sampai tidak bisa bergerak lagi.',
      'Mulai dari nonlogam padat golongan 16 di periode 3. Naiklah sampai menginjak gas, lalu bergeraklah ke kiri sampai menginjak gas berikutnya.',
    ],
    slots: 3,
  },
  {
    title: 'Segel Ketiga · Dua Logam',
    intro: 'Dua unsur logam menutup segel terakhir. Kalian butuh jawaban dua segel sebelumnya.',
    clues: [
      'Salah satunya segolongan dengan besi.',
      'Unsur yang segolongan dengan besi itu seperiode dengan unsur terakhir di Segel Pertama.',
      'Unsur yang lain segolongan dengan unsur terakhir di Segel Kedua.',
      'Unsur yang lain itu seperiode dengan emas.',
      'Unsur dengan nomor atom lebih besar diletakkan lebih dulu.',
    ],
    slots: 2,
  },
];
