// Menggabungkan anggota ruang yang namanya sama.
// Satu orang bisa masuk dengan identitas baru (browser lain, data browser terhapus, atau Reset Session).
// Supaya daftar party tidak menumpuk, identitas lama yang sedang offline digabung ke identitas yang dipakai,
// termasuk kepemilikan karakter/token dan keikutsertaan minigame.

type Owned = { ownerId: string };
type GameRefs = { players: string[]; scores: Record<string, number>; choices: Record<string, string> };
export type MemberRoom = {
  members: Record<string, { name: string; secret: string }>;
  characters?: Owned[];
  tokens?: Owned[];
  scenes?: { tokens: Owned[] }[];
  minigames?: GameRefs[];
  playerScenes?: Record<string, string>;
};

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Pindahkan kepemilikan karakter dan token saja, tanpa menghapus anggota (dipakai untuk identitas yang masih online).
export function transferOwnership(room: MemberRoom, keepId: string, fromIds: string[]) {
  const from = new Set(fromIds.filter(id => id !== keepId));
  if (!from.size) return;
  for (const character of room.characters || []) if (from.has(character.ownerId)) character.ownerId = keepId;
  for (const token of room.tokens || []) if (from.has(token.ownerId)) token.ownerId = keepId;
  for (const scene of room.scenes || []) for (const token of scene.tokens) if (from.has(token.ownerId)) token.ownerId = keepId;
}

export function mergeMembers(room: MemberRoom, keepId: string, fromIds: string[]) {
  const from = new Set(fromIds.filter(id => id !== keepId));
  if (!from.size) return;
  transferOwnership(room, keepId, [...from]);
  for (const game of room.minigames || []) {
    game.players = [...new Set(game.players.map(id => (from.has(id) ? keepId : id)))];
    for (const id of from) {
      if (Object.hasOwn(game.scores, id)) { game.scores[keepId] = (game.scores[keepId] || 0) + game.scores[id]; delete game.scores[id]; }
      if (Object.hasOwn(game.choices, id)) { if (!Object.hasOwn(game.choices, keepId)) game.choices[keepId] = game.choices[id]; delete game.choices[id]; }
    }
  }
  // Scene tujuan (split party) ikut ke identitas yang dipakai.
  for (const id of from) {
    const sceneId = room.playerScenes?.[id];
    if (sceneId && room.playerScenes && !room.playerScenes[keepId]) room.playerScenes[keepId] = sceneId;
    if (room.playerScenes) delete room.playerScenes[id];
  }
  for (const id of from) delete room.members[id];
}

// Rapikan data lama: satu nama = satu anggota. Yang dipertahankan adalah identitas yang memiliki paling banyak
// karakter/token; bila seri, yang paling akhir terdaftar (paling baru).
export function dedupeMembers(room: MemberRoom, isOnline: (id: string) => boolean = () => false) {
  const owned = (id: string) =>
    (room.characters || []).filter(c => c.ownerId === id).length +
    (room.scenes || []).reduce((n, s) => n + s.tokens.filter(t => t.ownerId === id).length, 0);
  const groups = new Map<string, string[]>();
  for (const [id, member] of Object.entries(room.members)) {
    const key = member.name.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) || []), id]);
  }
  let removed = 0;
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    // Urutan prioritas: sedang online, lalu paling banyak memiliki, lalu paling baru terdaftar.
    const ranked = ids.map((id, i) => ({ id, i, online: isOnline(id) ? 1 : 0, owned: owned(id) }))
      .sort((a, b) => b.online - a.online || b.owned - a.owned || b.i - a.i);
    const keep = ranked[0].id;
    const drop = ids.filter(id => id !== keep && !isOnline(id));
    removed += drop.length;
    mergeMembers(room, keep, drop);
  }
  return removed;
}
