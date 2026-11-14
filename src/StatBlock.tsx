import { useEffect, useState } from "react";
import { Dice5 } from "lucide-react";
import { monsterStats, type MonsterAction, type MonsterStats } from "../server/monsters";
import "./monster-sheet.css";

export type RollMode = "normal" | "advantage" | "disadvantage";
const names = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" } as const;
const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
const mod = (score: number) => Math.floor((score - 10) / 2);
// Parser dadu server hanya menerima satu kelompok dadu: "2d6+3".
const rollable = (dice: string) => /^\d{1,2}d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/.test(dice);

// Ambil stat block: SRD/homebrew langsung, Monster Manual 2024 dimuat lazy.
export function useMonsterStats(key: string) {
  const [stats, setStats] = useState<MonsterStats | undefined>(() => monsterStats(key));
  useEffect(() => {
    const local = monsterStats(key);
    if (local || !key.startsWith("xmm:")) { setStats(local); return; }
    setStats(undefined);
    let alive = true;
    void import("../server/bestiary").then((m) => { if (alive) setStats(m.bestiaryStats(key)); });
    return () => { alive = false; };
  }, [key]);
  return stats;
}

export function creditFor(stats: MonsterStats) {
  return stats.source === "homebrew"
    ? "Stat block homebrew (buatan sendiri)."
    : stats.source.startsWith("XMM")
      ? `Stat block: Monster Manual 2024 (${stats.source}), impor 5etools — hanya untuk pemakaian pribadi.`
      : "Stat block: SRD 5.1 (Wizards of the Coast), CC BY 4.0.";
}

// Isi stat block (gaya sheet NPC). Klik angka untuk roll ke chat; label = nama monster/token.
export default function StatBlock({
  stats,
  label,
  ac,
  hp,
  maxHp,
  onRoll,
  expanded = false,
}: {
  stats: MonsterStats;
  label: string;
  ac?: number;
  hp?: number;
  maxHp?: number;
  onRoll?: (expression: string, mode: RollMode, label: string) => void;
  expanded?: boolean;
}) {
  const [mode, setMode] = useState<RollMode>("normal");
  const [critical, setCritical] = useState(false);
  const roll = onRoll || (() => undefined);
  const disabled = !onRoll;
  const d20 = (bonus: number, what: string) => roll(`${mode === "normal" ? 1 : 2}d20${sign(bonus)}`, mode, `${label} · ${what}`);
  const damage = (dice: string, what: string) => {
    const doubled = critical ? dice.replace(/^(\d+)d/, (_, n) => `${Number(n) * 2}d`) : dice;
    roll(doubled, "normal", `${label} · ${what}${critical ? " (crit)" : ""}`);
  };
  const saves = new Map(stats.saves.map(([name, value]) => [name.toUpperCase(), value]));
  const text = (name: string, desc: string) =>
    expanded ? (
      <div key={name} className="ms-trait ms-open"><strong>{name}.</strong> <p>{desc}</p></div>
    ) : (
      <details key={name} className="ms-trait"><summary>{name}</summary><p>{desc}</p></details>
    );
  const actionBlock = (a: MonsterAction) => (
    <div className="ms-action" key={a.name}>
      <div className="ms-action-head">
        <strong>{a.name}{a.usage && <small> ({a.usage})</small>}</strong>
        {a.attack != null && (
          <button type="button" className="ms-hit" disabled={disabled} onClick={() => d20(a.attack!, `${a.name} (hit)`)} title="Roll serangan">
            <Dice5 size={13} /> {sign(a.attack)}
          </button>
        )}
        {(a.damage || []).map((d, i) =>
          rollable(d.dice) ? (
            <button type="button" key={i} className="ms-dmg" disabled={disabled} onClick={() => damage(d.dice, `${a.name} ${d.type}`)} title={`Roll damage ${d.type}`}>
              {d.dice} <small>{d.type}</small>
            </button>
          ) : (
            <span key={i} className="ms-dmg-static">{d.dice} {d.type}</span>
          ),
        )}
        {a.dc && <span className="ms-dc">DC {a.dc.value}{a.dc.ability ? ` ${a.dc.ability}` : ""}</span>}
      </div>
      {expanded ? <p className="ms-desc">{a.desc}</p> : (
        <details>
          <summary>Detail</summary>
          <p>{a.desc}</p>
        </details>
      )}
    </div>
  );
  return (
    <>
      <div className="ms-vitals">
        <div><span>AC</span><strong>{ac ?? stats.ac}</strong>{stats.acNote && <small>{stats.acNote}</small>}</div>
        <div><span>HP</span><strong>{hp ?? stats.hp}{maxHp != null && <small>/{maxHp}</small>}</strong><small>{stats.hitDice}</small></div>
        <button type="button" disabled={disabled} onClick={() => d20(stats.init, "Initiative")} title="Roll initiative"><span>Init</span><strong>{sign(stats.init)}</strong>{!disabled && <small>roll</small>}</button>
        <div><span>Speed</span><strong className="ms-speed">{stats.speed}</strong></div>
      </div>
      {!disabled && (
        <div className="ms-toggles">
          <div className="ms-mode" role="radiogroup" aria-label="Mode d20">
            {([["disadvantage", "Disadv"], ["normal", "Normal"], ["advantage", "Adv"]] as const).map(([m, name]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>{name}</button>
            ))}
          </div>
          <label className="ms-crit"><input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} /> Critical</label>
        </div>
      )}
      <div className="ms-abilities">
        {(Object.keys(names) as (keyof typeof names)[]).map((key) => {
          const score = stats.abilities[key];
          const save = saves.get(names[key]) ?? mod(score);
          return (
            <div key={key}>
              <button type="button" disabled={disabled} onClick={() => d20(mod(score), `${names[key]} check`)} title={`${names[key]} check`}>
                <span>{names[key]}</span>
                <strong>{sign(mod(score))}</strong>
                <small>{score}</small>
              </button>
              <button type="button" disabled={disabled} className={saves.has(names[key]) ? "prof" : ""} onClick={() => d20(save, `${names[key]} save`)} title={`${names[key]} saving throw`}>
                Save {sign(save)}
              </button>
            </div>
          );
        })}
      </div>
      <dl className="ms-props">
        {!!stats.skills.length && (
          <div><dt>Skills</dt><dd>{stats.skills.map(([name, value]) => (
            <button type="button" key={name} disabled={disabled} onClick={() => d20(value, name)}>{name} {sign(value)}</button>
          ))}</dd></div>
        )}
        {stats.vulnerabilities && <div><dt>Rentan</dt><dd>{stats.vulnerabilities}</dd></div>}
        {stats.resistances && <div><dt>Resisten</dt><dd>{stats.resistances}</dd></div>}
        {stats.immunities && <div><dt>Imun damage</dt><dd>{stats.immunities}</dd></div>}
        {stats.conditionImmunities && <div><dt>Imun kondisi</dt><dd>{stats.conditionImmunities}</dd></div>}
        <div><dt>Senses</dt><dd>{stats.senses}</dd></div>
        <div><dt>Bahasa</dt><dd>{stats.languages}</dd></div>
      </dl>
      {!!stats.traits.length && (
        <section>
          <h3>Trait</h3>
          {stats.traits.map((t) => text(t.name, t.desc))}
        </section>
      )}
      <section>
        <h3>Action</h3>
        {stats.actions.map(actionBlock)}
      </section>
      {!!stats.bonus?.length && (
        <section>
          <h3>Bonus Action</h3>
          {stats.bonus.map(actionBlock)}
        </section>
      )}
      {!!stats.reactions.length && (
        <section>
          <h3>Reaction</h3>
          {stats.reactions.map((t) => text(t.name, t.desc))}
        </section>
      )}
      {!!stats.legendary.length && (
        <section>
          <h3>Legendary Action</h3>
          {stats.legendary.map((t) => text(t.name, t.desc))}
        </section>
      )}
      <p className="ms-credit">{creditFor(stats)}</p>
    </>
  );
}
