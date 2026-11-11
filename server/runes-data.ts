// Data publik Bahasa Rune yang Hilang: contoh kalimat dan tugas terjemahan. Dipakai server dan klien.
// Kunci jawaban tugas sengaja tidak ada di sini (lihat runes.ts) supaya tidak ikut terkirim ke browser pemain.
//
// Tata bahasa rahasia (untuk GM): kata kerja selalu di depan. Kalimat biasa: Kerja–Subjek–Objek.
// Kalimat menyangkal (awalan ᛜ pada kata kerja): Kerja–Objek–Subjek. Akhiran ᛁ = jamak, ᛞ = lampau (telah),
// ᛊ = kepemilikan (diletakkan pada pemilik, sesudah benda yang dimiliki; jamak dulu baru ᛊ).

export type RuneExample = { runes: string; meaning: string };
// Urutan sengaja diacak supaya pola tidak langsung terlihat.
export const runeExamples: RuneExample[] = [
  { runes: 'ᛟᛈᛖᛞ ᚱᚨᚲ ᛒᚨᚱᛁ', meaning: 'Raja telah membuka gerbang-gerbang.' },
  { runes: 'ᛊᛚᛖ ᚱᚨᚲ', meaning: 'Raja tidur.' },
  { runes: 'ᛜᚹᚨᚱ ᛒᚨᚱ ᛞᚹᛖᛁ', meaning: 'Para kurcaci tidak menjaga gerbang.' },
  { runes: 'ᚹᚨᚱ ᚦᚢᚱ ᚷᛟᛚ', meaning: 'Naga menjaga harta.' },
  { runes: 'ᛜᛊᛚᛖ ᚦᚢᚱ', meaning: 'Naga tidak tidur.' },
  { runes: 'ᛏᚺᚠᛞ ᛞᚹᛖ ᚷᛟᛚ', meaning: 'Kurcaci telah mencuri harta.' },
  { runes: 'ᛊᛚᛖ ᛞᚹᛖᛁ', meaning: 'Para kurcaci tidur.' },
  { runes: 'ᛜᛏᚺᚠ ᚷᛟᛚ ᚱᚨᚲ', meaning: 'Raja tidak mencuri harta.' },
  { runes: 'ᛟᛈᛖ ᚦᚢᚱ ᛒᚨᚱ ᛞᚹᛖᛁᛊ', meaning: 'Naga membuka gerbang para kurcaci.' },
];

// Empat pintu, makin dalam makin sulit. Pemain menulis kalimat rune untuk setiap arti.
export const runeTasks: string[] = [
  'Para naga tidur.',
  'Para raja tidak membuka gerbang.',
  'Kurcaci telah membuka gerbang-gerbang raja.',
  'Para naga tidak menjaga harta para kurcaci.',
];

// Papan rune: semua huruf yang dipakai bahasa ini, ditambah beberapa pengecoh.
export const runeKeys = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];

// Spasi ganda/pinggir diabaikan saat membandingkan jawaban.
export const normalizeRunes = (s: string) => s.trim().split(/\s+/).filter(Boolean).join(' ');
