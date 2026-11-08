import type { Game } from '../server/minigames';
import { candleColors, candleRunes, runeGlyphs, candleCount, ritualSeals, type RitualView } from '../server/ritual';
import './ritual.css';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const visionText = {
  color: { title: 'Penglihatan Warna', body: 'Kamu melihat warna lilin, tapi rune-nya kabur. Tanyakan rune kepada yang berpenglihatan rune.' },
  rune: { title: 'Penglihatan Rune', body: 'Kamu melihat rune di kaki lilin, tapi warnanya pudar. Tanyakan warna kepada yang berpenglihatan warna.' },
  all: { title: 'Penglihatan Penuh', body: 'Kamu melihat warna dan rune setiap lilin.' },
  none: { title: 'Penonton', body: 'Kamu menyaksikan ritual. Hanya peserta yang bisa menyalakan lilin.' },
} as const;

export default function Ritual({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const r = game.ritual as RitualView | undefined;
  if (!r) return <p className="ritual-intro">Delapan lilin menunggu dinyalakan. Setiap peserta memegang sebagian langkah ritual dan hanya bisa melihat warna atau rune lilin. Bicarakan petunjuk kalian, lalu nyalakan lima lilin sesuai urutan.</p>;
  const open = game.phase === 'open';
  const playing = open && game.players.includes(playerId);
  const nextHolder = r.progress < r.steps ? game.players[r.holders[r.progress]] : undefined;
  const vision = visionText[r.vision];
  const myIndex = game.players.indexOf(playerId);

  return (
    <div className={`ritual ritual-${game.result || 'idle'}`}>
      <div className="ritual-stage">
        <div className="ritual-circle" role="group" aria-label="Lingkaran lilin">
          <svg className="ritual-sigil" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="70" className="thin" />
            <polygon points={Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; return `${100 + 70 * Math.cos(a)},${100 + 70 * Math.sin(a)}`; }).join(' ')} />
            <circle cx="100" cy="100" r="24" className="core" />
          </svg>
          <div className="ritual-altar" aria-hidden="true">
            <span>{r.progress}</span>
            <small>dari {r.steps}</small>
          </div>
          {r.candles.map((c, i) => {
            const angle = -90 + (i * 360) / candleCount;
            const color = c.color === null ? null : candleColors[c.color];
            const rune = c.rune === null ? null : candleRunes[c.rune];
            const label = `Lilin ${i + 1}, ${color ? `warna ${color}` : 'warna tak terlihat'}, ${rune ? `rune ${rune}` : 'rune tak terlihat'}${c.lit ? ', menyala' : ''}`;
            return (
              <button
                key={i}
                type="button"
                className={`ritual-candle${c.lit ? ' lit' : ''}${c.wrong ? ' wrong' : ''}`}
                style={{ ['--angle' as string]: `${angle}deg`, ['--wax' as string]: c.color === null ? undefined : `var(--wax-${c.color})` }}
                data-hidden-color={c.color === null ? '' : undefined}
                disabled={!playing || disabled || c.lit}
                aria-label={label}
                title={label}
                onClick={() => send({ type: 'ritual:light', candle: i })}
              >
                <span className="ritual-flame" aria-hidden="true" />
                <span className="ritual-wax" aria-hidden="true" />
                <span className="ritual-base" aria-hidden="true">{c.rune === null ? '·' : runeGlyphs[c.rune]}</span>
                <span className="ritual-num" aria-hidden="true">{i + 1}</span>
              </button>
            );
          })}
        </div>
        <div className="ritual-seals" aria-label={`Segel tersisa ${r.seals} dari ${ritualSeals}`}>
          {Array.from({ length: ritualSeals }, (_, i) => <span key={i} className={i < r.seals ? 'whole' : 'broken'} aria-hidden="true" />)}
          <small>Segel</small>
        </div>
      </div>

      <aside className="ritual-scroll">
        <header>
          <span className="ritual-kicker">{vision.title}</span>
          <p>{vision.body}</p>
          {(r.vision === 'rune' || r.vision === 'all') && (
            <ul className="ritual-legend" aria-label="Kunci rune">
              {candleRunes.map((rune, i) => <li key={rune}><b aria-hidden="true">{runeGlyphs[i]}</b>{rune}</li>)}
            </ul>
          )}
          {(r.vision === 'color' || r.vision === 'all') && (
            <ul className="ritual-legend" aria-label="Kunci warna">
              {candleColors.map((color, i) => <li key={color}><i aria-hidden="true" style={{ background: `var(--wax-${i})` }} />{color}</li>)}
            </ul>
          )}
        </header>

        <div className="ritual-status" role="status" aria-live="polite">
          {game.result === 'win' && <p className="good">Ritual sempurna. Lingkaran menyala terang dan segel terbuka.</p>}
          {game.result === 'lost' && <p className="bad">Segel terakhir hancur. Ritual gagal.</p>}
          {game.result === 'backfire' && <p className="bad">Ritual meledak. Semua lilin padam dan satu segel retak. Mulai lagi dari langkah I.</p>}
          {open && game.result !== 'backfire' && nextHolder && (
            <p>Langkah {ROMAN[r.progress]} dipegang <strong>{nextHolder === playerId ? 'kamu' : name(nextHolder)}</strong>.</p>
          )}
        </div>

        <ol className="ritual-steps">
          {Array.from({ length: r.steps }, (_, step) => {
            const mine = r.myClues.find(c => c.step === step);
            const holder = game.players[r.holders[step]];
            const state = step < r.progress ? 'done' : step === r.progress && open ? 'current' : 'later';
            return (
              <li key={step} className={`${state}${mine ? ' mine' : ''}`}>
                <span className="ritual-step-num">{ROMAN[step]}</span>
                <div>
                  {mine ? <p>{mine.text}</p> : <p className="sealed">Gulungan milik {holder === playerId ? 'kamu' : name(holder)}</p>}
                  {(dm || game.phase === 'finished') && r.order && <small>Lilin {r.order[step] + 1}</small>}
                </div>
              </li>
            );
          })}
        </ol>

        {!dm && myIndex >= 0 && open && <p className="ritual-hint">Klik lilin untuk menyalakannya. Semua peserta bisa menyalakan lilin, jadi sepakati dulu sebelum menyentuhnya.</p>}
        {dm && open && <p className="ritual-hint">Tampilan GM: semua petunjuk dan urutan jawaban terlihat. Pemain tidak melihat ini.</p>}
      </aside>
    </div>
  );
}
