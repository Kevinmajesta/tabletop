import { gameCatalog, fixedPlayers, type GameKind } from './game-catalog.js';
export { gameCatalog, gameKinds, fixedPlayers } from './game-catalog.js';
export type { GameKind } from './game-catalog.js';
import { ttsPilihanEntries } from './tts-pilihan.js';
import { coopAction, coopView, type CoopState } from './coop-rooms.js';
import { newScale, weigh, scaleView, scaleRelics, type ScaleState } from './relic-scale.js';
import { newJournal, checkJournal, journalView, type JournalState } from './torn-journal.js';
import { newLock, validLock, score, marksOf, lockView, lockLength, lockTries, type LockState } from './lockpick.js';
import { newWhodunit, checkWhodunit, whodunitReveal, suspects, type WhodunitState } from './whodunit.js';
import { newTiles, tilesView, adjacent, isSafe, tileFall, armTimer, tileCols, tileRows, type TileState } from './tilefloor.js';
import { newCryptex, checkCryptex, cryptexView, type CryptexState } from './cryptex.js';
import { newRitual, ritualLight, ritualView, type RitualState, type RitualView } from './ritual.js';
import { newMirrors, mirrorAction, mirrorMinPlayers, mirrorMaxPlayers, type MirrorState } from './mirrors.js';
import { newWires, wireAction, wireView, type WireState } from './wirehack.js';
const bombOrders = [['red', 'blue', 'yellow'], ['yellow', 'red', 'blue'], ['blue', 'yellow', 'red'], ['green', 'red', 'black'], ['black', 'yellow', 'green'], ['black', 'green', 'yellow']];
const bombKeypads = [['☾', '★', '☂', '♜'], ['☂', '♜', '☾', '★'], ['★', '☂', '♜', '☾']];
const wireSymbols = ['BURUNG', 'MAHKOTA', 'MATA', 'PEDANG'];
const wireSymbolMarks: Record<string, string> = { BURUNG: '🐦', MAHKOTA: '♛', MATA: '◉', PEDANG: '⚔' };
const boardSize = (kind: GameKind) => kind === 'wallclock' ? 3 : kind === 'connectfour' ? 42 : kind === 'bombdefuse' ? 3 : 9;
type BombModule = { id: 'wires' | 'button' | 'keypad' | 'dial'; label: string; options: string[]; clue: string; solution?: string[]; progress: string[] };
type CipherLayer = { title: string; cipher: string; clue: string; method: string; answer?: string };
type CrosswordEntry = { id: string; clue: string; cells: number[]; answer?: string };
const crosswordEntries: CrosswordEntry[] = [
  { id: '1M', clue: 'Tempat manusia tinggal', cells: [0, 1, 2, 3, 4], answer: 'RUMAH' },
  { id: '2M', clue: 'Tanaman penghasil beras', cells: [10, 11, 12, 13], answer: 'PADI' },
  { id: '1T', clue: 'Teratur dan bersih', cells: [0, 5, 10, 15], answer: 'RAPI' },
  { id: '2T', clue: 'Pusat perasaan', cells: [4, 9, 14, 19], answer: 'HATI' },
];
const seatingNames = ['ANI', 'BUDI', 'CITRA', 'DODI', 'EKA', 'FANI', 'GALIH', 'HANA', 'IWAN'];
const drawingWords = [['KUCING', 'GAJAH', 'KELINCI'], ['NASI', 'SATE', 'BAKSO'], ['APEL', 'MANGGA', 'PISANG']];
const chainCipherSet: CipherLayer[] = [
  { title: 'I · Sandi Morse', cipher: '- .. .- ... . -- -.-. ... .--- . .- .. --.. -- ...- --', clue: 'Setiap kelompok titik/garis adalah satu huruf.', method: 'Morse internasional · pisahkan per spasi', answer: 'TIASEMCSJEAIZMVM' },
  { title: 'II · Sandi A–Z', cipher: 'TIASEMCSJEAIZMVM', clue: 'A menjadi Z, B menjadi Y, dan seterusnya.', method: 'Alfabet terbalik · A↔Z', answer: 'GRZHVNXHQVZRANEN' },
  { title: 'III · Sandi A–N', cipher: 'GRZHVNXHQVZRANEN', clue: 'Pasangkan A dengan N, B dengan O, dan seterusnya.', method: 'ROT13 · alfabet A–N', answer: 'TEMUI AKU DI MENARA' },
];
const cipherSets: CipherLayer[][] = [
  [
    { title: 'I · Pergeseran Penjaga', cipher: 'JHUEDQJ EDUDW PHQJHWDKXL NXQFL', clue: 'Patung ketiga menghadap fajar. Mundurkan tiap aksara sebanyak jumlah kepala naga.', method: 'Caesar · alfabet A–Z · spasi tidak berubah', answer: 'GERBANG BARAT MENGETAHUI KUNCI' },
    { title: 'II · Nyanyian Vigenère', cipher: 'PECBNZKTYAVUGGXE', clue: 'Ambil kata pertama hasil lapis I sebagai kunci berulang. A=0, B=1, … Z=25. Kurangi aksara kunci dari sandi.', method: 'Vigenère · dekripsi C − K modulo 26', answer: 'JALANMENUJUUTARA' },
    { title: 'III · Kisi Sang Arsitek', cipher: 'PATKINEANGRTIBUNU', clue: 'Tulis sandi ke kisi selebar jumlah huruf arah pada hasil lapis II. Kolom dibaca dari kiri ke kanan; baca kembali per baris.', method: 'Transposisi kolom · tanpa spasi', answer: 'PINTUANGINTERBUKA' },
  ],
  [
    { title: 'I · Roda Ketujuh', cipher: 'ZLNLS APTBY ALYQHNH', clue: 'Angka suci adalah tujuh. Mundurkan tiap aksara tujuh langkah.', method: 'Caesar 7 · alfabet A–Z', answer: 'SEGEL TIMUR TERJAGA' },
    { title: 'II · Kunci Berulang', cipher: 'VITUPTLUVRPIT', clue: 'Gunakan kata arah dari lapis I sebagai kunci Vigenère. A=0.', method: 'Vigenère · C − K modulo 26', answer: 'CAHAYADIBAWAH' },
    { title: 'III · Empat Pilar', cipher: 'BAAHAANTATGRSUKAI', clue: 'Empat pilar berarti empat kolom. Isi tiap kolom dari atas ke bawah dengan panjang seimbang, lalu baca per baris.', method: 'Transposisi kolom · 4 kolom', answer: 'BATUANGKATRAHASIA' },
  ],
];
function cipherLayers(randomInt: (max: number) => number) {
  return cipherSets[randomInt(cipherSets.length)].map(layer => ({ ...layer }));
}
function chainCipherLayers() {
  return chainCipherSet.map(layer => ({ ...layer }));
}
function bombModules(randomInt: (max: number) => number): BombModule[] {
  const wires = [...bombOrders[randomInt(bombOrders.length)]];
  const symbol = wireSymbols[randomInt(wireSymbols.length)];
  const indicator = randomInt(2) ? 'MENYALA' : 'GELAP';
  const [top, middle, bottom] = wires;
  const wireSolution = symbol === 'BURUNG' ? (bottom === 'yellow' ? [top, middle, bottom] : [middle, bottom, top])
    : symbol === 'MAHKOTA' ? (indicator === 'MENYALA' ? [bottom, top, middle] : [middle, top, bottom])
    : symbol === 'MATA' ? (top === 'red' ? [middle, bottom, top] : [bottom, middle, top])
    : bottom === 'blue' ? [top, bottom, middle] : [middle, top, bottom];
  const buttonLabel = ['TAHAN', 'BATAL', 'LEDAKKAN'][randomInt(3)];
  const keypad = [...bombKeypads[randomInt(bombKeypads.length)]];
  const keypadSolution = keypad[0] === '☾' ? ['☾', '★', '☂', '♜'] : keypad[0] === '☂' ? ['☂', '♜', '☾', '★'] : ['★', '☂', '♜', '☾'];
  const buttonSolution = buttonLabel === 'TAHAN' ? (indicator === 'MENYALA' ? 'blue' : 'yellow') : buttonLabel === 'BATAL' ? (indicator === 'MENYALA' ? 'red' : 'yellow') : indicator === 'MENYALA' ? 'yellow' : 'blue';
  const rune = ['RUBY', 'SAFIR', 'EMERALD', 'ONYX'][randomInt(4)];
  const serial = String(100 + randomInt(900));
  const serialOdd = Number(serial.at(-1)) % 2 === 1;
  const dialSolution = rune === 'RUBY' ? (serialOdd ? ['2', '4', '1', '3'] : ['4', '1', '3', '2'])
    : rune === 'SAFIR' ? (indicator === 'MENYALA' ? ['3', '1', '4', '2'] : ['1', '3', '2', '4'])
    : rune === 'EMERALD' ? (serial.includes('0') ? ['4', '2', '3', '1'] : ['2', '1', '4', '3'])
    : serialOdd ? ['1', '4', '2', '3'] : ['3', '2', '1', '4'];
  return [
    { id: 'wires', label: 'KABEL', options: wires, clue: `${wireSymbolMarks[symbol]} · INDIKATOR ${indicator}`, solution: wireSolution, progress: [] },
    { id: 'button', label: 'TOMBOL', options: ['blue', 'red', 'yellow'], clue: `${buttonLabel} · ${indicator}`, solution: [buttonSolution], progress: [] },
    { id: 'keypad', label: 'SIMBOL', options: keypad, clue: `SIMBOL PERTAMA ${keypad[0]}`, solution: keypadSolution, progress: [] },
    { id: 'dial', label: 'PUTARAN RUNE', options: ['1', '2', '3', '4'], clue: `RUNE ${rune} · SEGEL ${serial}`, solution: dialSolution, progress: [] }
  ];
}
export type Game = {
  coop?: CoopState; scale?: ScaleState; journal?: JournalState; cryptex?: CryptexState; whodunit?: WhodunitState; lock?: LockState; tiles?: TileState; ritual?: RitualState | RitualView; mirrors?: MirrorState; wirehack?: WireState;
  tokenId: string; kind: GameKind; round: number; phase: 'waiting' | 'open' | 'finished';
  players: string[]; scores: Record<string, number>; choices: Record<string, string>;
  result: string;
  board: string[]; turn: number; moveHistory?: number[];
  declaration?: number;
  question?: string; answer?: number;
  memoryBoard?: string[]; memoryOpen?: number[]; memoryPairs?: number; memoryCloseAt?: number;
  wires?: string[];
  bombModules?: BombModule[];
  cipherLayers?: CipherLayer[]; cipherStage?: number;
  crosswordColumns?: number; crosswordEntries?: CrosswordEntry[]; crosswordSolved?: string[]; crosswordLetters?: string[];
  clockTimes?: string[];
  seatingNames?: string[]; seatingSeats?: string[]; seatingClues?: string[]; seatingSolution?: string[];
  drawingRound?: number; drawingChoices?: string[]; drawingWord?: string; drawingStrokes?: number[][][];
};
export function newGame(tokenId: string, kind: GameKind): Game {
  return { tokenId, kind, round: 0, phase: 'waiting', players: [], scores: {}, choices: {}, result: '', board: Array(boardSize(kind)).fill(''), turn: 0, memoryBoard: [], memoryOpen: [], memoryPairs: 0 };
}
export function closeMemoryMismatch(game: Game, now = Date.now()) {
  if (!game.memoryCloseAt || now < game.memoryCloseAt) return false;
  game.memoryOpen = [];
  game.turn = 1 - game.turn;
  delete game.memoryCloseAt;
  return true;
}
export function gameView(game: Game, playerId: string, dm: boolean): Game {
  const { coop, scale, journal, cryptex, whodunit, lock, tiles, answer, memoryBoard, memoryOpen, wires, bombModules, cipherLayers: layers, crosswordEntries: entries, seatingSolution, drawingChoices, drawingWord, ...view } = game;
  if (game.kind === 'cooprooms') return { ...view, coop: coopView(game, playerId, dm) };
  if (game.kind === 'wirehack') { const { wirehack, ...rest } = view as Game; return { ...rest, ...(wirehack && game.phase !== 'waiting' ? { wirehack: wireView(wirehack, dm, game.phase === 'finished') } : {}) } as Game; }
  // Ruang Cermin Cahaya tidak punya rahasia: semua pemain melihat ruangan yang sama.
  if (game.kind === 'mirrors') { const { mirrors, ...rest } = view as Game; return { ...rest, ...(mirrors && game.phase !== 'waiting' ? { mirrors } : {}) } as Game; }
  if (game.kind === 'ritual') { const { ritual, ...rest } = view as Game; return { ...rest, ...(ritual && game.phase !== 'waiting' ? { ritual: ritualView(ritual as RitualState, game.players.indexOf(playerId), game.players.length, dm, game.phase === 'finished') } : {}) } as Game; }
  const memoryViewer = game.players.indexOf(playerId);
  const canSeeMemoryOpen = memoryViewer < 0 || memoryViewer === game.turn;
  const filteredMemoryBoard = memoryBoard?.map((card, i) =>
    game.board[i] || (memoryOpen?.includes(i) && canSeeMemoryOpen)
      ? card
      : ''
  );
  const modules = dm
    ? bombModules
    : playerId === game.players[0]
      ? undefined
      : bombModules?.map(({ solution: _solution, ...module }) => module);
  const visibleLayers = layers
    ?.slice(0, Math.min((game.cipherStage || 0) + 1, layers.length))
    .map(({ answer: _answer, ...layer }) => game.kind === 'chaincipher' ? (({ method: _method, clue: _clue, ...cipher }) => cipher)(layer) : layer);
  return { ...view, ...(game.phase === 'finished' && answer !== undefined ? { answer } : {}), ...(game.kind === 'memory' ? { memoryBoard: filteredMemoryBoard, memoryOpen: canSeeMemoryOpen ? memoryOpen : [] } : {}), ...(game.kind === 'bombdefuse' ? { bombModules: modules } : {}), ...(game.kind === 'reliccipher' || game.kind === 'chaincipher' ? { cipherLayers: visibleLayers } : {}), ...(game.kind === 'relicscale' && scale ? { scale: scaleView(scale, dm, game.phase === 'finished') } : {}), ...(game.kind === 'journal' && journal ? { journal: journalView(journal, dm, game.phase === 'finished') } : {}), ...(game.kind === 'cryptex' && cryptex ? { cryptex: cryptexView(cryptex, dm, game.phase === 'finished') } : {}), ...(game.kind === 'whodunit' && whodunit ? { whodunit } : {}), ...(game.kind === 'tilefloor' && tiles ? { tiles: tilesView(tiles, playerId === game.players[0] ? 'guide' : playerId === game.players[1] ? 'walker' : 'other', dm && !game.players.slice(0, 2).includes(playerId), game.phase === 'finished') } : {}), ...(game.kind === 'lockpick' && lock ? { lock: lockView(lock, dm, game.phase === 'finished') } : {}), ...((game.kind === 'crossword' || game.kind === 'ttspilihan') ? { crosswordEntries: entries?.map(({ answer: _answer, ...entry }) => entry) } : {}), ...(game.kind === 'drawing' && (dm || playerId === game.players[0]) ? { drawingChoices, drawingWord } : {}), choices: game.phase === 'finished' ? { ...game.choices } : Object.fromEntries(Object.entries(game.choices).map(([id, choice]) => [id, id === playerId ? choice : 'locked'])) } as Game;
}
export function declareGame(game: Game, participants: string[]): string | null {
  if (game.phase !== 'waiting') return 'Reset ronde sebelum deklarasi berikutnya.';
  const fixed = fixedPlayers(game.kind);
  if (new Set(participants).size !== participants.length || participants.length < 1 || (fixed && participants.length !== fixed)) return fixed === 1 ? 'Pilih tepat satu pemain.' : 'Pilih tepat dua pemain untuk permainan 1v1.';
  game.players = [...participants];
  for (const id of participants) if (!Object.hasOwn(game.scores, id)) Object.defineProperty(game.scores, id, { value: 0, writable: true, enumerable: true, configurable: true });
  game.declaration = (game.declaration || 0) + 1;
  return null;
}
function nextQuickMath(game: Game, randomInt: (max: number) => number) {
  const operation = randomInt(3);
  let a = 1 + randomInt(operation === 2 ? 12 : 50);
  let b = 1 + randomInt(operation === 2 ? 12 : 50);
  if (operation === 1 && b > a) [a, b] = [b, a];
  game.question = `${a} ${['+', '−', '×'][operation]} ${b}`;
  game.answer = operation === 0 ? a + b : operation === 1 ? a - b : a * b;
}
export function gameAction(game: Game, playerId: string, dm: boolean, action: Record<string, unknown>, randomInt?: (max: number) => number): string | null {
  if (game.kind === 'cooprooms') return coopAction(game, playerId, dm, action);
  if (game.kind === 'wirehack' && String(action.type).startsWith('wire:')) return wireAction(game, playerId, dm, action, randomInt);
  // Log Ruang Cermin Cahaya menyimpan penanda @indeks; tampilan menggantinya dengan nama pemain.
  if (game.kind === 'mirrors' && String(action.type).startsWith('mirror:')) return mirrorAction(game, playerId, action, randomInt, i => `@${i}`);
  if (game.kind === 'ritual' && action.type === 'ritual:light') return ritualLight(game as Game & { ritual?: RitualState }, playerId, action.candle);
  const fail = 'Aksi tidak tersedia pada ronde ini.';
  const partyActions = ['cipher:answer'];
  if (partyActions.includes(String(action.type)) && !dm && !game.players.includes(playerId)) {
    return 'Kamu bukan peserta ronde ini. Minta GM mendeklarasikan ulang token.';
  }
  if (action.type === 'join') {
    if (game.declaration) return 'Peserta ditentukan GM lewat deklarasi token.';
    if (game.phase !== 'waiting' || game.players.includes(playerId) || game.players.length >= (fixedPlayers(game.kind) || 20)) return fail;
    game.players.push(playerId);
    if (!Object.hasOwn(game.scores, playerId)) Object.defineProperty(game.scores, playerId, { value: 0, writable: true, enumerable: true, configurable: true });
  } else if (action.type === 'leave') {
    if (game.declaration) return 'Peserta ditentukan GM lewat deklarasi token.';
    if (game.phase !== 'waiting') return fail;
    game.players = game.players.filter(id => id !== playerId);
  } else if (action.type === 'remove-player') {
    if (game.declaration) return 'Peserta ditentukan GM lewat deklarasi token.';
    if (!dm || game.phase !== 'waiting' || typeof action.playerId !== 'string') return fail;
    game.players = game.players.filter(id => id !== action.playerId);
  } else if (action.type === 'reset') {
    if (!dm) return 'Hanya GM boleh mengatur ronde.';
    Object.assign(game, { phase: 'waiting', choices: {}, result: '', board: Array(boardSize(game.kind)).fill(''), turn: 0, moveHistory: [], memoryOpen: [], memoryPairs: 0 });
    delete game.question; delete game.answer; delete game.memoryBoard; delete game.memoryCloseAt; delete game.wires; delete game.bombModules; delete game.cipherLayers; delete game.cipherStage; delete game.crosswordEntries; delete game.crosswordSolved; delete game.crosswordLetters; delete game.clockTimes; delete game.seatingNames; delete game.seatingSeats; delete game.seatingClues; delete game.seatingSolution; delete game.scale; delete game.journal; delete game.cryptex; delete game.whodunit; delete game.lock; delete game.tiles; delete game.drawingRound; delete game.drawingChoices; delete game.drawingWord; delete game.drawingStrokes;
  } else if (action.type === 'start') {
    if (!dm) return 'Hanya GM boleh memulai ronde.';
    const openParty = (game.kind === 'crossword' || game.kind === 'ttspilihan') || game.kind === 'seating' || game.kind === 'wallclock' || game.kind === 'relicscale' || game.kind === 'journal' || game.kind === 'cryptex' || game.kind === 'whodunit' || game.kind === 'lockpick';
    if (game.phase !== 'waiting' || (!openParty && game.players.length < (gameCatalog[game.kind].mode === 'duel' ? 2 : 1))) return 'Peserta belum cukup atau ronde belum direset.';
    if (game.kind === 'wallclock') {
      game.clockTimes = ['12:00', '12:00', '12:00'];
    } else if (game.kind === 'drawing') {
      game.drawingRound = 0;
      game.drawingChoices = [...drawingWords[0]];
      game.drawingStrokes = [];
      delete game.drawingWord;
    } else if ((game.kind === 'crossword' || game.kind === 'ttspilihan')) {
      game.crosswordColumns = game.kind === 'ttspilihan' ? 15 : 5;
      game.crosswordEntries = (game.kind === 'ttspilihan' ? ttsPilihanEntries : crosswordEntries).map(entry => ({ ...entry, cells: [...entry.cells] }));
      game.crosswordSolved = [];
      game.crosswordLetters = Array(game.kind === 'ttspilihan' ? 225 : 20).fill('');
    } else if (game.kind === 'seating') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      const solution = [...seatingNames];
      for (let i = solution.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [solution[i], solution[j]] = [solution[j], solution[i]];
      }
      game.seatingNames = [...seatingNames];
      game.seatingSeats = Array(9).fill('');
      game.seatingSolution = solution;
      game.seatingClues = [
        `${solution[0]} duduk dekat Jendela A.`,
        `${solution[4]} duduk dekat Jendela B.`,
        `${solution[1]} duduk tepat di kanan ${solution[0]}.`,
        `${solution[2]} duduk tepat di kanan ${solution[1]}.`,
        `${solution[3]} duduk di antara ${solution[2]} dan ${solution[4]}.`,
        `${solution[5]} tidak duduk bersebelahan dengan ${solution[1]}.`,
        `${solution[6]} duduk tepat di kanan ${solution[5]}.`,
        `${solution[7]} duduk di antara ${solution[6]} dan ${solution[8]}.`,
        `${solution[8]} duduk bersebelahan dengan ${solution[0]}.`,
      ];
    } else if (game.kind === 'journal') {
      game.journal = newJournal();
    } else if (game.kind === 'lockpick') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.lock = newLock(randomInt);
    } else if (game.kind === 'whodunit') {
      game.whodunit = newWhodunit();
    } else if (game.kind === 'wirehack') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      if (game.players.length !== 1) return 'Retas Panel Kabel dimainkan tepat satu peretas.';
      game.wirehack = newWires(randomInt);
    } else if (game.kind === 'mirrors') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      if (game.players.length < mirrorMinPlayers || game.players.length > mirrorMaxPlayers) return `Ruang Cermin Cahaya butuh ${mirrorMinPlayers} sampai ${mirrorMaxPlayers} pemain.`;
      game.mirrors = newMirrors(game.players.length, randomInt);
    } else if (game.kind === 'ritual') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.ritual = newRitual(randomInt);
    } else if (game.kind === 'tilefloor') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.tiles = newTiles(randomInt);
    } else if (game.kind === 'cryptex') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.cryptex = newCryptex(randomInt);
    } else if (game.kind === 'relicscale') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.scale = newScale(randomInt);
    } else if (game.kind === 'quickmath') {
      if (!randomInt) return 'Pembuat soal tidak tersedia.';
      game.turn = 0;
      nextQuickMath(game, randomInt);
    } else if (game.kind === 'reliccipher') {
      if (!randomInt) return 'Pembuat sandi tidak tersedia.';
      game.cipherLayers = cipherLayers(randomInt);
      game.cipherStage = 0;
    } else if (game.kind === 'chaincipher') {
      game.cipherLayers = chainCipherLayers();
      game.cipherStage = 0;
    } else if (game.kind === 'bombdefuse') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.bombModules = bombModules(randomInt);
      game.wires = game.bombModules[0].solution!;
      game.board = Array(3).fill('');
    } else if (game.kind === 'memory') {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
      const deck = [...emojis, ...emojis];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      game.memoryBoard = deck;
      game.board = Array(16).fill('');
      game.memoryOpen = [];
      game.memoryPairs = 0;
    }
    game.round++; game.phase = 'open';
  } else if (action.type === 'drawing:choose') {
    if (game.kind !== 'drawing' || game.phase !== 'open' || playerId !== game.players[0] || game.drawingWord || typeof action.word !== 'string' || !game.drawingChoices?.includes(action.word)) return fail;
    game.drawingWord = action.word;
    game.drawingChoices = [];
  } else if (action.type === 'drawing:stroke') {
    const points = action.points;
    if (game.kind !== 'drawing' || game.phase !== 'open' || playerId !== game.players[0] || !game.drawingWord || !Array.isArray(points) || points.length < 2 || points.length > 100 || !points.every(point => Array.isArray(point) && point.length === 2 && point.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) || (game.drawingStrokes?.length || 0) >= 500) return fail;
    game.drawingStrokes!.push(points as number[][]);
  } else if (action.type === 'drawing:clear') {
    if (game.kind !== 'drawing' || game.phase !== 'open' || playerId !== game.players[0] || !game.drawingWord) return fail;
    game.drawingStrokes = [];
  } else if (action.type === 'drawing:guess') {
    if (game.kind !== 'drawing' || game.phase !== 'open' || playerId !== game.players[1] || !game.drawingWord || typeof action.answer !== 'string' || action.answer.length > 40) return fail;
    if (action.answer.toUpperCase().replace(/[^A-Z]/g, '') !== game.drawingWord) return 'Tebakan belum tepat.';
    game.scores[playerId]++;
    game.drawingRound = (game.drawingRound || 0) + 1;
    game.drawingStrokes = [];
    delete game.drawingWord;
    if (game.drawingRound === 3) {
      game.result = playerId;
      game.phase = 'finished';
      game.drawingChoices = [];
    } else game.drawingChoices = [...drawingWords[game.drawingRound]];
  } else if (action.type === 'crossword:answer') {
    if ((game.kind !== 'crossword' && game.kind !== 'ttspilihan') || game.phase !== 'open' || typeof action.id !== 'string' || typeof action.answer !== 'string' || action.answer.length > 30) return fail;
    const entry = game.crosswordEntries?.find(item => item.id === action.id);
    if (!entry?.answer) return fail;
    const normalized = action.answer.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized !== entry.answer) return 'Jawaban belum tepat.';
    game.crosswordSolved ||= [];
    if (!game.crosswordSolved.includes(entry.id)) {
      game.crosswordSolved.push(entry.id);
      entry.cells.forEach((cell, index) => game.crosswordLetters![cell] = entry.answer![index]);
    }
    if (game.crosswordSolved.length === game.crosswordEntries!.length) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    }
  } else if (action.type === 'crossword:letter') {
    if ((game.kind !== 'crossword' && game.kind !== 'ttspilihan') || game.phase !== 'open') return fail;
    if (typeof action.cell !== 'number' || !Number.isInteger(action.cell) || action.cell < 0 || action.cell >= (game.crosswordLetters?.length || 0)) return fail;
    if (typeof action.letter !== 'string' || action.letter.length > 1) return fail;
    const cell = action.cell as number;
    const upper = action.letter.toUpperCase().replace(/[^A-Z]/g, '');
    game.crosswordLetters ||= Array(game.crosswordColumns === 15 ? 225 : 20).fill('');
    game.crosswordLetters[cell] = upper;
    const matchingEntries = game.crosswordEntries?.filter(item => item.cells.includes(cell)) || [];
    for (const entry of matchingEntries) {
      if (entry.answer && entry.cells.every(c => game.crosswordLetters![c]) && entry.cells.map(c => game.crosswordLetters![c]).join('') === entry.answer) {
        game.crosswordSolved ||= [];
        if (!game.crosswordSolved.includes(entry.id)) {
          game.crosswordSolved.push(entry.id);
        }
      }
    }
    if (game.crosswordSolved && game.crosswordEntries && game.crosswordSolved.length === game.crosswordEntries.length) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    }
  } else if (action.type === 'clock:adjust') {
    if (game.kind !== 'wallclock' || game.phase !== 'open' || typeof action.clock !== 'number' || !Number.isInteger(action.clock) || action.clock < 0 || action.clock > 2 || typeof action.hour !== 'number' || !Number.isInteger(action.hour) || action.hour < 1 || action.hour > 12 || typeof action.minute !== 'number' || !Number.isInteger(action.minute) || action.minute < 0 || action.minute > 59) return fail;
    if (game.board[action.clock]) return 'Jam ini sudah terkunci.';
    game.clockTimes ||= ['12:00', '12:00', '12:00'];
    game.clockTimes[action.clock] = `${action.hour}:${String(action.minute).padStart(2, '0')}`;
  } else if (action.type === 'clock:set') {
    if (game.kind !== 'wallclock' || game.phase !== 'open' || typeof action.clock !== 'number' || !Number.isInteger(action.clock) || action.clock < 0 || action.clock > 2 || typeof action.hour !== 'number' || !Number.isInteger(action.hour) || action.hour < 1 || action.hour > 12 || typeof action.minute !== 'number' || !Number.isInteger(action.minute) || action.minute < 0 || action.minute > 59) return fail;
    if (game.board[action.clock]) return 'Jam ini sudah terkunci.';
    const time = `${action.hour}:${String(action.minute).padStart(2, '0')}`;
    game.clockTimes ||= ['12:00', '12:00', '12:00'];
    game.clockTimes[action.clock] = time;
    if (time !== ['2:45', '8:15', '6:45'][action.clock]) return 'Jarum belum menunjukkan waktu yang tepat.';
    game.board[action.clock] = time;
    if (game.board.every(Boolean)) { game.phase = 'finished'; game.result = playerId; }
  } else if (action.type === 'seating:place') {
    if (game.kind !== 'seating' || game.phase !== 'open' || typeof action.seat !== 'number' || !Number.isInteger(action.seat) || action.seat < 0 || action.seat > 8 || typeof action.name !== 'string' || (action.name && !game.seatingNames?.includes(action.name))) return fail;
    if (action.name && game.seatingSeats?.some((name, seat) => name === action.name && seat !== action.seat)) return 'Nama itu sudah ditempatkan.';
    game.seatingSeats![action.seat] = action.name;
    if (game.seatingSeats!.every(Boolean) && game.seatingSeats!.every((name, seat) => name === game.seatingSolution![seat])) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    }
  } else if (action.type === 'journal:answer') {
    if (game.kind !== 'journal' || game.phase !== 'open' || !game.journal) return fail;
    const index = action.index as number;
    const verdict = checkJournal(game.journal, index, action.text);
    if (verdict === 'invalid') return 'Pertanyaan atau jawaban tidak valid.';
    if (verdict === 'done') return 'Pertanyaan ini sudah terjawab.';
    if (verdict === 'right') {
      game.journal.solved[index] = true;
      game.result = 'right';
      if (game.journal.solved.every(Boolean)) {
        game.result = playerId;
        game.scores[playerId] = (game.scores[playerId] || 0) + 1;
        game.phase = 'finished';
      }
    } else {
      // Not an error return: errors skip save/broadcast. The counter lets every client show the miss.
      game.journal.attempts++;
      game.result = 'wrong';
    }
  } else if (action.type === 'lock:draft') {
    if (game.kind !== 'lockpick' || game.phase !== 'open' || !game.lock || !validLock(action.draft)) return fail;
    game.lock.draft = action.draft;
  } else if (action.type === 'lock:try') {
    if (game.kind !== 'lockpick' || game.phase !== 'open' || !game.lock) return fail;
    const guess = game.lock.draft;
    if (guess.length !== lockLength) return `Isi ${lockLength} simbol dulu.`;
    const { exact, near } = score(game.lock.code, guess);
    game.lock.history.push({ guess: [...guess], exact, near, marks: marksOf(game.lock.code, guess) });
    if (exact === lockLength) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    } else if (game.lock.history.length >= lockTries) {
      // Bukan return error: error melewati save/broadcast, padahal reset harus sampai ke semua klien.
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      game.lock = newLock(randomInt, game.lock.attempts + 1);
      game.result = 'wrong';
    } else {
      game.lock.draft = [];
      game.result = '';
    }
  } else if (action.type === 'tile:step') {
    const t = game.tiles;
    if (game.kind !== 'tilefloor' || game.phase !== 'open' || !t || playerId !== game.players[1] || typeof action.cell !== 'number' || !Number.isInteger(action.cell) || action.cell < 0 || action.cell >= tileCols * tileRows || !adjacent(t.pos, action.cell)) return fail;
    if (!randomInt) return 'Pembuat acak tidak tersedia.';
    // Bukan return error di cabang jatuh: error melewati save/broadcast, padahal jatuhnya Pejalan harus terlihat semua klien.
    if (Date.now() > t.deadline + 1500) tileFall(game, t, randomInt); // melangkah setelah waktu habis (toleransi 1,5 dtk untuk latensi)
    else {
      t.steps++;
      if (isSafe(t, action.cell)) {
        t.pos = action.cell; game.result = ''; armTimer(t);
        if (!t.visited.includes(action.cell)) t.visited.push(action.cell);
        if (Math.floor(action.cell / tileCols) === 0) { game.phase = 'finished'; game.result = 'win'; for (const id of game.players) game.scores[id] = (game.scores[id] || 0) + 1; }
      } else tileFall(game, t, randomInt, t.faces[action.cell]!);
    }
  } else if (action.type === 'tile:timeout') {
    const t = game.tiles;
    if (game.kind !== 'tilefloor' || game.phase !== 'open' || !t || (!dm && !game.players.includes(playerId))) return fail;
    if (!randomInt) return 'Pembuat acak tidak tersedia.';
    // Server yang menilai waktunya; kedua pemain boleh melapor, laporan terlalu awal/ganda diabaikan tanpa error.
    if (Date.now() >= t.deadline - 300) tileFall(game, t, randomInt);
  } else if (action.type === 'whodunit:draft') {
    if (game.kind !== 'whodunit' || game.phase !== 'open' || !game.whodunit) return fail;
    const c = action.culprit, h = action.honest;
    if ((c !== null && (!Number.isInteger(c) || (c as number) < 0 || (c as number) >= suspects.length)) || !Array.isArray(h) || h.length > suspects.length || !h.every(n => Number.isInteger(n) && n >= 0 && n < suspects.length) || new Set(h).size !== h.length) return fail;
    game.whodunit.draftCulprit = c as number | null;
    game.whodunit.draftHonest = h as number[];
  } else if (action.type === 'whodunit:submit') {
    if (game.kind !== 'whodunit' || game.phase !== 'open' || !game.whodunit) return fail;
    if (checkWhodunit(game.whodunit.draftCulprit, game.whodunit.draftHonest)) {
      game.whodunit.reveal = whodunitReveal;
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    } else {
      game.whodunit.attempts++;
      game.result = 'wrong';
    }
  } else if (action.type === 'cryptex:draft') {
    if (game.kind !== 'cryptex' || game.phase !== 'open' || !game.cryptex) return fail;
    if (typeof action.guess !== 'string' || action.guess.length > 40) return fail;
    game.cryptex.draft = action.guess.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  } else if (action.type === 'cryptex:guess') {
    if (game.kind !== 'cryptex' || game.phase !== 'open' || !game.cryptex) return fail;
    if (typeof action.guess !== 'string' || !action.guess.trim() || action.guess.length > 100) return fail;
    if (checkCryptex(game.cryptex, action.guess)) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    } else {
      game.cryptex.attempts++;
      game.result = 'wrong';
    }
  } else if (action.type === 'scale:place') {
    if (game.kind !== 'relicscale' || game.phase !== 'open' || !game.scale) return fail;
    if (!Array.isArray(action.left) || !Array.isArray(action.right)) return fail;
    game.scale.leftPan = action.left.filter(n => Number.isInteger(n));
    game.scale.rightPan = action.right.filter(n => Number.isInteger(n));
  } else if (action.type === 'scale:weigh') {
    if (game.kind !== 'relicscale' || game.phase !== 'open' || !game.scale) return fail;
    const error = weigh(game.scale, action.left, action.right);
    if (!error && game.result === 'wrong') game.result = '';
    return error;
  } else if (action.type === 'scale:pick') {
    if (game.kind !== 'relicscale' || game.phase !== 'open' || !game.scale || typeof action.relic !== 'number' || !Number.isInteger(action.relic) || action.relic < 0 || action.relic >= scaleRelics) return fail;
    if (action.relic === game.scale.fake) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    } else {
      if (!randomInt) return 'Pembuat acak tidak tersedia.';
      // A wrong guess re-randomizes the fake so the answer can't be found by elimination across attempts.
      // Not an error return: errors skip save/broadcast, and the reset must reach every client.
      game.scale = newScale(randomInt, game.scale.attempts + 1);
      game.result = 'wrong';
    }
  } else if (action.type === 'cipher:answer') {
    if ((game.kind !== 'reliccipher' && game.kind !== 'chaincipher') || game.phase !== 'open' || (!dm && !game.players.includes(playerId)) || typeof action.answer !== 'string' || action.answer.length > 120) return fail;
    const layer = game.cipherLayers?.[game.cipherStage || 0];
    if (!layer?.answer) return fail;
    const normalized = action.answer.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized !== layer.answer.replace(/[^A-Z]/g, '')) return 'Jawaban belum membuka lapis ini.';
    game.cipherStage = (game.cipherStage || 0) + 1;
    if (game.cipherStage >= game.cipherLayers!.length) {
      game.result = playerId;
      game.scores[playerId] = (game.scores[playerId] || 0) + 1;
      game.phase = 'finished';
    }
  } else if (action.type === 'answer') {
    if (game.kind !== 'quickmath' || game.phase !== 'open' || (!dm && !game.players.includes(playerId)) || action.round !== game.round || action.question !== game.turn || typeof action.answer !== 'number' || !Number.isSafeInteger(action.answer)) return fail;
    if (action.answer !== game.answer) return 'Belum benar. Coba lagi.';
    game.scores[playerId] = (game.scores[playerId] || 0) + 1;
    game.result = playerId;
    game.turn++;
    if (game.turn === 10) game.phase = 'finished';
    else if (randomInt) nextQuickMath(game, randomInt);
    else return 'Pembuat soal tidak tersedia.';
  } else if (action.type === 'bomb:input') {
    if (game.kind !== 'bombdefuse' || game.phase !== 'open' || game.players[1] !== playerId || typeof action.module !== 'string' || typeof action.value !== 'string') return fail;
    const module = game.bombModules?.find(item => item.id === action.module);
    if (!module || module.progress.length >= module.solution!.length || !module.options.includes(action.value)) return fail;
    if (module.solution![module.progress.length] !== action.value) {
      game.result = 'exploded';
      game.phase = 'finished';
    } else {
      module.progress.push(action.value);
      if (module.id === 'wires') game.board = [...module.progress];
      if (game.bombModules!.every(item => item.progress.length === item.solution!.length)) {
        game.result = 'defused';
        game.scores[playerId]++;
        game.phase = 'finished';
      }
    }
  } else if (action.type === 'cut') {
    if (game.kind !== 'bombdefuse') return fail;
    return gameAction(game, playerId, dm, { type: 'bomb:input', module: 'wires', value: action.wire }, randomInt);
  } else if (action.type === 'flip') {
    if (game.kind === 'memory' && game.memoryCloseAt) return 'Tunggu kartu tertutup kembali.';
    if (game.kind !== 'memory' || game.phase !== 'open' || game.players[game.turn] !== playerId || typeof action.index !== 'number' || action.index < 0 || action.index > 15 || game.board[action.index] || (game.memoryOpen && game.memoryOpen.includes(action.index))) return fail;
    game.memoryOpen = game.memoryOpen || [];
    game.memoryOpen.push(action.index);
    if (game.memoryOpen.length === 2 && game.memoryBoard) {
      const [a, b] = game.memoryOpen;
      if (game.memoryBoard[a] === game.memoryBoard[b]) {
        game.board[a] = playerId; game.board[b] = playerId;
        game.scores[playerId]++;
        game.memoryPairs = (game.memoryPairs || 0) + 1;
        game.memoryOpen = [];
        if (game.memoryPairs === 8) {
          if (game.scores[game.players[0]] > game.scores[game.players[1]]) game.result = game.players[0];
          else if (game.scores[game.players[0]] < game.scores[game.players[1]]) game.result = game.players[1];
          else game.result = 'Seri.';
          game.phase = 'finished';
        }
      } else game.memoryCloseAt = Date.now() + 1000;
    }
  } else if (action.type === 'drop') {
    if (game.kind !== 'connectfour' || game.phase !== 'open' || game.players[game.turn] !== playerId || typeof action.column !== 'number' || !Number.isInteger(action.column) || action.column < 0 || action.column > 6) return fail;
    const column = action.column;
    let row = 5;
    while (row >= 0 && game.board[row * 7 + column]) row--;
    if (row < 0) return 'Kolom penuh. Pilih kolom lain.';
    const piece = game.turn === 0 ? 'X' : 'O';
    game.board[row * 7 + column] = piece;
    const win = [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) => {
      let count = 1;
      for (const sign of [-1, 1]) {
        let r = row + dr * sign, c = column + dc * sign;
        while (r >= 0 && r < 6 && c >= 0 && c < 7 && game.board[r * 7 + c] === piece) { count++; r += dr * sign; c += dc * sign; }
      }
      return count >= 4;
    });
    if (win) { game.result = playerId; game.scores[playerId]++; game.phase = 'finished'; }
    else if (game.board.every(Boolean)) { game.result = 'Seri.'; game.phase = 'finished'; }
    else game.turn = 1 - game.turn;
  } else if (action.type === 'cell') {
    if (game.kind !== 'tictactoe' || game.phase !== 'open' || game.players[game.turn] !== playerId || typeof action.cell !== 'number' || !Number.isInteger(action.cell) || action.cell < 0 || action.cell > 8 || game.board[action.cell]) return fail;
    game.moveHistory ||= [];
    if (game.moveHistory.length === 6) game.board[game.moveHistory.shift()!] = '';
    game.board[action.cell] = game.turn === 0 ? 'X' : 'O';
    game.moveHistory.push(action.cell);
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    if (lines.some(([a,b,c]) => game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c])) {
      game.result = playerId; game.scores[playerId]++; game.phase = 'finished';
    } else game.turn = 1 - game.turn;
  } else if (action.type === 'choose') {
    if (game.phase !== 'open' || !game.players.includes(playerId) || Object.hasOwn(game.choices, playerId)) return fail;
    const choice = action.choice;
    if (game.kind !== 'rps' || typeof choice !== 'string' || !['rock', 'paper', 'scissors'].includes(choice)) return fail;
    game.choices[playerId] = choice;
    if (game.kind === 'rps' && game.players.every(id => Object.hasOwn(game.choices, id))) {
      const [a, b] = game.players; const ca = game.choices[a], cb = game.choices[b];
      if (ca === cb) game.result = 'Seri.';
      else { const winner = ({ rock: 'scissors', paper: 'rock', scissors: 'paper' } as Record<string, string>)[ca] === cb ? a : b; game.scores[winner]++; game.result = winner; }
      game.phase = 'finished';
    }
  } else return fail;
  return null;
}
