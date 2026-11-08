import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import './game-skin.css';

// Aturan main yang bisa dilipat. Terbuka saat ronde menunggu, terlipat saat ronde berjalan supaya papan permainan langsung terlihat.
export default function GameRules({ phase, children }: { phase: string; children: ReactNode }) {
  return (
    <details key={phase === 'waiting' ? 'waiting' : 'playing'} className="mg-rules" open={phase === 'waiting' || undefined}>
      <summary><BookOpen size={15} aria-hidden="true" />Cara main</summary>
      <div className="mg-rules-body">{children}</div>
    </details>
  );
}
