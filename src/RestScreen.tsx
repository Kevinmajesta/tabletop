import { useEffect, useRef, useState } from 'react';
import { Coffee, Pause, Play, Timer, X } from 'lucide-react';
import './rest-screen.css';

export type RestState = { kind: 'pause' | 'short' | 'long' | 'countdown'; note: string; since: number };
const COUNTDOWN_MS = 5_000;

const copy = {
  pause: { title: 'Game Paused', hint: '' },
  countdown: { title: 'Hitung Mundur', hint: '' },
  short: { title: 'Short Rest', hint: '' },
  long: { title: 'Long Rest', hint: '' },
} as const;

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
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

  if (rest) return rest.kind === 'countdown'
    ? <button className="dm-launch rest-launch active" onClick={onEnd} disabled={disabled}><X size={17} />Hentikan</button>
    : <button className="dm-launch rest-launch active" onClick={onEnd} disabled={disabled}><Play size={17} />Lanjutkan</button>;
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
            <Pause size={18} /><span><strong>Jeda permainan</strong><small>Tanda pause di atas peta</small></span>
          </button>
          <button role="menuitem" className="rest-option" onClick={() => start('countdown')}>
            <Timer size={18} /><span><strong>Hitung mundur</strong><small>Angka 5 sampai 0 untuk semua</small></span>
          </button>
          <button role="menuitem" className="rest-option" onClick={() => start('short')}>
            <Coffee size={18} /><span><strong>Short Rest</strong><small>Layar api unggun · pulihkan lewat sheet</small></span>
          </button>
          <button role="menuitem" className="rest-option" onClick={() => start('long')}>
            <span className="rest-moon" /><span><strong>Long Rest</strong><small>Layar bermalam · pulihkan lewat sheet</small></span>
          </button>
          <input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Pesan opsional, mis. “Lanjut 10 menit lagi”" onKeyDown={(e) => { if (e.key === 'Enter') start('pause'); }} />
        </div>
      )}
    </div>
  );
}

// Lapisan jeda/istirahat di atas peta: peta tetap terlihat dan bisa digeser/di-zoom.
// Lapisan ini tidak menangkap klik (pointer-events: none), kecuali tombol Lanjutkan milik GM.
export function RestOverlay({ rest, isDM, onEnd }: { rest: RestState; isDM: boolean; onEnd: () => void }) {
  if (rest.kind === 'countdown') return <CountdownOverlay key={rest.since} rest={rest} />;
  return <RestPanel rest={rest} isDM={isDM} onEnd={onEnd} />;
}

// Hitung mundur 5 → 0 di tengah peta. Waktu mulai memakai jam server (since) bila masuk akal; bila jam
// perangkat ini berbeda jauh, pakai saat state diterima supaya semua orang tetap melihat hitungan penuh.
function CountdownOverlay({ rest }: { rest: RestState }) {
  const [start] = useState(() => { const lag = Date.now() - rest.since; return lag >= -1500 && lag <= COUNTDOWN_MS + 3000 ? rest.since : Date.now(); });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let frame = 0;
    const tick = () => { setNow(Date.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const n = Math.ceil(Math.max(0, COUNTDOWN_MS - (now - start)) / 1000);
  // Hanya angka besar di tengah peta; DM menghentikannya lewat tombol di toolbar.
  return (
    <div className={`rest-overlay rest-countdown${n === 0 ? ' done' : n <= 3 ? ' urgent' : ''}`} role="timer" aria-label={`Hitung mundur, ${n} detik`}>
      <span key={n} className="countdown-num">{n}</span>
    </div>
  );
}

function RestPanel({ rest, isDM, onEnd }: { rest: RestState; isDM: boolean; onEnd: () => void }) {
  const elapsed = useElapsed(rest.since);
  const text = copy[rest.kind];
  return (
    <div className={`rest-overlay rest-${rest.kind}`} role="status" aria-live="polite" aria-label={`${text.title}, ${elapsed}`}>
      <div className="rest-band" aria-hidden="true" />
      <div className="rest-mark">
        <strong>{text.title}</strong>
        {rest.note && <p>{rest.note}</p>}
        {text.hint && <small className="rest-hint">{text.hint}</small>}
        <span className="rest-clock">{elapsed}</span>
        {isDM &&<button type="button" className="rest-resume" onClick={onEnd}><Play size={14} />Lanjutkan</button>}
      </div>
    </div>
  );
}
