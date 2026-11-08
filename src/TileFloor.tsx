import { useEffect, useState } from 'react';
import type { Game } from '../server/minigames';
import { tileCols, tileRows, tileGlyphs, tileNames, tileColors, tileLives, stepSecs, adjacent } from '../server/tilefloor';

const bandName = ['Zona 1 · 1 syarat', 'Zona 2 · 2 syarat', 'Zona 3 · 3 syarat'];
const colorCss = ['#d9534f', '#4a8fe0', '#4fa86b', '#e0c040'];

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
  if (!t) return null;
  const guide = playerId === game.players[0];
  const walker = playerId === game.players[1];
  const row = Math.floor(t.pos / tileCols);
  const wrong = t.lastWrong;
  const fmt = (f: { s: number; n: number; c: number }) => `${tileGlyphs[f.s]} ${tileNames[f.s]} ${f.n} ${tileColors[f.c]}`;
  const total = stepSecs[Math.min(2, t.band ?? 0)];
  return <section className="tilefloor">
    <p>Pasangan: <strong>Pemandu</strong> {name(game.players[0])} dan <strong>Pejalan</strong> {name(game.players[1])}. Pejalan hanya melihat ubin yang bersebelahan (berkabut) dan tidak tahu aturannya. Pemandu memegang aturan zona tapi tidak melihat ubin. Pejalan harus menyebutkan lambang, angka, dan warna ubin; Pemandu memeriksa semua syarat. <b>Setiap langkah dibatasi waktu</b>. Jatuh atau waktu habis: nyawa berkurang dan papan diacak ulang, aturan zona tetap. Hati-hati: ubin jebakan sering memenuhi hampir semua syarat.</p>
    <p role="status">Kamu: <b>{guide ? 'Pemandu' : walker ? 'Pejalan' : dm ? 'GM' : 'Penonton'}</b> · Nyawa: {Math.max(t.lives, 0)}/{tileLives} · Langkah: {t.steps} · Posisi: baris {tileRows - row} dari {tileRows}</p>
    {open && <div className={`tile-timer${left <= 10 ? ' low' : ''}`} role="timer" aria-label={`Sisa waktu ${left} detik`}><i style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /><span>{left} dtk</span></div>}
    {guide && t.ruleTexts && <ol className="tile-rules" aria-label="Aturan untuk Pemandu">{t.ruleTexts.map((r, i) => <li key={i}><b>{bandName[i]}</b> (ubin aman): {r}</li>)}<li className="tile-note">Aturan zona berikutnya terbuka saat Pejalan berada di baris tepi zona (tepat sebelum melangkah ke sana).</li></ol>}
    {dm && t.ruleTexts && <p className="tile-dm">Info GM: {t.ruleTexts.join(' · ')}</p>}
    {game.result === 'fall' && open && wrong && <p role="alert" className="tile-fall">Ubin {fmt(wrong)} runtuh! Papan diacak ulang, Pejalan kembali ke start.</p>}
    {game.result === 'timeout' && open && <p role="alert" className="tile-fall">Waktu habis. Papan diacak ulang, Pejalan kembali ke start.</p>}
    {walker && <p className="tile-legend" aria-label="Legenda">{tileGlyphs.map((g, i) => <span key={i}><b>{g}</b> {tileNames[i]}</span>)}</p>}
    {t.faces ? <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${tileCols}, 1fr)` }}>{t.faces.map((f, i) => {
      const cls = ['tile', t.pos === i && 'here', t.visited.includes(i) && 'visited', t.path?.includes(i) && 'safe', !f && 'fog', Math.floor(i / tileCols) === 0 && 'goal'].filter(Boolean).join(' ');
      return <button key={i} type="button" className={cls} style={f ? { color: colorCss[f.c] } : undefined} disabled={disabled || !open || !walker || !f || !adjacent(t.pos, i)}
        aria-label={f ? `Ubin baris ${tileRows - Math.floor(i / tileCols)} kolom ${(i % tileCols) + 1}: ${tileNames[f.s]} ${f.n} ${tileColors[f.c]}${t.pos === i ? ', posisi Pejalan' : ''}` : `Ubin baris ${tileRows - Math.floor(i / tileCols)} kolom ${(i % tileCols) + 1}: tertutup kabut`}
        onClick={() => send({ type: 'tile:step', cell: i })}>{f ? <><span>{tileGlyphs[f.s]}</span><small>{f.n}</small></> : ''}</button>;
    })}</div> : <p>Papan disembunyikan dari Pemandu. Minta Pejalan membacakan ubin di sekitarnya.</p>}
    {game.phase === 'finished' && <p role="status" className={game.result === 'win' ? 'tile-win' : 'tile-fall'}>{game.result === 'win' ? `Pejalan sampai di seberang dengan ${t.falls} kali jatuh.` : 'Nyawa habis. Ronde gagal; GM dapat mereset.'}</p>}
  </section>;
}
