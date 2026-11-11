import { useState, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { categoryNames, elements, type Category, type Element } from '../server/alchemy-data';
import './alchemy.css';

// Tabel periodik bersama untuk minigame alkemis (Segel, Ramuan, Jalur).
// Pemanggil menentukan apa yang terjadi saat unsur diklik dan bisa menandai sel tertentu.
const stateClass: Record<Element['state'], string> = { padat: 'solid', cair: 'liquid', gas: 'gas', 'tidak diketahui': 'unknown' };
const legend: Category[] = ['alkali', 'alkaline', 'transition', 'post', 'metalloid', 'nonmetal', 'halogen', 'noble', 'lanthanide', 'actinide'];
export const elementAt = (z: number) => elements[z - 1];

export default function PeriodicTable({ title = 'Tabel Unsur', cellClass, cellBadge, onCell, onCellDouble, action, hint, showInfo = true }: {
  title?: string;
  cellClass?: (e: Element) => string;
  cellBadge?: (e: Element) => ReactNode;
  onCell?: (e: Element) => void;
  onCellDouble?: (e: Element) => void;
  action?: (e: Element) => ReactNode;
  hint?: string;
  showInfo?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [colorBy, setColorBy] = useState<'category' | 'state'>('category');
  const sel = picked ? elementAt(picked) : null;
  return (
    <div className="al-table-wrap">
      <div className="al-table-bar">
        <span><FlaskConical size={14} />{title}</span>
        <div className="al-toggle" role="radiogroup" aria-label="Warnai menurut">
          {(['category', 'state'] as const).map(m => <button key={m} type="button" role="radio" aria-checked={colorBy === m} onClick={() => setColorBy(m)}>{m === 'category' ? 'Kategori' : 'Wujud'}</button>)}
        </div>
      </div>
      <div className="al-scroll">
        <div className={`al-table by-${colorBy}`}>
          {Array.from({ length: 18 }, (_, i) => <span key={`g${i}`} className="al-gnum" style={{ gridColumn: i + 2, gridRow: 1 }}>{i + 1}</span>)}
          {Array.from({ length: 7 }, (_, i) => <span key={`p${i}`} className="al-pnum" style={{ gridColumn: 1, gridRow: i + 2 }}>{i + 1}</span>)}
          <span className="al-fmark" style={{ gridColumn: 4, gridRow: 7 }}>57–71</span>
          <span className="al-fmark" style={{ gridColumn: 4, gridRow: 8 }}>89–103</span>
          {elements.map(e => (
            <button key={e.z} type="button"
              className={`al-cell cat-${e.category} st-${stateClass[e.state]}${picked === e.z && showInfo ? ' picked' : ''}${cellClass ? ' ' + cellClass(e) : ''}`}
              style={{ gridColumn: e.col + 1, gridRow: e.row + 1 }}
              onClick={() => { setPicked(e.z); onCell?.(e); }} onDoubleClick={() => onCellDouble?.(e)}
              title={`${e.name} (${e.z})`} aria-label={`${e.name}, nomor atom ${e.z}`}>
              <small>{e.z}</small><b>{e.symbol}</b>{cellBadge?.(e)}
            </button>
          ))}
        </div>
      </div>
      <div className="al-legend">
        {colorBy === 'category'
          ? legend.map(c => <span key={c} className={`cat-${c}`}><i />{categoryNames[c]}</span>)
          : (['solid', 'liquid', 'gas', 'unknown'] as const).map((s, i) => <span key={s} className={`st-${s}`}><i />{['Padat', 'Cair', 'Gas', 'Tidak diketahui'][i]}</span>)}
      </div>
      {showInfo && sel && <div className="al-info" aria-live="polite">
        <div className={`al-info-tile cat-${sel.category}`}><small>{sel.z}</small><b>{sel.symbol}</b></div>
        <dl>
          <div><dt>Nama</dt><dd>{sel.name}</dd></div>
          <div><dt>Golongan</dt><dd>{sel.group ?? '— (blok f)'}</dd></div>
          <div><dt>Periode</dt><dd>{sel.period}</dd></div>
          <div><dt>Kategori</dt><dd>{categoryNames[sel.category]}</dd></div>
          <div><dt>Wujud</dt><dd>{sel.state}</dd></div>
        </dl>
        {action?.(sel)}
      </div>}
      {(!showInfo || !sel) && hint && <p className="al-hint">{hint}</p>}
    </div>
  );
}
