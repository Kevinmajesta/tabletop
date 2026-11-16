import { useEffect, useState } from 'react';
import { Check, Skull, Sparkles } from 'lucide-react';
import type { Game } from '../server/minigames';
import { attrValues, holdersOf, drinkLore, drinkNames, gobletCount, gobletMaterials, isPoison, safeCount, senseInfo, senses, type LichView, type Sense } from '../server/lich';
import GameRules from './GameRules';
import './alchemy.css';
import './lich.css';

const liquid: Record<string, string> = { 'Merah delima': '#9e1f2c', 'Ungu pekat': '#4b1f6e', 'Hijau zamrud': '#1f7a4d', 'Keemasan': '#c9962e', 'Bening': '#b9d4dc' };
const metal = ['#d4a93c', '#c9ccd2', '#a8703a', '#e6dcc3', '#a9d8e8', '#3a3a40', '#4a2e22', '#5fa87a'];
const tempIcon = ['❄', '·', '♨'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const lines = {
  poisoned: (n: number) => `${n} piala beracun. Coba lagi.`,
  win: 'Berhasil! Keempat piala aman.',
};

type Member = { id: string; name: string; online: boolean; dm: boolean };

// GM memilih pemegang tiap indra dari semua anggota room (termasuk yang offline), seperti Dua Ruangan.
function SeatPanel({ game, members, disabled, send, title, note }: { game: Game; members: Member[]; disabled: boolean; send: (action: Record<string, unknown>) => void; title: string; note: string }) {
  const holders = holdersOf({ holders: game.lichHolders }, game.players.length);
  const current = senses.map((_s, k) => game.players[holders[k]] || '');
  const key = JSON.stringify(current);
  const [seats, setSeats] = useState<string[]>(current);
  useEffect(() => { setSeats(JSON.parse(key)); }, [key]);
  const ready = seats.every(id => id && members.some(m => m.id === id));
  return <div className="lc-panel lc-seat">
    <h4>{title}</h4>
    <ul className="lc-holders">{senses.map((s, k) => <li key={s}><span className={`lc-dot ${s}`} />{senseInfo[s].title} <em>{senseInfo[s].attr}</em>
      <select aria-label={`Pemegang indra ${senseInfo[s].title}`} value={seats[k]} disabled={disabled} onChange={e => setSeats(cur => cur.map((v, i) => (i === k ? e.target.value : v)))}>
        <option value="">Pilih pemain</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}{m.online ? '' : ' (offline)'}{m.dm ? ' (GM)' : ''}</option>)}
      </select></li>)}</ul>
    <button type="button" className="lc-agree" disabled={disabled || !ready || JSON.stringify(seats) === key} onClick={() => send({ type: 'lich:seat', seats })}>Tetapkan peran</button>
    <small>{note}</small>
  </div>;
}

export default function Lich({ game, disabled, send, playerId, name, dm, members }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean; members: Member[] }) {
  const t = game.lich as LichView | undefined;
  const rules = <GameRules phase={game.phase}>
    <p>Sang Lich menjamu party dengan <strong>delapan piala</strong>: empat beracun, empat aman. Party harus menandai <strong>empat piala aman</strong>, lalu bersulang bersama.</p>
    <p>Setiap peserta hanya punya <strong>satu indra</strong> (warna, aroma, bunyi, atau suhu) dan <strong>satu halaman buku racun</strong>. Halaman itu mencatat dua jenis minuman, tapi <strong>hanya dua dari empat cirinya</strong>, ditambah beberapa aturan. Ciri yang tidak tercatat harus disimpulkan dari aturan di halaman semua tamu.</p>
    <p>Kedelapan jenis minuman di buku masing-masing ada di <strong>tepat satu piala</strong>. Ceritakan apa yang kalian lihat, cium, amati, dan rasakan, lalu susun bersama.</p>
    <p>Siapa pun boleh menandai piala. Sulangan baru terjadi setelah <strong>semua peserta menekan Setuju</strong>. Kalau ada piala beracun yang ikut diminum, lich akan menyebut jumlahnya dan GM menentukan akibatnya. Meja tetap sama, jadi kalian bisa mencoba lagi.</p>
  </GameRules>;
  if (!t || game.phase === 'waiting') {
    const pre = holdersOf({ holders: game.lichHolders }, game.players.length);
    return <section className="mg-skin alchemy-skin lich-skin" data-phase={game.phase}>{rules}
      {dm
        ? <SeatPanel game={game} members={members} disabled={disabled} send={send} title="Bagikan indra" note="Pilih dari semua anggota room, termasuk yang sedang offline. Satu pemain boleh memegang beberapa indra; halaman buku ikut indranya. Setelah peran ditetapkan, tekan Mulai ronde." />
        : <p className="al-hint">{game.players.length ? 'Peran sudah dibagikan. Menunggu GM membuka perjamuan.' : 'Menunggu GM membagikan indra.'}</p>}
      {!dm && !!game.players.length && <ul className="lc-holders lc-seat-list">{senses.map((s, k) => <li key={s}><span className={`lc-dot ${s}`} />{senseInfo[s].title}<b>{game.players[pre[k]] === playerId ? 'kamu' : name(game.players[pre[k]])}</b></li>)}</ul>}
    </section>;
  }

  const open = game.phase === 'open';
  const finished = game.phase === 'finished';
  const me = game.players.indexOf(playerId);
  const guest = me >= 0;
  const canMark = open && !disabled && (guest || dm);
  const mySenses = new Set(t.roles.map(r => r.sense));
  const agreedMe = t.agreed.includes(playerId);
  const ready = t.marks.length === safeCount;
  const holderName = (k: number) => { const id = game.players[t.holders[k]]; return !id ? '—' : id === playerId ? 'kamu' : name(id); };
  const line = finished && game.result === 'win' ? lines.win : game.result === 'poisoned' && t.lastPoisoned ? lines.poisoned(t.lastPoisoned) : null;
  const val = (s: Sense, g: number) => { const v = t.observed[s]?.[g]; return v === undefined ? null : attrValues[s][v]; };

  return <section className="mg-skin alchemy-skin lich-skin" data-phase={game.phase}>
    {rules}

    {line && <blockquote className={`lc-voice${game.result === 'poisoned' ? ' bad' : ''}${finished ? ' good' : ''}`} role="status">
      {finished ? <Sparkles size={18} aria-hidden="true" /> : <Skull size={18} aria-hidden="true" />}
      <p>{line}</p>
    </blockquote>}

    <div className="lc-table" role="group" aria-label="Meja perjamuan">
      {Array.from({ length: gobletCount }, (_, g) => {
        const color = val('sight', g);
        const marked = t.marks.includes(g);
        const drink = t.solution?.[g];
        const label = `Piala ${ROMAN[g]}, ${gobletMaterials[g]}${color ? `, cairan ${color}` : ''}${val('smell', g) ? `, aroma ${val('smell', g)}` : ''}${val('watch', g) ? `, bunyi ${val('watch', g)}` : ''}${val('touch', g) ? `, ${val('touch', g)}` : ''}${marked ? ', ditandai aman' : ''}`;
        return <button key={g} type="button" className={`lc-goblet${marked ? ' marked' : ''}${drink !== undefined ? (isPoison(drink) ? ' poison' : ' safe') : ''}`}
          disabled={!canMark || (!marked && t.marks.length >= safeCount)} aria-pressed={marked} aria-label={label} title={label}
          onClick={() => send({ type: 'lich:mark', goblet: g })}>
          <span className="lc-num">{ROMAN[g]}</span>
          <svg viewBox="0 0 60 86" aria-hidden="true">
            <path d="M8 8 H52 C52 34 42 44 30 46 C18 44 8 34 8 8 Z" className="lc-cup" style={{ fill: metal[g] }} />
            <path d="M12 14 H48 C47 32 39 40 30 41 C21 40 13 32 12 14 Z" className={`lc-liquid${color ? '' : ' unknown'}`} style={color ? { fill: liquid[color] } : undefined} />
            {!color && <text x="30" y="31" textAnchor="middle" className="lc-q">?</text>}
            <rect x="27" y="45" width="6" height="26" className="lc-stem" style={{ fill: metal[g] }} />
            <ellipse cx="30" cy="76" rx="16" ry="5" className="lc-foot" style={{ fill: metal[g] }} />
            {val('touch', g) === 'Sedingin es' && <path d="M20 4 l3 -3 M30 3 v-3 M40 4 l-3 -3" className="lc-frost" />}
            {val('touch', g) === 'Hangat' && <path d="M22 6 q-3 -3 0 -6 M30 6 q-3 -3 0 -6 M38 6 q-3 -3 0 -6" className="lc-steam" />}
          </svg>
          <span className="lc-material">{gobletMaterials[g]}</span>
          <span className="lc-notes">
            {senses.filter(s => mySenses.has(s)).map(s => <small key={s} className={`lc-note ${s}`}>{s === 'touch' ? `${tempIcon[t.observed.touch![g]]} ` : ''}{val(s, g)}</small>)}
          </span>
          {drink !== undefined && <span className="lc-reveal">{drinkNames[drink]}</span>}
          {marked && <span className="lc-badge"><Check size={12} />aman</span>}
        </button>;
      })}
    </div>

    <div className="lc-bar">
      <span><b>{t.marks.length}</b> / {safeCount} piala ditandai aman</span>
      {open && guest && <button type="button" className={`lc-agree${agreedMe ? ' on' : ''}`} disabled={disabled || !ready} onClick={() => send({ type: 'lich:agree' })}>
        {agreedMe ? 'Batal setuju' : 'Setuju, bersulang!'}
      </button>}
      <span className="lc-agreed">{game.players.map(id => <i key={id} className={t.agreed.includes(id) ? 'on' : ''} title={name(id)}>{name(id).slice(0, 1).toUpperCase()}</i>)}<small>{t.agreed.length}/{game.players.length} setuju</small></span>
    </div>
    {open && !ready && <p className="al-hint">Klik piala untuk menandai atau melepas tanda aman. Setiap perubahan tanda membatalkan persetujuan semua orang.</p>}

    <div className="lc-layout">
      <div className="lc-panel">
        <h4>{dm || finished ? 'Semua indra' : 'Indramu'}</h4>
        {!t.roles.length && <p className="lc-none">GM belum memberimu indra. Kamu duduk di ujung meja dan hanya bisa mendengar cerita tamu lain, tapi tetap boleh menandai piala dan ikut bersulang.</p>}
        {t.roles.map(({ sense }) => <div key={sense} className={`lc-sense ${sense}`}>
          <strong>{senseInfo[sense].title}</strong><p>{senseInfo[sense].body}</p>
        </div>)}
        <h4>Para tamu</h4>
        <ul className="lc-holders">{senses.map((s, k) => <li key={s}><span className={`lc-dot ${s}`} />{senseInfo[s].title} <em>{senseInfo[s].attr}</em>
          <b>{holderName(k)}</b>
        </li>)}</ul>
        {dm && open && <details className="lc-reseat"><summary>GM: ubah pembagian indra</summary><SeatPanel game={game} members={members} disabled={disabled} send={send} title="Pembagian indra" note="Perubahan langsung berlaku; persetujuan pemain yang tidak lagi ikut dihapus." /></details>}
      </div>

      <div className="lc-panel lc-book">
        <h4>{dm || finished ? 'Buku racun lengkap' : 'Halaman buku racun di tanganmu'}</h4>
        {t.book.map(({ drink, traits, full }) => <article key={drink} className={isPoison(drink) ? 'poison' : 'safe'}>
          <header><strong>{drinkNames[drink]}</strong><span>{isPoison(drink) ? 'RACUN' : 'AMAN'}</span></header>
          <p>{drinkLore[drink]}</p>
          <dl>{senses.map(s => { const v = traits[s]; return <div key={s} className={v === undefined ? 'missing' : ''}><dt>{senseInfo[s].attr}</dt><dd>{v !== undefined ? attrValues[s][v] : full ? <span className="lc-hidden">{attrValues[s][full[s]]}</span> : 'tidak tercatat'}</dd></div>; })}</dl>
        </article>)}
        {!!t.rules.length && <div className="lc-rules"><h5>{dm || finished ? 'Semua aturan' : 'Aturan di halamanmu'}</h5><ul>{t.rules.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {!dm && !finished && <small>Enam jenis minuman lainnya dan aturan sisanya tertulis di halaman milik tamu lain. Setiap jenis minuman ada di tepat satu piala.</small>}
        {(dm || finished) && <small>Ciri bergaris bawah titik tidak tercatat di buku pemain; ditampilkan untuk GM.</small>}
      </div>
    </div>

    {!!t.history.length && <div className="al-log lc-log" aria-label="Riwayat sulangan">
      {t.history.slice().reverse().map((h, i) => <div key={i} className={h.poisoned ? 'bad' : 'ok'}>
        <span>Sulangan {t.history.length - i}</span> piala {h.marks.map(g => ROMAN[g]).join(', ')}<em>{h.poisoned ? `${h.poisoned} beracun` : 'semua aman'}</em>
      </div>)}
    </div>}

    {dm && <div className="lc-dm">
      <strong>Catatan GM</strong>
      <p>Jawaban: piala aman {t.solution?.flatMap((d, g) => (isPoison(d) ? [] : [ROMAN[g]])).join(', ')}.</p>
      <p>Saran akibat tiap piala beracun yang diminum: CON save DC 13; gagal = 2d6 poison damage dan kondisi poisoned selama 1 jam, berhasil = setengah damage. Lich hanya menyebut jumlah piala beracun, bukan yang mana.</p>
    </div>}
  </section>;
}
