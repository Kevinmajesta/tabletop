import { useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { ShiftState } from '../server/shift';
import { E, N, S, SIZE, W, reachable, shiftLevels, shiftLevers, type Line } from '../server/shift-data';
import GameRules from './GameRules';
import './alchemy.css';
import './potion.css';
import './shift.css';

const CELL = 72, PAD = 40, BOARD = SIZE * CELL;
// Lorong digambar dari tengah petak ke setiap sisi yang terbuka.
function corridors(mask: number) {
  const h = CELL / 2, w = CELL * 0.32;
  const parts: [number, number, number, number][] = [];
  if (mask & N) parts.push([h - w / 2, 0, w, h + w / 2]);
  if (mask & S) parts.push([h - w / 2, h - w / 2, w, h + w / 2]);
  if (mask & W) parts.push([0, h - w / 2, h + w / 2, w]);
  if (mask & E) parts.push([h - w / 2, h - w / 2, h + w / 2, w]);
  return parts;
}

export default function Shift({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.shift as ShiftState | undefined;
  const [flash, setFlash] = useState<string | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const rules = <GameRules phase={game.phase}>
    <p>Party terjebak di dungeon yang lantainya bisa <strong>bergeser</strong>. Bawa party (perisai) ke <strong>peti harta</strong> di setiap ruangan.</p>
    <p>Klik petak yang tersambung lorong untuk berjalan, gratis dan sejauh apa pun. Tarik <strong>tuas di tepi papan</strong> untuk menggeser satu baris atau kolom secara melingkar: petak yang keluar di satu sisi masuk lagi dari sisi seberang, dan party serta peti ikut terbawa petaknya.</p>
    <p>Setiap geseran menghabiskan satu lilin, dan lilinnya pas dengan jumlah geseran paling hemat. Lilin habis? Ulangi ruangan, sebanyak yang kalian mau. Ada tiga ruangan.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin alchemy-skin shift-skin" data-phase={game.phase}>{rules}</section>;

  const lv = shiftLevels[t.level];
  const canPlay = game.phase === 'open' && !t.done && !disabled;
  const region = reachable(t.tiles, t.pos);
  const out = t.used >= lv.budget;
  const who = (id: string) => (id === playerId ? 'Kamu' : name(id));
  const pull = (line: Line, dir: 1 | -1) => {
    if (!canPlay || out) return;
    send({ type: 'shift:pull', axis: line.axis, k: line.k, dir });
    setFlash(`${line.axis}${line.k}`);
    window.setTimeout(() => setFlash(null), 450);
  };
  const lineOf = (i: number) => [`r${Math.floor(i / SIZE)}`, `c${i % SIZE}`];

  // Tuas: dua ujung untuk setiap baris/kolom yang bisa digeser.
  const levers = shiftLevers.flatMap(line => {
    const at = PAD + line.k * CELL + CELL / 2;
    return line.axis === 'r'
      ? [{ line, dir: 1 as const, x: PAD / 2, y: at, arrow: '→' }, { line, dir: -1 as const, x: PAD + BOARD + PAD / 2, y: at, arrow: '←' }]
      : [{ line, dir: 1 as const, x: at, y: PAD / 2, arrow: '↓' }, { line, dir: -1 as const, x: at, y: PAD + BOARD + PAD / 2, arrow: '↑' }];
  });

  return <section className="mg-skin alchemy-skin shift-skin" data-phase={game.phase}>
    {rules}

    {t.done && <div className="al-won" role="status">
      <Sparkles size={18} />
      <div><div className="al-phrase pt-phrase">Labirin ditaklukkan</div><p>{t.reward}</p></div>
    </div>}

    <div className="sh-layout">
      <div className="sh-side">
        <div className="sh-rooms">{shiftLevels.map((l, i) => <span key={i} className={i < t.level || t.done ? 'done' : i === t.level ? 'current' : ''}>{i + 1}</span>)}</div>
        <h3>{lv.name}</h3>
        <p className="sh-story">{lv.story}</p>
        <div className="sh-candles" aria-label={`Lilin tersisa ${lv.budget - t.used} dari ${lv.budget}`}>
          <small>Lilin</small>
          <div>{Array.from({ length: lv.budget }, (_, i) => <i key={i} className={i < lv.budget - t.used ? 'lit' : ''} />)}</div>
        </div>
        {out && !t.done && <div className="pt-fail" role="status">Lilin habis. Kalau peti belum terjangkau, ulangi ruangan.</div>}
        <button type="button" className="al-ghost" disabled={!canPlay || (t.used === 0)} onClick={() => send({ type: 'shift:reset' })}><RotateCcw size={14} />Ulangi ruangan</button>
        {dm && <p className="al-dm-answer">GM: jumlah geseran minimum ruangan ini {lv.budget}.</p>}
      </div>

      <div className="sh-board-wrap">
        <svg className="sh-board" viewBox={`0 0 ${BOARD + PAD * 2} ${BOARD + PAD * 2}`} role="img" aria-label={`Denah ${lv.name}`}>
          <rect x={PAD - 6} y={PAD - 6} width={BOARD + 12} height={BOARD + 12} rx="10" className="sh-frame" />
          {t.tiles.map((mask, i) => {
            const r = Math.floor(i / SIZE), c = i % SIZE, x = PAD + c * CELL, y = PAD + r * CELL;
            const near = region.has(i), flashing = flash !== null && lineOf(i).includes(flash);
            return <g key={i} transform={`translate(${x} ${y})`} className={`sh-tile${near ? ' near' : ''}${flashing ? ' flash' : ''}`}
              onClick={() => { if (canPlay && near && i !== t.pos) send({ type: 'shift:walk', to: i }); }}>
              <rect x="2" y="2" width={CELL - 4} height={CELL - 4} rx="6" className="sh-floor" />
              {corridors(mask).map(([cx, cy, w, h], j) => <rect key={j} x={cx} y={cy} width={w} height={h} className="sh-path" />)}
              {i === t.goal && <g className="sh-chest" transform={`translate(${CELL / 2} ${CELL / 2})`}>
                <rect x="-13" y="-8" width="26" height="17" rx="3" /><path d="M-13 -3 H13" /><rect x="-3" y="-2" width="6" height="6" rx="1" className="sh-lock" />
              </g>}
              {i === t.pos && <g className="sh-party" transform={`translate(${CELL / 2} ${CELL / 2})`}>
                <circle r="17" className="sh-party-glow" />
                <path d="M0 -12 L10 -8 V1 C10 7 5 11 0 13 C-5 11 -10 7 -10 1 V-8 Z" />
              </g>}
            </g>;
          })}
          {levers.map(({ line, dir, x, y, arrow }) => (
            <g key={`${line.axis}${line.k}${dir}`} className={`sh-lever${canPlay && !out ? '' : ' off'}`} transform={`translate(${x} ${y})`}
              onClick={() => pull(line, dir)} role="button" aria-label={`Geser ${line.axis === 'r' ? 'baris' : 'kolom'} ${line.k + 1} ${arrow}`}>
              <circle r="15" />
              <text textAnchor="middle" dominantBaseline="central">{arrow}</text>
            </g>
          ))}
        </svg>
        <p className="al-hint">Petak terang tersambung dengan party: klik untuk berjalan. Klik tombol panah di tepi untuk menggeser baris atau kolom.</p>
      </div>
    </div>

    {!!t.log.length && <div className="al-log" aria-label="Riwayat ruangan">
      {t.log.slice().reverse().slice(0, 6).map((a, i) => (
        <div key={i} className={a.kind === 'cleared' ? 'ok' : 'bad'}><span>{who(a.by)}</span> {a.kind === 'cleared' ? 'mencapai peti di' : 'mengulang'} {shiftLevels[a.level].name}<em>{a.kind === 'cleared' ? 'berhasil' : 'ulang'}</em></div>
      ))}
    </div>}

    {dm && <div className="al-dm">
      <label htmlFor="sh-reward">Pesan hadiah (muncul saat ruangan terakhir selesai)</label>
      <textarea id="sh-reward" rows={2} maxLength={300} value={reward ?? t.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === t.reward} onClick={() => { send({ type: 'shift:reward', text: reward }); setReward(null); }}>Simpan pesan</button>
    </div>}
  </section>;
}
