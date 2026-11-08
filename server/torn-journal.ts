// Jurnal Terkoyak: 10 halaman jurnal tercampur. Urutan benar hanya ada di server.
// moon (0 baru .. 4 purnama), salt (genggam) dan fog (2 tebal .. 0 hilang) tidak pernah dikirim ke klien; dipakai tes untuk membuktikan solusi tunggal.
export type JournalSource = { first: string; text: string; link: string | null; moon: number; salt: number; fog: number };
export const smudged = '▒▒▒▒▒';
export const journalSource: JournalSource[] = [
  { first: 'Pagi', text: 'Pagi buta kami meninggalkan pelabuhan. Sabit muda yang tipis menggantung di barat. Kantong garam masih penuh, sembilan genggam, dan kabut tebal menutup jalan setapak.', link: 'Bukit', moon: 1, salt: 9, fog: 2 },
  { first: 'Bukit', text: 'Bukit pertama kami daki sebelum siang. Sabit muda itu belum banyak berubah. Garam tinggal delapan genggam setelah kami mengawetkan ikan, dan kabut masih tebal.', link: 'Sungai', moon: 1, salt: 8, fog: 2 },
  { first: 'Sungai', text: 'Sungai lebar menghentikan langkah kami. Malam itu bulan tampak separuh. Tujuh genggam garam tersisa, dan kabut tetap tebal di atas permukaan air.', link: smudged, moon: 2, salt: 7, fog: 2 },
  { first: 'Jembatan', text: 'Jembatan tali yang rapuh membawa kami ke seberang. Bulan masih separuh, garam tinggal enam genggam, dan kabut mulai menipis menjadi sedang.', link: 'Hutan', moon: 2, salt: 6, fog: 1 },
  { first: 'Hutan', text: 'Hutan bambu berdesir di kedua sisi jalan. Bulan mulai menggembung. Lima genggam garam tersisa, dan kabut sedang bergerak di antara batang-batang bambu.', link: 'Gua', moon: 3, salt: 5, fog: 1 },
  { first: 'Gua', text: 'Gua di kaki tebing memberi kami tempat berteduh. Bulan masih menggembung, garam tinggal empat genggam, dan kabut sedang menggantung di mulut gua.', link: smudged, moon: 3, salt: 4, fog: 1 },
  { first: 'Tangga', text: 'Tangga batu yang panjang menanjak sampai ke atas awan. Bulan masih menggembung. Garam tinggal tiga genggam, dan kabut akhirnya hilang sama sekali.', link: 'Menara', moon: 3, salt: 3, fog: 0 },
  { first: 'Menara', text: 'Menara tua berdiri di puncak, dan bulan purnama menerangi seluruh batunya. Garam tinggal dua genggam, dan langit cerah tanpa kabut.', link: 'Lonceng', moon: 4, salt: 2, fog: 0 },
  { first: 'Lonceng', text: 'Lonceng perunggu tergantung di ruangan paling atas. Purnama masih penuh. Garam tinggal satu genggam, dan udara sangat jernih.', link: 'Akhirnya', moon: 4, salt: 1, fog: 0 },
  { first: 'Akhirnya', text: 'Akhirnya kami membunyikan lonceng itu. Purnama bersinar, kantong garam kosong, dan tidak ada kabut. Perjalanan kami selesai di sini.', link: null, moon: 4, salt: 0, fog: 0 },
];
export type JournalPage = { id: string; text: string; foot: string };
export type JournalState = { pages: JournalPage[]; solution: string[]; attempts: number; order?: string[] };
export const journalPageCount = journalSource.length;

export function newJournal(randomInt: (max: number) => number, attempts = 0): JournalState {
  const order = journalSource.map((_, i) => i);
  do {
    for (let i = order.length - 1; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  } while (order.every((n, i) => n === i));
  const ids = 'ABCDEFGHIJ';
  const pages = order.map((n, slot) => ({ id: ids[slot], text: journalSource[n].text, foot: journalSource[n].link === null ? '' : `Kata sambung: ${journalSource[n].link}` }));
  const solution = journalSource.map((_, truth) => ids[order.indexOf(truth)]);
  return { pages, solution, attempts };
}

export function checkJournal(journal: JournalState, order: unknown): 'invalid' | 'wrong' | 'right' {
  if (!Array.isArray(order) || order.length !== journalPageCount || !order.every(id => typeof id === 'string') || new Set(order).size !== order.length || !order.every(id => journal.pages.some(p => p.id === id))) return 'invalid';
  return order.every((id, i) => id === journal.solution[i]) ? 'right' : 'wrong';
}

export function journalView(journal: JournalState, dm: boolean, finished: boolean) {
  const { solution, ...rest } = journal;
  return dm || finished ? journal : rest;
}
