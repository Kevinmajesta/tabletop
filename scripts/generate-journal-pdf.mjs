// Membuat public/manual/jurnal-terkoyak.pdf (10 halaman). Jawaban teka-teki ada di server/torn-journal.ts; ubah teks di sini = cek ulang jawabannya.
import { mkdirSync, writeFileSync } from 'node:fs';

const pages = [
  { title: 'Pelabuhan Karang Biru', body: [
    'Kabut tipis masih menempel di dermaga Karang Biru ketika aku mulai menulis jurnal ini. Namaku Sekar Arunika, juru peta dari Balai Peta Selatan. Aku menulis agar siapa pun yang kelak menemukan buku ini dapat mengikuti jejakku sampai ke Menara Lonceng, tempat yang selama ini hanya ada dalam dongeng para pelaut.',
    'Rombongan kami terdiri dari empat orang: aku sendiri, Dalang Wirya si pembaca bintang, Bu Ratri si tabib, dan Kodrat si pemikul barang. Di pasar pelabuhan kami membeli perbekalan seperlunya, dan yang paling penting adalah garam. Aku membeli dua belas genggam garam, sebab garam bukan sekadar bumbu. Garam mengawetkan ikan, menahan lumut pada tali, dan menurut para tetua pelabuhan, ia juga menolak makhluk yang tidak ramah di jalan setapak.',
    'Menurut peta tua milik guruku, perjalanan ini melewati Bukit Gading, Sungai Lebar, sebuah jembatan tali, hutan bambu, sebuah gua, tangga batu, lalu akhirnya menara. Aku tidak percaya pada setengah isi peta itu, tetapi aku percaya pada sisanya.',
    'Ada satu kebiasaan yang akan kuulangi di setiap halaman. Aku memilih huruf pertama di awal tiap halaman dengan sengaja. Bila dibaca berurutan dari halaman pertama sampai halaman terakhir, huruf-huruf itu menyimpan satu pesan untuk pembaca yang teliti. Selain itu, aku akan mencatat garam, cuaca, dan jumlah hari yang kami habiskan, sebab juru peta yang lupa menghitung hanyalah pengelana yang tersesat sambil membawa pena.',
  ] },
  { title: 'Menuju Bukit Gading', body: [
    'Angin darat mendorong kami keluar dari pelabuhan sebelum fajar. Hari pertama kami habiskan menyusuri jalan setapak berbatu di antara kebun kelapa, dan menjelang sore kami tiba di kaki Bukit Gading. Perjalanan dari pelabuhan sampai kaki bukit memakan satu hari penuh.',
    'Malam itu langit sangat bersih. Sabit muda yang tipis menggantung di barat, dan Dalang Wirya berkata bahwa bulan akan terus membesar selama kami berjalan ke timur. Aku mencatatnya sebagai penanda perjalanan: bila bulan sudah bulat sempurna, berarti kami sudah hampir sampai.',
    'Kodrat mengeluh punggungnya pegal karena pikulan, tetapi ia tertawa ketika Bu Ratri menyuruhnya memijat kakinya sendiri. Kami makan ikan asin dan ubi bakar sambil mendengarkan jangkrik. Dalang Wirya menggambar rasi bintang di tanah dengan ranting, lalu mencocokkannya dengan peta guruku. Rasi itu cocok, dan untuk pertama kalinya aku merasa peta tua itu mungkin jujur.',
    'Sebelum tidur aku memeriksa kantong perbekalan. Semuanya aman, dan garam belum kami sentuh sama sekali.',
  ] },
  { title: 'Bukit Gading dan Sungai Lebar', body: [
    'Kami mendaki Bukit Gading pada pagi berikutnya. Jalannya curam dan licin oleh lumut, jadi kami berjalan pelan sambil saling menarik tali pengaman. Mendaki bukit lalu menuruni sisi seberangnya sampai ke tepi sungai memakan dua hari.',
    'Sungai Lebar menyambut kami dengan air yang coklat dan deras. Hujan di hulu rupanya baru saja turun, sehingga sungai meluap dan tidak mungkin diseberangi. Kami terpaksa berkemah dan menunggu dua hari sampai air surut. Pada malam pertama menunggu, bulan tampak separuh, tepat seperti yang dikatakan Dalang Wirya.',
    'Bu Ratri memanfaatkan waktu menunggu itu untuk mengawetkan ikan hasil pancingan Kodrat. Ia menggosok ikan dengan garam, lalu menjemurnya di atas batu. Untuk itu kami memakai satu genggam garam dari kantongku. Aku mencatatnya di sini supaya hitunganku tidak meleset.',
    'Sambil menunggu, aku menggambar tepian sungai pada petaku: tiga pohon beringin, sebuah batu besar bercorak seperti wajah, dan dasar sungai yang berpasir. Kodrat berkata batu itu mirip kepala kerbau. Aku berkata ia sudah terlalu lama memikul barang.',
  ] },
  { title: 'Jembatan Tali', body: [
    'Ikatan tali jembatan itu sudah rapuh, dan papan-papannya berderit setiap kali tertiup angin. Jembatan itu membentang di atas ngarai sempit tempat Sungai Lebar terjun menjadi arus yang lebih deras. Dari jauh ia tampak seperti benang laba-laba yang digantung oleh orang yang berani.',
    'Kami menyeberang satu per satu. Dalang Wirya paling dahulu, lalu Bu Ratri, lalu aku, dan Kodrat paling akhir sebab ia membawa beban terberat. Di tengah jembatan, kantong garamku terlepas dari ikatannya dan jatuh ke arus. Aku sempat menangkapnya, tetapi dua genggam garam sudah hanyut ke bawah. Itu kerugian pertama kami, dan aku mencatatnya dengan getir.',
    'Setelah semua orang tiba di seberang, kami memeriksa perbekalan dan melanjutkan perjalanan sebelum matahari terlalu tinggi. Menyeberangi jembatan dan terus berjalan sampai ke tepi hutan bambu memakan satu hari.',
    'Bulan malam itu masih separuh. Bu Ratri mengoleskan salep pada telapak tangan Kodrat yang lecet oleh tali. Kodrat bersumpah tidak akan pernah lagi menyeberangi jembatan dalam hidupnya, sumpah yang kuduga akan bertahan sampai perjalanan pulang.',
  ] },
  { title: 'Hutan Bambu', body: [
    'Malam di hutan bambu sama sekali tidak sunyi. Batang-batangnya berdecit dan berdetak setiap kali angin lewat, seakan hutan itu sedang berbisik dengan bahasa yang tidak kami mengerti. Kami berjalan tiga hari penuh di bawah rimbun daun bambu sebelum akhirnya tiba di kaki tebing batu.',
    'Pada hari kedua kami bertemu seorang pedagang bambu tua yang sedang memikul seikat batang untuk dijual. Ia heran melihat orang asing berjalan sejauh itu ke dalam hutan. Setelah mendengar tujuan kami, ia hanya menggeleng, lalu memberi kami satu genggam garam sebagai bekal. Katanya, orang yang pergi ke Menara Lonceng sebaiknya membawa lebih banyak daripada yang ia kira perlu. Aku mencatat pemberian itu di sini, sebab garam tambahan itu menambah isi kantongku.',
    'Bulan mulai menggembung. Cahayanya menembus sela-sela bambu dan membuat bayangan bergaris-garis di tanah. Dalang Wirya berkata bulan akan bulat penuh tidak lama lagi, dan ia menghitung bahwa kami tiba di menara tepat pada malam ketika bulan paling terang.',
    'Kodrat sempat tersesat ketika pergi mencari air, tetapi ia menemukan jalan kembali dengan mengikuti bunyi ketukan sendok Bu Ratri pada panci. Sejak saat itu, setiap malam kami membunyikan panci sebelum tidur, sekadar untuk berjaga-jaga.',
  ] },
  { title: 'Gua di Kaki Tebing', body: [
    'Embun masih menetes dari langit-langit gua ketika aku menulis halaman ini. Hujan deras turun begitu kami sampai di kaki tebing, sehingga kami berlindung di dalam gua dan baru bisa keluar setelah berteduh dua hari. Selama itu api unggun Kodrat tidak pernah padam, dan ia bangga bukan main.',
    'Di mulut gua kami bertemu seorang pemanjat tebing bernama Ki Jatmika. Ia bersedia meminjamkan seutas tali panjang untuk naik ke tebing, asalkan kami menukarnya dengan garam. Setelah tawar-menawar yang alot, kami sepakat menukar tiga genggam garam dengan tali itu. Harganya mahal, tetapi tali itu kuat dan tampak baru. Ki Jatmika lalu pergi tanpa menoleh.',
    'Pada dinding gua yang paling dalam terukir deretan tujuh huruf yang tidak membentuk kata apa pun:',
    { box: ['S X U Q D P D'] },
    'Di bawah ukiran itu tertulis kalimat kecil: "Setiap huruf telah digeser tiga tempat maju dalam alfabet. Untuk membacanya, geser tiap huruf mundur tiga tempat." Dalang Wirya memberi contoh: huruf E dalam sandi sebenarnya adalah B. Kami menyalin ukiran itu dengan teliti, lalu membacanya satu per satu. Kata yang terbentuk ternyata menyebut keadaan bulan yang harus ada ketika lonceng dibunyikan.',
  ] },
  { title: 'Tangga Batu', body: [
    'Nafasku tersengal ketika kami mulai menaiki tangga batu yang konon dipahat oleh para penjaga menara. Tangga itu menanjak lurus ke atas awan, dan Kodrat menghitung bahwa ada seratus anak tangga. Kami mendakinya selama dua hari, beristirahat setiap kali kaki mulai gemetar.',
    'Di tengah pendakian kabut mulai turun, lalu pelan-pelan menghilang sampai langit tampak jernih seperti kaca. Kami menaburkan satu genggam garam di anak tangga pertama sebagai tanda hormat, seperti kebiasaan para pelaut sebelum memasuki tempat yang dihormati. Aku mencatatnya di sini.',
    'Pada anak tangga ke seratus, sebuah batu pipih di pinggir tangga memuat ukiran. Di atasnya tertulis: "Hanya yang dapat menjawab boleh naik lebih jauh." Di bawahnya terpahat sebuah teka-teki:',
    { box: ['Semakin banyak kau ambil dariku,', 'semakin besar aku. Apakah aku?'] },
    'Kami berdebat panjang. Kodrat menebak berkali-kali dengan jawaban yang aneh, sementara Bu Ratri hanya tersenyum. Akhirnya Dalang Wirya mengucapkan jawabannya dengan pelan, dan terdengar bunyi gemeretak di dalam batu. Aku tidak menulis jawabannya di sini, sebab yang tertulis di halaman ini hanyalah teka-teki itu. Siapa pun yang membaca jurnal ini harus menjawabnya dengan kepalanya sendiri.',
  ] },
  { title: 'Menara Tua', body: [
    'Awan menutup puncak tebing ketika kami melangkah dari anak tangga terakhir. Kami tiba di kaki Menara Lonceng menjelang malam pada hari kedua pendakian tangga, sehingga tidak ada hari tambahan yang perlu kuhitung dari sini.',
    'Menara itu jauh lebih besar daripada yang kubayangkan dari peta guruku. Batunya hitam kehijauan, berlumut di sisi utara, dan pintunya terbuat dari kayu jati tebal yang diikat pita besi. Di atas pintu terukir sebuah bulan bulat sempurna, persis seperti yang dikatakan Dalang Wirya akan kami temui.',
    'Malam itu bulan bulat menerangi seluruh batu menara sampai tampak keperakan. Udara tidak berkabut sedikit pun, dan bintang tampak begitu dekat sehingga Kodrat mencoba menggapainya. Bu Ratri memeriksa kesehatan kami semua, lalu menyatakan bahwa kami layak naik, asalkan tidak ada yang tergesa-gesa.',
    'Kami menginap di kaki menara. Aku menyalin ukiran pintu ke petaku, termasuk lingkaran kecil yang kuduga adalah lubang kunci. Besok pagi kami akan naik ke ruangan paling atas.',
  ] },
  { title: 'Lonceng Perunggu', body: [
    'Ruangan paling atas menara ternyata hanya sebuah ruangan bundar dengan jendela di keempat sisinya. Di tengahnya tergantung lonceng perunggu yang sangat besar, hijau karena usia, dengan tali penarik yang menjuntai sampai ke lantai. Udara di sana sangat jernih, dan dari jendela utara kami bisa melihat pelabuhan Karang Biru sebagai titik kecil di kejauhan.',
    'Sebelum membunyikan lonceng, kami menaburkan dua genggam garam di lantai bawahnya sebagai tanda syukur, sesuai kebiasaan lama para pelaut. Aku mencatat ini sebagai pengeluaran garam terakhirku.',
    'Kami menarik tali itu bersama-sama. Bunyi lonceng bergema ke seluruh lembah, rendah dan dalam, dan terasa seakan bumi ikut bergetar. Beberapa saat kemudian, sebuah panel kecil di dasar lonceng bergeser terbuka. Di dalamnya ada selembar kertas tua yang dilipat rapi. Dalang Wirya membukanya dengan hati-hati, lalu membaca isinya keras-keras. Setelah itu tak seorang pun berbicara lama.',
    'Aku menulis semua ini dengan tangan yang masih gemetar. Isi kertas itu akan kutuliskan di halaman terakhir.',
  ] },
  { title: 'Penutup', body: [
    'Akhirnya kami membunyikan lonceng itu, dan perjalanan kami selesai di sini. Isi kertas tua itu pendek saja: "Kunci yang kalian cari tidak pernah disembunyikan jauh. Ia berada di tempat yang paling dekat dengan akar dari semua yang tinggi. Baca kembali jurnalmu, dan kau akan tahu di mana." Aku tertegun cukup lama, lalu tertawa, sebab aku sudah menuliskan jawabannya sejak halaman pertama tanpa sadar.',
    'Bagi siapa pun yang menemukan buku ini: huruf-huruf di awal tiap halaman bukan kebetulan. Gabungkan semuanya, lalu cocokkan dengan teka-teki kertas itu. Bila kalian membaca dengan teliti, kalian tidak akan melewatkan petunjuk apa pun.',
    'Aku menutup jurnal ini dengan satu catatan terakhir. Kantong garamku kini ringan sekali. Kalian yang membaca ini dapat menghitung sendiri berapa genggam yang masih tersisa berdasarkan catatanku di setiap halaman. Aku menuliskan semuanya dengan jujur.',
    'Terima kasih telah mengikuti perjalanan kami sampai ke halaman ini. Semoga jalan kalian lebih mudah daripada jalan kami. - Sekar Arunika',
  ] },
];

const esc = (s) => s.replace(/([\\()])/g, '\\$1');
const wrap = (s, max = 80) => {
  const lines = []; let line = '';
  for (const word of s.split(' ')) {
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; } else line = line ? line + ' ' + word : word;
  }
  return line ? [...lines, line] : lines;
};

const streams = pages.map(({ title, body }, index) => {
  const out = [];
  const text = (font, size, x, y, s) => { if (/[^\x20-\x7e]/.test(s)) throw new Error(`Karakter non-ASCII di halaman ${index + 1}: ${s}`); out.push(`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`); };
  out.push('0.5 w 54 54 504 684 re S');
  text('F3', 10, 72, 752, 'JURNAL PERJALANAN SEKAR ARUNIKA');
  out.push('72 742 m 540 742 l S');
  text('F1', 16, 72, 712, `Halaman ${index + 1} - ${title}`);
  let y = 680;
  for (const item of body) {
    if (typeof item === 'string') {
      for (const line of wrap(item)) { text('F2', 12, 72, y, line); y -= 17; }
      y -= 9;
    } else {
      const bottom = y - (item.box.length - 1) * 22 - 10;
      out.push(`66 ${bottom} 480 ${y + 16 - bottom} re S`);
      item.box.forEach((line, i) => text('F1', 14, 84, y - i * 22, line));
      y = bottom - 22;
    }
  }
  if (y < 80) throw new Error(`Halaman ${index + 1} meluap (y=${y})`);
  text('F3', 10, 292, 40, `- ${index + 1} -`);
  return out.join('\n');
});

const objects = ['<< /Type /Catalog /Pages 2 0 R >>'];
objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
const fonts = '/F1 << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> /F3 << /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>';
for (const body of streams) {
  const pageId = objects.length + 1;
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << ${fonts} >> >> /Contents ${pageId + 1} 0 R >>`);
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
writeFileSync(new URL('../public/manual/jurnal-terkoyak.pdf', import.meta.url), pdf, 'binary');
console.log(`jurnal-terkoyak.pdf: ${pages.length} halaman, ${pdf.length} byte`);
