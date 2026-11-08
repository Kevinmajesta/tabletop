import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react';
import { ruleEntries } from './rules-reference';
import './rule-search.css';

type Spell = {
  index: string; name: string; level: number; school?: { name: string }; classes?: { name: string }[];
  casting_time?: string; range?: string; components?: string[]; material?: string;
  concentration?: boolean; ritual?: boolean; duration?: string; desc?: string[]; description?: string;
};
type Named = { index: string; name: string; desc?: string[]; description?: string; equipment_categories?: { name: string }[]; prerequisites?: unknown };
type Catalog = { spells: Spell[]; equipment: Named[]; feats: Named[] };

type Category = 'Spell' | 'Kondisi' | 'Aksi' | 'Aturan' | 'Item' | 'Feat';
type Entry = { id: string; category: Category; name: string; meta: string; summary: string; body: string[]; facts?: [string, string][]; haystack: string };

const categories: ('Semua' | Category)[] = ['Semua', 'Spell', 'Kondisi', 'Aksi', 'Aturan', 'Item', 'Feat'];

// Katalog SRD cukup besar, jadi diunduh sekali saat pencarian pertama kali dibuka.
let catalogPromise: Promise<Catalog> | null = null;
function loadCatalog() {
  catalogPromise ??= fetch('/api/character-catalog').then((r) => {
    if (!r.ok) throw new Error('catalog');
    return r.json();
  }).catch((error) => { catalogPromise = null; throw error; });
  return catalogPromise;
}

// Bentuk deskripsi di katalog tidak seragam (string, array, atau kosong), jadi diratakan dulu.
const textOf = (item: { desc?: unknown; description?: unknown }) => {
  const raw = Array.isArray(item.desc) && item.desc.length ? item.desc : item.description;
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/\n+/) : [];
  return parts.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean);
};
const levelLabel = (level: number) => (level === 0 ? 'Cantrip' : `Level ${level}`);

function buildEntries(catalog: Catalog | null): Entry[] {
  const list: Entry[] = ruleEntries.map((rule) => ({
    id: `rule-${rule.name}`, category: rule.kind, name: rule.name, meta: '', summary: rule.summary, body: rule.points,
    haystack: `${rule.name} ${rule.summary} ${rule.points.join(' ')}`.toLowerCase(),
  }));
  if (!catalog) return list;
  for (const spell of catalog.spells || []) {
    const body = textOf(spell);
    const tags = [spell.concentration && 'Concentration', spell.ritual && 'Ritual'].filter(Boolean).join(' · ');
    list.push({
      id: `spell-${spell.index}`, category: 'Spell', name: spell.name,
      meta: `${levelLabel(spell.level)} · ${spell.school?.name || ''}${tags ? ' · ' + tags : ''}`,
      summary: body[0] || '', body,
      facts: [
        ['Waktu', spell.casting_time || '—'], ['Jarak', spell.range || '—'],
        ['Komponen', `${(spell.components || []).join(', ')}${spell.material ? ` (${spell.material})` : ''}` || '—'],
        ['Durasi', `${spell.concentration ? 'Concentration, ' : ''}${spell.duration || '—'}`],
        ['Kelas', (spell.classes || []).map((c) => c.name).join(', ') || '—'],
      ],
      haystack: `${spell.name} ${spell.school?.name || ''} ${levelLabel(spell.level)} ${(spell.classes || []).map((c) => c.name).join(' ')}`.toLowerCase(),
    });
  }
  for (const item of catalog.equipment || []) {
    const body = textOf(item);
    const cats = (item.equipment_categories || []).map((c) => c.name.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())).join(' · ');
    list.push({ id: `item-${item.index}`, category: 'Item', name: item.name, meta: cats || 'Item', summary: body[0] || '', body, haystack: `${item.name} ${cats}`.toLowerCase() });
  }
  for (const feat of catalog.feats || []) {
    const body = textOf(feat);
    list.push({ id: `feat-${feat.index}`, category: 'Feat', name: feat.name, meta: 'Feat', summary: body[0] || '', body, haystack: feat.name.toLowerCase() });
  }
  return list;
}

// Nama yang cocok di awal diprioritaskan, lalu cocok di nama, lalu cocok di isi.
function score(entry: Entry, query: string) {
  const name = entry.name.toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(/[\s/-]+/).some((word) => word.startsWith(query))) return 2;
  if (name.includes(query)) return 3;
  if (entry.haystack.includes(query)) return 4;
  return -1;
}

export default function RuleSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('Semua');
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Entry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || catalog) return;
    setLoadError(false);
    loadCatalog().then(setCatalog).catch(() => setLoadError(true));
  }, [open, catalog]);
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.select(), 0); }, [open]);

  const entries = useMemo(() => buildEntries(catalog), [catalog]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = category === 'Semua' ? entries : entries.filter((e) => e.category === category);
    if (!q) return category === 'Semua' ? pool.filter((e) => e.category === 'Kondisi' || e.category === 'Aksi') : pool.slice(0, 80);
    return pool.map((e) => [e, score(e, q)] as const).filter(([, s]) => s >= 0)
      .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name)).slice(0, 60).map(([e]) => e);
  }, [entries, query, category]);
  useEffect(() => setActive(0), [query, category]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!open) return null;

  function onKey(event: React.KeyboardEvent) {
    // Jangan sampai tombol di panel ini memicu shortcut meja (Delete hapus token, V/H/G/D, dst).
    if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) event.nativeEvent.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (detail) setDetail(null); else onClose(); return; }
    if (detail) { if (event.key === 'Backspace' && (event.target as HTMLElement).tagName !== 'INPUT') setDetail(null); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === 'Enter' && results[active]) { event.preventDefault(); setDetail(results[active]); }
    else if (event.key === 'Tab' && !event.shiftKey && event.target === inputRef.current) {
      event.preventDefault();
      setCategory((c) => categories[(categories.indexOf(c) + 1) % categories.length]);
    }
  }

  return (
    <div className="rule-search-layer" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="rule-search" role="dialog" aria-label="Cari aturan dan spell" onKeyDown={onKey}>
        <header className="rs-head">
          <BookOpen size={17} className="rs-mark" />
          <div className="rs-field">
            <Search size={15} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDetail(null); }}
              placeholder="Cari spell, kondisi, aksi, item…"
              aria-label="Kata kunci"
              spellCheck={false}
            />
          </div>
          <button className="rs-close" onClick={onClose} title="Tutup (Esc)" aria-label="Tutup"><X size={16} /></button>
        </header>
        <nav className="rs-chips" aria-label="Kategori">
          {categories.map((c) => (
            <button key={c} className={c === category ? 'active' : ''} onClick={() => { setCategory(c); setDetail(null); inputRef.current?.focus(); }}>{c}</button>
          ))}
        </nav>

        {detail ? (
          <article className="rs-detail" tabIndex={-1}>
            <button className="rs-back" onClick={() => { setDetail(null); inputRef.current?.focus(); }}><ArrowLeft size={14} /> Kembali</button>
            <div className="rs-detail-kicker">{detail.category}</div>
            <h3>{detail.name}</h3>
            {detail.meta && <div className="rs-detail-meta">{detail.meta}</div>}
            {detail.facts && (
              <dl className="rs-facts">
                {detail.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            )}
            {detail.category !== 'Spell' && detail.summary && detail.body[0] !== detail.summary && <p className="rs-lead">{detail.summary}</p>}
            {ruleEntries.some((r) => `rule-${r.name}` === detail.id)
              ? <ul className="rs-points">{detail.body.map((p, i) => <li key={i}>{p}</li>)}</ul>
              : <div className="rs-prose">{detail.body.length ? detail.body.map((p, i) => (p.length < 60 && !/[.:!?)]$/.test(p) ? <h4 key={i}>{p}</h4> : <p key={i}>{p}</p>)) : <p className="rs-empty">Tidak ada deskripsi.</p>}</div>}
          </article>
        ) : (
          <div className="rs-results" ref={listRef} role="listbox">
            {!query.trim() && category === 'Semua' && <div className="rs-hint">Kondisi dan aksi yang sering dipakai. Ketik untuk mencari spell, item, atau feat.</div>}
            {results.map((entry, i) => (
              <button
                key={entry.id}
                data-i={i}
                role="option"
                aria-selected={i === active}
                className={`rs-row${i === active ? ' active' : ''}`}
                onPointerMove={() => setActive(i)}
                onClick={() => setDetail(entry)}
              >
                <span className={`rs-tag ${entry.category.toLowerCase()}`}>{entry.category}</span>
                <span className="rs-row-text">
                  <strong>{entry.name}</strong>
                  <small>{entry.category === 'Spell' || entry.category === 'Item' ? entry.meta : entry.summary}</small>
                </span>
              </button>
            ))}
            {!results.length && (
              <div className="rs-empty">
                {!catalog && !loadError && category !== 'Kondisi' && category !== 'Aksi' && category !== 'Aturan' ? 'Memuat katalog spell dan item…' : loadError ? 'Katalog gagal dimuat. Coba tutup lalu buka lagi.' : `Tidak ada hasil untuk “${query}”.`}
              </div>
            )}
          </div>
        )}
        <footer className="rs-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> pilih</span>
          <span><kbd>Enter</kbd> buka</span>
          <span><kbd>Tab</kbd> kategori</span>
          <span><kbd>Esc</kbd> {detail ? 'kembali' : 'tutup'}</span>
          {!catalog && !loadError && <span className="rs-loading">memuat katalog…</span>}
        </footer>
      </section>
    </div>
  );
}
