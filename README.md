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

Ini versi awal tabletop, belum mencakup character sheet, fog of war, maupun dynamic lighting.
