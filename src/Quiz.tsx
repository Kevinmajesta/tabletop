import { useState } from 'react';
import { Check, Eye, Lock, Scroll, X } from 'lucide-react';
import type { Game } from '../server/minigames';
import type { QuizView } from '../server/quiz';
import GameRules from './GameRules';
import './quiz.css';

const letters = ['A', 'B', 'C', 'D'];
const asking = [
  'Dengarkan baik-baik, pengelana. Pertanyaan pertamaku…',
  'Pertanyaan kedua. Jangan terburu-buru.',
  'Yang ketiga. Pikirkan bersama rekanmu.',
  'Keempat. Banyak yang tersandung di sini.',
  'Kelima. Separuh jalan telah kalian tempuh.',
  'Keenam. Pasir waktu terus berjatuhan…',
  'Ketujuh. Kebijaksanaan kalian sedang kutimbang.',
  'Kedelapan. Gerbang ini mulai mendengarkan.',
  'Kesembilan. Tinggal sedikit lagi.',
  'Pertanyaan terakhir. Jawablah dengan hati-hati.',
];
const praise = ['Benar. Matamu jeli.', 'Tepat sekali. Aku terkesan.', 'Hmm… benar. Lanjutkan.', 'Jawaban yang bijak.', 'Benar. Gerbang bergetar sedikit.'];
const scold = ['Salah. Jawabannya adalah', 'Bukan itu. Yang benar ialah', 'Keliru, pengelana. Seharusnya', 'Sayang sekali. Jawabannya'];

export default function Quiz({ game, disabled, send, playerId, name, dm }: { game: Game; disabled: boolean; send: (action: Record<string, unknown>) => void; playerId: string; name: (id: string) => string; dm: boolean }) {
  const s = game.quiz as QuizView | undefined;
  const [reward, setReward] = useState<string | null>(null);
  const team = game.players;
  const rules = <GameRules phase={game.phase}>
    <p>Seekor <strong>Sphinx</strong> menjaga gerbang. Ia hanya membukanya untuk pengelana yang bisa menjawab <strong>10 pertanyaan</strong> pengetahuan umum.</p>
    <p>Dua pemain yang dipilih GM menjadi <strong>satu tim</strong>. Klik pilihan untuk menandainya (rekanmu bisa melihat tandamu), diskusikan, lalu tekan <strong>Kunci jawaban</strong>. Jawaban yang sudah dikunci tidak bisa diubah.</p>
    <p>Jawab benar minimal <strong>7 dari 10</strong> dan Sphinx akan membuka gerbangnya. Pemain lain boleh menonton.</p>
  </GameRules>;
  if (!s) return <section className="mg-skin quiz-skin" data-phase={game.phase}>{rules}</section>;

  const finished = game.phase === 'finished';
  const won = finished && s.score >= s.pass;
  const onTeam = team.includes(playerId);
  const idx = Math.min(s.current, s.total - 1);
  const item = s.asked[idx];
  const answered = item?.pick !== null && item?.pick !== undefined;
  const canPlay = game.phase === 'open' && !disabled && onTeam && !answered;
  const who = (id: string | null) => (!id ? '' : id === playerId ? 'Kamu' : name(id));
  const correctSoFar = s.asked.filter(a => a.pick !== null && a.pick === a.correct).length;

  let speech: string;
  if (finished) speech = won ? `${s.score} dari ${s.total}. Kalian layak melintas. Gerbang ini terbuka untuk kalian.` : `${s.score} dari ${s.total}. Belum cukup bijak. Kembalilah saat kalian lebih siap.`;
  else if (answered) speech = item.pick === item.correct ? praise[idx % praise.length] : `${scold[idx % scold.length]} "${item.options[item.correct ?? 0]}".`;
  else speech = asking[idx] || 'Pertanyaan berikutnya…';

  return <section className="mg-skin quiz-skin" data-phase={game.phase}>
    {rules}

    <div className="qz-stage">
      <aside className={`qz-npc${finished ? (won ? ' won' : ' lost') : answered ? (item.pick === item.correct ? ' good' : ' bad') : ''}`}>
        <div className="qz-medallion" aria-hidden="true"><Eye size={34} strokeWidth={1.4} /></div>
        <strong>Sang Sphinx</strong>
        <small>Penjaga Gerbang</small>
        <p className="qz-speech" role="status">{speech}</p>
        <div className="qz-team">
          <small>Tim penjawab</small>
          {team.map(id => <span key={id} className={id === playerId ? 'me' : ''}><i>{name(id).slice(0, 1).toUpperCase()}</i>{who(id)}</span>)}
        </div>
      </aside>

      <div className="qz-main">
        <div className="qz-progress" aria-label={`Pertanyaan ${Math.min(s.current + 1, s.total)} dari ${s.total}, benar ${correctSoFar}`}>
          {Array.from({ length: s.total }, (_, i) => {
            const a = s.asked[i];
            const state = !a || a.pick === null ? (i === s.current ? 'now' : '') : a.pick === a.correct ? 'ok' : 'bad';
            return <i key={i} className={state}>{state === 'ok' ? <Check size={11} /> : state === 'bad' ? <X size={11} /> : i + 1}</i>;
          })}
          <span className="qz-score"><b>{correctSoFar}</b>/{s.total} benar · lulus {s.pass}</span>
        </div>

        {!finished && item && <article className="qz-card">
          <header><span>Pertanyaan {idx + 1}</span><em>{item.topic}</em></header>
          <h3>{item.q}</h3>
          <div className="qz-options">
            {item.options.map((opt, i) => {
              const marked = !answered && s.mark?.choice === i;
              const cls = answered ? (i === item.correct ? 'right' : i === item.pick ? 'wrong' : 'faded') : marked ? 'marked' : '';
              return <button key={i} type="button" className={`qz-option ${cls}`} disabled={!canPlay} aria-pressed={marked}
                onClick={() => send({ type: 'quiz:mark', choice: i })}>
                <b>{letters[i]}</b><span>{opt}</span>
                {marked && <em>{who(s.mark!.by)}</em>}
                {answered && i === item.pick && <em>{who(item.by)}</em>}
                {dm && !answered && i === item.correct && <small className="qz-key">kunci</small>}
              </button>;
            })}
          </div>
          <footer>
            {!answered && (onTeam
              ? <button type="button" className="qz-lock" disabled={!canPlay || !s.mark} onClick={() => s.mark && send({ type: 'quiz:answer', choice: s.mark.choice })}>
                  <Lock size={15} />{s.mark ? `Kunci jawaban ${letters[s.mark.choice]}` : 'Pilih jawaban dulu'}
                </button>
              : <p className="qz-hint">{dm ? 'Tim sedang berdiskusi. Pilihan berlabel "kunci" hanya terlihat olehmu.' : 'Kamu menonton. Hanya tim penjawab yang bisa memilih.'}</p>)}
            {answered && (onTeam || dm) && <button type="button" className="qz-next" disabled={disabled} onClick={() => send({ type: 'quiz:next' })}>
              {s.current + 1 >= s.total ? 'Lihat hasil' : 'Pertanyaan berikutnya'}
            </button>}
          </footer>
        </article>}

        {finished && <div className={`qz-result ${won ? 'won' : 'lost'}`}>
          <div className="qz-big"><b>{s.score}</b><span>/ {s.total}</span></div>
          <div>
            <strong>{won ? 'Gerbang terbuka!' : 'Sphinx menolak membuka gerbang'}</strong>
            <p>{won ? 'Tim kalian menjawab cukup banyak pertanyaan dengan benar.' : `Butuh minimal ${s.pass} jawaban benar. Minta GM mengulang ronde untuk mencoba lagi dengan soal baru.`}</p>
          </div>
        </div>}
        {won && s.reward && <div className="qz-reward"><Scroll size={18} /><p>{s.reward}</p></div>}

        {finished && <ol className="qz-recap" aria-label="Rekap jawaban">
          {s.asked.map((a, i) => {
            const ok = a.pick !== null && a.pick === a.correct;
            return <li key={i} className={ok ? 'ok' : 'bad'}>
              <span className="qz-recap-mark">{ok ? <Check size={13} /> : <X size={13} />}</span>
              <div><p>{a.q}</p><small>{ok ? `${a.options[a.correct!]}` : <>Jawaban tim: {a.pick === null ? '—' : a.options[a.pick]} · Benar: <b>{a.options[a.correct ?? 0]}</b></>}</small></div>
            </li>;
          })}
        </ol>}
      </div>
    </div>

    {dm && <div className="qz-dm">
      <label htmlFor="qz-reward">Hadiah / petunjuk (muncul bila tim lulus)</label>
      <textarea id="qz-reward" rows={2} maxLength={300} value={reward ?? s.reward} onChange={e => setReward(e.target.value)} />
      <button type="button" disabled={disabled || reward === null || reward === s.reward} onClick={() => { send({ type: 'quiz:reward', text: reward }); setReward(null); }}>Simpan hadiah</button>
    </div>}
  </section>;
}
