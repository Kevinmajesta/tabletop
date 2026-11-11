import { useState } from 'react';
import { Check, LockKeyhole, LockKeyholeOpen, Scroll } from 'lucide-react';
import type { Game } from '../server/minigames';
import { houseRules, tavernChances, tavernMenu, tavernNoteText as tavernNotes } from '../server/tavern-data';
import type { TavernView } from '../server/tavern';
import GameRules from './GameRules';
import './tavern.css';

// Harga ditampilkan seperti di menu tavern sungguhan: campuran gp, sp, dan cp.
const coins = (cp: number) => {
  const gp = Math.floor(cp / 100), sp = Math.floor((cp % 100) / 10), c = cp % 10;
  return [gp && `${gp} gp`, sp && `${sp} sp`, c && `${c} cp`].filter(Boolean).join(' ') || '0 cp';
};

export default function TavernBill({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.tavern as TavernView | undefined;
  const [drafts, setDrafts] = useState<string[]>(tavernNotes.map(() => ''));
  const [reward, setReward] = useState<string | null>(null);
  const rules = <GameRules phase={game.phase}>
    <p>Pemilik tavern menyimpan petunjuk berikutnya di dalam peti berkunci. Ia hanya mau membukanya kalau kalian bisa <strong>menghitung tiga nota tagihan lama</strong> dengan benar.</p>
    <p>Semua angka diambil dari <strong>menu tavern</strong>. Baca juga <strong>Aturan Rumah</strong> di bawah menu, karena ada promo, potongan, dan denda yang ikut dihitung. Ingat: 1 gp = 10 sp = 100 cp.</p>
    <p>Setiap jawaban ditulis dalam <strong>cp</strong>. Kalian berbagi {tavernChances} kesempatan salah. Kalau habis, pemilik tavern menolak membuka peti.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin tavern-skin" data-phase={game.phase}>{rules}</section>;

  const won = t.solved.every(Boolean);
  const lost = game.phase === 'finished' && !won;
  const canPlay = game.phase === 'open' && !disabled;
  const submit = (i: number) => {
    const value = Number(drafts[i].replace(/[^\d]/g, ''));
    if (!canPlay || t.solved[i] || !drafts[i].trim() || !Number.isFinite(value)) return;
    send({ type: 'tavern:answer', note: i, value });
    setDrafts(d => d.map((v, j) => (j === i ? '' : v)));
  };
  const who = (id: string) => (id === playerId ? 'Kamu' : name(id));

  return <section className="mg-skin tavern-skin" data-phase={game.phase}>
    {rules}

    <div className={`tv-chest${won ? ' open' : ''}${lost ? ' refused' : ''}`}>
      <div className="tv-chest-icon">{won ? <LockKeyholeOpen size={26} /> : <LockKeyhole size={26} />}</div>
      <div className="tv-chest-rows" aria-label="Kunci peti">
        {tavernNotes.map((note, i) => (
          <span key={i} className={t.solved[i] ? 'done' : ''}>{t.solved[i] ? t.answers[i] : '• • •'}</span>
        ))}
      </div>
      <div className="tv-chances" aria-label={`Sisa kesempatan ${t.chances} dari ${tavernChances}`}>
        <small>Kesempatan</small>
        <div>{Array.from({ length: tavernChances }, (_, i) => <i key={i} className={i < t.chances ? 'on' : ''} />)}</div>
      </div>
    </div>

    {won && <div className="tv-reward" role="status">
      <Scroll size={18} />
      <div><strong>Peti terbuka!</strong><p>{t.reward}</p></div>
    </div>}
    {lost && <div className="tv-refused" role="status">Pemilik tavern menggeleng dan menutup petinya rapat-rapat. Minta GM mengulang ronde untuk mencoba lagi.</div>}

    <div className="tv-layout">
      <article className="tv-menu" aria-label="Menu tavern">
        <header>
          <small>Selamat datang di</small>
          <h3>Tavern Tanduk Emas</h3>
          <span className="tv-flourish" aria-hidden="true">✦</span>
        </header>
        {tavernMenu.map(sec => (
          <section key={sec.section}>
            <h4>{sec.section}</h4>
            <ul>
              {sec.items.map(item => (
                <li key={item.id}>
                  <span className="tv-item"><b>{item.name}</b><em>{item.note}</em></span>
                  <span className="tv-dots" aria-hidden="true" />
                  <span className="tv-price">{coins(item.cp)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <footer>
          <h4>Aturan Rumah</h4>
          <ol>{houseRules.map((r, i) => <li key={i}>{r}</li>)}</ol>
          <p className="tv-rate">1 gp = 10 sp = 100 cp</p>
        </footer>
      </article>

      <div className="tv-notes">
        {tavernNotes.map((note, i) => (
          <article key={i} className={`tv-note${t.solved[i] ? ' solved' : ''}`}>
            <header>
              <span className="tv-note-no">Nota {i + 1}</span>
              <span className="tv-note-day">Hari {note.day}</span>
            </header>
            <h4>{note.title}</h4>
            <p>{note.text}</p>
            <p className="tv-ask">{note.ask}</p>
            <span className="tv-sign">— {note.signed}</span>
            {t.solved[i] ? (
              <div className="tv-paid"><Check size={15} />Lunas · {t.answers[i]} cp</div>
            ) : game.phase === 'open' ? (
              <form className="tv-answer" onSubmit={e => { e.preventDefault(); submit(i); }}>
                <input
                  inputMode="numeric"
                  value={drafts[i]}
                  onChange={e => setDrafts(d => d.map((v, j) => (j === i ? e.target.value.replace(/[^\d]/g, '').slice(0, 6) : v)))}
                  placeholder="Jawaban"
                  aria-label={`Jawaban nota ${i + 1} dalam cp`}
                  disabled={!canPlay}
                />
                <span className="tv-unit">cp</span>
                <button type="submit" disabled={!canPlay || !drafts[i]}>Serahkan</button>
              </form>
            ) : null}
            {(dm || lost) && !t.solved[i] && t.answers[i] !== null && <div className="tv-dm-answer">{dm ? 'Jawaban (hanya GM)' : 'Jawaban'}: {t.answers[i]} cp</div>}
          </article>
        ))}
      </div>
    </div>

    {!!t.log.length && <div className="tv-log" aria-label="Riwayat jawaban">
      {t.log.slice().reverse().slice(0, 8).map((a, i) => (
        <div key={i} className={a.ok ? 'ok' : 'bad'}>
          <span>{who(a.by)}</span> menyerahkan <b>{a.value} cp</b> untuk Nota {a.note + 1}
          <em>{a.ok ? 'benar' : 'salah'}</em>
        </div>
      ))}
    </div>}

    {dm && <div className="tv-dm">
      <label htmlFor="tv-reward">Petunjuk hadiah (muncul saat peti terbuka)</label>
      <textarea id="tv-reward" rows={2} maxLength={300} value={reward ?? t.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === t.reward} onClick={() => { send({ type: 'tavern:reward', text: reward }); setReward(null); }}>Simpan petunjuk</button>
    </div>}
  </section>;
}
