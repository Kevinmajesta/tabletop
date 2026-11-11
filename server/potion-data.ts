// Data publik Ramuan Seimbang: bahan dan aturan racikan. Dipakai server dan klien.
// Susunan jawaban sengaja tidak ada di sini (lihat potion.ts) supaya tidak ikut terkirim ke browser pemain.

// Sembilan unsur yang harus dibagi ke tiga kuali (kiri, tengah, kanan), masing-masing tiga posisi (atas, tengah, bawah).
export const potionPool = [11, 20, 26, 80, 35, 8, 10, 14, 6]; // Na Ca Fe Hg Br O Ne Si C
export const cauldronNames = ['Kuali Kiri', 'Kuali Tengah', 'Kuali Kanan'];
export const layerNames = ['Atas', 'Tengah', 'Bawah'];

export const potionRules = [
  'Setiap kuali berisi tepat satu unsur periode 2.',
  'Posisi bawah setiap kuali selalu diisi logam.',
  'Dua unsur cair tidak boleh berada di kuali yang sama.',
  'Gas hanya boleh berada di posisi atas.',
  'Dalam satu kuali tidak boleh ada dua unsur segolongan.',
  'Kuali kanan tidak berisi logam transisi.',
  'Tepat di atas logam alkali harus ada gas.',
  'Posisi tengah Kuali Tengah diisi halogen.',
  'Gas mulia tidak boleh sekuali dengan logam alkali.',
  'Logam alkali tidak boleh sekuali dengan logam transisi.',
];
