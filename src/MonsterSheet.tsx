import { X } from "lucide-react";
import type { BoardToken } from "../server/tabletop";
import StatBlock, { useMonsterStats, type RollMode } from "./StatBlock";
import "./monster-sheet.css";

// Panel stat block untuk token monster di peta: HP/AC mengikuti token, roll memakai nama token.
export default function MonsterSheet({
  token,
  onClose,
  onRoll,
}: {
  token: BoardToken;
  onClose: () => void;
  onRoll: (expression: string, mode: RollMode, label: string) => void;
}) {
  const stats = useMonsterStats(token.monster || "");
  if (!stats) return null;
  return (
    <aside className="monster-sheet" aria-label={`Stat block ${token.name}`}>
      <header className="ms-head">
        {token.image && <img src={token.image} alt="" />}
        <div>
          <h2>{token.name}</h2>
          <span>{stats.meta}</span>
          <small>CR {stats.cr} · {stats.xp.toLocaleString("id-ID")} XP · Proficiency +{stats.prof}</small>
        </div>
        <button type="button" className="ms-close" onClick={onClose} aria-label="Tutup stat block"><X size={16} /></button>
      </header>
      <div className="ms-body">
        <StatBlock stats={stats} label={token.name} ac={token.ac} hp={token.hp} maxHp={token.maxHp ?? stats.hp} onRoll={onRoll} />
      </div>
    </aside>
  );
}
