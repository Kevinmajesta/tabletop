import { useEffect, useRef, useState } from 'react';
import { Coffee, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import './rest-screen.css';

export type RestState = { kind: 'pause' | 'short' | 'long'; note: string; since: number };

const copy = {
  pause: { kicker: 'Sesi dijeda', title: 'Permainan Dijeda', line: 'Ambil napas, isi minum. Petualangan berlanjut sebentar lagi.' },
  short: { kicker: 'Short Rest · 1 jam', title: 'Istirahat Sejenak', line: 'Api kecil menyala. Pakai Hit Dice di sheet untuk memulihkan HP.' },
  long: { kicker: 'Long Rest · 8 jam', title: 'Bermalam di Bawah Bintang', line: 'HP, spell slot, dan kemampuan pulih saat fajar. Pilih Long Rest di sheet karakter.' },
} as const;

const SOUND_KEY = 'meja-petualang:rest-sound';
function readSound() { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } }

// Suara api dan dengung lembut dibuat langsung dengan Web Audio, tanpa file musik.
function startAmbience(kind: RestState['kind']) {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => undefined;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
  master.connect(ctx.destination);
  const timers: number[] = [];

  // Dengung latar: dua nada rendah yang pelan bergoyang.
  const chord = kind === 'pause' ? [110, 164.8, 220] : [98, 146.8];
  for (const freq of chord) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = kind === 'pause' ? 0.035 : 0.02;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07 + Math.random() * 0.08;
    const depth = ctx.createGain();
    depth.gain.value = gain.gain.value * 0.6;
    lfo.connect(depth).connect(gain.gain);
    osc.connect(gain).connect(master);
    osc.start(); lfo.start();
  }

  if (kind !== 'pause') {
    // Desis api: noise yang disaring rendah.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer; noise.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.value = 500;
    const hiss = ctx.createGain(); hiss.gain.value = 0.22;
    noise.connect(lowpass).connect(hiss).connect(master);
    noise.start();
    // Letupan kayu: klik pendek acak.
    const crackle = () => {
      const len = Math.floor(ctx.sampleRate * (0.004 + Math.random() * 0.012));
      const pop = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = pop.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const src = ctx.createBufferSource(); src.buffer = pop;
      const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1200 + Math.random() * 2800;
      const g = ctx.createGain(); g.gain.value = 0.08 + Math.random() * 0.2;
      src.connect(band).connect(g).connect(master); src.start();
      timers.push(window.setTimeout(crackle, 60 + Math.random() * (Math.random() < 0.2 ? 900 : 260)));
    };
    crackle();
  }
  void ctx.resume().catch(() => undefined);
  return () => {
    timers.forEach(clearTimeout);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    window.setTimeout(() => void ctx.close().catch(() => undefined), 700);
  };
}

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

export default function RestScreen({ rest, isDM, onEnd }: { rest: RestState; isDM: boolean; onEnd: () => void }) {
  const [hidden, setHidden] = useState(false);
  const [sound, setSound] = useState(readSound);
  const elapsed = useElapsed(rest.since);
  const text = copy[rest.kind];
  // Layar muncul lagi setiap DM memulai jeda/istirahat baru.
  useEffect(() => setHidden(false), [rest.since, rest.kind]);
  useEffect(() => {
    if (!sound || hidden) return;
    return startAmbience(rest.kind);
  }, [sound, hidden, rest.kind]);
  const toggleSound = () => setSound((v) => { try { localStorage.setItem(SOUND_KEY, v ? 'off' : 'on'); } catch { /* abaikan */ } return !v; });

  if (hidden) {
    return (
      <button className="rest-pill" onClick={() => setHidden(false)}>
        <span className="rest-pill-dot" />{text.title} · {elapsed}
      </button>
    );
  }

  return (
    <div className={`rest-screen rest-${rest.kind}`} role="dialog" aria-modal="true" aria-label={text.title}>
      <div className="rest-sky" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 60}%`, animationDelay: `${(i % 7) * 0.6}s` }} />)}</div>
      <div className="rest-vignette" aria-hidden="true" />

      <div className="rest-content">
        <div className="rest-kicker">{text.kicker}</div>
        <h1 className="rest-title">{text.title}</h1>
        <div className="rest-rule" aria-hidden="true"><span /></div>
        <p className="rest-line">{rest.note || text.line}</p>
        {rest.note && <p className="rest-sub">{text.line}</p>}
        <div className="rest-clock" aria-label={`Berlangsung ${elapsed}`}>{elapsed}</div>
      </div>

      {rest.kind === 'pause' ? (
        <div className="rest-hourglass" aria-hidden="true"><div className="hg-glass"><i className="hg-top" /><i className="hg-stream" /><i className="hg-bottom" /></div></div>
      ) : (
        <div className="rest-fire" aria-hidden="true">
          <div className="fire-glow" />
          <div className="fire-flames"><i /><i /><i /><i /></div>
          <div className="fire-logs"><i /><i /></div>
          <div className="fire-embers">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ left: `${30 + ((i * 41) % 40)}%`, animationDelay: `${i * 0.37}s`, animationDuration: `${2.6 + (i % 4) * 0.5}s` }} />)}</div>
        </div>
      )}

      <div className="rest-actions">
        <button onClick={toggleSound} title={sound ? 'Matikan suara' : 'Nyalakan suara'}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />}{sound ? 'Suara' : 'Senyap'}</button>
        {!isDM && <button onClick={() => setHidden(true)}><Minimize2 size={16} />Lihat meja</button>}
        {isDM && <button className="rest-resume" onClick={onEnd}><Play size={16} />Lanjutkan permainan</button>}
      </div>
    </div>
  );
}

// Tombol DM di toolbar: satu klik untuk jeda, menu kecil untuk Short/Long Rest dan catatan.
export function RestControl({ rest, onStart, onEnd, disabled }: { rest: RestState | null; onStart: (kind: RestState['kind'], note: string) => void; onEnd: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pos, setPos] = useState({ top: 56, left: 8 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const start = (kind: RestState['kind']) => { onStart(kind, note); setOpen(false); setNote(''); };

  if (rest) return <button className="dm-launch rest-launch active" onClick={onEnd} disabled={disabled}><Play size={17} />Lanjutkan</button>;
  return (
    <div className="rest-control" ref={ref}>
      <button
        className="dm-launch rest-launch"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 288)) }); setOpen((v) => !v); }}
        aria-expanded={open}
        disabled={disabled}
      ><Pause size={17} />Jeda</button>
      {open && (
        // Menu fixed agar tidak terpotong toolbar yang bisa di-scroll.
        <div className="rest-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
          <button role="menuitem" className="rest-option" onClick={() => start('pause')}>
            <Pause size={18} /><span><strong>Jeda permainan</strong><small>Splash untuk semua pemain</small></span>
          </button>
          <button role="menuitem" className="rest-option" onClick={() => start('short')}>
            <Coffee size={18} /><span><strong>Short Rest</strong><small>Api unggun, 1 jam</small></span>
          </button>
          <button role="menuitem" className="rest-option" onClick={() => start('long')}>
            <span className="rest-moon" /><span><strong>Long Rest</strong><small>Bermalam, 8 jam</small></span>
          </button>
          <input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Pesan opsional, mis. “Lanjut 10 menit lagi”" onKeyDown={(e) => { if (e.key === 'Enter') start('pause'); }} />
        </div>
      )}
    </div>
  );
}
