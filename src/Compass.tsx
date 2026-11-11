import { useState } from 'react';
import { Compass as CompassIcon, Flag, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { CompassView } from '../server/compass';
import { categoryNames, type Category } from '../server/alchemy-data';
import { compassGoal, compassMap, compassStart, dirArrow, dirDelta } from '../server/compass-data';
import GameRules from './GameRules';
import PeriodicTable, { elementAt } from './PeriodicTable';
import './compass.css';

const cardOrder: Category[] = ['alkali', 'alkaline', 'transition', 'post', 'metalloid', 'nonmetal', 'halogen', 'noble'];
const isNeighbor = (a: number, b: number) => {
  const x = elementAt(a), y = elementAt(b);
  return x.row <= 7 && y.row <= 7 && Object.values(dirDelta).some(([dr, dc]) => x.row + dr === y.row && x.col + dc === y.col);
};

export default function Compass({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.compass as CompassView | undefined;
  const [reward, setReward] = useState<string | null>(null);
  const start = elementAt(compassStart), goal = elementAt(compassGoal);
  const rules = <GameRules phase={game.phase}>
    <p>Tabel periodik di dinding ternyata sebuah <strong>labirin</strong>. Buat jalur dari <strong>{start.name} ({start.symbol})</strong> sampai <strong>{goal.name} ({goal.symbol})</strong>.</p>
    <p>Setiap langkah pindah ke kotak tetangga: atas, bawah, kiri, atau kanan. Kotak kosong, lantanida, dan aktinida tidak bisa dilewati. <strong>Arah yang boleh diambil ditentukan kategori unsur tempat kalian berdiri</strong>, sesuai kompas. Tidak boleh menginjak unsur yang sama dua kali.</p>
    <p>Banyak cabang berakhir buntu. Klik kotak tetangga untuk melangkah. Tidak ada batas percobaan, tapi jalur hanya dinilai benar atau salah saat diserahkan.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin alchemy-skin compass-skin" data-phase={game.phase}>{rules}</section>;

  const canPlay = game.phase === 'open' && !t.solved && !disabled;
  const here = t.path.at(-1)!;
  const stepOf = new Map(t.path.map((z, i) => [z, i]));
  const atGoal = here === compassGoal;
  const last = t.log.at(-1);
  const who = (id: string) => (id === playerId ? 'Kamu' : name(id));
  const answerSet = dm && t.answer ? new Set(t.answer) : null;

  return <section className="mg-skin alchemy-skin compass-skin" data-phase={game.phase}>
    {rules}

    {t.solved && <div className="al-won" role="status">
      <Sparkles size={18} />
      <div><div className="al-phrase pt-phrase">Jalur ditemukan</div><p>{t.reward}</p></div>
    </div>}
    {!t.solved && last && !last.ok && <div className="pt-fail" role="status" key={t.tries}>
      Jalur ke-{t.tries} ({last.steps} langkah) ditolak: cahayanya padam di tengah jalan. Ada langkah yang tidak sesuai kompas.
    </div>}

    <div className="cp-layout">
      <article className="al-clues cp-card">
        <header><CompassIcon size={15} /><span>Kompas Sang Alkemis</span></header>
        <p className="al-intro">Dari unsur berkategori ini, kalian hanya boleh melangkah ke arah:</p>
        <ul>
          {cardOrder.map(c => {
            const dirs = compassMap[c];
            return <li key={c} className={`cat-${c}${elementAt(here).category === c && !t.solved ? ' here' : ''}`}>
              <i />
              <span>{categoryNames[c]}</span>
              <b>{dirs ? dirs.map(d => dirArrow[d]).join('  ') : 'buntu'}</b>
            </li>;
          })}
        </ul>
        {dm && t.answer && <div className="al-dm-answer">Jalur (hanya GM): {t.answer.map(z => elementAt(z).symbol).join(' → ')}</div>}
      </article>

      <div className="cp-panel">
        <div className="cp-ends">
          <div><small>Mulai</small><b>{start.symbol}</b><span>{start.name}</span></div>
          <div className="cp-line" aria-hidden="true" />
          <div className={atGoal ? 'reached' : ''}><small>Tujuan</small><b>{goal.symbol}</b><span>{goal.name}</span></div>
        </div>
        <div className="cp-now">
          <small>Posisi sekarang</small>
          <strong>{elementAt(here).name} ({elementAt(here).symbol})</strong>
          <span>{t.path.length - 1} langkah</span>
        </div>
        <div className="cp-trail" aria-label="Jalur sejauh ini">
          {t.path.map((z, i) => <span key={i} className={`cat-${elementAt(z).category}`}>{elementAt(z).symbol}</span>)}
        </div>
        <div className="al-slot-actions">
          <button type="button" className="al-ghost" disabled={!canPlay || t.path.length < 2} onClick={() => send({ type: 'compass:undo' })}><Undo2 size={14} />Mundur</button>
          <button type="button" className="al-ghost" disabled={!canPlay || t.path.length < 2} onClick={() => send({ type: 'compass:reset' })}><RotateCcw size={14} />Ulang</button>
          <button type="button" className="al-primary" disabled={!canPlay || !atGoal} onClick={() => send({ type: 'compass:submit' })}><Flag size={14} />Serahkan jalur</button>
        </div>
      </div>
    </div>

    <PeriodicTable
      title="Labirin Unsur"
      cellClass={e => [
        stepOf.has(e.z) ? 'cp-on' : '',
        e.z === here ? 'cp-here' : '',
        e.z === compassStart ? 'cp-start' : '',
        e.z === compassGoal ? 'cp-goal' : '',
        canPlay && !stepOf.has(e.z) && isNeighbor(here, e.z) ? 'cp-next' : '',
        answerSet?.has(e.z) && !stepOf.has(e.z) ? 'cp-dm' : '',
      ].filter(Boolean).join(' ')}
      cellBadge={e => (stepOf.has(e.z) && e.z !== compassStart ? <i className="cp-step">{stepOf.get(e.z)}</i> : null)}
      onCell={e => { if (canPlay && !stepOf.has(e.z) && isNeighbor(here, e.z)) send({ type: 'compass:step', z: e.z }); }}
      hint="Klik kotak tetangga (bingkai putus-putus) untuk melangkah. Klik unsur mana pun untuk melihat kategorinya."
    />

    {!!t.log.length && <div className="al-log" aria-label="Riwayat jalur">
      {t.log.slice().reverse().slice(0, 6).map((a, i) => (
        <div key={i} className={a.ok ? 'ok' : 'bad'}><span>{who(a.by)}</span> menyerahkan jalur {a.steps} langkah<em>{a.ok ? 'benar' : 'salah'}</em></div>
      ))}
    </div>}

    {dm && <div className="al-dm">
      <label htmlFor="cp-reward">Pesan hadiah (muncul saat jalur benar)</label>
      <textarea id="cp-reward" rows={2} maxLength={300} value={reward ?? t.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === t.reward} onClick={() => { send({ type: 'compass:reward', text: reward }); setReward(null); }}>Simpan pesan</button>
    </div>}
  </section>;
}

