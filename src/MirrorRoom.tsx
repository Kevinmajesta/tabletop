import type { KeyboardEvent } from 'react';
import { DoorOpen, Star } from 'lucide-react';
import type { Game } from '../server/minigames';
import { mirrorRooms, traceBeams, starsFor, type MirrorState } from '../server/mirrors';
import GameRules from './GameRules';
import './mirrors.css';

const ownerColor = ['#e0675d', '#5c9ae8', '#5fb67a', '#e5c552', '#a77be0', '#e08ad0'];
const ownerName = ['merah', 'biru', 'hijau', 'kuning', 'ungu', 'merah muda'];
const arrow: Record<string, string> = { R: 'M0.62 0.5 L0.4 0.36 L0.4 0.64 Z', L: 'M0.38 0.5 L0.6 0.36 L0.6 0.64 Z', U: 'M0.5 0.38 L0.36 0.6 L0.64 0.6 Z', D: 'M0.5 0.62 L0.36 0.4 L0.64 0.4 Z' };

export default function MirrorRoom({ game, disabled, send, playerId, name }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string }) {
  const t = game.mirrors as MirrorState | undefined;
  const rules = <GameRules phase={game.phase}>
    <p>Party masuk ke tiga ruangan dungeon yang pintunya tersegel. Di tiap ruangan, <strong>arahkan berkas cahaya dari kristal sumber ke rune di pintu</strong> dengan memutar cermin miring di lantai.</p>
    <p>Setiap cermin punya warna pemiliknya. <strong>Kamu hanya bisa memutar cermin berwarna milikmu</strong>, jadi beri tahu teman cermin mana yang perlu diputar.</p>
    <p>Di Aula Penguat, cahaya harus melewati kristal penguat dulu. Di Gerbang Kembar, kedua rune harus menyala bersamaan. Semakin hemat putaran, semakin banyak bintang yang kalian dapat.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin mirrors-skin" data-phase={game.phase}>{rules}</section>;

  const room = mirrorRooms[t.room];
  const map = room.map;
  const W = map[0].length, H = map.length;
  const me = game.players.indexOf(playerId);
  const who = (i: number) => (i === me ? 'Kamu' : name(game.players[i]));
  const beams = traceBeams(map, t.mirrors);
  const reaching = beams.filter(b => b.hits.some(h => h.startsWith('T@')));
  const lit = new Set(reaching.flatMap(b => b.hits));
  const passed = new Set(beams.flatMap(b => b.hits));
  const canPlay = game.phase === 'open' && !t.cleared && me >= 0;
  const rotate = (i: number) => { if (canPlay && !disabled && t.mirrors[i].owner === me) send({ type: 'mirror:rotate', index: i }); };
  const onKey = (i: number) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rotate(i); } };
  const logText = (s: string) => s.replace(/@(\d+)/g, (_, i) => who(Number(i)));
  const totalStars = t.stars.reduce((a, b) => a + (b || 0), 0);

  return <section className="mg-skin mirrors-skin" data-phase={game.phase}>
    {rules}
    <div className="mr-layout">
      <div className="mr-main">
        <header className="mr-room-head">
          <span className="mg-kicker">Ruangan {t.room + 1} dari {mirrorRooms.length}</span>
          <h3>{room.name}</h3>
          <p>{room.story}</p>
        </header>

        <div className={`mr-board${t.cleared ? ' cleared' : ''}`}>
          <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Peta ${room.name}`}>
            <defs>
              <radialGradient id="mr-orb"><stop offset="0" stopColor="#fffbe6" /><stop offset=".45" stopColor="#ffd77a" /><stop offset="1" stopColor="#ffb547" stopOpacity="0" /></radialGradient>
              <radialGradient id="mr-glow"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".55" /><stop offset="1" stopColor="#ffe9a8" stopOpacity="0" /></radialGradient>
            </defs>
            {map.map((row, y) => [...row].map((ch, x) => <rect key={`f${x},${y}`} className={`mr-floor${(x + y) % 2 ? ' alt' : ''}`} x={x + 0.03} y={y + 0.03} width={0.94} height={0.94} rx={0.06} />))}

            {beams.map((b, k) => <g key={`b${k}`} className={`mr-beam${b.hits.some(h => h.startsWith('T@')) ? ' hit' : ''}`}>
              <polyline className="halo" points={b.points.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(' ')} />
              <polyline className="core" points={b.points.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(' ')} />
            </g>)}

            {map.map((row, y) => [...row].map((ch, x) => {
              const key = `${x},${y}`;
              if (ch === '#') return <g key={key} className="mr-pillar"><rect x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.08} /><rect className="top" x={x + 0.16} y={y + 0.14} width={0.68} height={0.5} rx={0.06} /></g>;
              if (ch === 'C') return <g key={key} className={`mr-crystal${passed.has(`C@${x},${y}`) ? ' lit' : ''}`}><circle cx={x + 0.5} cy={y + 0.5} r={0.42} className="aura" /><path d={`M${x + 0.5} ${y + 0.16} L${x + 0.78} ${y + 0.5} L${x + 0.5} ${y + 0.84} L${x + 0.22} ${y + 0.5} Z`} /></g>;
              if (ch === 'T') return <g key={key} className={`mr-door${lit.has(`T@${x},${y}`) ? ' lit' : ''}`}><circle cx={x + 0.5} cy={y + 0.5} r={0.4} className="ring" /><text x={x + 0.5} y={y + 0.53} textAnchor="middle" dominantBaseline="middle">ᚱ</text></g>;
              if (arrow[ch]) return <g key={key} className="mr-source"><circle cx={x + 0.5} cy={y + 0.5} r={0.46} fill="url(#mr-orb)" /><circle cx={x + 0.5} cy={y + 0.5} r={0.2} className="core" /><path d={arrow[ch]} transform={`translate(${x} ${y})`} className="dir" /></g>;
              return null;
            }))}

            {t.mirrors.map((m, i) => {
              const mine = m.owner === me;
              const active = mine && canPlay;
              const color = ownerColor[m.owner % ownerColor.length];
              const [x1, y1, x2, y2] = m.dir === '/' ? [m.x + 0.2, m.y + 0.8, m.x + 0.8, m.y + 0.2] : [m.x + 0.2, m.y + 0.2, m.x + 0.8, m.y + 0.8];
              return <g key={`m${i}`} className={`mr-mirror${active ? ' mine' : ''}`} style={{ ['--mc' as string]: color }}
                role={active ? 'button' : undefined} tabIndex={active ? 0 : undefined}
                aria-label={`Cermin ${who(m.owner)} di kolom ${m.x + 1} baris ${m.y + 1}, miring ${m.dir === '/' ? 'ke kanan' : 'ke kiri'}${active ? ', tekan untuk memutar' : ''}`}
                onClick={() => rotate(i)} onKeyDown={active ? onKey(i) : undefined}>
                <rect x={m.x + 0.08} y={m.y + 0.08} width={0.84} height={0.84} rx={0.14} className="base" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="glass" />
                <circle cx={m.x + 0.84} cy={m.y + 0.84} r={0.09} className="tag" />
              </g>;
            })}
          </svg>
        </div>
      </div>

      <aside className="mr-side">
        {game.phase === 'finished' ? <p className="mg-alert good" role="status"><DoorOpen size={16} aria-hidden="true" /> Ketiga pintu terbuka! Party mengumpulkan {totalStars} dari {mirrorRooms.length * 3} bintang.</p>
          : t.cleared ? <div className="mr-cleared">
            <p className="mg-alert good" role="status"><DoorOpen size={16} aria-hidden="true" /> Pintu {room.name} terbuka!</p>
            {me >= 0 && <button type="button" className="mg-btn primary" disabled={disabled} onClick={() => send({ type: 'mirror:next' })}>Masuk ke {mirrorRooms[t.room + 1].name}</button>}
          </div> : me >= 0 ? <p className="mr-you" style={{ ['--mc' as string]: ownerColor[me % ownerColor.length] }}><i aria-hidden="true" /><span>Cerminmu berwarna <b>{ownerName[me % ownerName.length]}</b>. Klik cerminmu untuk memutarnya.</span></p>
          : <p className="mr-you">Kamu menonton. Hanya peserta yang bisa memutar cermin.</p>}

        <ul className="mr-party">
          {game.players.map((id, i) => <li key={id} style={{ ['--mc' as string]: ownerColor[i % ownerColor.length] }}>
            <i aria-hidden="true" /><span>{who(i)}</span><small>{t.mirrors.filter(m => m.owner === i).length} cermin</small>
          </li>)}
        </ul>

        {game.phase === 'open' && !t.cleared && <ul className="mg-stats">
          <li><span>Putaran</span><strong>{t.rotations}</strong></li>
          <li><span>Minimum</span><strong>{t.par}</strong></li>
          <li><span>Bintang kini</span><strong className="mr-stars">{[1, 2, 3].map(s => <Star key={s} size={14} aria-hidden="true" className={s <= starsFor(t.rotations, t.par) ? 'on' : ''} />)}</strong></li>
        </ul>}

        <div className="mr-progress">
          <span className="mg-kicker">Perjalanan</span>
          <ol>{mirrorRooms.map((r, i) => <li key={r.name} className={i === t.room ? 'current' : i < t.room || t.stars[i] ? 'done' : ''}>
            <span>{r.name}</span>
            <span className="mr-stars" aria-label={t.stars[i] ? `${t.stars[i]} bintang` : 'belum'}>{[1, 2, 3].map(s => <Star key={s} size={13} aria-hidden="true" className={t.stars[i] && s <= t.stars[i] ? 'on' : ''} />)}</span>
          </li>)}</ol>
        </div>

        {t.log.length > 0 && <div className="mr-log">
          <span className="mg-kicker">Catatan</span>
          <ol>{t.log.map((line, k) => <li key={t.log.length - k}>{logText(line)}</li>)}</ol>
        </div>}
      </aside>
    </div>
  </section>;
}
