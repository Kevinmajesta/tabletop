// Gudang Token: tempat menyimpan gambar token yang pernah diunggah, supaya bisa diseret lagi ke peta mana pun
// tanpa unggah ulang. Player hanya melihat token miliknya sendiri; DM melihat semuanya.
import { randomUUID } from 'node:crypto';

export type LibraryItem = { id: string; name: string; image: string; ownerId: string; size: number; createdAt: number };
type TokenLike = { name: string; image: string; ownerId: string; size?: number; minigame?: unknown };
export type LibraryRoom = { library?: LibraryItem[]; scenes?: { tokens: TokenLike[] }[] };

export const LIBRARY_LIMIT = 300;
const isUpload = (image: unknown): image is string => typeof image === 'string' && /^\/(uploads|monsters)\//.test(image);

// Simpan gambar ke gudang pemiliknya. Gambar yang sama milik orang yang sama tidak disimpan dua kali.
export function addToLibrary(room: LibraryRoom, entry: { name: string; image: string; ownerId: string; size?: number }, now = Date.now()): LibraryItem | null {
  if (!isUpload(entry.image) || !entry.ownerId) return null;
  const library = (room.library ??= []);
  const existing = library.find(item => item.ownerId === entry.ownerId && item.image === entry.image);
  if (existing) return existing;
  if (library.length >= LIBRARY_LIMIT) return null;
  const item = { id: randomUUID(), name: (entry.name || 'Token').slice(0, 32), image: entry.image, ownerId: entry.ownerId, size: entry.size ?? 1, createdAt: now };
  library.push(item);
  return item;
}

// Data lama: isi gudang dari token-token yang sudah ada di semua scene (bukan token minigame).
export function seedLibrary(room: LibraryRoom) {
  if (room.library) return 0;
  room.library = [];
  let added = 0;
  for (const scene of room.scenes || []) for (const token of scene.tokens) {
    if (token.minigame) continue;
    const before = room.library.length;
    addToLibrary(room, token, 0);
    added += room.library.length - before;
  }
  return added;
}

export function libraryView(room: LibraryRoom, playerId: string, dm: boolean) {
  return (room.library || []).filter(item => dm || item.ownerId === playerId);
}

export function canUse(item: LibraryItem | undefined, playerId: string, dm: boolean): item is LibraryItem {
  return !!item && (dm || item.ownerId === playerId);
}
