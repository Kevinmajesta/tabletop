import { useState } from 'react';
import { Eraser, FlaskRound, Scroll, Sparkles } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { PotionView } from '../server/potion';
import { cauldronNames, layerNames, potionPool, potionRules } from '../server/potion-data';
import GameRules from './GameRules';
import PeriodicTable, { elementAt } from './PeriodicTable';
import './potion.css';

export default function Potion({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.potion as PotionView | undefined;
  const [held, setHeld] = useState<number | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const rules = <GameRules phase={game.phase}>
    <p>Di meja sang alkemis ada <strong>sembilan bahan</strong> dan <strong>tiga kuali</strong>. Setiap kuali punya tiga lapis: atas, tengah, dan bawah. Bagi semua bahan ke kuali sesuai <strong>sepuluh aturan racikan</strong>.</p>
    <p>Aturan menyebut sifat unsur seperti periode, golongan, kategori, dan wujud. Cari sifat itu di tabel periodik di bawah. Hanya ada satu susunan yang memenuhi semua aturan.</p>
    <p>Klik bahan, lalu klik posisi di kuali. Klik bahan di kuali untuk mengembalikannya. Tidak ada batas percobaan, tapi racikan hanya dijawab benar atau salah.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin alchemy-skin potion-skin" data-phase={game.phase}>{rules}</section>;

  const canPlay = game.phase === 'open' && !t.solved && !disabled;
  const placed = new Set(t.slots.filter((z): z is number => z !== null));
  const pool = potionPool.filter(z => !placed.has(z));
  const full = t.slots.every(z => z !== null);
  const last = t.log.at(-1);
  const who = (id: string) => (id === playerId ? 'Kamu' : name(id));
  const clickSlot = (i: number) => {
    if (!canPlay) return;
    if (held !== null) { send({ type: 'potion:place', slot: i, z: held }); setHeld(null); }
    else if (t.slots[i] !== null) send({ type: 'potion:place', slot: i, z: null });
  };
  const tile = (z: number, extra = '') => {
    const e = elementAt(z);
    return <><small>{e.z}</small><b>{e.symbol}</b><em>{e.name}</em>{extra && <i>{extra}</i>}</>;
  };

  return <section className="mg-skin alchemy-skin potion-skin" data-phase={game.phase}>
    {rules}

    {t.solved && <div className="al-won" role="status">
      <Sparkles size={18} />
      <div><div className="al-phrase pt-phrase">Ramuan seimbang</div><p>{t.reward}</p></div>
    </div>}
    {!t.solved && last && !last.ok && <div className="pt-fail" role="status" key={t.tries}>
      Racikan ke-{t.tries} gagal: ramuannya mendidih lalu menghitam. Masih ada aturan yang dilanggar.
    </div>}

    <div className="pt-layout">
      <article className="al-clues pt-rules">
        <header><Scroll size={15} /><span>Aturan Racikan</span></header>
        <ol>{potionRules.map((r, i) => <li key={i}>{r}</li>)}</ol>
        {dm && t.answer && <div className="al-dm-answer">Jawaban (hanya GM): {[0, 1, 2].map(k => t.answer!.slice(k * 3, k * 3 + 3).map(z => elementAt(z).symbol).join(' / ')).join('  ·  ')}</div>}
      </article>

      <div className="pt-bench">
        <div className="pt-pool" aria-label="Bahan yang belum dipakai">
          <span className="pt-label">Bahan</span>
          <div>
            {pool.map(z => (
              <button key={z} type="button" className={`pt-tile cat-${elementAt(z).category}${held === z ? ' held' : ''}`} disabled={!canPlay}
                onClick={() => setHeld(h => (h === z ? null : z))} aria-pressed={held === z}>{tile(z)}</button>
            ))}
            {!pool.length && <p className="pt-empty">Semua bahan sudah di kuali.</p>}
          </div>
        </div>

        <div className="pt-cauldrons">
          {[0, 1, 2].map(k => (
            <div key={k} className="pt-cauldron">
              <span className="pt-cname">{cauldronNames[k]}</span>
              <div className="pt-pot">
                {[0, 1, 2].map(l => {
                  const i = k * 3 + l, z = t.slots[i];
                  return <button key={l} type="button" className={`pt-slot${z !== null ? ` filled cat-${elementAt(z).category}` : ''}${held !== null && canPlay ? ' target' : ''}`}
                    disabled={!canPlay || (z === null && held === null)} onClick={() => clickSlot(i)}
                    aria-label={`${cauldronNames[k]}, ${layerNames[l].toLowerCase()}${z !== null ? `: ${elementAt(z).name}` : ', kosong'}`}>
                    {z !== null ? tile(z) : <span>{layerNames[l]}</span>}
                  </button>;
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="al-slot-actions">
          <button type="button" className="al-ghost" disabled={!canPlay || !placed.size} onClick={() => { send({ type: 'potion:clear' }); setHeld(null); }}><Eraser size={14} />Kosongkan</button>
          <button type="button" className="al-primary" disabled={!canPlay || !full} onClick={() => send({ type: 'potion:brew' })}><FlaskRound size={14} />Racik ramuan</button>
        </div>
      </div>
    </div>

    <PeriodicTable
      cellClass={e => (potionPool.includes(e.z) ? (placed.has(e.z) ? 'pt-used' : 'pt-ingredient') : '')}
      onCell={e => { if (canPlay && potionPool.includes(e.z) && !placed.has(e.z)) setHeld(e.z); }}
      hint="Klik unsur untuk melihat sifatnya. Bahan ramuan ditandai bingkai emas di tabel."
    />

    {!!t.log.length && <div className="al-log" aria-label="Riwayat racikan">
      {t.log.slice().reverse().slice(0, 6).map((a, i) => (
        <div key={i} className={a.ok ? 'ok' : 'bad'}><span>{who(a.by)}</span> meracik ramuan<em>{a.ok ? 'berhasil' : 'gagal'}</em></div>
      ))}
    </div>}

    {dm && <div className="al-dm">
      <label htmlFor="pt-reward">Pesan hadiah (muncul saat ramuan berhasil)</label>
      <textarea id="pt-reward" rows={2} maxLength={300} value={reward ?? t.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === t.reward} onClick={() => { send({ type: 'potion:reward', text: reward }); setReward(null); }}>Simpan pesan</button>
    </div>}
  </section>;
}
