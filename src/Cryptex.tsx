import { useState, useId, useEffect } from 'react';
import type { Game } from '../server/minigames';

export default function Cryptex({
  game,
  disabled,
  send,
  dm
}: {
  game: Game;
  disabled: boolean;
  send: (action: Record<string, unknown>) => void;
  dm: boolean;
}) {
  const cryptex = game.cryptex;
  const chamber = cryptex?.chamber;
  const [guess, setGuess] = useState(cryptex?.draft || '');
  const inputId = useId();

  useEffect(() => {
    if (cryptex?.draft !== undefined) {
      setGuess(cryptex.draft);
    }
  }, [cryptex?.draft]);

  if (!chamber) {
    return <p>Menunggu ronde Cryptex dimulai oleh GM.</p>;
  }

  const isFinished = game.phase === 'finished';
  const isOpen = game.phase === 'open';
  const cleanGuess = guess.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const displayLetters = cleanGuess.replace(/\s+/g, '').split('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleanGuess.trim() || disabled || !isOpen) return;
    send({ type: 'cryptex:guess', guess: cleanGuess.trim() });
  }

  return (
    <section className="cryptex-board">
      <header className="cryptex-header">
        <h3>{chamber.title}</h3>
        <p className="cryptex-lore">{chamber.lore}</p>
      </header>

      <div className="cryptex-meta">
        <span className="cryptex-badge">
          <b>Metode:</b> {chamber.method}
        </span>
        <p className="cryptex-clue">
          <em>Petunjuk:</em> {chamber.clue}
        </p>
      </div>

      <div className="cryptex-scroll" aria-label="Teks Sandi">
        {chamber.verse ? (
          <div className="cryptex-verse">
            {chamber.verse.map((line, idx) => (
              <p key={idx}>
                <span className="verse-num">{idx + 1}.</span> {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="cryptex-cipher-text">
            <code>{chamber.cipher}</code>
          </div>
        )}
      </div>

      {isOpen && (
        <form className="cryptex-form" onSubmit={handleSubmit}>
          <div className="cryptex-dials" aria-label="Roda Silinder Cryptex">
            {displayLetters.length > 0 ? (
              displayLetters.map((char, i) => (
                <div key={i} className="cryptex-dial-slot">
                  <span>{char}</span>
                </div>
              ))
            ) : (
              <div className="cryptex-dial-placeholder">Ketik sandi di bawah untuk memutar silinder...</div>
            )}
          </div>

          <div className="cryptex-input-row">
            <label htmlFor={inputId}>Kata Sandi</label>
            <input
              id={inputId}
              type="text"
              value={guess}
              onChange={e => {
                setGuess(e.target.value);
                send({ type: 'cryptex:draft', guess: e.target.value });
              }}
              placeholder="Contoh: KUNCI EMAS"
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled || !isOpen}
            />
            <button type="submit" disabled={disabled || !isOpen || !cleanGuess.trim()}>
              Buka Cryptex
            </button>
          </div>

          {cryptex.attempts > 0 && game.result === 'wrong' && (
            <p role="alert" className="cryptex-wrong">
              ✕ Roda silinder bergeming. Sandi belum tepat ({cryptex.attempts}x percobaan salah). Periksa kembali petunjuk.
            </p>
          )}

          {dm && chamber.answer && (
            <p className="cryptex-dm-hint">
              <strong>Info GM:</strong> Kunci sandi adalah <code>{chamber.answer}</code>
            </p>
          )}
        </form>
      )}

      {isFinished && (
        <div className="cryptex-solved">
          <p role="status" className="cryptex-win">
            ✓ KLIK! Pasak Cryptex berputar dan silinder terbuka!
          </p>
          {chamber.answer && (
            <p className="cryptex-unlocked-key">
              Sandi Terbuka: <strong>{chamber.answer}</strong>
            </p>
          )}
          {chamber.reward && (
            <blockquote className="cryptex-reward-box">
              <p>{chamber.reward}</p>
            </blockquote>
          )}
        </div>
      )}
    </section>
  );
}
