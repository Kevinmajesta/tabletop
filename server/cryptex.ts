// Sandi Cryptex: Teka-teki sandi untuk D&D Scavenger Hunt tanpa sandi Morse atau angka A-Z.
// Menggunakan Sandi Pagar (Rail Fence), Sandi Cermin Kata, Sandi Akrostik Bait, dan Sandi Sisipan Ganjil.

export type CryptexChamber = {
  id: string;
  title: string;
  lore: string;
  method: string;
  clue: string;
  cipher: string;
  verse?: string[];
  answer: string;
  reward: string;
};

export type CryptexState = {
  chamber: CryptexChamber;
  attempts: number;
  draft?: string;
};

export const cryptexChambers: CryptexChamber[] = [
  {
    id: 'pagar',
    title: 'Kamar I · Sandi Pagar Tiga Bilah',
    lore: 'Di reruntuhan makam kuno terpahat tiga bilah pagar besi. Sang penjaga memahat aksara rahasia meliuk naik-turun pada tiga bilah rel tersebut. Pecahkan sandi untuk membuka silinder Cryptex.',
    method: 'Sandi Pagar (Rail Fence 3 Rel)',
    clue: 'Susun aksara secara zig-zag pada 3 rel pagar (Rel 1 -> Rel 2 -> Rel 3 -> Rel 2 -> Rel 1...). Baca mendatar dari kiri ke kanan untuk menemukan nama kunci pusaka.',
    cipher: 'KIS UCEA NM',
    answer: 'KUNCI EMAS',
    reward: '📜 Berkas Rahasia Perburuan: "Silinder Cryptex berputar dan terlepas! Di dalamnya ditemukan Perkamen Emas: Peta makam kuno menunjuk Altar Tersembunyi di balik air terjun barat laut."'
  },
  {
    id: 'cermin',
    title: 'Kamar II · Sandi Cermin Perak',
    lore: 'Prasasti ruang pemburu dilapisi kristal perak yang memantulkan bayangan. Huruf pada setiap kata terbalik arahnya seperti bayangan di atas cermin air tenang.',
    method: 'Sandi Cermin Pantulan · Balik Huruf Tiap Kata',
    clue: 'Balikkan susunan huruf pada masing-masing kata (baca dari huruf terakhir ke huruf awal tiap kata). Urutan kata dalam kalimat tetap sama.',
    cipher: 'GNADEP KAREP ONUK',
    answer: 'PEDANG PERAK KUNO',
    reward: '📜 Berkas Rahasia Perburuan: "Silinder Cryptex terbuka perlahan! Di dalamnya tersimpan Segel Perak sang Pahlawan untuk membuka Gerbang Besi Menara Kabut."'
  },
  {
    id: 'akrostik',
    title: 'Kamar III · Bait Akrostik Pahlawan',
    lore: 'Tujuh baris kidung kepahlawanan dipahat pada dinding batu pualam. Aksara pertama dari setiap baris syair merangkai nama mustika yang dicari dalam perburuan harta.',
    method: 'Sandi Akrostik · Huruf Awal Tiap Baris',
    clue: 'Ambil huruf pertama dari setiap baris syair dari atas ke bawah untuk menyusun kata sandi rahasia.',
    cipher: 'MAHKOTA (7 bait syair)',
    verse: [
      'Malam dingin menyelimuti puncak kabut batu,',
      'Angin utara berbisik membawa rahasia leluhur,',
      'Hanya petualang berani yang sanggup melangkah maju,',
      'Keringat dan darah tertumpah demi sebuah janji,',
      'Obor menyala menerangi jalan lorong tersembunyi,',
      'Takhta para raja menunggu pewaris yang sejati,',
      'Api suci membakar kegelapan untuk selamanya.'
    ],
    answer: 'MAHKOTA',
    reward: '📜 Berkas Rahasia Perburuan: "Gigi roda Cryptex mengunci pas! Tabung membuka dan menampakkan Permata Delima untuk dipasang pada Mahkota Raja Elang."'
  },
  {
    id: 'ganjil',
    title: 'Kamar IV · Sandi Sisipan Pengelana',
    lore: 'Gulungan catatan sang pengelana dipenuhi huruf-huruf palsu yang disisipkan pada setiap posisi genap untuk mengelabui mata penjarah makam.',
    method: 'Sandi Sisipan Posisi Ganjil (1, 3, 5, 7...)',
    clue: 'Aksara asli berada di posisi urutan ganjil (ke-1, ke-3, ke-5, ke-7, dst). Singkirkan semua aksara di posisi genap.',
    cipher: 'TX OZ NP GD KB AL TY SX IW HV IQ RM',
    answer: 'TONGKAT SIHIR',
    reward: '📜 Berkas Rahasia Perburuan: "Pasak kuningan berdentang dan Cryptex terlepas! Di dalamnya tersimpan Gulungan Mantra Teleportasi menuju Sarang Naga."'
  }
];

export function newCryptex(randomInt: (max: number) => number): CryptexState {
  const index = randomInt(cryptexChambers.length);
  return { chamber: { ...cryptexChambers[index] }, attempts: 0 };
}

export function normalizeCryptexAnswer(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function checkCryptex(cryptex: CryptexState, guess: unknown): boolean {
  if (typeof guess !== 'string') return false;
  return normalizeCryptexAnswer(guess) === normalizeCryptexAnswer(cryptex.chamber.answer);
}

export function cryptexView(cryptex: CryptexState, dm: boolean, finished: boolean) {
  const { chamber, ...rest } = cryptex;
  if (dm || finished) return cryptex;
  const { answer: _answer, reward: _reward, ...safeChamber } = chamber;
  return { ...rest, chamber: safeChamber as CryptexChamber };
}
