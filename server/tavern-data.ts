// Data publik Tagihan Sang Pengelana: menu, Aturan Rumah, dan teks nota. Dipakai server dan klien.
// Kunci jawaban sengaja tidak ada di sini (lihat tavern.ts) supaya tidak ikut terkirim ke browser pemain.
// Semua harga disimpan dalam cp. 1 gp = 10 sp = 100 cp.

export type MenuItem = { id: string; name: string; note: string; cp: number; kind: 'food' | 'drink' | 'stay' };
export const tavernMenu: { section: string; items: MenuItem[] }[] = [
  { section: 'Hidangan', items: [
    { id: 'bread', name: 'Roti Gandum Hitam', note: 'hangat dari tungku', cp: 2, kind: 'food' },
    { id: 'soup', name: 'Sup Jamur Gua', note: 'jamur Underdark, garam hitam', cp: 30, kind: 'food' },
    { id: 'fish', name: 'Ikan Asap Danau', note: 'ditangkap pagi ini', cp: 50, kind: 'food' },
    { id: 'pie', name: 'Pai Daging Domba', note: 'resep nenek pemilik', cp: 60, kind: 'food' },
    { id: 'boar', name: 'Panggang Babi Hutan', note: 'porsi pemburu', cp: 80, kind: 'food' },
  ] },
  { section: 'Minuman', items: [
    { id: 'tea', name: 'Teh Rempah', note: 'kayu manis & cengkih', cp: 3, kind: 'drink' },
    { id: 'ale', name: 'Ale Kurcaci', note: 'segelas penuh busa', cp: 4, kind: 'drink' },
    { id: 'mead', name: 'Mead Madu', note: 'manis, menghangatkan', cp: 15, kind: 'drink' },
    { id: 'wine', name: 'Anggur Elf', note: 'sebotol kecil', cp: 100, kind: 'drink' },
  ] },
  { section: 'Penginapan', items: [
    { id: 'stable', name: 'Kandang Kuda', note: 'per kuda, per malam', cp: 10, kind: 'stay' },
    { id: 'bath', name: 'Mandi Air Panas', note: 'per orang', cp: 20, kind: 'stay' },
    { id: 'shared', name: 'Kamar Bersama', note: 'per orang, per malam', cp: 50, kind: 'stay' },
    { id: 'private', name: 'Kamar Pribadi', note: 'per kamar, per malam', cp: 200, kind: 'stay' },
  ] },
];

export const houseRules = [
  'Hari Selasa: Ale Kurcaci setengah harga. Ale tidak ikut promo lain.',
  'Promo Tiga Piring: setiap 3 porsi hidangan yang sama, 1 porsi gratis. Hanya untuk hidangan, bukan minuman.',
  'Lencana Guild: potongan 10% dari total hidangan, dihitung setelah Promo Tiga Piring.',
  'Tip pelayan wajib: 5 cp per tamu.',
  'Gelas pecah dikenakan denda 8 cp per gelas.',
];

export type TavernNoteText = { title: string; signed: string; day: string; text: string; ask: string };
export const tavernNoteText: TavernNoteText[] = [
  {
    title: 'Nota Meja Panjang', signed: 'Brakka, Kapak Besi', day: 'Selasa',
    text: 'Kami berlima, tanpa lencana guild. Setiap orang minum 2 Ale Kurcaci. Tiga orang makan Panggang Babi Hutan, dua sisanya makan Sup Jamur Gua. Kami tidak menginap.',
    ask: 'Berapa cp total tagihan kami?',
  },
  {
    title: 'Nota Sang Penyihir', signed: 'Ilvara Bintang Kelabu', day: 'Kamis',
    text: 'Aku datang sendiri bersama dua kuda, dan aku anggota guild. Aku makan Pai Daging Domba dan Ikan Asap Danau, minum Anggur Elf dan 2 Teh Rempah. Aku menginap 2 malam di Kamar Pribadi, dan kedua kudaku di kandang selama 2 malam itu. Aku membayar dengan 10 gp.',
    ask: 'Berapa cp kembalianku?',
  },
  {
    title: 'Nota Tiga Saudara', signed: 'Keluarga Thornbury', day: 'Selasa',
    text: 'Kami bertiga menginap 1 malam di Kamar Bersama, dan masing-masing mandi air panas. Kami memesan 3 Mead Madu dan 6 Ale Kurcaci, lalu adik kami memecahkan satu gelas. Masing-masing makan Roti Gandum Hitam dan Pai Daging Domba. Tagihan kami bagi rata bertiga.',
    ask: 'Berapa cp yang dibayar tiap orang?',
  },
];

export const tavernChances = 4;
