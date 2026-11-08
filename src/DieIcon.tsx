// Ikon bentuk dadu untuk panel Lempar dadu. sides = 0 berarti koin.
export default function DieIcon({ sides }: { sides: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className="die-icon">
      {sides === 4 && <><path d="M16 4 L28 26 L4 26 Z" {...common} /><path d="M16 4 L16 26" {...common} opacity=".45" /></>}
      {sides === 6 && <><rect x="6" y="6" width="20" height="20" rx="3" {...common} /><circle cx="11.5" cy="11.5" r="1.6" fill="currentColor" /><circle cx="16" cy="16" r="1.6" fill="currentColor" /><circle cx="20.5" cy="20.5" r="1.6" fill="currentColor" /></>}
      {sides === 8 && <><path d="M16 3 L28 16 L16 29 L4 16 Z" {...common} /><path d="M4 16 L28 16" {...common} opacity=".45" /></>}
      {sides === 10 && <><path d="M16 3 L27 13 L16 29 L5 13 Z" {...common} /><path d="M5 13 L16 18 L27 13 M16 18 L16 29" {...common} opacity=".45" /></>}
      {sides === 12 && <><path d="M16 3 L28 12 L24 27 L8 27 L4 12 Z" {...common} /><path d="M16 9 L22 13.5 L20 20 L12 20 L10 13.5 Z" {...common} opacity=".45" /></>}
      {sides === 20 && <><path d="M16 2.5 L27.5 9 L27.5 23 L16 29.5 L4.5 23 L4.5 9 Z" {...common} /><path d="M16 8 L23 21 L9 21 Z M16 2.5 L16 8 M4.5 23 L9 21 M27.5 23 L23 21" {...common} opacity=".45" /></>}
      {sides === 100 && <><path d="M11 4 L19 11 L11 24 L3 11 Z" {...common} /><path d="M21 8 L29 15 L21 28 L13 15 Z" {...common} opacity=".7" /></>}
      {sides === 0 && <><circle cx="16" cy="16" r="12" {...common} /><circle cx="16" cy="16" r="7.5" {...common} opacity=".45" /></>}
    </svg>
  );
}
