import { useState } from 'react';
import { useSyncedDraft } from './useSyncedDraft';
import { Eraser, LockKeyhole, Scroll, Sparkles } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { AlchemyView } from '../server/alchemy';
import { elements, sealInfo } from '../server/alchemy-data';
import PeriodicTable from './PeriodicTable';
import GameRules from './GameRules';
import './alchemy.css';

const roman = ['I', 'II', 'III'];

export default function Alchemy({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.alchemy as AlchemyView | undefined;
  const [reward, setReward] = useState<string | null>(null);
  // Salinan lokal slot supaya klik beruntun tidak saling menimpa sebelum server menjawab.
  const [draft, setLocalDraft] = useSyncedDraft<number[]>(t?.draft ?? [], v => v.join(','));
  const rules = <GameRules phase={game.phase}>
    <p>Lemari sang alkemis terkunci <strong>tiga segel</strong>. Di dinding terukir tabel periodik. Setiap segel dibuka dengan menyusun unsur yang tepat, dan <strong>simbol-simbolnya membentuk satu kata</strong>.</p>
    <p>Klik sebuah unsur untuk melihat golongan, periode, kategori, dan wujudnya, lalu masukkan ke slot segel. Slot dipakai bersama, jadi semua orang melihat susunan yang sama.</p>
    <p>Tidak ada batas percobaan. Setiap kali segel dicoba, jawabannya hanya benar atau salah, tanpa petunjuk bagian mana yang keliru. Segel ketiga butuh jawaban dua segel sebelumnya.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin alchemy-skin" data-phase={game.phase}>{rules}</section>;

  const won = t.seal >= sealInfo.length;
  const seal = sealInfo[Math.min(t.seal, sealInfo.length - 1)];
  const canPlay = game.phase === 'open' && !won && !disabled;
  const el = (z: number) => elements[z - 1];
  const setDraft = (next: number[]) => { setLocalDraft(next); send({ type: 'alch:draft', draft: next }); };
  const add = (z: number) => { if (canPlay && draft.length < seal.slots) setDraft([...draft, z]); };
  const word = draft.map(z => el(z).symbol).join('');
  const who = (id: string) => (id === playerId ? 'Kamu' : name(id));

  return <section className="mg-skin alchemy-skin" data-phase={game.phase}>
    {rules}

    <div className="al-top">
      <div className="al-seals" aria-label="Tiga segel">
        {sealInfo.map((s, i) => {
          const solved = t.solved[i];
          return <div key={i} className={`al-seal${solved ? ' open' : ''}${i === t.seal ? ' current' : ''}`}>
            <span className="al-seal-mark">{roman[i]}</span>
            <strong>{solved ? solved.word : '· · ·'}</strong>
            <small>{solved ? solved.answer.map(z => el(z).symbol).join(' · ') : i === t.seal ? 'sedang dibuka' : 'tersegel'}</small>
          </div>;
        })}
      </div>
      <div className="al-tries" aria-label={`${t.mistakes} percobaan gagal`}>
        <small>Percobaan gagal</small>
        <strong>{t.mistakes}</strong>
      </div>
    </div>

    {won && <div className="al-won" role="status">
      <Sparkles size={18} />
      <div>
        <div className="al-phrase">{t.solved.map(s => s.word).join(' ')}</div>
        <p>{t.reward}</p>
      </div>
    </div>}

    {!won && <div className="al-work">
      <article className="al-clues">
        <header><Scroll size={15} /><span>{seal.title}</span></header>
        <p className="al-intro">{seal.intro}</p>
        <ol>{seal.clues.map((c, i) => <li key={i}>{c}</li>)}</ol>
        {dm && t.answers && <div className="al-dm-answer">Jawaban (hanya GM): {t.answers[t.seal].map(z => el(z).symbol).join(' · ')}</div>}
      </article>

      <div className="al-slots-panel">
        <div className="al-slots" aria-label="Slot segel">
          {Array.from({ length: seal.slots }, (_, i) => {
            const z = draft[i];
            const e = z ? el(z) : null;
            return <button key={i} type="button" className={`al-slot${e ? ` filled cat-${e.category}` : ''}`} disabled={!canPlay || !e}
              title={e ? `Lepas ${e.name}` : 'Slot kosong'} onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
              {e ? <><small>{e.z}</small><b>{e.symbol}</b><em>{e.name}</em></> : <span>{i + 1}</span>}
            </button>;
          })}
        </div>
        <div className={`al-word${word ? '' : ' empty'}`} aria-live="polite">{word ? word.toUpperCase() : 'Kata akan muncul di sini'}</div>
        <div className="al-slot-actions">
          <button type="button" className="al-ghost" disabled={!canPlay || !draft.length} onClick={() => setDraft([])}><Eraser size={14} />Kosongkan</button>
          <button type="button" className="al-primary" disabled={!canPlay || draft.length !== seal.slots} onClick={() => send({ type: 'alch:submit' })}><LockKeyhole size={14} />Buka segel</button>
        </div>
      </div>
    </div>}

    <PeriodicTable
      cellClass={e => (draft.includes(e.z) ? 'in-draft' : '')}
      onCellDouble={e => add(e.z)}
      hint="Klik unsur untuk melihat sifatnya. Klik dua kali untuk langsung memasukkannya ke slot."
      action={e => <button type="button" className="al-primary" disabled={!canPlay || draft.length >= seal.slots} onClick={() => add(e.z)}>Masukkan ke slot</button>}
    />

    {!!t.log.length && <div className="al-log" aria-label="Riwayat percobaan">
      {t.log.slice().reverse().slice(0, 8).map((a, i) => (
        <div key={i} className={a.ok ? 'ok' : 'bad'}>
          <span>{who(a.by)}</span> mencoba Segel {roman[a.seal]} dengan <b>{a.guess.map(z => el(z).symbol).join(' · ')}</b>
          <em>{a.ok ? 'terbuka' : 'gagal'}</em>
        </div>
      ))}
    </div>}

    {dm && <div className="al-dm">
      <label htmlFor="al-reward">Pesan hadiah (muncul saat ketiga segel terbuka)</label>
      <textarea id="al-reward" rows={2} maxLength={300} value={reward ?? t.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === t.reward} onClick={() => { send({ type: 'alch:reward', text: reward }); setReward(null); }}>Simpan pesan</button>
    </div>}
  </section>;
}
