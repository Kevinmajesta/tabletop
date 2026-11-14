// Data publik Bahasa Rune yang Hilang: contoh kalimat dan tugas terjemahan. Dipakai server dan klien.
// Kunci jawaban tugas sengaja tidak ada di sini (lihat runes.ts) supaya tidak ikut terkirim ke browser pemain.
//
// Tata bahasa rahasia (untuk GM): kata kerja selalu di depan. Kalimat biasa: Kerja–Subjek–Objek.
// Kalimat menyangkal diawali kata ᛜᚢ (tidak) dan urutannya terbalik: ᛜᚢ–Kerja–Objek–Subjek. Tidak ada imbuhan.

export type RuneExample = { runes: string; meaning: string };
// Urutan sengaja diacak supaya pola tidak langsung terlihat.
export const runeExamples: RuneExample[] = [
  { runes: 'ᛟᛈᛖ ᚱᚨᚲ ᛒᚨᚱ', meaning: 'Raja membuka gerbang.' },
  { runes: 'ᛊᛚᛖ ᚱᚨᚲ', meaning: 'Raja tidur.' },
  { runes: 'ᛜᚢ ᚹᚨᚱ ᛒᚨᚱ ᛞᚹᛖ', meaning: 'Kurcaci tidak menjaga gerbang.' },
  { runes: 'ᚹᚨᚱ ᚦᚢᚱ ᚷᛟᛚ', meaning: 'Naga menjaga harta.' },
  { runes: 'ᛜᚢ ᛊᛚᛖ ᚦᚢᚱ', meaning: 'Naga tidak tidur.' },
  { runes: 'ᛏᚺᚠ ᛞᚹᛖ ᚷᛟᛚ', meaning: 'Kurcaci mencuri harta.' },
  { runes: 'ᛊᛚᛖ ᛞᚹᛖ', meaning: 'Kurcaci tidur.' },
  { runes: 'ᛜᚢ ᛏᚺᚠ ᚷᛟᛚ ᚱᚨᚲ', meaning: 'Raja tidak mencuri harta.' },
  { runes: 'ᛟᛈᛖ ᚦᚢᚱ ᛒᚨᚱ', meaning: 'Naga membuka gerbang.' },
];

// Empat pillar, makin dalam makin sulit. Pemain menulis kalimat rune untuk setiap arti.
export const runeTasks: string[] = [
  'Naga tidur.',
  'Raja menjaga harta.',
  'Kurcaci menjaga raja.',
  'Raja tidak menjaga kurcaci.',
];

// Papan rune: semua huruf yang dipakai bahasa ini, ditambah beberapa pengecoh.
export const runeKeys = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];

// Spasi ganda/pinggir diabaikan saat membandingkan jawaban.
export const normalizeRunes = (s: string) => s.trim().split(/\s+/).filter(Boolean).join(' ');
