import { useCallback, useEffect, useState } from "react";
import "./intro-splash.css";

// Splash perkenalan karakter (sementara).
// Untuk mencopot: hapus file ini, intro-splash.css, dan baris <IntroSplash> di main.tsx.
//
// NAMA KARAKTER: ganti nama di bawah ini dengan nama karakter asli.
// Kuncinya adalah nama file gambar di folder token_screen.
const HEROES: Record<string, { name: string }> = {
  "ChatGPT Image Sep 19, 2026, 07_44_18 PM.png": { name: "Penabuh Pengelana" },
  "Gemini_Generated_Image_4x6hcr4x6hcr4x6h.jpg": { name: "Penabuh Merah" },
  "WhatsApp Image 2026-08-19 at 12.39.10.jpeg": { name: "Tabib Murah Senyum" },
  "WhatsApp Image 2026-09-03 at 16.51.12.jpeg": { name: "Utusan Kelabu" },
};

const ROMAN = ["I", "II", "III", "IV"];
const SEEN_KEY = "age-of-heroes:intro-seen";
const HERO_MS = 2800;
const LINEUP_MS = 4200;
const EXIT_MS = 700;
const GIVE_UP_MS = 4000;

// stage: -2 selesai, -1 menunggu gambar, 0..3 satu per karakter, 4 barisan semua, 5 keluar
const DONE = -2;
const WAITING = -1;
const LINEUP = 4;
const EXITING = 5;

function alreadySeen() {
  try {
    if (new URLSearchParams(location.search).has("intro")) return false;
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function heroFor(src: string, index: number) {
  const file = decodeURIComponent(src.split("/").pop() || "");
  return { src, ...(HEROES[file] ?? { name: `Pahlawan ${ROMAN[index]}` }) };
}

export default function IntroSplash({ portraits, replay = 0 }: { portraits: string[]; replay?: number }) {
  const [stage, setStage] = useState(() => (alreadySeen() ? DONE : WAITING));
  // Setiap kali nilai replay naik, intro diputar ulang dari awal.
  useEffect(() => { if (replay > 0) setStage(WAITING); }, [replay]);
  const reduceMotion =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroes = portraits.slice(0, 4).map(heroFor);

  const finish = useCallback(() => setStage(s => (s >= 0 && s < EXITING ? EXITING : s)), []);
  const skip = useCallback(() => setStage(s => (s >= 0 && s < LINEUP ? LINEUP : s >= LINEUP && s < EXITING ? EXITING : s)), []);

  // Tunggu keempat gambar termuat. Kalau server tidak mengirim gambar, splash dilewati.
  useEffect(() => {
    if (stage !== WAITING) return;
    const giveUp = window.setTimeout(() => setStage(s => (s === WAITING ? DONE : s)), GIVE_UP_MS);
    if (portraits.length === 4) {
      void Promise.all(
        portraits.map(src => new Promise(resolve => {
          const img = new Image();
          img.onload = img.onerror = () => resolve(null);
          img.src = src;
        })),
      ).then(() => setStage(s => (s === WAITING ? (reduceMotion ? LINEUP : 0) : s)));
    }
    return () => window.clearTimeout(giveUp);
  }, [stage, portraits, reduceMotion]);

  useEffect(() => {
    if (stage < 0) return;
    if (stage === EXITING) {
      const t = window.setTimeout(() => {
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage diblokir: splash muncul lagi, tidak masalah */ }
        setStage(DONE);
      }, EXIT_MS);
      return () => window.clearTimeout(t);
    }
    if (stage === LINEUP && reduceMotion) return;
    const t = window.setTimeout(() => setStage(s => s + 1), stage === LINEUP ? LINEUP_MS : HERO_MS);
    return () => window.clearTimeout(t);
  }, [stage, reduceMotion]);

  useEffect(() => {
    if (stage < 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); skip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, finish, skip]);

  if (stage === DONE) return null;
  if (stage === WAITING) return <div className="intro-splash intro-splash-waiting" aria-hidden="true" />;

  return (
    <div
      className="intro-splash"
      data-exiting={stage === EXITING ? "true" : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Perkenalan para pahlawan"
      onClick={skip}
    >
      <div className="intro-masthead">
        <span>The Age of Heroes</span>
        <span>Para Pahlawan</span>
      </div>

      {heroes.map((hero, i) => (
        <figure
          key={hero.src}
          className="intro-hero"
          data-side={i % 2 ? "right" : "left"}
          data-state={i === stage ? "active" : "idle"}
          aria-hidden={i !== stage}
        >
          <div className="intro-hero-art">
            <img src={hero.src} alt={hero.name} />
          </div>
          <figcaption>
            <strong>{hero.name}</strong>
          </figcaption>
        </figure>
      ))}

      <section className="intro-lineup" data-state={stage >= LINEUP ? "active" : "idle"} aria-hidden={stage < LINEUP}>
        <p className="intro-kicker">One Shot</p>
        <h2>The Age <em>of Heroes</em></h2>
        <ul>
          {heroes.map((hero, i) => (
            <li key={hero.src} style={{ ["--i" as string]: i }}>
              <img src={hero.src} alt="" />
              <span>{hero.name}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="intro-enter"
          tabIndex={stage >= LINEUP ? 0 : -1}
          onClick={event => { event.stopPropagation(); finish(); }}
        >
          Masuk ke petualangan
        </button>
      </section>

      <div className="intro-progress" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} data-state={i < stage ? "done" : i === stage ? "active" : "idle"} style={{ ["--ms" as string]: `${i === LINEUP ? LINEUP_MS : HERO_MS}ms` }} />
        ))}
      </div>

      {stage < LINEUP && (
        <button type="button" className="intro-skip" onClick={event => { event.stopPropagation(); finish(); }}>
          Lewati intro
        </button>
      )}
    </div>
  );
}
