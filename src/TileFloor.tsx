import { useEffect, useState } from 'react';
import { Footprints, Heart, Map as MapIcon } from 'lucide-react';
import type { Game } from '../server/minigames';
import { tileCols, tileRows, tileGlyphs, tileNames, tileColors, tileLives, stepSecs, adjacent } from '../server/tilefloor';
import GameRules from './GameRules';
import './tilefloor.css';

const bandName = ['Zona 1', 'Zona 2', 'Zona 3'];
const bandNote = ['1 syarat', '2 syarat', '3 syarat'];
const colorCss = ['#e0675d', '#5c9ae8', '#5fb67a', '#e5c552'];

export default function TileFloor({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.tiles;
  const open = game.phase === 'open';
  // Jam server dibandingkan dengan jam lokal sekali, agar selisih jam antar perangkat tidak memengaruhi hitung mundur.
  const [skew, setSkew] = useState(0);
  const [left, setLeft] = useState(0);
  useEffect(() => { if (t?.now) setSkew(t.now - Date.now()); }, [t?.now, t?.deadline]);
  useEffect(() => {
    if (!t || !open) return;
    let reported = false;
    const tick = () => {
      const s = Math.max(0, Math.ceil((t.deadline - (Date.now() + skew)) / 1000));
      setLeft(s);
      if (s <= 0 && !reported && !disabled) { reported = true; send({ type: 'tile:timeout' }); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [t?.deadline, open, skew, disabled]);

  const rules = <GameRules phase={game.phase}>
    <p><strong>Pemandu</strong> ({name(game.players[0])}) memegang aturan ubin aman, tapi tidak melihat lantai. <strong>Pejalan</strong> ({name(game.players[1])}) melihat ubin di sekitarnya saja, tapi tidak tahu aturannya.</p>
    <p>Pejalan membacakan lambang, angka, dan warna ubin di sekitarnya. Pemandu memeriksa apakah ubin itu memenuhi semua syarat zona. Seberangi lantai sampai baris paling atas.</p>
    <p>Setiap langkah dibatasi waktu. Salah ubin atau waktu habis membuat satu nyawa hilang dan papan diacak ulang. Aturan zona tetap sama. Hati-hati, ubin jebakan sering memenuhi hampir semua syarat.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin tilefloor-skin" data-phase={game.phase}>{rules}</section>;

  const guide = playerId === game.players[0];
  const walker = playerId === game.players[1];
  const row = Math.floor(t.pos / tileCols);
  const wrong = t.lastWrong;
  const fmt = (f: { s: number; n: number; c: number }) => `${tileGlyphs[f.s]} ${tileNames[f.s]} ${f.n} ${tileColors[f.c]}`;
  const total = stepSecs[Math.min(2, t.band ?? 0)];
  const role = guide ? 'Pemandu' : walker ? 'Pejalan' : dm ? 'GM' : 'Penonton';
  const partner = guide ? name(game.players[1]) : walker ? name(game.players[0]) : '';

  return <section className="mg-skin tilefloor-skin" data-phase={game.phase}>
    {rules}
    <div className="tf-layout">
      <div className="tf-main">
        {t.faces ? <div className="tf-board" style={{ gridTemplateColumns: `repeat(${tileCols}, minmax(0, 1fr))` }}>
          {t.faces.map((f, i) => {
            const cls = ['tf-tile', t.pos === i && 'here', t.visited.includes(i) && 'visited', t.path?.includes(i) && 'safe', !f && 'fog', Math.floor(i / tileCols) === 0 && 'goal', f && walker && open && adjacent(t.pos, i) && 'reach'].filter(Boolean).join(' ');
            return <button key={i} type="button" className={cls} style={f ? { ['--glyph' as string]: colorCss[f.c] } : undefined} disabled={disabled || !open || !walker || !f || !adjacent(t.pos, i)}
              aria-label={f ? `Ubin baris ${tileRows - Math.floor(i / tileCols)} kolom ${(i % tileCols) + 1}: ${tileNames[f.s]} ${f.n} ${tileColors[f.c]}${t.pos === i ? ', posisi Pejalan' : ''}` : `Ubin baris ${tileRows - Math.floor(i / tileCols)} kolom ${(i % tileCols) + 1}: tertutup kabut`}
              onClick={() => send({ type: 'tile:step', cell: i })}>
              {f && <><span className="tf-glyph">{tileGlyphs[f.s]}</span><small>{f.n}</small></>}
              {t.pos === i && <i className="tf-walker" aria-hidden="true" />}
            </button>;
          })}
        </div> : <div className="tf-blind">
          <MapIcon size={28} aria-hidden="true" />
          <p className="mg-title">Kamu tidak melihat lantai</p>
          <p>Minta Pejalan membacakan lambang, angka, dan warna ubin di sekitarnya, lalu periksa dengan aturan zona.</p>
        </div>}
      </div>

      <aside className="tf-side">
        <div className="tf-role">
          <span className="mg-kicker">Peranmu</span>
          <p className="mg-title">{role}</p>
          {partner && <p className="tf-partner">Berpasangan dengan <b>{partner}</b></p>}
        </div>

        <ul className="mg-stats">
          <li><span>Nyawa</span><strong className="tf-hearts" aria-label={`${Math.max(t.lives, 0)} dari ${tileLives}`}>{Array.from({ length: tileLives }, (_, i) => <Heart key={i} size={16} aria-hidden="true" className={i < t.lives ? 'on' : ''} />)}</strong></li>
          <li><span>Baris</span><strong>{tileRows - row}<small>/{tileRows}</small></strong></li>
          <li><span>Langkah</span><strong>{t.steps}</strong></li>
        </ul>

        {open && <div className={`tf-timer${left <= 10 ? ' low' : ''}`} role="timer" aria-label={`Sisa waktu ${left} detik`}>
          <div><span>Waktu langkah</span><strong>{left}<small> dtk</small></strong></div>
          <i aria-hidden="true"><i style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /></i>
        </div>}

        {game.result === 'fall' && open && wrong && <p role="alert" className="mg-alert bad">Ubin {fmt(wrong)} runtuh. Papan diacak ulang dan Pejalan kembali ke awal.</p>}
        {game.result === 'timeout' && open && <p role="alert" className="mg-alert bad">Waktu habis. Papan diacak ulang dan Pejalan kembali ke awal.</p>}
        {game.phase === 'finished' && <p role="status" className={`mg-alert ${game.result === 'win' ? 'good' : 'bad'}`}>{game.result === 'win' ? `Pejalan sampai di seberang dengan ${t.falls} kali jatuh.` : 'Nyawa habis. Ronde gagal, GM dapat mereset.'}</p>}

        {(guide || dm) && t.ruleTexts && <div className="tf-rules">
          <span className="mg-kicker">{dm && !guide ? 'Aturan zona (GM)' : 'Aturan ubin aman'}</span>
          <ol>{t.ruleTexts.map((r, i) => <li key={i} className={t.band === i ? 'current' : ''}><b>{bandName[i]}<small>{bandNote[i]}</small></b><span>{r}</span></li>)}</ol>
          {guide && <p className="tf-note">Aturan zona berikutnya terbuka saat Pejalan sampai di tepi zona.</p>}
        </div>}

        {walker && <div className="tf-legend">
          <span className="mg-kicker"><Footprints size={13} aria-hidden="true" /> Kunci lambang</span>
          <ul>{tileGlyphs.map((g, i) => <li key={i}><b>{g}</b>{tileNames[i]}</li>)}</ul>
          <ul>{tileColors.map((c, i) => <li key={c}><i style={{ background: colorCss[i] }} />{c}</li>)}</ul>
        </div>}
      </aside>
    </div>
  </section>;
}
