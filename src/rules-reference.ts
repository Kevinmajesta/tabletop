// Referensi cepat aturan D&D 2024 (diringkas dari SRD 5.2, CC BY 4.0) untuk pencarian di meja.
export type RuleEntry = { name: string; kind: 'Kondisi' | 'Aksi' | 'Aturan'; summary: string; points: string[] };

export const ruleEntries: RuleEntry[] = [
  // Kondisi
  { kind: 'Kondisi', name: 'Blinded', summary: 'Tidak bisa melihat.', points: ['Gagal otomatis pada ability check yang butuh penglihatan.', 'Attack roll terhadapmu mendapat Advantage.', 'Attack roll-mu mendapat Disadvantage.'] },
  { kind: 'Kondisi', name: 'Charmed', summary: 'Terpikat oleh makhluk lain.', points: ['Tidak bisa menyerang si pemikat atau menargetkannya dengan kemampuan berbahaya.', 'Si pemikat mendapat Advantage pada ability check untuk berinteraksi sosial denganmu.'] },
  { kind: 'Kondisi', name: 'Deafened', summary: 'Tidak bisa mendengar.', points: ['Gagal otomatis pada ability check yang butuh pendengaran.'] },
  { kind: 'Kondisi', name: 'Exhaustion', summary: 'Kelelahan bertingkat 1 sampai 6.', points: ['Setiap D20 Test dikurangi 2 × tingkat Exhaustion.', 'Speed berkurang 5 kaki × tingkat Exhaustion.', 'Tingkat 6 berarti mati.', 'Long Rest mengurangi satu tingkat.'] },
  { kind: 'Kondisi', name: 'Frightened', summary: 'Ketakutan terhadap suatu sumber.', points: ['Disadvantage pada ability check dan attack roll selama sumber ketakutan terlihat.', 'Tidak bisa sengaja bergerak mendekati sumber ketakutan.'] },
  { kind: 'Kondisi', name: 'Grappled', summary: 'Dicengkeram makhluk lain.', points: ['Speed menjadi 0.', 'Disadvantage pada attack roll terhadap target selain yang mencengkeram.', 'Yang mencengkeram bisa menyeretmu saat bergerak, dengan biaya gerak tambahan.'] },
  { kind: 'Kondisi', name: 'Incapacitated', summary: 'Tidak bisa bertindak.', points: ['Tidak bisa melakukan aksi, Bonus Action, maupun Reaction.', 'Concentration-mu buyar.', 'Tidak bisa bicara.', 'Kalau Incapacitated saat roll Initiative, kamu mendapat Disadvantage.'] },
  { kind: 'Kondisi', name: 'Invisible', summary: 'Tidak terlihat tanpa sihir atau indra khusus.', points: ['Advantage pada Initiative.', 'Attack roll-mu mendapat Advantage.', 'Attack roll terhadapmu mendapat Disadvantage, kecuali penyerang bisa melihatmu.'] },
  { kind: 'Kondisi', name: 'Paralyzed', summary: 'Lumpuh total.', points: ['Incapacitated dan Speed 0.', 'Gagal otomatis pada saving throw STR dan DEX.', 'Attack roll terhadapmu mendapat Advantage.', 'Serangan yang mengenaimu dari jarak 5 kaki menjadi Critical Hit.'] },
  { kind: 'Kondisi', name: 'Petrified', summary: 'Berubah menjadi batu atau benda padat.', points: ['Incapacitated dan Speed 0.', 'Gagal otomatis pada saving throw STR dan DEX.', 'Attack roll terhadapmu mendapat Advantage.', 'Resistance terhadap semua damage dan kebal terhadap kondisi Poisoned.'] },
  { kind: 'Kondisi', name: 'Poisoned', summary: 'Keracunan.', points: ['Disadvantage pada attack roll dan ability check.'] },
  { kind: 'Kondisi', name: 'Prone', summary: 'Terjatuh di tanah.', points: ['Hanya bisa merangkak, atau berdiri dengan memakai setengah Speed.', 'Attack roll-mu mendapat Disadvantage.', 'Attack roll terhadapmu mendapat Advantage bila penyerang dalam 5 kaki, selain itu Disadvantage.'] },
  { kind: 'Kondisi', name: 'Restrained', summary: 'Terikat atau terjerat.', points: ['Speed menjadi 0.', 'Attack roll-mu mendapat Disadvantage.', 'Attack roll terhadapmu mendapat Advantage.', 'Disadvantage pada saving throw DEX.'] },
  { kind: 'Kondisi', name: 'Stunned', summary: 'Terpana dan tidak bisa bereaksi.', points: ['Incapacitated.', 'Gagal otomatis pada saving throw STR dan DEX.', 'Attack roll terhadapmu mendapat Advantage.'] },
  { kind: 'Kondisi', name: 'Unconscious', summary: 'Pingsan.', points: ['Incapacitated dan Prone, menjatuhkan barang yang dipegang.', 'Speed 0, gagal otomatis pada saving throw STR dan DEX.', 'Attack roll terhadapmu mendapat Advantage.', 'Serangan yang mengenaimu dari jarak 5 kaki menjadi Critical Hit.'] },

  // Aksi
  { kind: 'Aksi', name: 'Attack', summary: 'Lakukan satu serangan dengan senjata atau Unarmed Strike.', points: ['Bisa lebih dari satu serangan kalau punya fitur Extra Attack.', 'Unarmed Strike bisa dipakai untuk Damage, Grapple, atau Shove.'] },
  { kind: 'Aksi', name: 'Dash', summary: 'Bergerak lebih jauh.', points: ['Tambahan gerak sebesar Speed-mu untuk giliran ini.'] },
  { kind: 'Aksi', name: 'Disengage', summary: 'Mundur dengan aman.', points: ['Gerakanmu tidak memancing Opportunity Attack sampai akhir giliran.'] },
  { kind: 'Aksi', name: 'Dodge', summary: 'Fokus menghindar.', points: ['Sampai awal giliranmu berikutnya, attack roll terhadapmu mendapat Disadvantage bila kamu bisa melihat penyerangnya.', 'Saving throw DEX-mu mendapat Advantage.', 'Efeknya hilang kalau kamu Incapacitated atau Speed-mu 0.'] },
  { kind: 'Aksi', name: 'Help', summary: 'Bantu teman.', points: ['Beri Advantage pada ability check berikutnya seorang teman, atau', 'alihkan perhatian musuh dalam 5 kaki darimu sehingga attack roll berikutnya teman terhadap musuh itu mendapat Advantage.'] },
  { kind: 'Aksi', name: 'Hide', summary: 'Bersembunyi.', points: ['Harus terhalang dari pandangan atau tertutup Heavy Obscurement.', 'Lakukan check DEX (Stealth) DC 15. Berhasil berarti kamu Invisible sampai ketahuan, bersuara keras, atau menyerang.'] },
  { kind: 'Aksi', name: 'Influence', summary: 'Pengaruhi sikap makhluk lain.', points: ['Check CHA (Deception, Intimidation, Performance, Persuasion) atau WIS (Animal Handling).'] },
  { kind: 'Aksi', name: 'Magic', summary: 'Gunakan sihir.', points: ['Merapal spell, memakai magic item, atau memakai kemampuan magis.'] },
  { kind: 'Aksi', name: 'Ready', summary: 'Siapkan tindakan dengan pemicu.', points: ['Tentukan pemicu dan tindakannya.', 'Saat pemicu terjadi, tindakan itu dijalankan memakai Reaction.', 'Spell yang disiapkan membutuhkan Concentration sampai dilepas.'] },
  { kind: 'Aksi', name: 'Search', summary: 'Cari sesuatu.', points: ['Check WIS (Insight, Medicine, Perception, atau Survival).'] },
  { kind: 'Aksi', name: 'Study', summary: 'Ingat atau analisis sesuatu.', points: ['Check INT (Arcana, History, Investigation, Nature, atau Religion).'] },
  { kind: 'Aksi', name: 'Utilize', summary: 'Pakai benda non-magis.', points: ['Contohnya membuka pintu, menarik tuas, atau menyalakan obor.'] },

  // Aturan dasar
  { kind: 'Aturan', name: 'Advantage dan Disadvantage', summary: 'Lempar dua d20.', points: ['Advantage: ambil hasil tertinggi. Disadvantage: ambil hasil terendah.', 'Kalau punya keduanya, saling batal dan lempar satu d20.'] },
  { kind: 'Aturan', name: 'Bonus Action', summary: 'Tindakan singkat tambahan.', points: ['Hanya bisa dipakai kalau fitur, spell, atau kemampuan memberinya.', 'Maksimal satu Bonus Action per giliran.'] },
  { kind: 'Aturan', name: 'Reaction', summary: 'Tindakan seketika di luar giliran.', points: ['Satu Reaction per ronde, pulih di awal giliranmu.', 'Contoh: Opportunity Attack atau spell seperti Shield.'] },
  { kind: 'Aturan', name: 'Opportunity Attack', summary: 'Serang musuh yang kabur.', points: ['Saat makhluk yang kamu lihat keluar dari jangkauanmu, kamu bisa memakai Reaction untuk satu serangan melee.', 'Tidak terpicu kalau makhluk itu memakai Disengage atau dipindahkan tanpa memakai gerakannya sendiri.'] },
  { kind: 'Aturan', name: 'Concentration', summary: 'Mempertahankan spell.', points: ['Hanya satu spell Concentration aktif pada satu waktu.', 'Saat terkena damage: saving throw CON dengan DC 10 atau setengah damage, maksimal DC 30.', 'Buyar kalau kamu Incapacitated atau mati.'] },
  { kind: 'Aturan', name: 'Death Saving Throw', summary: 'Bertahan hidup di 0 HP.', points: ['Di awal setiap giliran, lempar d20: 10 ke atas berhasil, di bawah 10 gagal.', 'Tiga keberhasilan berarti stabil, tiga kegagalan berarti mati.', 'Natural 20: bangun dengan 1 HP. Natural 1: dihitung dua kegagalan.', 'Terkena damage saat 0 HP dihitung satu kegagalan, Critical Hit dihitung dua.'] },
  { kind: 'Aturan', name: 'Cover', summary: 'Perlindungan dari halangan.', points: ['Half Cover: +2 AC dan saving throw DEX.', 'Three-Quarters Cover: +5 AC dan saving throw DEX.', 'Total Cover: tidak bisa ditarget langsung.'] },
  { kind: 'Aturan', name: 'Critical Hit', summary: 'Natural 20 pada attack roll.', points: ['Serangan otomatis mengenai.', 'Lempar dadu damage serangan itu dua kali, lalu tambahkan modifier seperti biasa.'] },
  { kind: 'Aturan', name: 'Grapple dan Shove', summary: 'Pilihan Unarmed Strike.', points: ['Target melakukan saving throw STR atau DEX (pilihan target) dengan DC 8 + modifier STR + Proficiency Bonus.', 'Grapple gagal disave: target Grappled. Shove gagal disave: target terdorong 5 kaki atau jatuh Prone.'] },
  { kind: 'Aturan', name: 'Short Rest', summary: 'Istirahat singkat 1 jam.', points: ['Boleh memakai Hit Dice untuk memulihkan HP: lempar dadunya dan tambahkan modifier CON.'] },
  { kind: 'Aturan', name: 'Long Rest', summary: 'Istirahat panjang 8 jam.', points: ['Pulih semua HP dan semua Hit Dice yang terpakai.', 'Tingkat Exhaustion berkurang satu.', 'Hanya satu Long Rest per 24 jam.'] },
];
