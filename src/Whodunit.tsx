import type { Game } from '../server/minigames';
import { suspects, statementTexts, honestCount } from '../server/whodunit';

const faces = ['🧙', '🛡️', '🗡️', '🧝', '🦅', '🎭'];

export default function Whodunit({ game, disabled, send }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void }) {
  const w = game.whodunit;
  const open = game.phase === 'open' && !!w;
  const culprit = w?.draftCulprit ?? null, honest = w?.draftHonest ?? [];
  const sync = (c: number | null, h: number[]) => send({ type: 'whodunit:draft', culprit: c, honest: h });
  const toggle = (i: number) => sync(culprit, honest.includes(i) ? honest.filter(x => x !== i) : [...honest, i]);
  const full = honest.length === honestCount;
  const ready = open && !disabled && culprit !== null && full;
  return <section className="whodunit">
    <p className="whodunit-intro">Sebuah relik dicuri. Enam tersangka masing-masing mengucapkan satu pernyataan. <strong>Tepat tiga orang jujur</strong>, tiga lainnya berbohong. Tentukan <em>siapa pencurinya</em> dan <em>siapa saja yang jujur</em>. Pilihan dibagikan ke semua pemain.</p>
    {game.phase !== 'waiting' && w && <>
      <ul className="whodunit-cards">{suspects.map((name, i) => {
        const isCulprit = culprit === i, isHonest = honest.includes(i);
        // Hanya menandai pilihan tim, bukan kunci jawaban: warna netral dan tanpa label "Bohong" otomatis.
        return <li key={name} className={`suspect${isCulprit || isHonest ? ' picked' : ''}`}>
          <header><span className="suspect-face" aria-hidden="true">{faces[i]}</span><b>{name}</b>{isCulprit && <span className="suspect-tag">Dipilih: pencuri</span>}{isHonest && <span className="suspect-tag">Dipilih: jujur</span>}</header>
          <blockquote>{statementTexts[i]}</blockquote>
          <div className="suspect-actions">
            <button type="button" aria-pressed={isCulprit} disabled={disabled || !open} onClick={() => sync(isCulprit ? null : i, honest)}>🕵 Pencuri</button>
            <button type="button" aria-pressed={isHonest} disabled={disabled || !open || (!isHonest && full)} onClick={() => toggle(i)}>✓ Jujur</button>
          </div>
        </li>;
      })}</ul>
      <footer className="whodunit-bar">
        <span>Pencuri: <b>{culprit === null ? 'belum dipilih' : suspects[culprit]}</b></span>
        <span className="whodunit-pips" aria-label={`Jujur dipilih ${honest.length} dari ${honestCount}`}>{Array.from({ length: honestCount }, (_, i) => <i key={i} className={i < honest.length ? 'on' : ''} />)}<small>{honest.length}/{honestCount} jujur</small></span>
        {open && <button className="whodunit-submit" disabled={!ready} onClick={() => send({ type: 'whodunit:submit' })}>Ajukan jawaban</button>}
      </footer>
      {w.attempts > 0 && game.result === 'wrong' && open && <p role="alert" className="whodunit-wrong">✕ Jawaban belum konsisten dengan semua pernyataan ({w.attempts}x salah).</p>}
      {game.phase === 'finished' && <p role="status" className="whodunit-win">✓ {w.reveal}</p>}
    </>}
  </section>;
}
