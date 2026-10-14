export const gameKinds = ['rps', 'tictactoe', 'connectfour', 'quickmath', 'memory', 'bombdefuse'] as const;
export type GameKind = typeof gameKinds[number];
export const gameCatalog: Record<GameKind, { name: string; mark: string; mode: 'duel' | 'party' }> = {
  rps: { name: 'Gunting batu kertas', mark: 'GBK', mode: 'duel' },
  tictactoe: { name: 'Tic tac toe', mark: 'X/O', mode: 'duel' },
  connectfour: { name: 'Connect Four', mark: '4', mode: 'duel' },
  quickmath: { name: 'Hitung Cepat', mark: '+×−', mode: 'party' },
  memory: { name: 'Memory', mark: 'M', mode: 'duel' },
  bombdefuse: { name: 'Defuse the Bomb', mark: '!', mode: 'duel' },
};
const bombOrders = [['red', 'blue', 'yellow'], ['yellow', 'red', 'blue'], ['blue', 'yellow', 'red'], ['green', 'red', 'black'], ['black', 'yellow', 'green'], ['black', 'green', 'yellow']];
const bombKeypads = [['☾', '★', '☂', '♜'], ['☂', '♜', '☾', '★'], ['★', '☂', '♜', '☾']];
const wireSymbols = ['BURUNG', 'MAHKOTA', 'MATA', 'PEDANG'];
const boardSize = (kind: GameKind) => kind === 'connectfour' ? 42 : kind === 'bombdefuse' ? 3 : 9;
type BombModule = { id: 'wires' | 'button' | 'keypad' | 'dial'; label: string; options: string[]; clue: string; solution?: string[]; progress: string[] };
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
    { id: 'wires', label: 'KABEL', options: wires, clue: `LAMBANG ${symbol} · INDIKATOR ${indicator}`, solution: wireSolution, progress: [] },
    { id: 'button', label: 'TOMBOL', options: ['blue', 'red', 'yellow'], clue: `${buttonLabel} · ${indicator}`, solution: [buttonSolution], progress: [] },
    { id: 'keypad', label: 'SIMBOL', options: keypad, clue: `SIMBOL PERTAMA ${keypad[0]}`, solution: keypadSolution, progress: [] },
    { id: 'dial', label: 'PUTARAN RUNE', options: ['1', '2', '3', '4'], clue: `RUNE ${rune} · SEGEL ${serial}`, solution: dialSolution, progress: [] }
  ];
}
export type Game = {
  tokenId: string; kind: GameKind; round: number; phase: 'waiting' | 'open' | 'finished';
  players: string[]; scores: Record<string, number>; choices: Record<string, string>;
  result: string;
  board: string[]; turn: number;
  declaration?: number;
  question?: string; answer?: number;
  memoryBoard?: string[]; memoryOpen?: number[]; memoryPairs?: number;
  wires?: string[];
  bombModules?: BombModule[];
};
export function newGame(tokenId: string, kind: GameKind): Game {
  return { tokenId, kind, round: 0, phase: 'waiting', players: [], scores: {}, choices: {}, result: '', board: Array(boardSize(kind)).fill(''), turn: 0, memoryBoard: [], memoryOpen: [], memoryPairs: 0 };
}
export function gameView(game: Game, playerId: string, dm: boolean): Game {
  const { answer, memoryBoard, memoryOpen, wires, bombModules, ...view } = game;
  const filteredMemoryBoard = memoryBoard?.map((card, i) =>
    game.board[i] || (game.turn === game.players.indexOf(playerId) && memoryOpen?.includes(i))
      ? card
      : ''
  );
  const expert = dm || playerId === game.players[0];
  const modules = bombModules?.map(module => expert ? module : { id: module.id, label: module.label, options: module.options, clue: module.clue, progress: module.progress });
  return { ...view, ...(game.phase === 'finished' && answer !== undefined ? { answer } : {}), ...(game.kind === 'memory' ? { memoryBoard: filteredMemoryBoard, memoryOpen: game.turn === game.players.indexOf(playerId) ? memoryOpen : [] } : {}), ...(game.kind === 'bombdefuse' ? { bombModules: modules } : {}), choices: game.phase === 'finished' ? { ...game.choices } : Object.fromEntries(Object.entries(game.choices).map(([id, choice]) => [id, id === playerId ? choice : 'locked'])) } as Game;
}
export function declareGame(game: Game, participants: string[]): string | null {
  if (game.phase !== 'waiting') return 'Reset ronde sebelum deklarasi berikutnya.';
  if (new Set(participants).size !== participants.length || participants.length < 1 || (gameCatalog[game.kind].mode === 'duel' && participants.length !== 2)) return 'Pilih tepat dua pemain untuk permainan 1v1.';
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
  const fail = 'Aksi tidak tersedia pada ronde ini.';
  if (action.type === 'join') {
    if (game.declaration) return 'Peserta ditentukan GM lewat deklarasi token.';
    if (game.phase !== 'waiting' || game.players.includes(playerId) || game.players.length >= (gameCatalog[game.kind].mode === 'duel' ? 2 : 20)) return fail;
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
    Object.assign(game, { phase: 'waiting', choices: {}, result: '', board: Array(boardSize(game.kind)).fill(''), turn: 0, memoryOpen: [], memoryPairs: 0 });
    delete game.question; delete game.answer; delete game.memoryBoard; delete game.wires; delete game.bombModules;
  } else if (action.type === 'start') {
    if (!dm) return 'Hanya GM boleh memulai ronde.';
    if (game.phase !== 'waiting' || game.players.length < (gameCatalog[game.kind].mode === 'duel' ? 2 : 1)) return 'Peserta belum cukup atau ronde belum direset.';
    if (game.kind === 'quickmath') {
      if (!randomInt) return 'Pembuat soal tidak tersedia.';
      game.turn = 0;
      nextQuickMath(game, randomInt);
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
    if (game.kind !== 'memory' || game.phase !== 'open' || game.players[game.turn] !== playerId || typeof action.index !== 'number' || action.index < 0 || action.index > 15 || game.board[action.index] || (game.memoryOpen && game.memoryOpen.includes(action.index))) return fail;
    game.memoryOpen = game.memoryOpen || [];
    game.memoryOpen.push(action.index);
    if (game.memoryOpen.length === 2 && game.memoryBoard) {
      const [a, b] = game.memoryOpen;
      if (game.memoryBoard[a] === game.memoryBoard[b]) {
        game.board[a] = playerId; game.board[b] = playerId;
        game.scores[playerId]++;
        game.memoryPairs = (game.memoryPairs || 0) + 1;
        if (game.memoryPairs === 8) {
          if (game.scores[game.players[0]] > game.scores[game.players[1]]) game.result = game.players[0];
          else if (game.scores[game.players[0]] < game.scores[game.players[1]]) game.result = game.players[1];
          else game.result = 'Seri.';
          game.phase = 'finished';
        }
      } else game.turn = 1 - game.turn;
      game.memoryOpen = [];
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
    game.board[action.cell] = game.turn === 0 ? 'X' : 'O';
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    if (lines.some(([a,b,c]) => game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c])) {
      game.result = playerId; game.scores[playerId]++; game.phase = 'finished';
    } else if (game.board.every(Boolean)) { game.result = 'Seri.'; game.phase = 'finished'; }
    else game.turn = 1 - game.turn;
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
