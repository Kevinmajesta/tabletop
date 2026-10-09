import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, type Socket } from 'socket.io-client';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, Crown, Dice5, ImagePlus, Link2, MessageCircle, MoreHorizontal, Plus, Send, Shield, Sparkles, Sword, Trash2, Upload, Users, X } from 'lucide-react';
import './style.css';

type Token = { id: string; name: string; image: string; x: number; y: number; ownerId: string };
type Message = { id: string; name: string; text: string; time: number; kind: 'chat' | 'roll' | 'system' };
type Room = { id: string; title: string; map: string | null; tokens: Token[]; messages: Message[]; members: { id: string; name: string; online: boolean; dm: boolean }[] };
type Identity = { name: string; playerId: string; playerSecret: string; dmKey?: string };

const getRoomId = () => new URLSearchParams(location.search).get('room')?.toUpperCase() || '';
const identityKey = (id: string) => `meja-petualang:${id}`;
const readIdentity = (id: string): Identity | null => { try { return JSON.parse(localStorage.getItem(identityKey(id)) || 'null'); } catch { return null; } };

function App() {
  const [roomId, setRoomId] = useState(getRoomId);
  const [room, setRoom] = useState<Room | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(() => readIdentity(getRoomId()));
  const [isDM, setIsDM] = useState(false);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState(getRoomId);
  const [mode, setMode] = useState<'home' | 'join' | 'create'>(() => getRoomId() && !readIdentity(getRoomId()) ? 'join' : 'home');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebar, setSidebar] = useState<'chat' | 'players'>('chat');
  const [uploading, setUploading] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);
  const [modifier, setModifier] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const mapInput = useRef<HTMLInputElement>(null);
  const tokenInput = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId || !identity) return;
    const socket = io();
    socketRef.current = socket;
    const join = () => socket.emit('room:join', { roomId, ...identity }, (result: { ok?: boolean; isDM?: boolean; error?: string }) => {
      if (result.ok) { setConnected(true); setIsDM(!!result.isDM); setError(''); }
      else { setConnected(false); setError(result.error || 'Tidak dapat masuk ke ruang.'); }
    });
    socket.on('connect', join);
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:state', (next: Room) => setRoom(next));
    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [roomId, identity]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [room?.messages.length]);
  useEffect(() => {
    const onPop = () => { const id = getRoomId(); setRoomId(id); setIdentity(readIdentity(id)); setRoom(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (id: string, who: Identity | null) => {
    history.pushState({}, '', id ? `?room=${id}` : location.pathname);
    setRoom(null); setRoomId(id); setIdentity(who); setError('');
  };

  async function enter() {
    if (!name.trim()) { setError('Masukkan nama panggilanmu dulu.'); return; }
    setBusy(true); setError('');
    try {
      let id = joinCode.trim().toUpperCase();
      let dmKey: string | undefined;
      if (mode === 'create') {
        const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() || 'Petualangan Baru' }) });
        if (!response.ok) throw new Error('Gagal membuat ruang.');
        const created = await response.json(); id = created.id; dmKey = created.dmKey;
      } else {
        if (!id) throw new Error('Masukkan kode ruang dulu.');
        const response = await fetch(`/api/rooms/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error('Ruang tidak ditemukan. Periksa kodenya lagi.');
      }
      const who = { name: name.trim().slice(0, 24), playerId: crypto.randomUUID(), playerSecret: crypto.randomUUID(), dmKey };
      localStorage.setItem(identityKey(id), JSON.stringify(who));
      navigate(id, who);
    } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); }
    finally { setBusy(false); }
  }

  async function upload(kind: 'map' | 'token', file?: File) {
    if (!file || !identity) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError('Gunakan gambar PNG, JPG, WebP, atau GIF.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Gambar maksimal 10 MB.'); return; }
    const tokenName = kind === 'token' ? prompt('Nama token:', file.name.replace(/\.[^.]+$/, '').slice(0, 32)) : null;
    if (kind === 'token' && tokenName === null) return;
    setUploading(true); setError('');
    try {
      const form = new FormData(); form.append('image', file); if (tokenName) form.append('name', tokenName);
      const response = await fetch(`/api/rooms/${roomId}/upload/${kind}`, {
        method: 'POST', headers: { 'x-player-id': identity.playerId, 'x-player-secret': identity.playerSecret, 'x-dm-key': identity.dmKey || '' }, body: form,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Upload gagal.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload gagal.'); }
    finally { setUploading(false); if (mapInput.current) mapInput.current.value = ''; if (tokenInput.current) tokenInput.current.value = ''; }
  }

  function moveToken(event: React.PointerEvent) {
    if (!dragging.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
    setRoom(current => current ? { ...current, tokens: current.tokens.map(t => t.id === dragging.current ? { ...t, x, y } : t) } : current);
  }
  function finishDrag(event: React.PointerEvent) {
    if (!dragging.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    socketRef.current?.emit('token:move', {
      id: dragging.current,
      x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)),
    });
    dragging.current = null;
  }

  const selectedToken = room?.tokens.find(t => t.id === selected);
  const canEditSelected = selectedToken && (isDM || selectedToken.ownerId === identity?.playerId);

  if (!roomId || !identity) return (
    <div className="landing">
      <header className="landing-header"><div className="brand-mark"><Compass size={21} strokeWidth={2.4} /></div><span className="brand-name">meja<span>petualang.</span></span><span className="header-tag">VIRTUAL TABLETOP</span></header>
      <main className="landing-main">
        <div className="landing-copy"><div className="eyebrow"><span className="eyebrow-line" /> TEMPAT CERITA DIMULAI</div><h1>Petualangan<br/>terbaik dimulai<br/><em>di satu meja.</em></h1><p>Gelarkan peta, siapkan karakter, dan biarkan dadu menentukan nasib. Satu ruang untuk seluruh party-mu, di mana pun kalian berada.</p><div className="landing-perks"><span><span className="perk-icon">✦</span> Realtime bersama party</span><span><span className="perk-icon">✦</span> Langsung dari browser</span></div></div>
        <div className="welcome-card"><div className="card-decoration">✦ &nbsp; ✧ &nbsp; ✦</div><div className="card-kicker">MULAI BERMAIN</div><h2>{mode === 'create' ? 'Buat petualangan' : mode === 'join' ? 'Gabung ke party' : 'Ayo mulai bermain.'}</h2><p className="card-subtitle">{mode === 'create' ? 'Jadilah Dungeon Master dan undang party-mu.' : mode === 'join' ? 'Masukkan kode ruang dari Dungeon Master-mu.' : 'Pilih jalan ceritamu untuk mulai.'}</p>
          {mode === 'home' ? <div className="entry-options"><button className="entry-button primary" onClick={() => { setMode('create'); setError(''); }}><span className="entry-icon"><Crown size={22}/></span><span><strong>Buat ruang baru</strong><small>Jadi Dungeon Master</small></span><ArrowRight size={19}/></button><button className="entry-button" onClick={() => { setMode('join'); setError(''); }}><span className="entry-icon"><Users size={22}/></span><span><strong>Gabung ruang</strong><small>Masuk sebagai pemain</small></span><ArrowRight size={19}/></button></div> : <form onSubmit={e => { e.preventDefault(); void enter(); }}><label>Nama panggilan<input maxLength={24} placeholder="Contoh: Gandalf" value={name} onChange={e => setName(e.target.value)}/></label>{mode === 'create' ? <label>Nama petualangan<input maxLength={60} placeholder="Contoh: The Lost Mines" value={title} onChange={e => setTitle(e.target.value)}/></label> : <label>Kode ruang<input maxLength={20} placeholder="Contoh: A1B2C3D4" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}/></label>}<button className="submit-button" disabled={busy}>{busy ? 'Sedang menyiapkan...' : mode === 'create' ? 'Buat ruang' : 'Masuk ke ruang'} <ArrowRight size={18}/></button><button type="button" className="back-button" onClick={() => { setMode('home'); setError(''); }}><ArrowLeft size={15}/> Kembali</button></form>}
          {error && <div className="form-error">{error}</div>}
          <div className="card-footer"><Shield size={14}/> Ruang privat, hanya untuk party-mu</div>
        </div>
      </main><div className="landing-bottom"><span>✧ EVERY GREAT STORY STARTS SOMEWHERE</span><span>BUILT FOR THE ADVENTUROUS</span></div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="topbar"><div className="topbar-left"><div className="brand-mark small"><Compass size={19}/></div><span className="brand-name">meja<span>petualang.</span></span><span className="header-divider"/><div className="campaign-name"><span className="campaign-label">CAMPAIGN</span><strong>{room?.title || 'Memuat petualangan...'}</strong><ChevronDown size={15}/></div></div><div className="topbar-right"><span className={`status ${connected ? 'online' : ''}`}><i/>{connected ? 'Terhubung' : 'Menghubungkan...'}</span><span className="header-divider"/><div className="avatar">{identity.name.charAt(0).toUpperCase()}</div><span className="username">{identity.name}</span><span className="role-label">{isDM ? 'DM' : 'PEMAIN'}</span></div></header>
      <div className="workspace"><aside className="rail"><div className="rail-top"><button className="rail-button active" title="Peta"><Compass size={21}/><span>Peta</span></button><button className="rail-button" onClick={() => setSidebar('players')} title="Pemain"><Users size={21}/><span>Party</span></button><button className="rail-button" onClick={() => setSidebar('chat')} title="Chat"><MessageCircle size={21}/><span>Chat</span></button></div><div className="rail-bottom"><button className="rail-button" title="Kembali ke beranda" onClick={() => navigate('', null)}><ArrowLeft size={20}/><span>Keluar</span></button></div></aside>
        <main className="stage"><div className="stage-heading"><div><div className="stage-overline"><span className="dot-gold"/> MEJA PERMAINAN <span className="stage-overline-muted">/ {room?.title || '...'}</span></div><h1>Adventure Board <span>✦</span></h1><p>Semua cerita besar dimulai dari sini.</p></div><div className="stage-actions"><button className="outline-button" onClick={() => { navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${roomId}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }).catch(() => setError('Tidak bisa menyalin tautan. Salin URL dari browser.')); }}><span>{copied ? <Check size={17}/> : <Link2 size={17}/>}</span>{copied ? 'Tersalin!' : 'Undang party'}</button></div></div>
          <div className="board-toolbar"><div className="board-toolbar-left"><span className="board-symbol"><Sword size={17}/></span><strong>Battle Map</strong><span className="toolbar-separator"/><span className="board-hint">{room?.map ? 'Seret token untuk bergerak' : 'Menunggu peta petualangan'}</span></div><div className="board-toolbar-right"><span className="room-code">KODE: <strong>{roomId}</strong></span><span className="toolbar-separator"/><MoreHorizontal size={20}/></div></div>
          <div className={`board ${room?.map ? 'with-map' : ''}`} ref={boardRef} onPointerMove={moveToken} onPointerUp={finishDrag} onPointerCancel={finishDrag} style={room?.map ? { backgroundImage: `url("${room.map}")` } : undefined}>
            {!room?.map && <div className="empty-board"><div className="empty-emblem"><Compass size={45} strokeWidth={1.25}/><span>✦</span></div><span className="empty-eyebrow">THE WORLD AWAITS</span><h2>Peta belum digelar.</h2><p>{isDM ? 'Unggah peta untuk membuka dunia baru bagi party-mu.' : 'Dungeon Master sedang menyiapkan dunia untukmu.'}</p>{isDM && <button className="gold-button" onClick={() => mapInput.current?.click()}><Upload size={17}/> Unggah peta pertama</button>}</div>}
            {room?.tokens.map(token => <button key={token.id} className={`map-token ${selected === token.id ? 'selected' : ''}`} style={{ left: `${token.x}%`, top: `${token.y}%` }} onClick={() => setSelected(token.id)} onPointerDown={e => { e.stopPropagation(); setSelected(token.id); if (isDM || token.ownerId === identity.playerId) { dragging.current = token.id; e.currentTarget.setPointerCapture(e.pointerId); } }} onPointerMove={e => { if (dragging.current === token.id) moveToken(e); }} onPointerUp={e => { if (dragging.current === token.id) finishDrag(e); }} title={token.name}><img src={token.image} alt={token.name}/><span>{token.name}</span></button>)}
          </div>
          <div className="board-footer"><div className="board-footer-left"><span className="footer-dot"/> {room?.members.filter(m => m.online).length || 0} petualang online <span className="footer-sep">·</span> {room?.tokens.length || 0} token di peta</div><div className="board-footer-right">MAP {room?.map ? 'AKTIF' : 'BELUM ADA'}</div></div>
          <div className="bottom-panel"><div className="bottom-panel-title"><span className="bottom-panel-icon"><Sparkles size={18}/></span><div><strong>Peralatan petualang</strong><small>Semua yang kamu butuhkan untuk memulai</small></div></div><div className="quick-actions">{isDM && <button onClick={() => mapInput.current?.click()} disabled={uploading}><ImagePlus size={18}/><span>{room?.map ? 'Ganti peta' : 'Unggah peta'}</span></button>}<button onClick={() => tokenInput.current?.click()} disabled={uploading}><Plus size={18}/><span>{uploading ? 'Mengunggah...' : 'Tambah token'}</span></button><button onClick={() => setDiceOpen(o => !o)}><Dice5 size={18}/><span>Lempar dadu</span></button>{canEditSelected && <button className="remove-action" onClick={() => { socketRef.current?.emit('token:remove', selected); setSelected(null); }}><Trash2 size={17}/><span>Hapus token</span></button>}</div></div>
          {diceOpen && <div className="dice-tray"><span>Lempar</span>{[4, 6, 8, 10, 12, 20, 100].map(sides => <button key={sides} onClick={() => socketRef.current?.emit('dice:roll', `1d${sides}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''}`)}>d{sides}</button>)}<label>Modifier <input type="number" min={-99} max={99} value={modifier} onChange={e => setModifier(Math.max(-99, Math.min(99, Number(e.target.value) || 0)))}/></label><button className="tray-close" onClick={() => setDiceOpen(false)}><X size={16}/></button></div>}
          {error && <div className="toast-error" onClick={() => setError('')}>{error} <X size={16}/></div>}
        </main>
        <aside className="side-panel"><div className="side-tabs"><button className={sidebar === 'chat' ? 'active' : ''} onClick={() => setSidebar('chat')}><MessageCircle size={17}/> Chat & Dadu</button><button className={sidebar === 'players' ? 'active' : ''} onClick={() => setSidebar('players')}><Users size={17}/> Party</button></div>{sidebar === 'chat' ? <><div className="chat-topline"><span>OBROLAN PARTY</span><span>{room?.messages.length || 0} PESAN</span></div><div className="messages"><div className="chat-intro"><div className="chat-intro-icon"><Sparkles size={21}/></div><strong>Petualangan dimulai!</strong><p>Setiap cerita punya awal. Sapa party-mu dan mulai petualangan bersama.</p></div>{room?.messages.map(message => <div className={`message ${message.kind}`} key={message.id}><div className="message-avatar">{message.kind === 'roll' ? <Dice5 size={17}/> : message.name.charAt(0).toUpperCase()}</div><div className="message-body"><div className="message-meta"><strong>{message.name}</strong><span>{new Date(message.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div><div className="message-text">{message.kind === 'roll' && <Dice5 size={15}/>} {message.text}</div></div></div>)}<div ref={messagesEnd}/></div><form className="chat-compose" onSubmit={e => { e.preventDefault(); if (chat.trim()) { socketRef.current?.emit('chat:send', chat); setChat(''); } }}><input placeholder="Tulis pesan..." value={chat} maxLength={500} onChange={e => setChat(e.target.value)}/><button disabled={!connected || !chat.trim()} title="Kirim"><Send size={18}/></button></form><div className="chat-tip"><Dice5 size={15}/> Klik “Lempar dadu” untuk roll bersama</div></> : <><div className="chat-topline"><span>ANGGOTA PARTY</span><span>{room?.members.filter(m => m.online).length || 0} ONLINE</span></div><div className="players-list">{room?.members.map(member => <div className="player-row" key={member.id}><div className="player-avatar">{member.name.charAt(0).toUpperCase()}<i className={member.online ? 'online' : ''}/></div><div><strong>{member.name} {member.id === identity.playerId && '(Kamu)'}</strong><small>{member.dm ? 'Dungeon Master' : 'Petualang'} · {member.online ? 'Online' : 'Offline'}</small></div>{member.dm && <Crown size={17} className="crown"/>}</div>)}</div><div className="party-invite"><Users size={24}/><strong>Ajak temanmu bergabung</strong><p>Bagikan kode <b>{roomId}</b> atau klik tombol undang di atas.</p></div></>}</aside>
      </div>
      <input ref={mapInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => void upload('map', e.target.files?.[0])}/><input ref={tokenInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => void upload('token', e.target.files?.[0])}/>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
