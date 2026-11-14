import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { monsters, monsterImage, monsterStats, type Monster } from "../server/monsters";
import StatBlock, { useMonsterStats, type RollMode } from "./StatBlock";
import "./monster-sheet.css";

type Entry = Monster & { cr: string; crValue: number; type: string; source: "SRD" | "Homebrew" | "MM 2024"; image: string };
const crValue = (cr: string) => (cr.includes("/") ? Number(cr.split("/")[0]) / Number(cr.split("/")[1]) : Number(cr) || 0);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// "Medium undead, chaotic evil" → "Undead"
const typeOf = (meta: string) => cap((meta.split(",")[0].split(" ")[1] || "monster").replace(/[^a-z/]/gi, ""));
const crBands = [
  ["all", "Semua CR", 0, 99],
  ["0-1", "CR 0–1", 0, 1],
  ["2-4", "CR 2–4", 2, 4],
  ["5-10", "CR 5–10", 5, 10],
  ["11-16", "CR 11–16", 11, 16],
  ["17+", "CR 17+", 17, 99],
] as const;

// Buku monster untuk DM: telusuri semua monster sambil membaca stat block, lalu taruh di peta.
export default function Bestiary({
  onClose,
  onPlace,
  onRoll,
  connected,
}: {
  onClose: () => void;
  onPlace: (key: string, count: number, hidden: boolean) => void;
  onRoll: (expression: string, mode: RollMode, label: string) => void;
  connected: boolean;
}) {
  const [book, setBook] = useState<Monster[] | null>(null);
  useEffect(() => { void import("../server/bestiary").then((m) => setBook(m.bestiaryMonsters)); }, []);
  const entries = useMemo<Entry[]>(() => {
    const quick = monsters.map((m) => {
      const s = monsterStats(m.key)!;
      return { ...m, cr: s.cr, crValue: crValue(s.cr), type: typeOf(s.meta), source: s.source === "homebrew" ? "Homebrew" as const : "SRD" as const, image: monsterImage(m) };
    });
    const xmm = (book || []).map((m) => ({ ...m, cr: m.cr || "0", crValue: crValue(m.cr || "0"), type: m.group, source: "MM 2024" as const, image: monsterImage(m) }));
    return [...quick, ...xmm];
  }, [book]);
  const types = useMemo(() => [...new Set(entries.map((e) => e.type))].sort(), [entries]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [band, setBand] = useState<(typeof crBands)[number][0]>("all");
  const [source, setSource] = useState<"all" | "quick" | "MM 2024">("all");
  const [sort, setSort] = useState<"name" | "cr">("name");
  const [selected, setSelected] = useState(monsters[0].key);
  const [count, setCount] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [placed, setPlaced] = useState("");
  const shown = useMemo(() => {
    const [, , lo, hi] = crBands.find((b) => b[0] === band)!;
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (type === "all" || e.type === type)
        && (band === "all" || (e.crValue >= lo && e.crValue <= hi) || (band === "0-1" && e.crValue < 1))
        && (source === "all" || (source === "quick" ? e.source !== "MM 2024" : e.source === source))
        && (!q || `${e.name} ${e.type} ${e.source}`.toLowerCase().includes(q)))
      .sort((a, b) => (sort === "cr" ? a.crValue - b.crValue : 0) || a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
  }, [entries, query, type, band, source, sort]);
  const current = entries.find((e) => e.key === selected);
  const stats = useMonsterStats(selected);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [selected]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const step = (dir: number) => {
    const i = shown.findIndex((e) => e.key === selected);
    const next = shown[Math.max(0, Math.min(shown.length - 1, (i < 0 ? -1 : i) + dir))];
    if (next) setSelected(next.key);
  };
  let lastLetter = "";
  return (
    <div className="bestiary-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bestiary" role="dialog" aria-modal="true" aria-label="Bestiary">
        <header className="bestiary-head">
          <BookOpen size={20} />
          <div>
            <h2>Bestiary</h2>
            <span>{book ? `${entries.length} monster` : "Memuat Monster Manual 2024…"} · {shown.length} tampil</span>
          </div>
          <button type="button" className="ms-close" onClick={onClose} aria-label="Tutup bestiary"><X size={16} /></button>
        </header>
        <div className="bestiary-filters">
          <label className="bestiary-search">
            <Search size={14} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama monster…" aria-label="Cari monster"
              onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); step(1); } if (e.key === "ArrowUp") { e.preventDefault(); step(-1); } }} />
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipe monster">
            <option value="all">Semua tipe</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={band} onChange={(e) => setBand(e.target.value as typeof band)} aria-label="Challenge rating">
            {crBands.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} aria-label="Sumber">
            <option value="all">Semua sumber</option>
            <option value="quick">Daftar cepat (bergambar)</option>
            <option value="MM 2024">Monster Manual 2024</option>
          </select>
          <div className="bestiary-sort" role="radiogroup" aria-label="Urutkan">
            {([["name", "A–Z"], ["cr", "CR"]] as const).map(([id, name]) => (
              <button key={id} type="button" role="radio" aria-checked={sort === id} onClick={() => setSort(id)}>{name}</button>
            ))}
          </div>
        </div>
        <div className="bestiary-body">
          <ul className="bestiary-list" ref={listRef} role="listbox" aria-label="Daftar monster" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); step(1); } if (e.key === "ArrowUp") { e.preventDefault(); step(-1); } }}>
            {shown.map((e) => {
              const letter = sort === "name" ? e.name[0].toUpperCase() : `CR ${e.cr}`;
              const header = letter !== lastLetter ? <li key={`h:${letter}:${e.key}`} className="bestiary-letter" aria-hidden="true">{letter}</li> : null;
              lastLetter = letter;
              return [
                header,
                <li key={e.key}>
                  <button type="button" role="option" aria-selected={selected === e.key} onClick={() => setSelected(e.key)}>
                    <img src={e.image} alt="" loading="lazy" />
                    <span>
                      <strong>{e.name}</strong>
                      <small>{e.type} · {e.source}</small>
                    </span>
                    <em>CR {e.cr}</em>
                  </button>
                </li>,
              ];
            })}
            {!shown.length && <li className="bestiary-empty">Tidak ada monster yang cocok dengan filter.</li>}
          </ul>
          <article className="bestiary-page">
            {current && stats ? (
              <>
                <header className="ms-head">
                  <img src={current.image} alt="" />
                  <div>
                    <h2>{stats.name}</h2>
                    <span>{stats.meta}</span>
                    <small>CR {stats.cr} · {stats.xp.toLocaleString("id-ID")} XP · Proficiency +{stats.prof}</small>
                  </div>
                </header>
                <div className="ms-body">
                  <StatBlock stats={stats} label={stats.name} onRoll={onRoll} expanded />
                </div>
                <footer className="bestiary-place">
                  <div className="monster-count" aria-label="Jumlah monster">
                    <button type="button" aria-label="Kurangi jumlah" disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))}>−</button>
                    <strong>{count}</strong>
                    <button type="button" aria-label="Tambah jumlah" disabled={count >= 8} onClick={() => setCount((n) => Math.min(8, n + 1))}>+</button>
                  </div>
                  <label className="ms-crit"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Sembunyikan dulu</label>
                  {placed && <span className="bestiary-placed" role="status">{placed}</span>}
                  <button type="button" className="bestiary-place-btn" disabled={!connected} onClick={() => {
                    onPlace(current.key, count, hidden);
                    setPlaced(`${count} ${current.name} ditaruh di peta`);
                    window.setTimeout(() => setPlaced(""), 2500);
                  }}>
                    Taruh {count} di peta
                  </button>
                </footer>
              </>
            ) : (
              <p className="bestiary-empty">{current ? "Memuat stat block…" : "Pilih monster dari daftar."}</p>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
