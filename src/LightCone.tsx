import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import "./light-cone.css";

// Pengaturan bentuk cahaya token: bulat atau lancip (kerucut) dengan lebar sudut dan arah.
// Arah dalam derajat layar: 0 = kanan, 90 = bawah. Arah dipilih dengan menyeret/klik dial.
type Props = {
  shape: "circle" | "cone";
  angle: number;
  dir: number;
  canShape: boolean; // DM: boleh mengganti bentuk dan lebar sudut
  disabled: boolean;
  onChange: (patch: { lightShape?: "circle" | "cone"; lightAngle?: number; lightDir?: number }) => void;
};

const point = (deg: number, r: number) => ({ x: 50 + Math.cos((deg * Math.PI) / 180) * r, y: 50 + Math.sin((deg * Math.PI) / 180) * r });
function wedge(dir: number, angle: number, r: number) {
  const a = point(dir - angle / 2, r), b = point(dir + angle / 2, r);
  return `M50,50L${a.x.toFixed(2)},${a.y.toFixed(2)}A${r},${r} 0 ${angle > 180 ? 1 : 0} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}Z`;
}

export default function LightCone({ shape, angle, dir, canShape, disabled, onChange }: Props) {
  const [draft, setDraft] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const dial = useRef<SVGSVGElement>(null);
  const shown = draft ?? dir, spread = width ?? angle;
  const aim = (e: RPointerEvent) => {
    const box = dial.current?.getBoundingClientRect();
    if (!box) return dir;
    const deg = (Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
    return Math.round(((deg % 360) + 360) % 360 / 5) * 5 % 360;
  };
  return (
    <div className="light-cone">
      {canShape && (
        <div className="light-cone-shape" role="group" aria-label="Bentuk cahaya">
          <button type="button" aria-pressed={shape === "circle"} disabled={disabled} onClick={() => onChange({ lightShape: "circle" })}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /></svg>Bulat
          </button>
          <button type="button" aria-pressed={shape === "cone"} disabled={disabled} onClick={() => onChange({ lightShape: "cone" })}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3,10L17,4A9,9 0 0 1 17,16Z" /></svg>Lancip
          </button>
        </div>
      )}
      {shape === "cone" && (
        <div className="light-cone-aim">
          <svg ref={dial} viewBox="0 0 100 100" className="light-cone-dial" role="slider" aria-label="Arah cahaya" aria-valuemin={0} aria-valuemax={359} aria-valuenow={shown} tabIndex={disabled ? -1 : 0}
            onPointerDown={(e) => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); setDraft(aim(e)); }}
            onPointerMove={(e) => { if (draft !== null) setDraft(aim(e)); }}
            onPointerUp={(e) => { if (draft === null) return; const d = aim(e); setDraft(null); if (d !== dir) onChange({ lightDir: d }); }}
            onKeyDown={(e) => { if (disabled) return; const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -15 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 15 : 0; if (step) { e.preventDefault(); onChange({ lightDir: (dir + step + 360) % 360 }); } }}>
            <circle cx="50" cy="50" r="46" className="light-cone-ring" />
            <path d={wedge(shown, Math.min(spread, 359), 44)} className="light-cone-wedge" />
            <circle cx="50" cy="50" r="7" className="light-cone-token" />
          </svg>
          <div className="light-cone-fields">
            <span className="light-cone-hint">Seret dial untuk memutar arah cahaya</span>
            <b>Arah {shown}°</b>
            {canShape && (
              <label>
                Lebar sudut <output>{spread}°</output>
                <input type="range" min={20} max={180} step={5} value={spread} disabled={disabled}
                  onChange={(e) => setWidth(e.target.valueAsNumber)}
                  onPointerUp={() => { if (width !== null && width !== angle) onChange({ lightAngle: width }); setWidth(null); }}
                  onKeyUp={() => { if (width !== null && width !== angle) onChange({ lightAngle: width }); setWidth(null); }} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
