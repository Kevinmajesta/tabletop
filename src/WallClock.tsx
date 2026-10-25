import { useState } from 'react';
import type { Game } from '../server/minigames';

const clues = [
  'Jam Penjaga: angka jamnya adalah salah satu dari 1, 2, 3, atau 4. Jarum panjang sudah melewati angka 6, tetapi belum kembali ke angka 12. Pada lingkaran jam, angka jam Penjaga berseberangan dengan angka jam Pengelana.',
  'Jam Pengelana: angka jamnya adalah salah satu dari 7, 8, 9, atau 10. Jarum panjang menunjuk angka 2, 3, atau 4. Posisi jarum panjangnya berseberangan dengan jarum panjang Penjaga.',
  'Jam Penjaga Malam: angka jamnya genap dan merupakan salah satu dari 3, 4, 5, atau 6. Dari angka jam Pengelana, hitung dua langkah angka berlawanan arah jarum jam untuk menemukan angka jam Penjaga Malam. Jarum panjangnya menunjuk angka ganjil dan merupakan bayangan jarum panjang Pengelana pada cermin yang membelah lingkaran jam melalui angka 12 dan 6.'
];
export default function WallClock({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const [times, setTimes] = useState([[12, 0], [12, 0], [12, 0]]);
  return <section>
    <p>Di ruangan ini terdapat tiga jam dinding yang berhenti dan sebuah pintu yang terkunci. Untuk membuka pintu, tentukan waktu yang seharusnya ditunjukkan oleh setiap jam dengan menggabungkan ketiga petunjuk. Atur jarumnya, lalu tekan tombol Kunci pada setiap jam. Semua pemain boleh membantu.</p>
    <p>Gunakan format 12 jam: setelah pukul 12.59, waktu berlanjut ke pukul 01.00. Menit pada setiap jam harus merupakan kelipatan lima. Jarum pendek menunjukkan jam, sedangkan jarum panjang menunjukkan menit.</p>
    <p>“Angka jam” berarti angka yang dipilih pada kolom Jam, bukan posisi tepat jarum pendek. Contohnya, pukul 11.20 memiliki angka jam 11. “Berseberangan” berarti tepat di sisi seberang lingkaran, seperti angka 12 dan 6. Pencerminan melalui garis 12–6 menukar sisi kiri dan kanan, tanpa menukar bagian atas dan bawah.</p>
    {game.phase !== 'waiting' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {times.map((draft, clock) => {
        const solved = !!game.board[clock];
        const [hour, minute] = solved ? game.board[clock].split(':').map(Number) : draft;
        const locked = disabled || solved || game.phase !== 'open';
        return <fieldset key={clock} disabled={locked} style={{ minWidth: 0 }}>
          <legend>{['Jam Penjaga', 'Jam Pengelana', 'Jam Penjaga Malam'][clock]}{solved ? ' · terkunci' : ''}</legend>
          <p>{clues[clock]}</p>
          <svg viewBox="0 0 200 200" role="img" aria-label={`Jam ${clock + 1}, posisi jarum ${hour}:${String(minute).padStart(2, '0')}`} style={{ width: '100%', maxWidth: 240, display: 'block', margin: 'auto' }}>
            <circle cx="100" cy="100" r="94" fill="#152925" stroke="#73968c" strokeWidth="3" />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i + 1) * Math.PI / 6;
              return <text key={i} x={100 + Math.sin(angle) * 76} y={100 - Math.cos(angle) * 76} fill="#d6e3df" textAnchor="middle" dominantBaseline="central" fontSize="14">{i + 1}</text>;
            })}
            <line x1="100" y1="100" x2="100" y2="54" stroke="#e3c787" strokeWidth="6" strokeLinecap="round" transform={`rotate(${hour * 30 + minute / 2} 100 100)`} />
            <line x1="100" y1="100" x2="100" y2="34" stroke="#d6e3df" strokeWidth="3" strokeLinecap="round" transform={`rotate(${minute * 6} 100 100)`} />
            <circle cx="100" cy="100" r="5" fill="#e3c787" />
          </svg>
          <form onSubmit={event => { event.preventDefault(); if (!locked) send({ type: 'clock:set', clock, hour, minute }); }}>
            <label>Jam<select value={hour} onChange={event => setTimes(current => current.map((time, index) => index === clock ? [Number(event.target.value), time[1]] : time))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
            <label>Menit<select value={minute} onChange={event => setTimes(current => current.map((time, index) => index === clock ? [time[0], Number(event.target.value)] : time))}>{Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}</select></label>
            <button disabled={locked}>Kunci jam {clock + 1}</button>
          </form>
        </fieldset>;
      })}
    </div>}
    {game.phase === 'finished' && <p role="status">Ketiga jam berdentang. Pintu terbuka!</p>}
  </section>;
}
