import { newGame, gameAction, gameView, type Game } from './minigames.js';
import { seatSolution, seatRules, seatClue } from './seat-puzzle.js';
export type CoopState = { teams: string[][]; stage: number; cipherStage: number; seats: string[]; seatDone: boolean; finalDone: boolean; room?: 'chairs' | 'cipher' | 'spectator' | 'dm'; cipher?: string; fragments?: { name: string; text: string }[]; clues?: string[]; reward?: string; crossword?: Game };
const names = ['ANI', 'BUDI', 'CITRA', 'DODI', 'EKA', 'FANI', 'GALIH', 'HANA', 'IWAN'];
const extracts = ['7M', '5T', '9T', '15M', '12T'];
const first = seatRules.filter(rule => rule.room === 'morse').map(seatClue).join(' DAN ');
const second = seatRules.filter(rule => rule.room === 'vigenere').map(seatClue).join(' DAN ');
const fragments = ['83', '26', '59', '14', '72', '38', '95', '47', '61'];
const final = fragments.join('');
const fragmentOrder = [5, 2, 8, 0, 6, 3, 1, 7, 4];
const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');
const morse: Record<string, string> = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
function encrypt(text: string, key: string) { return [...normalize(text)].map((letter, i) => String.fromCharCode(65 + (letter.charCodeAt(0) + key.charCodeAt(i % key.length) - 130) % 26)).join(''); }
export function coopView(game: Game, playerId: string, dm: boolean): CoopState | undefined {
  const c = game.coop;
  if (!c) return undefined;
  const room = dm ? 'dm' : c.teams[0].includes(playerId) ? 'chairs' : c.teams[1].includes(playerId) ? 'cipher' : 'spectator';
  const view: CoopState = { teams: c.teams.map(t => [...t]), stage: c.stage, cipherStage: c.cipherStage, seats: [], seatDone: c.seatDone, finalDone: c.finalDone, room };
  if (room === 'chairs' || dm) {
    view.seats = [...c.seats];
    view.crossword = c.crossword && gameView(c.crossword, playerId, dm);
    view.clues = ['Kursi 1 berada di atas meja. Nomor bertambah searah jarum jam dan berputar kembali dari 9 ke 1. Jarak dihitung dalam langkah kursi, bukan jumlah orang di antaranya. Gabungkan petunjuk lokal dengan pesan tim sandi.', ...seatRules.filter(rule => rule.room === 'chairs').map(seatClue)];
    if (c.seatDone) view.reward = 'Bacakan NAMA LENGKAP penghuni kursi 1 sampai 9 secara berurutan kepada tim sandi. Urutan ini menyusun sembilan pasangan angka menjadi kode pintu 18 digit.';
  }
  if (room === 'cipher' || dm) {
    view.cipher = c.cipherStage === 0 ? 'Morse internasional. Garis miring memisahkan kata:\n' + first.split(' ').map(w => [...w].map(l => morse[l]).join(' ')).join(' / ') : c.cipherStage === 1 ? 'Vigenere A–Z (A=0). Kunci: huruf awal lima jawaban bertanda dari tim TTS.\n' + encrypt(second, 'KAPKG') : c.cipherStage === 2 ? 'Transposisi Kursi. Mintalah urutan nama penghuni kursi 1 sampai 9 kepada tim kursi. Baca keping bernama sesuai urutan itu, gabungkan pasangan angkanya menjadi kode pintu 18 digit. Jangan urutkan berdasarkan nama atau besar angka.' : 'Sandi selesai. Bacakan kode pintu 18 digit kepada tim kursi.';
    if (c.cipherStage === 2) view.fragments = fragmentOrder.map(i => ({ name: seatSolution[i], text: fragments[i] }));
    view.clues = [...(dm ? view.clues || [] : []), ...(c.cipherStage > 0 ? [first] : [])];
    if (c.cipherStage > 1) view.clues.push(second);
    if (c.cipherStage > 2) view.clues.push(final);
  }
  return view;
}
export function coopAction(game: Game, playerId: string, dm: boolean, action: Record<string, unknown>): string | null {
  const fail = 'Aksi ruangan tidak tersedia.';
  if (action.type === 'reset') {
    if (!dm) return fail;
    delete game.coop; game.phase = 'waiting'; game.players = []; delete game.declaration; game.result = ''; return null;
  }
  if (action.type === 'coop:assign') {
    const teams = action.teams;
    if (!dm || game.phase !== 'waiting' || !Array.isArray(teams) || teams.length !== 2 || !teams.every(t => Array.isArray(t) && t.length === 2 && t.every(id => typeof id === 'string' && id.length > 0 && id.length <= 100)) || new Set(teams.flat()).size !== 4) return 'Pilih empat pemain berbeda, dua per ruangan.';
    game.coop = { teams: teams.map(t => [...t]), stage: 0, cipherStage: 0, seats: Array(9).fill(''), seatDone: false, finalDone: false };
    game.players = teams.flat(); game.scores = Object.fromEntries(game.players.map(id => [id, 0])); game.declaration = (game.declaration || 0) + 1; return null;
  }
  const c = game.coop;
  if (!c) return 'GM harus membagi dua tim terlebih dahulu.';
  if (action.type === 'start') {
    if (!dm || game.phase !== 'waiting') return fail;
    c.crossword = newGame(game.tokenId + ':tts', 'ttspilihan'); gameAction(c.crossword, playerId, true, { type: 'start' });
    game.phase = 'open'; game.round++; return null;
  }
  if (game.phase !== 'open') return fail;
  const chairs = dm || c.teams[0].includes(playerId), cipher = dm || c.teams[1].includes(playerId);
  if (action.type === 'coop:crossword') {
    if (!chairs || !c.crossword) return fail;
    if (c.crossword.crosswordSolved?.includes(String(action.id))) return null;
    return gameAction(c.crossword, playerId, false, { type: 'crossword:answer', id: action.id, answer: action.answer });
  }
  if (action.type === 'coop:cipher') {
    if (!cipher || typeof action.answer !== 'string' || action.answer.length > 300 || c.cipherStage >= 3) return fail;
    if (c.cipherStage === 1 && !extracts.every(id => c.crossword?.crosswordSolved?.includes(id))) return 'Tunggu kunci lima jawaban bertanda dari tim TTS.';
    if (c.cipherStage === 2 && !c.seatDone) return 'Tunggu kunci susunan kursi dari tim kursi.';
    if ((c.cipherStage === 2 ? action.answer.replace(/\s/g, '') : normalize(action.answer)) !== [normalize(first), normalize(second), final][c.cipherStage]) return 'Jawaban belum tepat.';
    c.cipherStage++; c.stage++;
    if (c.cipherStage >= 2) c.seatDone = seatSolution.every((name, i) => c.seats[i] === name);
    return null;
  }
  if (action.type === 'coop:seat') {
    if (!chairs || c.seatDone || !Number.isInteger(action.seat) || (action.seat as number) < 0 || (action.seat as number) > 8 || typeof action.name !== 'string' || (action.name !== '' && !names.includes(action.name))) return fail;
    const seat = action.seat as number;
    if (action.name && c.seats.some((name, i) => i !== seat && name === action.name)) return 'Nama sudah duduk di kursi lain.';
    c.seats[seat] = action.name;
    c.seatDone = c.cipherStage >= 2 && seatSolution.every((name, i) => c.seats[i] === name); return null;
  }
  if (action.type === 'coop:final') {
    if (!chairs || typeof action.answer !== 'string' || action.answer.length > 50 || c.cipherStage !== 3 || !c.seatDone || c.crossword?.phase !== 'finished') return 'Selesaikan TTS, kursi, dan sandi sebelum membuka pintu.';
    if (action.answer.replace(/\s/g, '') !== final) return 'Kode pintu belum tepat.';
    c.finalDone = true; game.phase = 'finished'; game.result = playerId; return null;
  }
  return fail;
}
