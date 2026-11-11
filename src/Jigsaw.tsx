import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import { Expand, Image as ImageIcon, Maximize2, Minus, Plus, Shrink, Sparkles, Timer, Upload } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { JigsawState } from '../server/jigsaw';
import { geometry, gridFor, homeCenter, jigsawPresets, pieceOptions, piecePath, tabs, type JigsawConfig } from '../server/jigsaw-data';
import GameRules from './GameRules';
import './alchemy.css';
import './jigsaw.css';

type View = { x: number; y: number; w: number; h: number };
type Drag = { id: number; g: number; sx: number; sy: number; dx: number; dy: number; moved: boolean };
const HOLD_COLORS = ['#e0675d', '#5c9ae8', '#5fb67a', '#e5c552', '#a77be0', '#e08ad0'];
const TABLES = [
  { id: 'wood', label: 'Kayu', color: '#2b2016' },
  { id: 'felt', label: 'Beludru', color: '#1f3a2c' },
  { id: 'slate', label: 'Batu', color: '#2a2f36' },
  { id: 'paper', label: 'Terang', color: '#d8cfbd' },
];
const TABLE_KEY = 'meja-petualang:jigsaw-table';
const readTable = () => { try { return localStorage.getItem(TABLE_KEY) || 'wood'; } catch { return 'wood'; } };
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0'); const ss = String(s % 60).padStart(2, '0'); return h ? `${h}:${m}:${ss}` : `${m}:${ss}`; };

export default function Jigsaw({ game, disabled, send, playerId, name, dm, upload }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean; upload?: (file: File) => Promise<string> }) {
  const t = game.jigsaw as JigsawState | undefined;
  const setup = (game.jigsawSetup as JigsawConfig | undefined) ?? null;
  const cfg = t?.config ?? null;
  const geo = useMemo(() => (cfg ? geometry(cfg) : null), [cfg?.srcW, cfg?.srcH, cfg?.cols, cfg?.rows]);
  const shape = useMemo(() => (t && cfg ? tabs(t.seed, cfg.cols, cfg.rows) : null), [t?.seed, cfg?.cols, cfg?.rows]);
  const paths = useMemo(() => (cfg && geo && shape ? Array.from({ length: geo.count }, (_, i) => piecePath(i, cfg, geo.PW, geo.PH, shape)) : []), [shape, geo]);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const pan = useRef<{ sx: number; sy: number; view: View } | null>(null);
  const [preview, setPreview] = useState(false);
  const [table, setTable] = useState(readTable);
  const [full, setFull] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [reward, setReward] = useState<string | null>(null);
  const [uploading, setUploading] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (geo && !view) setView({ x: 0, y: 0, w: geo.TW, h: geo.TH }); }, [geo, view]);
  useEffect(() => { if (!t || t.done) return; const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [t?.done, !!t]);
  useEffect(() => { const on = () => setFull(document.fullscreenElement === wrapRef.current); document.addEventListener('fullscreenchange', on); return () => document.removeEventListener('fullscreenchange', on); }, []);
  useEffect(() => { if (cfg) { const img = new Image(); img.src = cfg.image; } }, [cfg?.image]);

  const rotating = !!(cfg?.rotate || setup?.rotate);
  const rules = <GameRules phase={game.phase}>
    <p>Rakit gambar bersama-sama, bebas di mana saja di meja, seperti puzzle sungguhan. <strong>Keping yang cocok akan menempel</strong> saat dijatuhkan di dekat pasangannya, lalu bergerak bersama sebagai satu kelompok.</p>
    <p>Seret keping atau kelompok untuk memindahkan. {rotating ? <><strong>Klik</strong> keping tanpa menyeret, atau klik kanan, untuk memutarnya 90°. </> : null}Keping yang sedang dipegang pemain lain bertanda nama.</p>
    <p>Gulir untuk zoom, seret area kosong untuk menggeser meja. Buka <strong>Gambar contoh</strong> kalau butuh panduan, dan mulai dari keping tepi.</p>
  </GameRules>;

  // ---------- Persiapan oleh GM (sebelum ronde dimulai) ----------
  if (!t || !cfg || !geo || !shape || !view) {
    const base = jigsawPresets[0];
    const chosen: JigsawConfig = setup ?? { image: base.url, title: base.title, srcW: base.w, srcH: base.h, ...gridFor(204, base.w, base.h), rotate: false, credit: base.credit };
    const count = chosen.cols * chosen.rows;
    const nearest = pieceOptions.reduce((a, b) => (Math.abs(b - count) < Math.abs(a - count) ? b : a));
    const apply = (patch: Partial<{ image: string; title: string; srcW: number; srcH: number; pieces: number; rotate: boolean }>) =>
      send({ type: 'jigsaw:setup', image: chosen.image, title: chosen.title, srcW: chosen.srcW, srcH: chosen.srcH, pieces: nearest, rotate: chosen.rotate, ...patch });
    const onFile = async (file?: File) => {
      if (!file || !upload) return;
      setUploading('Mengunggah…');
      try {
        const url = await upload(file);
        const size = await new Promise<{ w: number; h: number }>((ok, bad) => { const img = new Image(); img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => bad(new Error('Gambar tidak bisa dibaca.')); img.src = url; });
        apply({ image: url, title: file.name.replace(/\.[^.]+$/, '').slice(0, 60), srcW: size.w, srcH: size.h });
        setUploading('');
      } catch (e) { setUploading(e instanceof Error ? e.message : 'Upload gagal.'); }
      if (fileRef.current) fileRef.current.value = '';
    };
    return <section className="mg-skin alchemy-skin jigsaw-skin" data-phase={game.phase}>
      {rules}
      <div className="jg-setup">
        <figure className="jg-setup-preview">
          <img src={chosen.image} alt={chosen.title} />
          <figcaption><strong>{chosen.title}</strong><span>{chosen.cols} × {chosen.rows} = {count} keping{chosen.rotate ? ' · keping berputar' : ''}</span>{chosen.credit && <small>{chosen.credit}</small>}</figcaption>
        </figure>
        {dm ? <div className="jg-setup-form">
          <div className="jg-field"><span>Gambar</span>
            <div className="jg-choices">
              {jigsawPresets.map(p => <button key={p.id} type="button" className={`jg-thumb${chosen.image === p.url ? ' on' : ''}`} disabled={disabled} onClick={() => apply({ image: p.url, title: p.title, srcW: p.w, srcH: p.h })}><img src={p.url} alt="" /><span>{p.title}</span></button>)}
              {upload && <button type="button" className={`jg-thumb jg-upload${chosen.image.startsWith('/uploads/') ? ' on' : ''}`} disabled={disabled || uploading === 'Mengunggah…'} onClick={() => fileRef.current?.click()}><Upload size={20} /><span>{chosen.image.startsWith('/uploads/') ? 'Ganti gambar unggahan' : 'Unggah gambar sendiri'}</span></button>}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => onFile(e.target.files?.[0])} />
            {uploading && <small className="jg-note">{uploading}</small>}
          </div>
          <div className="jg-field"><span>Jumlah keping</span>
            <div className="jg-chips">{pieceOptions.map(n => <button key={n} type="button" className={n === nearest ? 'on' : ''} disabled={disabled} onClick={() => apply({ pieces: n })}>{n}</button>)}</div>
          </div>
          <label className="jg-switch"><input type="checkbox" checked={chosen.rotate} disabled={disabled} onChange={e => apply({ rotate: e.target.checked })} /><span>Keping berputar <small>(lebih sulit: keping mulai miring dan harus diputar)</small></span></label>
          <p className="al-hint">Setelah siap, tekan <strong>Mulai ronde</strong> di bawah.</p>
        </div> : <p className="jg-wait">GM sedang menyiapkan puzzle. Tunggu sampai ronde dimulai.</p>}
      </div>
    </section>;
  }

  // ---------- Bermain ----------
  const { PW, PH, TW, TH, W, H, count } = geo;
  const canPlay = game.phase === 'open' && !t.done && !disabled;
  const groups = new Map<number, number[]>();
  t.pieces.forEach((p, i) => { const list = groups.get(p.g); if (list) list.push(i); else groups.set(p.g, [i]); });
  const percent = Math.round(((count - groups.size) / (count - 1)) * 100);
  const holders = [...new Set(Object.values(t.held).map(h => h.by))];
  const colorOf = (id: string) => HOLD_COLORS[holders.indexOf(id) % HOLD_COLORS.length];
  const toWorld = (cx: number, cy: number) => { const ctm = svgRef.current?.getScreenCTM(); if (!ctm) return { x: 0, y: 0 }; const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse()); return { x: p.x, y: p.y }; };
  const clampView = (v: View): View => ({ ...v, x: Math.max(-v.w * 0.3, Math.min(TW - v.w * 0.7, v.x)), y: Math.max(-v.h * 0.3, Math.min(TH - v.h * 0.7, v.y)) });
  const zoom = (factor: number, cx?: number, cy?: number) => setView(v => {
    if (!v) return v;
    const w = Math.min(TW * 1.1, Math.max(TW / 10, v.w * factor)), h = w * (TH / TW);
    const fx = cx === undefined ? 0.5 : (cx - v.x) / v.w, fy = cy === undefined ? 0.5 : (cy - v.y) / v.h;
    return clampView({ x: v.x + (v.w - w) * fx, y: v.y + (v.h - h) * fy, w, h });
  });
  const heldByOther = (g: number) => { const h = t.held[String(g)]; return h && h.by !== playerId ? h.by : null; };

  const down = (e: RPointerEvent, id: number) => {
    e.stopPropagation();
    if (e.button === 2) return;
    const g = t.pieces[id].g;
    if (!canPlay || heldByOther(g)) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    setDrag({ id, g, sx: w.x, sy: w.y, dx: 0, dy: 0, moved: false });
    send({ type: 'jigsaw:grab', id });
  };
  const move = (e: RPointerEvent) => {
    if (drag) {
      const w = toWorld(e.clientX, e.clientY), dx = w.x - drag.sx, dy = w.y - drag.sy;
      setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > Math.min(PW, PH) * 0.08 });
      return;
    }
    if (pan.current) {
      const ctm = svgRef.current?.getScreenCTM(); if (!ctm) return;
      const { sx, sy, view: v0 } = pan.current;
      setView(clampView({ ...v0, x: v0.x - (e.clientX - sx) / ctm.a, y: v0.y - (e.clientY - sy) / ctm.d }));
    }
  };
  const up = () => {
    if (drag) {
      const p = t.pieces[drag.id];
      if (drag.moved) send({ type: 'jigsaw:drop', id: drag.id, x: p.x + drag.dx, y: p.y + drag.dy });
      else if (cfg.rotate) { send({ type: 'jigsaw:rotate', id: drag.id }); send({ type: 'jigsaw:release', id: drag.id }); }
      else send({ type: 'jigsaw:release', id: drag.id });
      setDrag(null);
    }
    pan.current = null;
  };
  const rotateNow = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!canPlay || !cfg.rotate || heldByOther(t.pieces[id].g)) return;
    send({ type: 'jigsaw:rotate', id });
  };
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void wrapRef.current?.requestFullscreen?.().catch(() => undefined); };

  // Kelompok besar di bawah, keping lepas di atas, kelompok yang sedang diseret paling atas.
  const order = [...t.pieces.keys()].sort((a, b) => {
    const ga = t.pieces[a].g, gb = t.pieces[b].g;
    if (drag && (ga === drag.g) !== (gb === drag.g)) return ga === drag.g ? 1 : -1;
    return (groups.get(gb)!.length - groups.get(ga)!.length) || ga - gb;
  });
  const elapsed = (t.finishedAt ?? now) - t.startedAt;
  const tableColor = TABLES.find(x => x.id === table)?.color ?? TABLES[0].color;
  const patternId = `jg-img-${game.tokenId}`;

  return <section className="mg-skin alchemy-skin jigsaw-skin" data-phase={game.phase}>
    {rules}
    {t.done && <div className="al-won" role="status">
      <Sparkles size={18} />
      <div><div className="al-phrase pt-phrase">Puzzle selesai · {clock(elapsed)}</div><p>{t.reward}</p></div>
    </div>}

    <div ref={wrapRef} className={`jg-wrap${full ? ' full' : ''}`} style={{ ['--jg-table' as string]: tableColor }}>
      <div className="jg-bar">
        <div className="jg-progress" aria-label={`${percent}% tersambung`}>
          <strong>{percent}%</strong>
          <div className="jg-meter"><i style={{ width: `${percent}%` }} /></div>
          <span>{count} keping · {groups.size} kelompok</span>
        </div>
        <div className="jg-time" title="Lama merakit"><Timer size={14} />{clock(elapsed)}</div>
        <div className="jg-tools">
          <button type="button" className={`al-ghost${preview ? ' on' : ''}`} onClick={() => setPreview(v => !v)}><ImageIcon size={14} />Gambar contoh</button>
          <span className="jg-swatches" role="radiogroup" aria-label="Warna meja">
            {TABLES.map(x => <button key={x.id} type="button" role="radio" aria-checked={table === x.id} title={`Meja ${x.label}`} style={{ background: x.color }} onClick={() => { setTable(x.id); try { localStorage.setItem(TABLE_KEY, x.id); } catch { /* abaikan */ } }} />)}
          </span>
          <span className="jg-zoom">
            <button type="button" aria-label="Perkecil" onClick={() => zoom(1.25)}><Minus size={14} /></button>
            <button type="button" aria-label="Perbesar" onClick={() => zoom(0.8)}><Plus size={14} /></button>
            <button type="button" aria-label="Tampilkan semua" onClick={() => setView({ x: 0, y: 0, w: TW, h: TH })}><Maximize2 size={14} /></button>
            <button type="button" aria-label={full ? 'Keluar layar penuh' : 'Layar penuh'} onClick={toggleFull}>{full ? <Shrink size={14} /> : <Expand size={14} />}</button>
          </span>
        </div>
      </div>

      <div className="jg-stage">
        <svg ref={svgRef} className={`jg-svg${drag ? ' dragging' : ''}`} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          onPointerDown={e => { if (!drag) pan.current = { sx: e.clientX, sy: e.clientY, view }; }}
          onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          onWheel={(e: RWheelEvent) => { const w = toWorld(e.clientX, e.clientY); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, w.x, w.y); }}
          onContextMenu={e => e.preventDefault()} role="img" aria-label={`Meja puzzle ${cfg.title}`}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <image href={cfg.image} width={W} height={H} preserveAspectRatio="none" />
            </pattern>
          </defs>
          <rect x={-TW} y={-TH} width={TW * 3} height={TH * 3} className="jg-table" />
          <rect x={(TW - W) / 2 - 20} y={(TH - H) / 2 - 20} width={W + 40} height={H + 40} rx="18" className="jg-zone" />
          {order.map(id => {
            const p = t.pieces[id];
            const inDrag = !!drag && p.g === drag.g;
            const x = p.x + (inDrag ? drag!.dx : 0), y = p.y + (inDrag ? drag!.dy : 0);
            const h = homeCenter(id, cfg.cols, PW, PH);
            const other = heldByOther(p.g);
            const single = groups.get(p.g)!.length === 1;
            const cls = `jg-piece${inDrag ? ' dragging' : ''}${other ? ' held' : ''}${single ? '' : ' joined'}`;
            const label = other && groups.get(p.g)![0] === id;
            return <g key={id} data-id={id} className={cls} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${p.r * 90}) translate(${(-h.x).toFixed(1)} ${(-h.y).toFixed(1)})`}
              onPointerDown={e => down(e, id)} onContextMenu={e => rotateNow(e, id)}>
              <path d={paths[id]} fill={`url(#${patternId})`} style={other ? { stroke: colorOf(other) } : undefined} />
              {label && <text x={h.x} y={h.y - PH * 0.62} textAnchor="middle" className="jg-holder" style={{ fill: colorOf(other!) }} transform={`rotate(${-p.r * 90} ${h.x} ${h.y})`}>{name(other!)}</text>}
            </g>;
          })}
        </svg>
        {preview && <figure className="jg-preview" onClick={() => setPreview(false)}>
          <img src={cfg.image} alt={`Contoh: ${cfg.title}`} />
          <figcaption>{cfg.title}{cfg.credit ? ` · ${cfg.credit}` : ''}</figcaption>
        </figure>}
      </div>
      <p className="al-hint jg-hint">Seret untuk memindahkan{cfg.rotate ? ' · klik atau klik kanan untuk memutar' : ''} · gulir untuk zoom · seret area kosong untuk menggeser meja.</p>
    </div>

    {!!Object.keys(t.joins).length && <div className="al-log jg-credits" aria-label="Sambungan per pemain">
      {Object.entries(t.joins).sort((a, b) => b[1] - a[1]).map(([id, n]) => <div key={id} className="ok"><span>{id === playerId ? 'Kamu' : name(id)}</span> menyambung <b>{n}</b> keping</div>)}
    </div>}
    {cfg.credit && <p className="jg-credit">{cfg.credit}</p>}

    {dm && <div className="al-dm">
      <label htmlFor="jg-reward">Pesan hadiah (muncul saat puzzle selesai)</label>
      <textarea id="jg-reward" rows={2} maxLength={300} value={reward ?? t.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === t.reward} onClick={() => { send({ type: 'jigsaw:reward', text: reward }); setReward(null); }}>Simpan pesan</button>
    </div>}
  </section>;
}
