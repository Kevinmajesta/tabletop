export const gameKinds = ['rps', 'tictactoe', 'connectfour', 'quickmath', 'memory', 'bombdefuse', 'reliccipher', 'chaincipher', 'crossword', 'ttspilihan', 'cooprooms', 'seating', 'drawing', 'wallclock'] as const;
export type GameKind = typeof gameKinds[number];
export const gameCatalog: Record<GameKind, { name: string; mark: string; mode: 'duel' | 'party' }> = {
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
  seating: { name: 'Misteri 9 Kursi', mark: '9', mode: 'party' },
  drawing: { name: 'Guess the Drawing', mark: '✎', mode: 'duel' },
};
