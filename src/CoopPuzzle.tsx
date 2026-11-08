import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Armchair, Check, DoorClosed, DoorOpen, Grid3x3, KeyRound, ScrollText } from 'lucide-react';
import type { Game } from '../server/minigames';
import Crossword from './Crossword';
import './coop.css';

type Props = {
  game: Game;
  disabled: boolean;
  send: (action: Record<string, unknown>) => void;
  dm: boolean;
  members: { id: string; name: string; online: boolean; dm: boolean }[];
};
const names = ['ANI', 'BUDI', 'CITRA', 'DODI', 'EKA', 'FANI', 'GALIH', 'HANA', 'IWAN'];
const extractKeys = ['7M', '5T', '9T', '15M', '12T'];
const cipherStages = ['Morse', 'Vigenère', 'Transposisi'];
const nameRe = new RegExp(`\\b(${names.join('|')})\\b`, 'gi');

// Petunjuk dari server ditulis KAPITAL semua. Ubah ke kalimat biasa supaya enak dibaca, dan tebalkan nama orang.
function readable(text: string): ReactNode {
  const shouting = /[A-Z]/.test(text) && text === text.toUpperCase();
  let sentence = text;
  if (shouting) {
    sentence = text.toLowerCase();
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    if (!/[.!?]$/.test(sentence)) sentence += '.';
  }
  const parts = sentence.split(nameRe);
  return parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part.toUpperCase()}</b> : <Fragment key={i}>{part}</Fragment>));
}

export default function CoopPuzzle({ game, disabled, send, dm, members }: Props) {
  const coop = game.coop;
  const assigned = [coop?.teams[0]?.[0] || '', coop?.teams[0]?.[1] || '', coop?.teams[1]?.[0] || '', coop?.teams[1]?.[1] || ''];
  const assignmentKey = JSON.stringify(assigned);
  const [players, setPlayers] = useState(assigned);
  const [cipherAnswer, setCipherAnswer] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [panel, setPanel] = useState<'chairs' | 'tts' | 'cipher'>('chairs');
  useEffect(() => { setPanel(game.coop?.room === 'cipher' ? 'cipher' : 'chairs'); }, [game.tokenId, game.coop?.room]);
  useEffect(() => { setPlayers(JSON.parse(assignmentKey)); }, [game.tokenId, game.round, assignmentKey]);
  useEffect(() => { setCipherAnswer(''); setFinalAnswer(''); }, [game.tokenId, game.round, game.phase, coop?.cipherStage]);
  const canAssign = players.every(id => id && members.some(member => member.id === id)) && new Set(players).size === 4;
  const locked = disabled || game.phase !== 'open';
  const chairs = dm || coop?.room === 'chairs';
  const cipher = dm || coop?.room === 'cipher';
  const memberName = (id: string) => members.find(member => member.id === id)?.name || 'Pemain';
  const teamNames = (index: number) => (coop?.teams[index] || []).map(memberName).join(' & ');

  if (game.phase === 'waiting') return <section className="coop-setup">
    <p className="coop-lede">Dua pemain masuk ruang kursi, dua pemain masuk ruang sandi. Setiap ruang hanya memegang separuh petunjuk, jadi kedua tim harus saling bicara.</p>
    {dm ? <fieldset className="coop-assign" disabled={disabled}>
      <legend>Bagi empat pemain ke dua ruangan</legend>
      {[0, 1].map(room => (
        <div key={room} className="coop-assign-room" data-room={room === 0 ? 'chairs' : 'cipher'}>
          <h4>{room === 0 ? <Armchair size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}{room === 0 ? 'Ruang Kursi' : 'Ruang Sandi'}</h4>
          {[0, 1].map(slot => {
            const index = room * 2 + slot;
            return <label key={index}>
              Pemain {slot + 1}
              <select value={players[index]} onChange={event => setPlayers(current => current.map((value, i) => i === index ? event.target.value : value))}>
                <option value="">Pilih pemain</option>
                {members.map(member => <option key={member.id} value={member.id} disabled={players.some((value, i) => i !== index && value === member.id)}>{member.name}{member.online ? '' : ' (offline)'}{member.dm ? ' (GM)' : ''}</option>)}
              </select>
            </label>;
          })}
        </div>
      ))}
      <div className="coop-assign-actions">
        <button type="button" className="coop-primary" disabled={disabled || !canAssign} onClick={() => send({ type: 'coop:assign', teams: [players.slice(0, 2), players.slice(2, 4)] })}>Tetapkan tim</button>
        <p>Setelah tim ditetapkan, tekan Mulai ronde.</p>
      </div>
    </fieldset> : <p className="coop-waiting">Menunggu GM menetapkan tim dan membuka ronde.</p>}
    {coop?.teams.some(team => team.length > 0) && <ul className="coop-team-list">{coop.teams.map((team, index) => <li key={index}>{index === 0 ? <Armchair size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}<span>{index === 0 ? 'Ruang Kursi' : 'Ruang Sandi'}</span><strong>{team.map(memberName).join(' & ')}</strong></li>)}</ul>}
  </section>;

  if (!coop) return <p role="status">Menunggu data ruang.</p>;
  if (!chairs && !cipher) return <p className="coop-waiting">Kamu penonton. Kedua tim sedang bertukar petunjuk.</p>;

  const ttsSolved = coop.crossword?.crosswordSolved?.length;
  const cipherDone = Math.min(coop.cipherStage, 3);
  const room = dm ? 'dm' : coop.room;
  const lines = (coop.cipher || '').split('\n');
  const cipherIntro = lines[0];
  const cipherBody = lines.slice(1).join('\n');

  return <section className="coop-workspace" data-room={room}>
    <div className="coop-banner">
      <div className="coop-emblem" aria-hidden="true">{room === 'cipher' ? <KeyRound size={26} /> : room === 'chairs' ? <Armchair size={26} /> : <Grid3x3 size={26} />}</div>
      <div className="coop-banner-text">
        <span className="coop-kicker">{room === 'dm' ? 'Tampilan GM' : 'Kamu berada di'}</span>
        <h3>{room === 'cipher' ? 'Ruang Sandi' : room === 'chairs' ? 'Ruang Kursi' : 'Kedua ruangan'}</h3>
        <p>
          {room === 'chairs' && <>Bersama <b>{teamNames(0)}</b>. Tim sebelah: <b>{teamNames(1)}</b> di Ruang Sandi.</>}
          {room === 'cipher' && <>Bersama <b>{teamNames(1)}</b>. Tim sebelah: <b>{teamNames(0)}</b> di Ruang Kursi.</>}
          {room === 'dm' && <>Ruang Kursi: <b>{teamNames(0)}</b>. Ruang Sandi: <b>{teamNames(1)}</b>.</>}
        </p>
      </div>
      <ol className="coop-milestones" aria-label="Progres sesi">
        <li data-done={ttsSolved === 19 || undefined}>
          <span>Teka-teki silang</span>
          <strong>{ttsSolved ?? '—'}<small>/19</small></strong>
          <i className="coop-meter" aria-hidden="true"><i style={{ width: `${((ttsSolved ?? 0) / 19) * 100}%` }} /></i>
        </li>
        <li data-done={coop.seatDone || undefined}>
          <span>Susunan kursi</span>
          <strong>{coop.seatDone ? <><Check size={16} aria-hidden="true" /> Selesai</> : 'Disusun'}</strong>
        </li>
        <li data-done={cipherDone === 3 || undefined}>
          <span>Sandi</span>
          <strong>{cipherDone}<small>/3</small></strong>
          <span className="coop-dots" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} data-on={i < cipherDone || undefined} />)}</span>
        </li>
        <li data-done={coop.finalDone || undefined}>
          <span>Pintu</span>
          <strong>{coop.finalDone ? <><DoorOpen size={16} aria-hidden="true" /> Terbuka</> : <><DoorClosed size={16} aria-hidden="true" /> Terkunci</>}</strong>
        </li>
      </ol>
    </div>

    {coop.finalDone && <p className="coop-victory" role="status"><DoorOpen size={20} aria-hidden="true" /> Pintu terbuka. Kedua ruang berhasil dipecahkan!</p>}

    <nav className="coop-tabs" aria-label="Panel puzzle">
      {chairs && <>
        <button type="button" aria-pressed={panel === 'chairs'} onClick={() => setPanel('chairs')}><Armchair size={16} aria-hidden="true" />Susunan kursi</button>
        <button type="button" aria-pressed={panel === 'tts'} onClick={() => setPanel('tts')}><Grid3x3 size={16} aria-hidden="true" />Teka-teki silang</button>
      </>}
      {cipher && <button type="button" aria-pressed={panel === 'cipher'} onClick={() => setPanel('cipher')}><KeyRound size={16} aria-hidden="true" />Ruang sandi</button>}
    </nav>

    <div className="coop-columns">
      {!!coop.clues?.length && <aside className="coop-notes">
        <h4><ScrollText size={16} aria-hidden="true" />{room === 'cipher' ? 'Pesan terpecahkan' : 'Catatan ruangan'}</h4>
        <ol>{coop.clues.map((clue, index) => <li key={index}>{readable(clue)}</li>)}</ol>
        <p>{room === 'cipher' ? 'Bacakan pesan ini kepada tim kursi.' : 'Sampaikan petunjuk kepada tim sebelah lewat suara atau chat.'}</p>
      </aside>}

      <div className="coop-main">
        {chairs && <section hidden={panel !== 'tts'} className="coop-panel">
          <div className="coop-extract">
            <span className="coop-kicker">Ekstraksi untuk tim sandi</span>
            <p>Ambil huruf pertama dari jawaban berikut, sesuai urutan:</p>
            <ol>{extractKeys.map(key => <li key={key}>{key}</li>)}</ol>
          </div>
          {coop.crossword ? <Crossword key={`${game.tokenId}-${game.round}`} game={coop.crossword} disabled={locked} send={action => send({ type: 'coop:crossword', ...action })} /> : <p>Menunggu papan TTS.</p>}
        </section>}

        {chairs && <section hidden={panel !== 'chairs'} className="coop-panel">
          <div className="coop-panel-head">
            <h4>Susunan kursi{coop.seatDone && <span className="coop-badge"><Check size={14} aria-hidden="true" /> Selesai</span>}</h4>
            <p>Kursi 1 berada di atas meja. Nomor bertambah searah jarum jam.</p>
          </div>
          <div className="coop-table-room">
            <div className="coop-table" aria-hidden="true">
              <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" /><path d="M50 3 A47 47 0 0 1 93 33" /><polygon points="93,33 88,25 96,27" /></svg>
              <span>Meja</span>
            </div>
            {names.map((_, seat) => {
              const value = coop.seats?.[seat] || '';
              return <label key={seat} className="coop-seat" data-filled={value ? '' : undefined} style={{ ['--angle' as string]: `${-90 + seat * 40}deg` }}>
                <span className="coop-seat-num">{seat + 1}</span>
                <select aria-label={`Kursi ${seat + 1}`} value={value} disabled={locked || coop.seatDone} onChange={event => send({ type: 'coop:seat', seat, name: event.target.value })}>
                  <option value="">Kosong</option>{names.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>;
            })}
          </div>
          {coop.reward && <p className="coop-reward" role="status">{coop.reward}</p>}
          <form className="coop-door" onSubmit={event => { event.preventDefault(); if (!locked && !coop.finalDone && finalAnswer.trim()) send({ type: 'coop:final', answer: finalAnswer.trim() }); }}>
            <span className="coop-door-icon" aria-hidden="true">{coop.finalDone ? <DoorOpen size={22} /> : <DoorClosed size={22} />}</span>
            <label>Kode pintu akhir<input value={finalAnswer} onChange={event => setFinalAnswer(event.target.value)} disabled={locked || coop.finalDone} autoComplete="off" inputMode="numeric" placeholder="18 digit dari tim sandi" /></label>
            <button className="coop-primary" disabled={locked || coop.finalDone || !finalAnswer.trim()}>Buka pintu</button>
          </form>
        </section>}

        {cipher && <section hidden={panel !== 'cipher'} className="coop-panel coop-cipher">
          <ol className="coop-stepper" aria-label="Tahap sandi">
            {cipherStages.map((name, i) => <li key={name} data-state={i < coop.cipherStage ? 'done' : i === coop.cipherStage ? 'current' : 'later'}><span>{i < coop.cipherStage ? <Check size={14} aria-hidden="true" /> : i + 1}</span>{name}</li>)}
          </ol>
          {coop.cipher ? <>
            <p className="coop-cipher-intro">{cipherIntro}</p>
            {cipherBody && <pre className="coop-cipher-text">{cipherBody}</pre>}
            {!!coop.fragments?.length && <div className="coop-fragments" aria-label="Sembilan pasangan angka">{coop.fragments.map(fragment => <div key={fragment.name}><small>{fragment.name}</small><strong>{fragment.text}</strong></div>)}</div>}
            {coop.cipherStage < 3 && <form className="coop-answer" onSubmit={event => { event.preventDefault(); if (!locked && cipherAnswer.trim()) send({ type: 'coop:cipher', answer: cipherAnswer.trim() }); }}>
              <label>{coop.cipherStage >= 2 ? 'Kode pintu 18 digit' : 'Jawaban sandi'}<input value={cipherAnswer} onChange={event => setCipherAnswer(event.target.value)} disabled={locked} autoComplete="off" /></label>
              <button className="coop-primary" disabled={locked || !cipherAnswer.trim()}>Kirim jawaban</button>
            </form>}
          </> : <p className="coop-waiting" role="status">Menunggu sandi berikutnya atau petunjuk dari tim kursi.</p>}
        </section>}
      </div>
    </div>
  </section>;
}
