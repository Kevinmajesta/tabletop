import { useEffect, useState, type ReactNode } from "react";
import { Check, Search, X } from "lucide-react";

export type PickerItem = { id: string; name: string; sub?: string; tag?: string };

// Pemilih dua panel: daftar di kiri, detail di kanan. Klik item untuk melihat detail,
// lalu tombol "Pilih" untuk memakainya (seperti builder D&D di VTT pada umumnya).
export default function OptionPicker({
  label,
  items,
  selected,
  onSelect,
  detail,
  searchable = true,
  toolbar,
  onClear,
}: {
  label: string;
  items: PickerItem[];
  selected: string;
  onSelect: (id: string) => void;
  detail: (id: string) => ReactNode;
  searchable?: boolean;
  toolbar?: ReactNode;
  onClear?: () => void;
}) {
  const [focus, setFocus] = useState(selected || items[0]?.id || "");
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!items.some((item) => item.id === focus)) setFocus(selected || items[0]?.id || "");
  }, [items, selected]);
  const shown = items.filter((item) => `${item.name} ${item.sub || ""} ${item.tag || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const current = items.find((item) => item.id === focus);
  return (
    <div className="option-picker" aria-label={label} role="group">
      <div className="option-picker-list">
        {toolbar}
        {searchable && (
          <label className="option-picker-search">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Cari ${label.toLowerCase()}…`} aria-label={`Cari ${label}`} />
          </label>
        )}
        <ul role="listbox" aria-label={label}>
          {shown.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === focus}
                className={item.id === selected ? "chosen" : ""}
                onClick={() => setFocus(item.id)}
                onDoubleClick={() => onSelect(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  {item.sub && <small>{item.sub}</small>}
                </span>
                {item.id === selected ? <Check size={16} aria-label="Terpilih" /> : item.tag ? <em>{item.tag}</em> : null}
              </button>
            </li>
          ))}
          {!shown.length && <li className="option-picker-empty">Tidak ada yang cocok.</li>}
        </ul>
      </div>
      <div className="option-picker-detail">
        {current ? (
          <>
            <header>
              <div>
                <h3>{current.name}</h3>
                {current.sub && <span>{current.sub}</span>}
              </div>
              {current.id === selected ? (
                <span className="option-picker-actions">
                  <span className="option-picker-chosen"><Check size={16} /> Terpilih</span>
                  {onClear && (
                    <button type="button" className="option-picker-clear" onClick={onClear} title="Batalkan pilihan ini">
                      <X size={14} /> Batalkan
                    </button>
                  )}
                </span>
              ) : (
                <button type="button" className="option-picker-select" onClick={() => onSelect(current.id)}>
                  {selected ? `Ganti ke ${current.name}` : `Pilih ${current.name}`}
                </button>
              )}
            </header>
            <div className="option-picker-body">{detail(current.id)}</div>
          </>
        ) : (
          <p>Pilih salah satu dari daftar.</p>
        )}
      </div>
    </div>
  );
}
