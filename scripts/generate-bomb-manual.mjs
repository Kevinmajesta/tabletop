import { mkdirSync, writeFileSync } from 'node:fs';

const pages = [
  [
    'MANUAL PENJINAK BOM',
    'Khusus Expert. Jangan perlihatkan manual ini kepada Operator.',
    '',
    'CARA BERKOMUNIKASI',
    'Operator menyebutkan posisi kabel dari atas ke bawah: A, B, C.',
    'Operator juga menyebutkan lambang, indikator, tulisan tombol, dan simbol awal.',
    'Berikan satu instruksi pada satu waktu. Satu input salah membuat bom meledak.',
    '',
    'MODUL KABEL: BACA LAMBANG, LALU WARNA POSISI YANG DIMINTA.',
    'Lambang BURUNG: jika kabel C kuning, potong A lalu B lalu C.',
    'Lambang BURUNG: jika kabel C bukan kuning, potong B lalu C lalu A.',
    'Lambang MAHKOTA: jika indikator MENYALA, potong C lalu A lalu B.',
    'Lambang MAHKOTA: jika indikator GELAP, potong B lalu A lalu C.',
    'Lambang MATA: jika kabel A merah, potong B lalu C lalu A.',
    'Lambang MATA: jika kabel A bukan merah, potong C lalu B lalu A.',
  ],
  [
    'MODUL KABEL: LANJUTAN',
    'Lambang PEDANG: jika kabel C biru, potong A lalu C lalu B.',
    'Lambang PEDANG: jika kabel C bukan biru, potong B lalu A lalu C.',
    '',
    'CONTOH PENGGUNAAN',
    'Operator berkata: lambang BURUNG; A merah, B biru, C kuning.',
    'Karena C kuning, instruksinya: potong kabel A, lalu B, lalu C.',
    'Operator berkata: lambang PEDANG; A hijau, B merah, C biru.',
    'Karena C biru, instruksinya: potong kabel A, lalu C, lalu B.',
    '',
    'MODUL TOMBOL',
    'TAHAN + MENYALA: tekan BIRU. TAHAN + GELAP: tekan KUNING.',
    'BATAL + MENYALA: tekan MERAH. BATAL + GELAP: tekan KUNING.',
    'LEDAKKAN + MENYALA: tekan KUNING. LEDAKKAN + GELAP: tekan BIRU.',
    '',
    'Selalu minta Operator mengulangi clue sebelum memberi instruksi.',
  ],
  [
    'MODUL SIMBOL',
    'Operator menyebutkan simbol pertama pada deretan simbol.',
    'Jika simbol pertama bulan: bulan, bintang, payung, benteng.',
    'Jika simbol pertama payung: payung, benteng, bulan, bintang.',
    'Jika simbol pertama bintang: bintang, payung, benteng, bulan.',
    '',
    'MODUL PUTARAN RUNE',
    'Operator menyebutkan warna RUNE, angka SEGEL, dan indikator jika diminta.',
    'RUBY: digit terakhir segel ganjil = 2, 4, 1, 3.',
    'RUBY: digit terakhir segel genap = 4, 1, 3, 2.',
    'SAFIR: indikator MENYALA = 3, 1, 4, 2.',
    'SAFIR: indikator GELAP = 1, 3, 2, 4.',
    'EMERALD: segel mengandung angka 0 = 4, 2, 3, 1.',
    'EMERALD: segel tanpa angka 0 = 2, 1, 4, 3.',
  ],
  [
    'MODUL PUTARAN RUNE: LANJUTAN',
    'ONYX: digit terakhir segel ganjil = 1, 4, 2, 3.',
    'ONYX: digit terakhir segel genap = 3, 2, 1, 4.',
    '',
    'CONTOH PUTARAN',
    'RUNE RUBY, segel 247: digit terakhir ganjil. Instruksi 2, 4, 1, 3.',
    'RUNE EMERALD, segel 502: ada angka 0. Instruksi 4, 2, 3, 1.',
    'RUNE SAFIR, indikator GELAP: instruksi 1, 3, 2, 4.',
    '',
    'CHECKLIST AKHIR',
    'Pastikan kabel A/B/C, tombol, simbol, dan putaran rune selesai semua.',
    'Jangan menebak. Jika clue tidak jelas, minta Operator mengulanginya.',
    'Bom baru dijinakkan ketika empat modul menunjukkan selesai.',
  ],
];

const escape = (text) => text.replace(/([\\()])/g, '\\$1');
const objects = ['<< /Type /Catalog /Pages 2 0 R >>'];
objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
for (const lines of pages) {
  const pageId = objects.length + 1;
  const contentId = pageId + 1;
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`);
  const stream = ['BT', '/F1 22 Tf', '72 736 Td', `(${escape(lines[0])}) Tj`, '/F2 11 Tf'];
  for (const line of lines.slice(1)) stream.push('0 -25 Td', `(${escape(line)}) Tj`);
  stream.push('ET');
  const body = stream.join('\n');
  objects.push(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
}
let pdf = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
mkdirSync(new URL('../public/manual/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/manual/bomb-defusal-manual.pdf', import.meta.url), pdf, 'binary');
