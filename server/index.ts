import express from 'express';
import multer from 'multer';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

type Member = { name: string; secret: string };
type Token = { id: string; name: string; image: string; x: number; y: number; ownerId: string };
type Message = { id: string; name: string; text: string; time: number; kind: 'chat' | 'roll' | 'system' };
type Room = { id: string; title: string; dmKey: string; map: string | null; members: Record<string, Member>; tokens: Token[]; messages: Message[] };
type SafeRoom = Omit<Room, 'dmKey' | 'members'> & { members: { id: string; name: string; online: boolean; dm: boolean }[] };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const uploadDir = path.join(dataDir, 'uploads');
mkdirSync(uploadDir, { recursive: true });
const dbFile = path.join(dataDir, 'rooms.json');
let rooms: Record<string, Room> = {};
try { if (existsSync(dbFile)) rooms = JSON.parse(readFileSync(dbFile, 'utf8')); }
catch (error) { console.error('Gagal membaca data ruang:', error); process.exit(1); }

function save() {
  writeFileSync(dbFile + '.tmp', JSON.stringify(rooms));
  renameSync(dbFile + '.tmp', dbFile);
}

const app = express();
const http = createServer(app);
const io = new Server(http, { maxHttpBufferSize: 1e6 });
app.use(express.json({ limit: '16kb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '1d' }));
const code = () => randomBytes(4).toString('hex').toUpperCase();
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

app.post('/api/rooms', (req, res) => {
  const title = clean(req.body?.title, 60) || 'Petualangan Baru';
  let id = code();
  while (rooms[id]) id = code();
  const dmKey = randomBytes(24).toString('hex');
  rooms[id] = { id, title, dmKey, map: null, members: {}, tokens: [], messages: [] };
  save();
  res.json({ id, dmKey });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) { res.status(404).json({ error: 'Ruang tidak ditemukan.' }); return; }
  res.json({ id: room.id, title: room.title });
});

function safeRoom(room: Room): SafeRoom {
  const connected = Array.from(io.sockets.sockets.values()).filter(s => s.data.roomId === room.id);
  return {
    id: room.id, title: room.title, map: room.map, tokens: room.tokens, messages: room.messages,
    members: Object.entries(room.members).map(([id, member]) => ({
      id, name: member.name, online: connected.some(s => s.data.playerId === id),
      dm: connected.some(s => s.data.playerId === id && s.data.isDM),
    })),
  };
}
function broadcast(room: Room) { io.to(room.id).emit('room:state', safeRoom(room)); }

io.on('connection', socket => {
  socket.on('room:join', (payload: unknown, reply: (result: unknown) => void) => {
    if (typeof reply !== 'function' || !payload || typeof payload !== 'object') return;
    const p = payload as Record<string, unknown>;
    const roomId = clean(p.roomId, 20).toUpperCase();
    const room = rooms[roomId];
    const name = clean(p.name, 24);
    const playerId = clean(p.playerId, 100);
    const playerSecret = clean(p.playerSecret, 100);
    if (!room || !name || !playerId || !playerSecret) { reply({ error: 'Data masuk tidak lengkap atau ruang tidak ditemukan.' }); return; }
    if (room.members[playerId] && room.members[playerId].secret !== playerSecret) { reply({ error: 'Identitas pemain tidak cocok.' }); return; }
    if (socket.data.roomId) socket.leave(socket.data.roomId);
    room.members[playerId] = { name, secret: playerSecret };
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;
    socket.data.isDM = p.dmKey === room.dmKey;
    socket.join(roomId);
    save();
    reply({ ok: true, isDM: socket.data.isDM });
    broadcast(room);
  });

  socket.on('token:move', (payload: unknown) => {
    const room = rooms[socket.data.roomId];
    if (!room || !payload || typeof payload !== 'object') return;
    const p = payload as Record<string, unknown>;
    const token = room.tokens.find(t => t.id === p.id);
    if (!token || (!socket.data.isDM && token.ownerId !== socket.data.playerId)) return;
    if (typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    token.x = Math.max(0, Math.min(100, p.x));
    token.y = Math.max(0, Math.min(100, p.y));
    save(); broadcast(room);
  });

  socket.on('token:remove', (id: unknown) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const token = room.tokens.find(t => t.id === id);
    if (!token || (!socket.data.isDM && token.ownerId !== socket.data.playerId)) return;
    room.tokens = room.tokens.filter(t => t.id !== id);
    save(); broadcast(room);
  });

  socket.on('chat:send', (text: unknown) => {
    const room = rooms[socket.data.roomId];
    const message = clean(text, 500);
    if (!room || !message) return;
    room.messages.push({ id: randomUUID(), name: room.members[socket.data.playerId]?.name || 'Pemain', text: message, time: Date.now(), kind: 'chat' });
    room.messages = room.messages.slice(-100);
    save(); broadcast(room);
  });

  socket.on('dice:roll', (expression: unknown) => {
    const room = rooms[socket.data.roomId];
    if (!room || typeof expression !== 'string') return;
    const match = expression.replace(/\s/g, '').toLowerCase().match(/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/);
    if (!match) return;
    const count = Number(match[1]);
    if (count < 1 || count > 20) return;
    const sides = Number(match[2]);
    const modifier = Number(match[3] || 0);
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
    const total = rolls.reduce((a, b) => a + b, modifier);
    room.messages.push({ id: randomUUID(), name: room.members[socket.data.playerId]?.name || 'Pemain', text: `${count}d${sides}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''} → [${rolls.join(', ')}]${modifier ? ` ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)}` : ''} = ${total}`, time: Date.now(), kind: 'roll' });
    room.messages = room.messages.slice(-100);
    save(); broadcast(room);
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.data.roomId];
    if (room) broadcast(room);
  });
});

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' } as Record<string, string>)[file.mimetype] || '.bin'}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  cb(null, ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype));
} });

app.post('/api/rooms/:id/upload/:kind', upload.single('image'), (req, res) => {
  const room = rooms[req.params.id.toUpperCase()];
  const kind = req.params.kind;
  const playerId = clean(req.headers['x-player-id'], 100);
  const playerSecret = clean(req.headers['x-player-secret'], 100);
  const authorized = room && room.members[playerId]?.secret === playerSecret;
  const dm = room && req.headers['x-dm-key'] === room.dmKey;
  if (!room || !authorized || !['map', 'token'].includes(kind) || (kind === 'map' && !dm) || !req.file) {
    if (req.file) unlinkSync(req.file.path);
    res.status(403).json({ error: 'Upload ditolak. Periksa akses dan format gambar (PNG, JPG, WebP, GIF).' }); return;
  }
  const url = `/uploads/${req.file.filename}`;
  if (kind === 'map') room.map = url;
  else room.tokens.push({ id: randomUUID(), name: clean(req.body.name, 32) || 'Token', image: url, x: 50, y: 50, ownerId: playerId });
  save(); broadcast(room);
  res.json({ ok: true });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(error instanceof multer.MulterError ? 413 : 500).json({ error: error instanceof multer.MulterError ? 'Gambar maksimal 10 MB.' : 'Terjadi kesalahan server.' });
});

const dist = path.join(root, 'dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
const port = Number(process.env.PORT) || 3001;
http.listen(port, '0.0.0.0', () => console.log(`Meja Petualang berjalan di http://localhost:${port}`));
