# Meja Petualang

Virtual tabletop sederhana untuk bermain D&D bersama di browser. Satu server Node.js menyajikan tampilan React dan sinkronisasi realtime lewat Socket.IO.

## Jalankan di komputer sendiri

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka **http://localhost:5173**. Buat ruang sebagai Dungeon Master, lalu bagikan tautan atau kode ruang kepada pemain. Untuk perangkat lain di jaringan yang sama, gunakan alamat IP komputer host sebagai pengganti `localhost` (misalnya `http://192.168.1.10:5173`). Semua perangkat harus bisa menjangkau komputer host.

## Fitur awal

- DM membuat ruang dan dapat mengunggah atau mengganti peta.
- Pemain masuk melalui tautan/kode ruang; semua anggota dapat mengunggah token. Pemilik token dan DM bisa menggeser atau menghapus token tersebut.
- Chat dan lempar dadu (d4, d6, d8, d10, d12, d20, d100) tersinkron secara realtime.
- Data ruang dan identitas pemain tersimpan saat server restart. Kunci DM tersimpan di browser pembuat ruang: gunakan browser yang sama saat kembali untuk mendapat akses DM. Jangan bagikan kunci DM.
- Gambar PNG, JPG, WebP, atau GIF maksimal 10 MB per gambar.

## Jalankan sebagai satu server (deploy)

```bash
npm install
npm run build
npm start
```

Buka **http://localhost:3001** (atau port pada variabel lingkungan `PORT`). Server perlu mendukung WebSocket dan folder **`data/` harus persisten** pada hosting agar ruang dan gambar tidak hilang saat deploy ulang. Simpan/backup folder `data/` untuk memindahkan campaign. Untuk bermain jarak jauh, jalankan di server dengan HTTPS atau gunakan tunnel/VPN seperti Tailscale; audio/voice bisa lewat Discord.

Jika hosting menyediakan volume di lokasi lain, atur variabel lingkungan `DATA_DIR` ke path folder volume tersebut. Jalankan `npm test` sesudah `npm run build` untuk menguji alur dasar dua pemain; data tes disimpan di folder sementara.

## Alat meja

Tombol **DM** (ikon mahkota) mengumpulkan scene/grid, peta, fog/dinding/cahaya, visibilitas token, kontrol combat, undo dan backup campaign dengan gambar. Undo mengembalikan aksi panel DM terakhir jika campaign belum berubah lagi; revisi karakter tetap meningkat. Backup tidak mengandung kunci DM atau secret pemain. Restore backup belum tersedia lewat UI.

Token terhubung menyediakan **Buka sheet**. Bagian HP & Rest memiliki Damage/Heal (temporary HP diserap lebih dulu); Spell menyediakan pencarian/filter, concentration dan penggantian prepared spells tanpa rebuild. Spell Savant tetap perlu dipilih sebagai prepared. Pengingat concentration memakai DC maksimal 30 sesuai 2024. Indikator penyimpanan menunjukkan penulisan disk selesai, bukan hanya sinkronisasi socket.

## Character builder

Tombol **Karakter** membuka builder D&D 2024 level 1–5: 12 class, 48 subclass (empat per class), 16 background, ability, proficiency, equipment, spellbook/prepared spells, ASI atau Grappler level 4. Subclass dipilih mulai level 3. Sheet menyediakan advantage/disadvantage, critical damage dice, slot per level, resource class, short/long rest, export/import JSON, dan hubungan HP dengan token. HP naik level memakai rata-rata hit die. Efek situasional dan keputusan target tetap dijalankan bersama DM.

Katalog disimpan lokal di `server/catalog/`. UI menggunakan 2024; backend mempertahankan kompatibilitas data lama. Pilihan Metamagic, Eldritch Invocations, Fighting Style, dan subclass tersedia sampai level 5. Katalog PHB tambahan memakai ringkasan aturan, bukan salinan narasi buku. Belum ada multiclass atau simulasi otomatis seluruh efek spell, companion, maneuver, dan tabel Wild Magic.

Three.js dan karakter dimuat saat diperlukan. Server memakai gzip, worker dadu reusable, patch state untuk browser baru, serta penyimpanan JSON async yang menggabungkan perubahan selama 200 ms dan memakai rename atomik. SIGTERM/SIGINT menunggu penyimpanan selesai. Restart paksa dapat kehilangan perubahan yang belum ditulis.

SRD 5.1: © 2016 Wizards of the Coast LLC, tersedia melalui [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sumber SRD: [D&D 5e API](https://www.dnd5eapi.co/). Background tambahan: [Open5e](https://open5e.com/), judul sumber dan URL lisensi dipertahankan dalam katalog. `node scripts/fetch-srd.mjs` dan `node scripts/fetch-backgrounds.mjs` memperbarui snapshot dari sumber, lalu perlu build ulang. Aplikasi tidak mengambil API eksternal saat karakter dibuat.

Buka **Alat & Scene** di kiri atas. Tab Alat menyediakan penggaris (`R`), ping (`P`), lingkaran, cone 60°, kotak, garis, dan teks. Seret untuk menggambar. Penggaris memakai skala scene; `F` menambah waypoint, `Alt` melepas snap, `Escape` membatalkan. Pengukuran dapat dibagikan ke party. Ping sementara terlihat bersama; DM memakai `Shift` saat ping untuk memusatkan kamera pemain yang dapat melihat lokasi tersebut.

Tab Scene khusus DM mengatur scene aktif, kolom/offset grid, jarak per kotak, satuan, dan aturan diagonal. Setiap scene menyimpan peta, token, bentuk, fog, dan combat sendiri. Unggah peta melalui alat gambar setelah membuat scene.

Tab Token menyediakan HP, HP maksimum, initiative, kondisi, dan jarak pandang. DM dapat menyembunyikan token. Tab Combat mengurutkan token berdasarkan initiative, menghitung ronde, melewati token Defeated, dan membatasi pergantian giliran pemain pada token miliknya.

Fog manual menutup peta; alat Buka fog membuka persegi panjang, dan menghapus persegi panjang tersebut menutupnya kembali. Vision menggunakan token milik pemain yang disetujui DM lewat **Token menjadi sumber vision pemain**, jarak pandang, dan dinding. Pemain tidak bisa menaikkan jarak pandang atau menyeberangi dinding saat vision aktif. Matikan Cahaya siang untuk memakai radius sumber cahaya. Token yang tidak terlihat disaring server dari state pemain.

**Batas visibilitas:** fog dan pencahayaan peta merupakan overlay tampilan, bukan pengamanan berkas peta. Gambar peta lengkap dan geometri dinding/cahaya tetap dikirim ke browser. Jangan menaruh informasi rahasia langsung pada gambar peta.
