import './roll-card.css';

type Roll = { sides: number; modifier: number; values: number[]; total: number };

// Kartu hasil lemparan di chat. Data dadu dari server; mode dan catatan kondisi dibaca dari teks pesan.
export default function RollCard({ roll, text }: { roll: Roll; text: string }) {
  const mode = text.startsWith('advantage:') ? 'advantage' : text.startsWith('disadvantage:') ? 'disadvantage' : 'normal';
  const count = roll.values.length;
  const formula = `${count}d${roll.sides}${roll.modifier ? (roll.modifier > 0 ? '+' : '−') + Math.abs(roll.modifier) : ''}`;
  // Pada advantage/disadvantage hanya satu dadu yang dipakai.
  const keptIndex = mode === 'normal' ? -1 : roll.values.indexOf(mode === 'advantage' ? Math.max(...roll.values) : Math.min(...roll.values));
  const kept = mode === 'normal' ? (count === 1 ? roll.values[0] : undefined) : roll.values[keptIndex];
  const natural = roll.sides === 20 && kept !== undefined ? (kept === 20 ? 'crit' : kept === 1 ? 'fumble' : '') : '';
  const note = text.split(`= ${roll.total}`).slice(1).join(`= ${roll.total}`).trim();

  return (
    <div className={`roll-card${natural ? ' ' + natural : ''}`}>
      <div className="roll-card-head">
        <span className="roll-formula">{formula}</span>
        {mode !== 'normal' && <span className={`roll-mode ${mode}`}>{mode === 'advantage' ? 'Advantage' : 'Disadvantage'}</span>}
      </div>
      <div className="roll-card-body">
        <strong className="roll-total" aria-label={`Total ${roll.total}`}>{roll.total}</strong>
        <div className="roll-dice" aria-label={`Hasil dadu ${roll.values.join(', ')}`}>
          {roll.values.map((value, i) => (
            <span key={i} className={`roll-die${keptIndex >= 0 && i !== keptIndex ? ' dropped' : ''}${roll.sides === 20 && value === 20 ? ' max' : ''}${roll.sides === 20 && value === 1 ? ' min' : ''}`}>{value}</span>
          ))}
          {!!roll.modifier && <span className="roll-mod">{roll.modifier > 0 ? '+' : '−'}{Math.abs(roll.modifier)}</span>}
        </div>
      </div>
      {natural && <div className="roll-natural">{natural === 'crit' ? 'Natural 20' : 'Natural 1'}</div>}
      {note && <div className="roll-note">{note}</div>}
    </div>
  );
}
