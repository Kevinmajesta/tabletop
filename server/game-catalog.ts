export const gameKinds = ['rps', 'tictactoe', 'connectfour', 'quickmath', 'memory', 'bombdefuse', 'reliccipher', 'chaincipher', 'crossword', 'ttspilihan', 'cooprooms', 'seating', 'drawing', 'wallclock', 'relicscale', 'journal', 'cryptex', 'whodunit', 'lockpick', 'tilefloor', 'ritual', 'mirrors', 'wirehack', 'tavern', 'alchemy', 'potion', 'compass', 'runes', 'shift', 'jigsaw'] as const;
export type GameKind = typeof gameKinds[number];
// duel = tepat 2 pemain, solo = tepat 1 pemain dipilih GM, party = semua pemain online.
export const gameCatalog: Record<GameKind, { name: string; mark: string; mode: 'duel' | 'solo' | 'party' }> = {
  rps: { name: 'Gunting batu kertas', mark: 'GBK', mode: 'duel' },
  tictactoe: { name: 'Tic tac toe', mark: 'X/O', mode: 'duel' },
  connectfour: { name: 'Connect Four', mark: '4', mode: 'duel' },
  quickmath: { name: 'Hitung Cepat', mark: '+×−', mode: 'party' },
  memory: { name: 'Memory', mark: 'M', mode: 'duel' },
  bombdefuse: { name: 'Defuse the Bomb', mark: '!', mode: 'duel' },
  reliccipher: { name: 'Sandi Relik', mark: '⌘', mode: 'party' },
  chaincipher: { name: 'Sandi Rantai', mark: '···', mode: 'party' },
  crossword: { name: 'Teka-teki Silang Indonesia', mark: 'TTS', mode: 'party' },
  ttspilihan: { name: 'TTS-Pilihan', mark: 'TTS-P', mode: 'party' },
  cooprooms: { name: 'Dua Ruangan · Kursi & Sandi', mark: '2+2', mode: 'party' },
  wallclock: { name: 'Misteri Jam Dinding', mark: '◷', mode: 'party' },
  relicscale: { name: 'Timbangan Relik', mark: '⚖', mode: 'party' },
  journal: { name: 'Jurnal Terkoyak', mark: '📖', mode: 'party' },
  seating: { name: 'Misteri 9 Kursi', mark: '9', mode: 'party' },
  drawing: { name: 'Guess the Drawing', mark: '✎', mode: 'duel' },
  cryptex: { name: 'Sandi Cryptex', mark: '🗝', mode: 'party' },
  whodunit: { name: 'Siapa Pencurinya?', mark: '?!', mode: 'party' },
  lockpick: { name: 'Kode Peti', mark: '🔒', mode: 'party' },
  tilefloor: { name: 'Lantai Ubin · Pemandu & Pejalan', mark: '▦', mode: 'duel' },
  ritual: { name: 'Ritual Lingkaran Sihir', mark: '✦', mode: 'party' },
  mirrors: { name: 'Ruang Cermin Cahaya', mark: '◇', mode: 'party' },
  wirehack: { name: 'Retas Panel Kabel', mark: '⚡', mode: 'solo' },
  tavern: { name: 'Tagihan Sang Pengelana', mark: '🍺', mode: 'party' },
  alchemy: { name: 'Segel Sang Alkemis', mark: '⚗', mode: 'party' },
  potion: { name: 'Ramuan Seimbang', mark: '🜄', mode: 'party' },
  compass: { name: 'Jalur Sang Alkemis', mark: '🧭', mode: 'party' },
  runes: { name: 'Bahasa Rune yang Hilang', mark: 'ᚱ', mode: 'party' },
  shift: { name: 'Dungeon yang Berputar', mark: '⟲', mode: 'party' },
  jigsaw: { name: 'Puzzle Gambar (Jigsaw)', mark: '🧩', mode: 'party' },
};
// Jumlah peserta tetap yang dipilih GM: 2 untuk duel, 1 untuk solo, 0 berarti semua pemain online (party).
export const fixedPlayers = (kind: GameKind) => (gameCatalog[kind].mode === 'duel' ? 2 : gameCatalog[kind].mode === 'solo' ? 1 : 0);
