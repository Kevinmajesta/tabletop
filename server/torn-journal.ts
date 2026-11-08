// Jurnal Terkoyak: buku PDF 10 halaman (public/manual/jurnal-terkoyak.pdf, dibuat scripts/generate-journal-pdf.mjs).
// Pemain membaca PDF-nya lalu menjawab lima pertanyaan. Jawaban ditulis sudah ternormalisasi dan hanya ada di server.
export const journalQuestions = [
  { prompt: 'Ambil huruf pertama dari kata pertama isi setiap halaman (bukan judulnya), dari halaman 1 sampai 10, lalu rangkai berurutan. Pesan apa yang terbentuk?', answers: ['KAKIMENARA'] },
  { prompt: 'Berapa genggam garam yang masih ada di kantong Sekar setelah semua catatan di jurnal? Hitung pembelian, pemberian, penggunaan, dan yang hilang.', answers: ['4', 'EMPAT'] },
  { prompt: 'Sandi di dinding gua (halaman 6) menyembunyikan satu kata. Kata apa itu setelah dibaca dengan benar?', answers: ['PURNAMA'] },
  { prompt: 'Jawab teka-teki yang terpahat pada batu di anak tangga ke seratus (halaman 7).', answers: ['LUBANG', 'LOBANG'] },
  { prompt: 'Berapa hari seluruhnya rombongan berjalan atau menunggu, sejak meninggalkan pelabuhan sampai tiba di kaki menara?', answers: ['13', 'TIGABELAS'] },
];
export const journalEpilogue = 'Kelima jawaban benar. Kertas tua di dalam lonceng berbunyi: kunci tersimpan di kaki menara, dan huruf pertama tiap halaman sudah menunjukkannya sejak awal.';
export type JournalState = { questions: string[]; solved: boolean[]; attempts: number; solution?: string[]; epilogue?: string };

export const normalizeAnswer = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function newJournal(): JournalState {
  return { questions: journalQuestions.map(q => q.prompt), solved: journalQuestions.map(() => false), attempts: 0 };
}

export function checkJournal(journal: JournalState, index: unknown, text: unknown): 'invalid' | 'done' | 'wrong' | 'right' {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= journalQuestions.length || typeof text !== 'string' || text.length > 60) return 'invalid';
  if (journal.solved[index]) return 'done';
  return journalQuestions[index].answers.includes(normalizeAnswer(text)) ? 'right' : 'wrong';
}

export function journalView(journal: JournalState, dm: boolean, finished: boolean): JournalState {
  return dm || finished ? { ...journal, solution: journalQuestions.map(q => q.answers[0]), epilogue: journalEpilogue } : journal;
}
