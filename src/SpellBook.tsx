import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Dices, Search, Send, Sparkles, X } from 'lucide-react';
import ActionEconomy from './ActionEconomy';
import { revisedCatalog as catalog, spellLimits, type Character } from '../server/characters';
import './spellbook.css';

type SpellInfo = (typeof catalog.spells)[number] & {
  level?: number; casting_time?: string; range?: string; duration?: string; components?: string[]; material?: string;
  concentration?: boolean; ritual?: boolean; school?: { name: string }; desc?: string[]; higher_level?: string | string[];
};
const spellOf = (id: string) => catalog.spells.find((s) => s.index === id) as SpellInfo | undefined;
const levelName = (level: number) => (level === 0 ? 'Cantrip' : `Level ${level}`);
const PREPARE_CLASSES = ['wizard', 'cleric', 'druid', 'paladin'];

// Tab Spell di sheet karakter: ringkasan spellcasting, spell slot berbentuk bulatan, filter satu baris,
// daftar spell ringkas yang bisa dibuka untuk detail, dan pengaturan prepared.
export default function SpellBook({ character, connected, busy, request, roll, sendToChat }: {
  character: Character;
  connected: boolean;
  busy: boolean;
  request: (payload: Record<string, unknown>, done?: (id?: string) => void) => void;
  roll: (kind: string, key?: string) => void;
  sendToChat: (title: string, description: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [preparedDraft, setPreparedDraft] = useState<string[] | null>(null);
  const sheet = character.sheet;
  const locked = !connected || busy;
  const concentrating = character.concentration ? spellOf(character.concentration) : undefined;

  const known = useMemo(() => [...new Set([...sheet.cantrips, ...sheet.spells])].map(spellOf).filter((s): s is SpellInfo => !!s), [sheet.cantrips, sheet.spells]);
  const levels = [...new Set(known.map((s) => s.level ?? 0))].sort((a, b) => a - b);
  const q = search.trim().toLowerCase();
  const shown = known.filter((s) =>
    (!q || `${s.name} ${(s.desc || []).join(' ')}`.toLowerCase().includes(q)) &&
    (filter === 'all' ||
      (filter === 'prepared' && sheet.prepared.includes(s.index)) ||
      (filter === 'concentration' && s.concentration) ||
      (filter === 'ritual' && s.ritual) ||
      String(s.level ?? 0) === filter));

  const slotRows = Object.entries(sheet.slotsByLevel || {}).filter(([, max]) => max > 0);
  const setSlot = (level: string, used: number) => request({ type: 'resources', id: character.id, revision: character.revision, spellSlotsUsed: { [level]: used } });
  const setConcentration = (spell: string) => request({ type: 'concentration', spell, id: character.id, revision: character.revision });

  const canPrepare = PREPARE_CLASSES.includes(character.build.classId);
  const limits = spellLimits(character.build);
  const prepareLimit = character.build.classId === 'wizard' ? limits.prepared : limits.spells;
  const prepareChoices = canPrepare ? catalog.spells.filter((s) => {
    const spell = s as SpellInfo;
    return character.build.classId === 'wizard'
      ? [...character.build.spells, ...(character.build.choices['subclass.savant'] || []), ...(character.build.choices['subclass.savant.5'] || [])].includes(s.index)
      : !!spell.level && spell.level <= limits.maxSpellLevel && !!s.classes?.some((c) => c.index === character.build.classId);
  }) as SpellInfo[] : [];
  // Hanya hitung/bawa spell yang masih ada di daftar pilihan, supaya pilihan lama yang sudah tidak valid tidak memakan slot.
  const validPrepared = (ids: string[]) => ids.filter((id) => prepareChoices.some((s) => s.index === id));
  const currentPrepared = validPrepared(character.build.classId === 'wizard' ? character.build.prepared : character.build.spells);

  const chatText = (s: SpellInfo) => [
    `${levelName(s.level ?? 0)}${s.school?.name ? ` · ${s.school.name}` : ''}`,
    `${s.casting_time || '—'} · ${s.range || '—'} · ${s.duration || '—'}`,
    ...(s.desc || []),
  ].join('\n');

  return (
    <div className="spellbook">
      {/* Ringkasan spellcasting dan concentration */}
      <div className="sb-summary">
        {sheet.spellAbility ? (
          <div className="sb-stats">
            <div><small>Ability</small><strong>{sheet.spellAbility.toUpperCase()}</strong></div>
            <div><small>Save DC</small><strong>{sheet.spellDC}</strong></div>
            <div><small>Attack</small><strong>+{sheet.spellAttack}</strong></div>
            <button type="button" className="sb-roll" disabled={locked} onClick={() => roll('spell')}><Dices size={14} />Lempar attack</button>
          </div>
        ) : <p className="sb-muted">Class ini tidak memakai spellcasting.</p>}
        <div className={`sb-concentration${concentrating ? ' on' : ''}`}>
          <Sparkles size={14} />
          {concentrating ? <>
            <span>Concentration</span><strong>{concentrating.name}</strong>
            <button type="button" title="Akhiri concentration" disabled={locked} onClick={() => setConcentration('')}><X size={13} /></button>
          </> : <span>Tidak sedang concentration</span>}
        </div>
      </div>

      {/* Spell slot: bulatan terisi = terpakai. Klik bulatan untuk menandai. */}
      {!!slotRows.length && (
        <div className="sb-slots" aria-label="Spell slot">
          {slotRows.map(([level, max]) => {
            const used = character.spellSlotsUsed?.[level] ?? (level === '1' ? character.slotsUsed : 0);
            return (
              <div key={level} className="sb-slot-row">
                <span>Lv {level}</span>
                <div className="sb-pips">
                  {Array.from({ length: max }, (_, i) => (
                    <button key={i} type="button" className={i < used ? 'used' : ''} disabled={locked}
                      aria-label={`Slot level ${level} ke-${i + 1} ${i < used ? 'terpakai' : 'tersedia'}`}
                      onClick={() => setSlot(level, i < used ? i : i + 1)} />
                  ))}
                </div>
                <em>{max - used}/{max}</em>
              </div>
            );
          })}
        </div>
      )}

      {/* Spell bawaan species */}
      {!!sheet.innateSpells?.length && (
        <div className="sb-innate">
          <h4>Spell bawaan species</h4>
          {sheet.innateSpells.map((spell) => (
            <p key={spell.id}><strong>{spellOf(spell.id)?.name || spell.id}</strong> · {spell.ability.toUpperCase()} · DC {spell.dc} · attack +{spell.attack} · {spell.uses}</p>
          ))}
        </div>
      )}

      {/* Alat: cari + filter */}
      <div className="sb-tools">
        <label className="sb-search"><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari spell…" aria-label="Cari spell" /></label>
        <div className="sb-chips" role="radiogroup" aria-label="Filter spell">
          {[['all', 'Semua'], ['prepared', 'Prepared'], ['concentration', 'Concentration'], ['ritual', 'Ritual'], ...levels.map((l) => [String(l), l === 0 ? 'Cantrip' : `Lv ${l}`])].map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        {canPrepare && !preparedDraft && (
          <button type="button" className="sb-prepare-btn" disabled={locked} onClick={() => setPreparedDraft(currentPrepared)}>
            <BookOpen size={14} />Atur prepared · {currentPrepared.length}/{prepareLimit}
          </button>
        )}
      </div>

      {/* Pengaturan prepared */}
      {preparedDraft && (
        <div className="sb-prepare">
          <header>
            <strong>Prepared spells</strong>
            <span className={preparedDraft.length > prepareLimit ? 'over' : ''}>{preparedDraft.length}/{prepareLimit}</span>
          </header>
          <p>Ganti sesuai aturan rest class. Spell yang selalu prepared tetap otomatis.</p>
          <div className="sb-prepare-grid">
            {prepareChoices.map((s) => {
              const on = preparedDraft.includes(s.index);
              return (
                <label key={s.index} className={on ? 'on' : ''}>
                  <input type="checkbox" checked={on} onChange={(e) => setPreparedDraft(e.target.checked ? [...preparedDraft, s.index] : preparedDraft.filter((id) => id !== s.index))} />
                  <span>{s.name}</span>
                  <small>Lv {s.level}</small>
                </label>
              );
            })}
          </div>
          <div className="sb-prepare-actions">
            <button type="button" onClick={() => setPreparedDraft(null)}>Batal</button>
            <button type="button" className="primary" disabled={locked} onClick={() => request({ type: 'prepared', spells: preparedDraft, id: character.id, revision: character.revision }, () => setPreparedDraft(null))}>Simpan prepared</button>
          </div>
        </div>
      )}

      {/* Daftar spell per level */}
      {!known.length && <p className="sb-muted">Karakter belum memiliki spell pada level ini.</p>}
      {!!known.length && !shown.length && <p className="sb-muted">Tidak ada spell yang cocok dengan filter ini.</p>}
      {levels.map((level) => {
        const list = shown.filter((s) => (s.level ?? 0) === level).sort((a, b) => a.name.localeCompare(b.name));
        if (!list.length) return null;
        const slot = slotRows.find(([l]) => l === String(level));
        return (
          <section key={level} className="sb-group">
            <h4>{levelName(level)}<span>{list.length} spell{slot ? ` · ${slot[1]} slot` : ''}</span></h4>
            <ul>
              {list.map((s) => {
                const prepared = level === 0 || sheet.prepared.includes(s.index);
                const expanded = open === s.index;
                return (
                  <li key={s.index} className={`sb-spell${expanded ? ' open' : ''}${prepared ? '' : ' unprepared'}`}>
                    <button type="button" className="sb-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : s.index)}>
                      <span className={`sb-dot${prepared ? ' on' : ''}`} title={level === 0 ? 'Cantrip selalu siap' : prepared ? 'Prepared' : 'Belum prepared'} />
                      <strong>{s.name}</strong>
                      <span className="sb-tags">
                        <ActionEconomy castingTime={s.casting_time} ritual={s.ritual} />
                        {s.concentration && <em title="Concentration">C</em>}
                        {character.concentration === s.index && <em className="active">Aktif</em>}
                      </span>
                      <span className="sb-meta">{s.range || ''}</span>
                      <ChevronDown size={15} className="sb-chevron" />
                    </button>
                    {expanded && (
                      <div className="sb-detail">
                        <dl>
                          <div><dt>Waktu</dt><dd>{s.casting_time || '—'}</dd></div>
                          <div><dt>Jarak</dt><dd>{s.range || '—'}</dd></div>
                          <div><dt>Komponen</dt><dd>{(s.components || []).join(', ') || '—'}{s.material ? ` (${s.material})` : ''}</dd></div>
                          <div><dt>Durasi</dt><dd>{s.concentration ? 'Concentration, ' : ''}{s.duration || '—'}</dd></div>
                        </dl>
                        <div className="sb-desc">{(s.desc || []).map((p, i) => <p key={i}>{p}</p>)}</div>
                        <div className="sb-detail-actions">
                          <button type="button" disabled={!connected} onClick={() => sendToChat(`📖 ${s.name}`, chatText(s))}><Send size={13} />Kirim ke chat</button>
                          {s.concentration && prepared && character.concentration !== s.index && (
                            <button type="button" disabled={locked} onClick={() => setConcentration(s.index)}><Sparkles size={13} />Mulai concentration</button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
