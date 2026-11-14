import { useMemo, useRef, useState } from 'react';
import { Check, Package, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import './token-library.css';

export type LibraryItem = { id: string; name: string; image: string; ownerId: string; size: number; createdAt: number };
export const LIBRARY_DRAG = 'application/x-meja-token';

// Panel Gudang Token: kartu token yang bisa diseret ke peta. Player hanya menerima token miliknya dari server;
// DM menerima semuanya dan melihatnya dikelompokkan per pemilik.
export default function TokenLibrary({ items, isDM, playerId, members, connected, uploading, onClose, onPlace, onRename, onRemove, onUpload }: {
  items: LibraryItem[]; isDM: boolean; playerId: string; members: { id: string; name: string }[]; connected: boolean; uploading: boolean;
  onClose: () => void; onPlace: (id: string) => void; onRename: (id: string, name: string) => void; onRemove: (item: LibraryItem) => void; onUpload: (file: File) => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameOf = (id: string) => (id === playerId ? 'Milikmu' : members.find(m => m.id === id)?.name || 'Pemain lama');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = items.filter(i => !q || i.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    const byOwner = new Map<string, LibraryItem[]>();
    for (const item of shown) byOwner.set(item.ownerId, [...(byOwner.get(item.ownerId) || []), item]);
    // Milik sendiri paling atas, lalu pemilik lain menurut abjad.
    return [...byOwner.entries()].sort(([a], [b]) => (a === playerId ? -1 : b === playerId ? 1 : nameOf(a).localeCompare(nameOf(b))));
  }, [items, query, members, playerId]);

  const saveName = () => {
    if (editing && editing.name.trim()) onRename(editing.id, editing.name.trim());
    setEditing(null);
  };

  return (
    <div className="tabletop-popover lib-panel" role="dialog" aria-label="Gudang Token">
      <header className="lib-head">
        <div><Package size={16} /><strong>Gudang Token</strong><span>{items.length}</span></div>
        <button type="button" className="lib-icon" title="Tutup gudang" onClick={onClose}><X size={16} /></button>
      </header>
      <p className="lib-hint">Seret token ke peta untuk menaruhnya. {isDM ? 'Kamu melihat token semua pemain.' : 'Hanya kamu yang melihat token di sini.'}</p>
      <div className="lib-tools">
        <label className="lib-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari token…" aria-label="Cari token" /></label>
        <button type="button" className="lib-upload" disabled={!connected || uploading} onClick={() => fileRef.current?.click()}><Upload size={14} />{uploading ? 'Mengunggah…' : 'Unggah'}</button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </div>

      <div className="lib-body">
        {!items.length && <div className="lib-empty">Gudang masih kosong. Token yang kamu unggah akan tersimpan di sini otomatis.</div>}
        {!!items.length && !groups.length && <div className="lib-empty">Tidak ada token bernama “{query}”.</div>}
        {groups.map(([owner, list]) => (
          <section key={owner} className="lib-group">
            {(isDM || groups.length > 1) && <h4>{nameOf(owner)} <span>{list.length}</span></h4>}
            <div className="lib-grid">
              {list.map(item => (
                <div
                  key={item.id}
                  className="lib-card"
                  draggable={connected && editing?.id !== item.id}
                  onDragStart={e => { e.dataTransfer.setData(LIBRARY_DRAG, item.id); e.dataTransfer.effectAllowed = 'copy'; }}
                  onDoubleClick={() => connected && onPlace(item.id)}
                  title={`${item.name} · seret ke peta, atau klik dua kali untuk menaruh di tengah`}
                >
                  <img src={item.image} alt="" draggable={false} />
                  {editing?.id === item.id ? (
                    <form className="lib-rename" onSubmit={e => { e.preventDefault(); saveName(); }}>
                      <input autoFocus value={editing.name} maxLength={32} onChange={e => setEditing({ id: item.id, name: e.target.value })} onBlur={saveName} onKeyDown={e => { if (e.key === 'Escape') setEditing(null); }} aria-label="Nama token" />
                      <button type="submit" className="lib-icon" aria-label="Simpan nama"><Check size={13} /></button>
                    </form>
                  ) : <span className="lib-name">{item.name}</span>}
                  <div className="lib-actions">
                    <button type="button" className="lib-icon" title="Ganti nama" disabled={!connected} onClick={() => setEditing({ id: item.id, name: item.name })}><Pencil size={12} /></button>
                    <button type="button" className="lib-icon danger" title="Hapus dari gudang" disabled={!connected} onClick={() => onRemove(item)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
