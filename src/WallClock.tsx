import { Lock, Minus, Plus } from 'lucide-react';
import type { Game } from '../server/minigames';
import GameRules from './GameRules';
import './wallclock.css';

const clockNames = ['Jam Penjaga', 'Jam Pengelana', 'Jam Penjaga Malam'];
const clues = [
  'Angka jamnya salah satu dari 1, 2, 3, atau 4. Jarum panjang sudah melewati angka 6, tetapi belum kembali ke angka 12. Pada lingkaran jam, angka jam Penjaga berseberangan dengan angka jam Pengelana.',
  'Angka jamnya salah satu dari 7, 8, 9, atau 10. Jarum panjang menunjuk angka 2, 3, atau 4. Posisi jarum panjangnya berseberangan dengan jarum panjang Penjaga.',
  'Angka jamnya genap dan salah satu dari 3, 4, 5, atau 6. Dari angka jam Pengelana, hitung dua langkah angka berlawanan arah jarum jam untuk menemukan angka jam Penjaga Malam. Jarum panjangnya menunjuk angka ganjil dan merupakan bayangan jarum panjang Pengelana pada cermin yang membelah lingkaran jam melalui angka 12 dan 6.',
];

const parseTime = (str?: string): [number, number] => {
  if (!str) return [12, 0];
  const [h, m] = str.split(':').map(Number);
  return [Number.isInteger(h) && h >= 1 && h <= 12 ? h : 12, Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0];
};
const wrapHour = (h: number) => ((h - 1 + 12) % 12) + 1;
// Menit selalu kelipatan lima. Kalau nilai lama bukan kelipatan lima, langkah pertama membulatkannya.
const stepMinute = (m: number, dir: 1 | -1) => {
  const base = dir === 1 ? Math.floor(m / 5) * 5 + 5 : Math.ceil(m / 5) * 5 - 5;
  return (base + 60) % 60;
};

export default function WallClock({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const solvedCount = [0, 1, 2].filter(i => !!game.board[i]).length;
  return <section className="mg-skin wallclock-skin" data-phase={game.phase}>
    <GameRules phase={game.phase}>
      <p>Tiga jam dinding berhenti dan pintu ruangan terkunci. Tentukan waktu yang seharusnya ditunjukkan setiap jam dengan menggabungkan ketiga petunjuk. Atur jarumnya, lalu kunci setiap jam. Semua pemain boleh membantu.</p>
      <p>Gunakan format 12 jam. Setelah 12.59, waktu berlanjut ke 01.00. Menit selalu kelipatan lima. Jarum pendek menunjukkan jam, jarum panjang menunjukkan menit.</p>
      <p><strong>Angka jam</strong> berarti angka jam yang dipilih, bukan posisi tepat jarum pendek. Contohnya, pukul 11.20 punya angka jam 11. <strong>Berseberangan</strong> berarti tepat di sisi seberang lingkaran, seperti 12 dan 6. Pencerminan melalui garis 12 ke 6 menukar sisi kiri dan kanan, tanpa menukar atas dan bawah.</p>
    </GameRules>

    {game.phase !== 'waiting' && <>
      <ul className="mg-stats">
        <li><span>Jam terkunci</span><strong>{solvedCount}<small>/3</small></strong></li>
      </ul>
      <div className="wc-clocks">
        {[0, 1, 2].map(clock => {
          const solved = !!game.board[clock];
          const [hour, minute] = solved ? parseTime(game.board[clock]) : parseTime(game.clockTimes?.[clock]);
          const locked = disabled || solved || game.phase !== 'open';
          const adjust = (h: number, m: number) => send({ type: 'clock:adjust', clock, hour: h, minute: m });
          return <article key={clock} className={`wc-card${solved ? ' solved' : ''}`}>
            <header>
              <h4>{clockNames[clock]}</h4>
              {solved && <span className="wc-badge"><Lock size={12} aria-hidden="true" /> Terkunci</span>}
            </header>
            <p className="wc-clue">{clues[clock]}</p>
            <svg className="wc-face" viewBox="0 0 200 200" role="img" aria-label={`${clockNames[clock]}, jarum menunjuk ${hour}:${String(minute).padStart(2, '0')}`}>
              <circle cx="100" cy="100" r="96" className="rim" />
              <circle cx="100" cy="100" r="86" className="dial" />
              {Array.from({ length: 60 }, (_, i) => {
                const a = (i * Math.PI) / 30, major = i % 5 === 0;
                return <line key={i} x1={100 + Math.sin(a) * 84} y1={100 - Math.cos(a) * 84} x2={100 + Math.sin(a) * (major ? 76 : 80)} y2={100 - Math.cos(a) * (major ? 76 : 80)} className={major ? 'tick major' : 'tick'} />;
              })}
              {Array.from({ length: 12 }, (_, i) => {
                const angle = ((i + 1) * Math.PI) / 6;
                return <text key={i} x={100 + Math.sin(angle) * 64} y={100 - Math.cos(angle) * 64} textAnchor="middle" dominantBaseline="central">{i + 1}</text>;
              })}
              <line x1="100" y1="108" x2="100" y2="58" className="hand hour" transform={`rotate(${hour * 30 + minute / 2} 100 100)`} />
              <line x1="100" y1="112" x2="100" y2="34" className="hand minute" transform={`rotate(${minute * 6} 100 100)`} />
              <circle cx="100" cy="100" r="5" className="pin" />
            </svg>
            <div className="wc-controls">
              <div className="wc-stepper">
                <span>Jam</span>
                <div>
                  <button type="button" aria-label={`Kurangi jam ${clockNames[clock]}`} disabled={locked} onClick={() => adjust(wrapHour(hour - 1), minute)}><Minus size={14} /></button>
                  <strong>{hour}</strong>
                  <button type="button" aria-label={`Tambah jam ${clockNames[clock]}`} disabled={locked} onClick={() => adjust(wrapHour(hour + 1), minute)}><Plus size={14} /></button>
                </div>
              </div>
              <div className="wc-stepper">
                <span>Menit</span>
                <div>
                  <button type="button" aria-label={`Kurangi menit ${clockNames[clock]}`} disabled={locked} onClick={() => adjust(hour, stepMinute(minute, -1))}><Minus size={14} /></button>
                  <strong>{String(minute).padStart(2, '0')}</strong>
                  <button type="button" aria-label={`Tambah menit ${clockNames[clock]}`} disabled={locked} onClick={() => adjust(hour, stepMinute(minute, 1))}><Plus size={14} /></button>
                </div>
              </div>
            </div>
            <button type="button" className="mg-btn primary wc-lock" disabled={locked} onClick={() => send({ type: 'clock:set', clock, hour, minute })}>{solved ? 'Jam terkunci' : 'Kunci jam ini'}</button>
          </article>;
        })}
      </div>
    </>}
    {game.phase === 'finished' && <p role="status" className="mg-alert good">Ketiga jam berdentang. Pintu terbuka!</p>}
  </section>;
}
