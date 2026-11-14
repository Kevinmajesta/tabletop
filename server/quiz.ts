// Ujian Sang Sphinx (2 pemain, satu tim).
// Seorang NPC (Sphinx penjaga gerbang) mengajukan 10 pertanyaan pengetahuan umum pilihan ganda.
// Dua peserta yang dideklarasikan GM menjawab bersama: siapa pun boleh menandai pilihan (terlihat oleh rekannya),
// lalu salah satu mengunci jawaban. Tidak ada batas salah; skor akhir menentukan apakah Sphinx membuka gerbang.
// Kunci jawaban hanya di server: klien hanya menerima soal yang sedang/sudah ditanyakan.

export type QuizQuestion = { q: string; options: [string, string, string, string]; topic: string }; // options[0] = jawaban benar
export const quizBank: QuizQuestion[] = [
  { topic: 'Antariksa', q: 'Planet apa yang terbesar di tata surya kita?', options: ['Jupiter', 'Saturnus', 'Neptunus', 'Uranus'] },
  { topic: 'Antariksa', q: 'Planet apa yang paling dekat dengan Matahari?', options: ['Merkurius', 'Venus', 'Mars', 'Bumi'] },
  { topic: 'Antariksa', q: 'Planet apa yang dijuluki "Planet Merah"?', options: ['Mars', 'Venus', 'Jupiter', 'Merkurius'] },
  { topic: 'Antariksa', q: 'Berapa kira-kira kecepatan cahaya di ruang hampa?', options: ['300.000 km per detik', '30.000 km per detik', '3.000 km per detik', '3.000.000 km per detik'] },
  { topic: 'Antariksa', q: 'Unsur apa yang paling melimpah di alam semesta?', options: ['Hidrogen', 'Helium', 'Oksigen', 'Karbon'] },
  { topic: 'Sains', q: 'Apa rumus kimia air?', options: ['H₂O', 'CO₂', 'O₂', 'NaCl'] },
  { topic: 'Sains', q: 'Gas apa yang paling banyak di atmosfer Bumi?', options: ['Nitrogen', 'Oksigen', 'Karbon dioksida', 'Argon'] },
  { topic: 'Sains', q: 'Apa lambang kimia untuk emas?', options: ['Au', 'Ag', 'Fe', 'Pb'] },
  { topic: 'Sains', q: 'Logam apa yang berwujud cair pada suhu ruang?', options: ['Raksa', 'Timah', 'Aluminium', 'Natrium'] },
  { topic: 'Sains', q: 'Pada tekanan 1 atmosfer, air mendidih pada suhu berapa?', options: ['100 °C', '90 °C', '120 °C', '80 °C'] },
  { topic: 'Sains', q: 'Gas apa yang dihasilkan tumbuhan saat fotosintesis?', options: ['Oksigen', 'Nitrogen', 'Karbon dioksida', 'Hidrogen'] },
  { topic: 'Sains', q: 'Satuan SI untuk gaya adalah …', options: ['Newton', 'Joule', 'Watt', 'Pascal'] },
  { topic: 'Sains', q: 'Di lapisan atmosfer mana sebagian besar cuaca terjadi?', options: ['Troposfer', 'Stratosfer', 'Mesosfer', 'Termosfer'] },
  { topic: 'Sains', q: 'Siapa ilmuwan yang mencetuskan teori relativitas?', options: ['Albert Einstein', 'Isaac Newton', 'Galileo Galilei', 'Nikola Tesla'] },
  { topic: 'Sains', q: 'Berapa bilangan prima terkecil?', options: ['2', '1', '3', '0'] },
  { topic: 'Tubuh', q: 'Berapa jumlah tulang pada tubuh manusia dewasa?', options: ['206', '186', '216', '256'] },
  { topic: 'Tubuh', q: 'Tulang apa yang paling panjang di tubuh manusia?', options: ['Tulang paha', 'Tulang kering', 'Tulang lengan atas', 'Tulang belakang'] },
  { topic: 'Tubuh', q: 'Organ apa yang memompa darah ke seluruh tubuh?', options: ['Jantung', 'Paru-paru', 'Hati', 'Ginjal'] },
  { topic: 'Alam', q: 'Hewan darat apa yang paling cepat?', options: ['Cheetah', 'Singa', 'Kuda', 'Rusa'] },
  { topic: 'Alam', q: 'Hewan apa yang terbesar yang pernah hidup di Bumi?', options: ['Paus biru', 'Gajah Afrika', 'Hiu paus', 'Brontosaurus'] },
  { topic: 'Alam', q: 'Hewan apa yang terkenal bisa mengubah warna kulitnya untuk berkamuflase?', options: ['Bunglon', 'Komodo', 'Iguana', 'Tokek'] },
  { topic: 'Alam', q: 'Komodo hidup secara alami di provinsi mana?', options: ['Nusa Tenggara Timur', 'Nusa Tenggara Barat', 'Sulawesi Selatan', 'Bali'] },
  { topic: 'Geografi', q: 'Apa ibu kota Australia?', options: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
  { topic: 'Geografi', q: 'Gunung apa yang tertinggi di dunia diukur dari permukaan laut?', options: ['Everest', 'K2', 'Kilimanjaro', 'Puncak Jaya'] },
  { topic: 'Geografi', q: 'Samudra apa yang paling luas?', options: ['Pasifik', 'Atlantik', 'Hindia', 'Arktik'] },
  { topic: 'Geografi', q: 'Pulau apa yang terbesar di dunia?', options: ['Greenland', 'Kalimantan', 'Papua', 'Madagaskar'] },
  { topic: 'Geografi', q: 'Gurun panas apa yang paling luas di dunia?', options: ['Sahara', 'Gobi', 'Kalahari', 'Atacama'] },
  { topic: 'Geografi', q: 'Benua apa yang paling kecil?', options: ['Australia', 'Eropa', 'Antarktika', 'Amerika Selatan'] },
  { topic: 'Geografi', q: 'Menara Eiffel berada di kota …', options: ['Paris', 'Roma', 'London', 'Berlin'] },
  { topic: 'Geografi', q: 'Negara apa yang dijuluki "Negeri Matahari Terbit"?', options: ['Jepang', 'Korea Selatan', 'Tiongkok', 'Thailand'] },
  { topic: 'Geografi', q: 'Bahasa resmi negara Brasil adalah …', options: ['Portugis', 'Spanyol', 'Inggris', 'Prancis'] },
  { topic: 'Geografi', q: 'Apa mata uang Jepang?', options: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
  { topic: 'Indonesia', q: 'Sungai apa yang terpanjang di Indonesia?', options: ['Kapuas', 'Mahakam', 'Musi', 'Bengawan Solo'] },
  { topic: 'Indonesia', q: 'Danau apa yang terbesar di Indonesia?', options: ['Danau Toba', 'Danau Singkarak', 'Danau Poso', 'Danau Sentani'] },
  { topic: 'Indonesia', q: 'Candi Buddha terbesar di dunia yang ada di Indonesia adalah …', options: ['Borobudur', 'Prambanan', 'Mendut', 'Muara Takus'] },
  { topic: 'Indonesia', q: 'Kota mana yang dijuluki "Kota Kembang"?', options: ['Bandung', 'Bogor', 'Malang', 'Yogyakarta'] },
  { topic: 'Indonesia', q: 'Alat musik angklung berasal dari daerah …', options: ['Jawa Barat', 'Bali', 'Sumatra Barat', 'Papua'] },
  { topic: 'Indonesia', q: 'Siapa Wakil Presiden pertama Indonesia?', options: ['Mohammad Hatta', 'Sutan Sjahrir', 'Adam Malik', 'Sri Sultan Hamengkubuwono IX'] },
  { topic: 'Indonesia', q: 'Siapa yang dijuluki "Bapak Pendidikan Nasional"?', options: ['Ki Hajar Dewantara', 'R.A. Kartini', 'Dewi Sartika', 'H.O.S. Tjokroaminoto'] },
  { topic: 'Indonesia', q: 'Sumpah Pemuda diikrarkan pada tahun …', options: ['1928', '1908', '1945', '1918'] },
  { topic: 'Indonesia', q: 'Siapa penulis novel "Laskar Pelangi"?', options: ['Andrea Hirata', 'Pramoedya Ananta Toer', 'Tere Liye', 'Dee Lestari'] },
  { topic: 'Sejarah', q: 'Siapa pelukis "Mona Lisa"?', options: ['Leonardo da Vinci', 'Michelangelo', 'Vincent van Gogh', 'Pablo Picasso'] },
  { topic: 'Sejarah', q: 'Siapa yang memperkenalkan mesin cetak huruf lepas di Eropa?', options: ['Johannes Gutenberg', 'Leonardo da Vinci', 'Isaac Newton', 'James Watt'] },
  { topic: 'Budaya', q: 'Pizza berasal dari negara …', options: ['Italia', 'Prancis', 'Yunani', 'Spanyol'] },
  { topic: 'Budaya', q: 'Bahasa apa yang punya penutur asli paling banyak di dunia?', options: ['Mandarin', 'Inggris', 'Spanyol', 'Hindi'] },
  { topic: 'Budaya', q: 'Berapa jumlah pemain satu tim sepak bola di lapangan?', options: ['11', '10', '9', '12'] },
  { topic: 'Budaya', q: 'Berapa jumlah hari dalam tahun kabisat?', options: ['366', '365', '364', '367'] },
  { topic: 'Budaya', q: 'Dalam catur, bidak apa yang hanya bisa bergerak diagonal?', options: ['Gajah (Bishop)', 'Benteng (Rook)', 'Kuda (Knight)', 'Raja (King)'] },
];

export const quizLength = 10;
export const quizPass = 7;
export const defaultQuizReward = 'Sphinx menunduk perlahan. Batu di bawah cakarnya bergeser, menyingkap secarik perkamen: "Ikuti bayangan menara saat senja."';

export type QuizState = {
  questions: number[];   // indeks soal di bank
  orders: number[][];    // urutan tampil pilihan per soal (indeks ke options; 0 = benar)
  current: number;
  picks: (number | null)[]; // pilihan terkunci (posisi tampil 0-3)
  by: (string | null)[];
  mark: { choice: number; by: string } | null; // tanda sementara sebelum dikunci
  reward: string;
};
export type QuizAsked = { q: string; topic: string; options: string[]; pick: number | null; by: string | null; correct: number | null };
export type QuizView = { current: number; total: number; pass: number; score: number; mark: QuizState['mark']; asked: QuizAsked[]; reward: string };

type GameLike = { phase: string; result: string; players: string[]; scores: Record<string, number>; quiz?: QuizState };

export function newQuiz(randomInt: (max: number) => number, reward = defaultQuizReward): QuizState {
  const pool = quizBank.map((_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) { const j = randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const questions = pool.slice(0, quizLength);
  const orders = questions.map(() => {
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    return order;
  });
  return { questions, orders, current: 0, picks: questions.map(() => null), by: questions.map(() => null), mark: null, reward };
}

const correctPos = (s: QuizState, i: number) => s.orders[i].indexOf(0);
export const quizScore = (s: QuizState) => s.picks.filter((p, i) => p !== null && p === correctPos(s, i)).length;

// Soal yang belum ditanyakan tidak dikirim. Kunci soal yang sedang berjalan hanya untuk GM.
export function quizView(s: QuizState, dm: boolean, finished: boolean): QuizView {
  const last = Math.min(s.current, s.questions.length - 1);
  const asked = s.questions.slice(0, last + 1).map((qi, i) => {
    const item = quizBank[qi];
    const answered = s.picks[i] !== null;
    return { q: item.q, topic: item.topic, options: s.orders[i].map(o => item.options[o]), pick: s.picks[i], by: s.by[i], correct: answered || dm || finished ? correctPos(s, i) : null };
  });
  const won = finished && quizScore(s) >= quizPass;
  return { current: s.current, total: s.questions.length, pass: quizPass, score: quizScore(s), mark: s.mark, asked, reward: dm || won ? s.reward : '' };
}

export function quizAction(game: GameLike, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const s = game.quiz;
  if (!s) return 'Ronde belum dimulai.';
  if (action.type === 'quiz:reward') {
    if (!dm) return 'Hanya GM boleh menulis hadiah.';
    if (typeof action.text !== 'string') return 'Hadiah tidak valid.';
    s.reward = action.text.trim().slice(0, 300) || defaultQuizReward;
    return null;
  }
  if (game.phase !== 'open') return 'Ronde belum dibuka.';
  const player = game.players.includes(playerId);
  if (action.type === 'quiz:next') {
    if (!player && !dm) return 'Hanya tim penjawab yang bisa lanjut.';
    if (s.picks[s.current] === null) return 'Jawab dulu pertanyaan ini.';
    s.current++;
    s.mark = null;
    if (s.current >= s.questions.length) {
      s.current = s.questions.length;
      game.phase = 'finished';
      game.result = quizScore(s) >= quizPass ? 'won' : 'lost';
    }
    return null;
  }
  if (!player) return 'Hanya dua peserta yang dipilih GM yang boleh menjawab.';
  if (s.picks[s.current] !== null) return 'Pertanyaan ini sudah dijawab.';
  const choice = action.choice;
  if (typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice > 3) return 'Pilihan tidak dikenal.';
  if (action.type === 'quiz:mark') {
    s.mark = s.mark?.choice === choice && s.mark.by === playerId ? null : { choice, by: playerId };
    return null;
  }
  if (action.type === 'quiz:answer') {
    s.picks[s.current] = choice;
    s.by[s.current] = playerId;
    s.mark = null;
    if (choice === correctPos(s, s.current)) for (const id of game.players) game.scores[id] = (game.scores[id] || 0) + 1;
    return null;
  }
  return 'Aksi tidak tersedia pada ronde ini.';
}
