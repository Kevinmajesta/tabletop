import { useEffect, useState } from 'react';
import type { Game } from '../server/minigames';
import { wireStages, wireLives, type WireState } from '../server/wirehack';
import GameRules from './GameRules';
import './wirehack.css';

const cableColor = ['#ff4d6d', '#3cf2c4', '#ffd23f', '#4da6ff'];
const ROW = 84, TOP = 50, W = 464;

export default function WireHack({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const t = game.wirehack as WireState | undefined;
  const open = game.phase === 'open';
  const hacker = game.players[0] === playerId;
  const [picked, setPicked] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [left, setLeft] = useState(0);
  useEffect(() => { if (t?.now) setSkew(t.now - Date.now()); }, [t?.now, t?.deadline]);
  useEffect(() => { setPicked(null); }, [t?.stage, t?.deadline]);
  useEffect(() => {
    if (!t || !open) return;
    let reported = false;
    const tick = () => {
      const s = Math.max(0, Math.ceil((t.deadline - (Date.now() + skew)) / 1000));
      setLeft(s);
      if (s <= 0 && !reported && !disabled && (hacker || dm)) { reported = true; send({ type: 'wire:timeout' }); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [t?.deadline, open, skew, disabled]);

  const rules = <GameRules phase={game.phase}>
    <p>Satu peretas memegang kabel. Di kiri ada beberapa angka, di kanan ada pengali. <strong>Sambungkan setiap angka ke satu pengali</strong> sampai jumlah semua hasil kalinya sama persis dengan <strong>tegangan target</strong>.</p>
    <p>Total tegangan tidak ditampilkan sampai kamu menekan Kirim arus, jadi hitung dulu di kepala. Contoh: angka 4 ke ×10, angka 7 ke ×2, dan angka 3 ke ×1 menghasilkan 40 + 14 + 3 = 57.</p>
    <p>Ada tiga panel yang makin sulit, dengan batas waktu di setiap panel. Salah kirim atau waktu habis memicu alarm dan panel diganti. <strong>Tiga alarm berarti peretasan gagal.</strong> Pemain lain bisa menonton dan membantu menghitung.</p>
  </GameRules>;
  if (!t) return <section className="mg-skin wirehack-skin" data-phase={game.phase}>{rules}</section>;

  const n = t.panel.values.length;
  const H = TOP + n * ROW;
  const total = wireStages[t.stage].secs;
  const allLinked = t.links.every(l => l !== null);
  const canTouch = open && hacker && !disabled;
  const yOf = (i: number) => TOP + i * ROW + ROW / 2 - 18;
  const leftClick = (i: number) => { if (canTouch) setPicked(p => (p === i ? null : i)); };
  const rightClick = (j: number) => {
    if (!canTouch) return;
    if (picked === null) { const from = t.links.indexOf(j); if (from >= 0) setPicked(from); return; }
    send({ type: 'wire:link', from: picked, to: j });
    setPicked(null);
  };
  const flash = t.last && !t.last.ok && open ? 'alarm' : '';

  return <section className={`mg-skin wirehack-skin ${flash}`} data-phase={game.phase}>
    {rules}
    <div className="wh-console" key={`${t.stage}:${t.lives}:${t.deadline}`}>
      <header className="wh-head">
        <div className="wh-stage"><span>PANEL</span><strong>{t.stage + 1}<small>/{wireStages.length}</small></strong></div>
        <div className="wh-target"><span>TEGANGAN TARGET</span><strong>{t.panel.target}<small>V</small></strong></div>
        <div className="wh-alarms" aria-label={`Sisa ${t.lives} dari ${wireLives} kesempatan`}>
          <span>ALARM</span>
          <div>{Array.from({ length: wireLives }, (_, i) => <i key={i} className={i < wireLives - t.lives ? 'on' : ''} />)}</div>
        </div>
      </header>

      {open && <div className={`wh-timer${left <= 10 ? ' low' : ''}`} role="timer" aria-label={`Sisa waktu ${left} detik`}>
        <i style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
        <span>{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
      </div>}

      <p className="wh-who">{hacker ? (picked === null ? 'Pilih terminal angka di kiri, lalu pilih pengali di kanan.' : `Terminal ${t.panel.values[picked]} dipilih. Pilih pengali di kanan.`) : `Peretas: ${name(game.players[0])}. Kamu menonton.`}</p>

      <svg className="wh-board" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Panel kabel">
        <text x={70} y={28} className="wh-col">ANGKA</text>
        <text x={394} y={28} className="wh-col">PENGALI</text>
        {t.links.map((to, i) => {
          if (to === null) return null;
          const y1 = yOf(i) + 18, y2 = yOf(to) + 18;
          const d = `M 144 ${y1} C 232 ${y1}, 232 ${y2}, 320 ${y2}`;
          return <g key={`c${i}`} className="wh-cable" style={{ ['--cc' as string]: cableColor[i % cableColor.length] }}>
            <path d={d} className="shadow" /><path d={d} className="wire" />
          </g>;
        })}
        {t.panel.values.map((v, i) => {
          const linked = t.links[i] !== null;
          return <g key={`l${i}`} className={`wh-term left${picked === i ? ' picked' : ''}${linked ? ' linked' : ''}${canTouch ? ' live' : ''}`} style={{ ['--cc' as string]: cableColor[i % cableColor.length] }}
            role={canTouch ? 'button' : undefined} tabIndex={canTouch ? 0 : undefined} aria-label={`Terminal angka ${v}${linked ? ', tersambung' : ''}`}
            onClick={() => leftClick(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); leftClick(i); } }}>
            <rect x={10} y={yOf(i)} width={120} height={36} rx={4} />
            <text x={70} y={yOf(i) + 25}>{v}</text>
            <circle cx={144} cy={yOf(i) + 18} r={9} className="plug" />
          </g>;
        })}
        {t.panel.mults.map((m, j) => {
          const linked = t.links.includes(j);
          return <g key={`r${j}`} className={`wh-term right${linked ? ' linked' : ''}${canTouch && (picked !== null || linked) ? ' live' : ''}`}
            style={linked ? { ['--cc' as string]: cableColor[t.links.indexOf(j) % cableColor.length] } : undefined}
            role={canTouch ? 'button' : undefined} tabIndex={canTouch ? 0 : undefined} aria-label={`Terminal pengali ${m}${linked ? ', tersambung' : ''}`}
            onClick={() => rightClick(j)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rightClick(j); } }}>
            <circle cx={320} cy={yOf(j) + 18} r={9} className="plug" />
            <rect x={334} y={yOf(j)} width={120} height={36} rx={4} />
            <text x={394} y={yOf(j) + 25}>×{m}</text>
          </g>;
        })}
      </svg>

      {t.last && open && <p className={`wh-result ${t.last.ok ? 'ok' : 'bad'}`} role="status">
        {t.last.ok ? `AKSES DITERIMA · panel ${t.stage} terbobol` : t.last.reason === 'timeout' ? 'ALARM! Waktu habis. Panel diganti.' : `ALARM! Tegangan ${t.last.got} V, target ${t.last.target} V. Panel diganti.`}
      </p>}
      {game.phase === 'finished' && <p className={`wh-result ${game.result === 'win' ? 'ok' : 'bad'}`} role="status">{game.result === 'win' ? `AKSES PENUH · ${name(game.players[0])} membobol ketiga panel.` : 'PERETASAN GAGAL · sistem terkunci.'}</p>}
      {dm && t.solution && open && <p className="wh-dm">Jawaban (GM): {t.solution.map((j, i) => `${t.panel.values[i]}×${t.panel.mults[j]}`).join(' + ')}</p>}

      {hacker && open && <div className="wh-actions">
        <button type="button" className="wh-btn ghost" disabled={disabled || t.links.every(l => l === null)} onClick={() => t.links.forEach((l, i) => { if (l !== null) send({ type: 'wire:link', from: i, to: null }); })}>Lepas semua</button>
        <button type="button" className="wh-btn" disabled={disabled || !allLinked} onClick={() => send({ type: 'wire:submit' })}>Kirim arus</button>
      </div>}
    </div>
  </section>;
}
