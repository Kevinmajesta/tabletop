import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from 'react-dom';
import { io, type Socket } from "socket.io-client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Crown,
  Dice5,
  Grid2X2,
  Hand,
  ImagePlus,
  Link2,
  MessageCircle,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import "./style.css";
import "./dice-animation.css";
import "./tabletop.css";
import "./characters.css";
const AnimatedDiceScene = lazy(() => import("./DiceScene"));
function DiceScene(props: { roll: DiceRoll; onComplete: () => void; zoom?: number }) {
  const instant = localStorage.getItem("meja-dice-animation") === "off";
  useEffect(() => {
    if (instant) props.onComplete();
  }, [props.roll, instant]);
  return instant ? (
    <p>Animasi dimatikan. Hasil dadu fisika tetap digunakan.</p>
  ) : (
    <Suspense fallback={<p role="status">Memuat dadu 3D…</p>}>
      <AnimatedDiceScene {...props} />
    </Suspense>
  );
}
import NaturalRollEffect from "./NaturalRollEffect";
import BoardTools from "./BoardTools";
import Minigames from './Minigames';
import type { Game } from '../server/minigames';
import { gameCatalog } from '../server/minigames';
import type { Character } from "../server/characters";
import { distance, type BoardToken, type Scene } from "../server/tabletop";
import type { DiceRoll } from "../server/dice-physics";

type Token = BoardToken;
type Message = {
  id: string;
  name: string;
  text: string;
  time: number;
  kind: "chat" | "roll" | "system";
};
type Room = {
  id: string;
  title: string;
  map: string | null;
  tokens: Token[];
  messages: Message[];
  scenes?: Scene[];
  activeSceneId?: string;
  characters?: Character[];
  minigames?: Game[];
  members: { id: string; name: string; online: boolean; dm: boolean }[];
};
type Identity = {
  name: string;
  playerId: string;
  playerSecret: string;
  dmKey?: string;
};

const getRoomId = () =>
  new URLSearchParams(location.search).get("room")?.toUpperCase() || "";
const identityKey = (id: string) => `meja-petualang:${id}`;
const readIdentity = (id: string): Identity | null => {
  try {
    return JSON.parse(localStorage.getItem(identityKey(id)) || "null");
  } catch {
    return null;
  }
};
const Characters = lazy(() => import("./Characters"));

function App() {
  const [roomId, setRoomId] = useState(getRoomId);
  const [room, setRoom] = useState<Room | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(() =>
    readIdentity(getRoomId()),
  );
  const [isDM, setIsDM] = useState(false);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [joinCode, setJoinCode] = useState(getRoomId);
  const [mode, setMode] = useState<"home" | "join" | "create">(() =>
    getRoomId() && !readIdentity(getRoomId()) ? "join" : "home",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [openMinigame, setOpenMinigame] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebar, setSidebar] = useState<"chat" | "players">("chat");
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 900);
  const [mapTool, setMapTool] = useState<"select" | "pan">("select");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [mapSize, setMapSize] = useState({ width: 1200, height: 800 });
  const [uploading, setUploading] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);
  useEffect(() => {
    if (diceOpen && window.innerWidth <= 900) setPanelOpen(false);
  }, [diceOpen]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [requestedCharacter, setRequestedCharacter] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  useEffect(() => {
    const open = () => mapInput.current?.click();
    window.addEventListener("tabletop:dm-upload", open);
    return () => window.removeEventListener("tabletop:dm-upload", open);
  }, []);
  const [diceEffects, setDiceEffects] = useState(
    () => localStorage.getItem("meja-dice-animation") !== "off",
  );
  const [modifier, setModifier] = useState(0);
  const [diceAnimation, setDiceAnimation] = useState<{
    id: string;
    name: string;
    text: string;
    roll: DiceRoll;
    revealed: boolean;
  } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollError, setRollError] = useState("");
  const rollQueue = useRef<
    {
      id: string;
      name: string;
      text: string;
      roll: DiceRoll;
      revealed: boolean;
    }[]
  >([]);
  const activeRoll = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const mapInput = useRef<HTMLInputElement>(null);
  const tokenInput = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panning = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);
  const tokenDragStart = useRef<{ x: number; y: number } | null>(null);
  const [movement, setMovement] = useState<{
    a: { x: number; y: number };
    b: { x: number; y: number };
  } | null>(null);
  const activeScene = room?.scenes?.find((s) => s.id === room.activeSceneId);
  const columns = activeScene?.grid.columns ?? 20;
  useEffect(() => {
    setSelected(null);
    setPan({ x: 0, y: 0 });
    setMovement(null);
    dragging.current = null;
  }, [room?.activeSceneId]);

  useEffect(() => {
    if (!roomId || !identity) return;
    const socket = io();
    socketRef.current = socket;
    const join = () =>
      socket.emit(
        "room:join",
        { roomId, ...identity },
        (result: { ok?: boolean; isDM?: boolean; error?: string }) => {
          if (result.ok) {
            socket.emit("room:patches");
            setConnected(true);
            setIsDM(!!result.isDM);
            setError("");
          } else {
            setConnected(false);
            setError(result.error || "Tidak dapat masuk ke ruang.");
          }
        },
      );
    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on(
      "dice:animation",
      (animation: {
        id: string;
        name: string;
        text: string;
        roll: DiceRoll;
      }) => {
        const next = { ...animation, revealed: false };
        if (activeRoll.current) {
          if (rollQueue.current.length < 8) rollQueue.current.push(next);
        } else {
          activeRoll.current = true;
          setDiceAnimation(next);
        }
      },
    );
    socket.on("room:state", (next: Room) => {
      setRoom(next);
    });
    socket.on("campaign:saved", ({ status }: { status: string }) =>
      setSaveStatus(status),
    );
    socket.on(
      "room:patch",
      ({ id, patch }: { id: string; patch: Partial<Room> }) =>
        setRoom((current) =>
          current?.id === id ? { ...current, ...patch } : current,
        ),
    );
    return () => {
      socket.disconnect();
      socketRef.current = null;
      rollQueue.current = [];
      activeRoll.current = false;
      setDiceAnimation(null);
      setRolling(false);
      setConnected(false);
    };
  }, [roomId, identity]);

  useEffect(() => {
    if (!diceAnimation?.revealed) return;
    const dismiss = window.setTimeout(() => finishAnimation(), 4000);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishAnimation();
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.clearTimeout(dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [diceAnimation?.id, diceAnimation?.revealed]);

  function finishAnimation() {
    const next = rollQueue.current.shift() || null;
    activeRoll.current = !!next;
    setDiceAnimation(next);
  }

  function throwDice(sides: number) {
    if (!socketRef.current || rolling || activeRoll.current) return;
    setRolling(true);
    setRollError("");
    socketRef.current
      .timeout(15000)
      .emit(
        "dice:roll",
        `1d${sides}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""}`,
        (error: Error | null, result?: { error?: string }) => {
          setRolling(false);
          if (error || result?.error)
            setRollError(
              result?.error ||
                "Lemparan belum terkonfirmasi. Periksa koneksi dan chat sebelum mencoba lagi.",
            );
        },
      );
  }

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages.length]);
  useEffect(() => {
    if (!room?.map) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) {
        setMapSize({ width: image.naturalWidth, height: image.naturalHeight });
        if (
          isDM &&
          activeScene &&
          (activeScene.grid.width !== image.naturalWidth ||
            activeScene.grid.height !== image.naturalHeight)
        )
          socketRef.current?.emit("tabletop:action", {
            type: "grid",
            sceneId: activeScene.id,
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
      }
    };
    image.src = room.map;
    return () => {
      active = false;
    };
  }, [room?.map]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setViewportSize({ width, height });
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, [roomId, identity]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board || !room?.map) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      changeZoom(
        zoomRef.current * (event.deltaY < 0 ? 1.1 : 1 / 1.1),
        event.clientX,
        event.clientY,
      );
    };
    board.addEventListener("wheel", onWheel, { passive: false });
    return () => board.removeEventListener("wheel", onWheel);
  }, [room?.map]);
  useEffect(() => {
    const onPop = () => {
      const id = getRoomId();
      setRoomId(id);
      setIdentity(readIdentity(id));
      setRoom(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (id: string, who: Identity | null) => {
    history.pushState({}, "", id ? `?room=${id}` : location.pathname);
    setRoom(null);
    setRoomId(id);
    setIdentity(who);
    setError("");
  };

  async function enter() {
    if (!name.trim()) {
      setError("Masukkan nama panggilanmu dulu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let id = joinCode.trim().toUpperCase();
      let dmKey: string | undefined;
      if (mode === "create") {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() || "Petualangan Baru" }),
        });
        if (!response.ok) throw new Error("Gagal membuat ruang.");
        const created = await response.json();
        id = created.id;
        dmKey = created.dmKey;
      } else {
        if (!id) throw new Error("Masukkan kode ruang dulu.");
        const response = await fetch(`/api/rooms/${encodeURIComponent(id)}`);
        if (!response.ok)
          throw new Error("Ruang tidak ditemukan. Periksa kodenya lagi.");
      }
      const who = {
        name: name.trim().slice(0, 24),
        playerId: crypto.randomUUID(),
        playerSecret: crypto.randomUUID(),
        dmKey,
      };
      localStorage.setItem(identityKey(id), JSON.stringify(who));
      navigate(id, who);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: "map" | "token", file?: File) {
    if (!file || !identity) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      setError("Gunakan gambar PNG, JPG, WebP, atau GIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Gambar maksimal 10 MB.");
      return;
    }
    const tokenName =
      kind === "token"
        ? prompt("Nama token:", file.name.replace(/\.[^.]+$/, "").slice(0, 32))
        : null;
    if (kind === "token" && tokenName === null) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      if (tokenName) form.append("name", tokenName);
      const response = await fetch(`/api/rooms/${roomId}/upload/${kind}`, {
        method: "POST",
        headers: {
          "x-player-id": identity.playerId,
          "x-player-secret": identity.playerSecret,
          "x-dm-key": identity.dmKey || "",
        },
        body: form,
      });
      if (!response.ok)
        throw new Error((await response.json()).error || "Upload gagal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (mapInput.current) mapInput.current.value = "";
      if (tokenInput.current) tokenInput.current.value = "";
    }
  }

  function tokenPosition(event: React.PointerEvent) {
    const rect = mapRef.current!.getBoundingClientRect();
    const cell = rect.width / columns;
    const coordinate = (
      pointer: number,
      start: number,
      length: number,
      offset: number,
    ) => {
      const pixel = Math.max(0, Math.min(length, pointer - start));
      if (event.altKey) return (pixel / length) * 100;
      const cellStart = Math.floor((pixel - offset) / cell) * cell + offset;
      const left = Math.max(0, cellStart),
        right = Math.min(length, cellStart + cell);
      return ((left + right) / 2 / length) * 100;
    };
    return {
      x: coordinate(
        event.clientX,
        rect.left,
        rect.width,
        ((activeScene?.grid.offsetX ?? 0) / 100) * cell,
      ),
      y: coordinate(
        event.clientY,
        rect.top,
        rect.height,
        ((activeScene?.grid.offsetY ?? 0) / 100) * cell,
      ),
    };
  }
  function moveToken(event: React.PointerEvent) {
    if (!dragging.current || !mapRef.current) return;
    const { x, y } = tokenPosition(event);
    const original = room?.tokens.find((t) => t.id === dragging.current);
    if (original)
      setMovement((current) => ({
        a: current?.a || { x: original.x, y: original.y },
        b: { x, y },
      }));
    setRoom((current) =>
      current
        ? {
            ...current,
            tokens: current.tokens.map((t) =>
              t.id === dragging.current ? { ...t, x, y } : t,
            ),
          }
        : current,
    );
  }
  function finishDrag(event: React.PointerEvent) {
    setMovement(null);
    if (!dragging.current || !mapRef.current) return;
    if (event.type === "pointercancel") {
      dragging.current = null;
      tokenDragStart.current = null;
      return;
    }
    if (
      tokenDragStart.current &&
      Math.hypot(
        event.clientX - tokenDragStart.current.x,
        event.clientY - tokenDragStart.current.y,
      ) < 3
    ) {
      dragging.current = null;
      tokenDragStart.current = null;
      return;
    }
    socketRef.current?.emit("token:move", {
      id: dragging.current,
      ...tokenPosition(event),
    });
    dragging.current = null;
    tokenDragStart.current = null;
  }

  function changeZoom(next: number, clientX?: number, clientY?: number) {
    const clamped = Math.max(0.5, Math.min(4, Math.round(next * 100) / 100));
    const previous = zoomRef.current;
    if (clamped === previous) return;
    if (clientX !== undefined && clientY !== undefined && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      setPan((current) => ({
        x: x - ((x - current.x) * clamped) / previous,
        y: y - ((y - current.y) * clamped) / previous,
      }));
    }
    zoomRef.current = clamped;
    setZoom(clamped);
  }
  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 2) return;
    if (
      event.button === 0 &&
      event.target !== event.currentTarget &&
      mapTool !== "pan"
    )
      return;
    panning.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: pan.x,
      startY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function panMove(event: React.PointerEvent) {
    if (panning.current?.pointerId !== event.pointerId) return;
    setPan({
      x: panning.current.startX + event.clientX - panning.current.x,
      y: panning.current.startY + event.clientY - panning.current.y,
    });
  }
  function stopPan(event: React.PointerEvent) {
    if (panning.current?.pointerId === event.pointerId) panning.current = null;
  }

  const selectedToken = room?.tokens.find((t) => t.id === selected);
  const canEditSelected =
    selectedToken && (isDM || selectedToken.ownerId === identity?.playerId);
  const mapRatio = mapSize.width / mapSize.height;
  const canvasWidth = Math.min(
    (viewportSize.width || 1200) * 0.92,
    (viewportSize.height || 800) * 0.92 * mapRatio,
  );
  const canvasHeight = canvasWidth / mapRatio;

  if (!roomId || !identity)
    return (
      <div className="landing">
        <header className="landing-header">
          <div className="brand-mark">
            <Compass size={21} strokeWidth={2.4} />
          </div>
          <span className="brand-name">
            meja<span>petualang.</span>
          </span>
          <span className="header-tag">VIRTUAL TABLETOP</span>
        </header>
        <main className="landing-main">
          <div className="landing-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" /> TEMPAT CERITA DIMULAI
            </div>
            <h1>
              Petualangan
              <br />
              terbaik dimulai
              <br />
              <em>di satu meja.</em>
            </h1>
            <p>
              Gelarkan peta, siapkan karakter, dan biarkan dadu menentukan
              nasib. Satu ruang untuk seluruh party-mu, di mana pun kalian
              berada.
            </p>
            <div className="landing-perks">
              <span>
                <span className="perk-icon">✦</span> Realtime bersama party
              </span>
              <span>
                <span className="perk-icon">✦</span> Langsung dari browser
              </span>
            </div>
          </div>
          <div className="welcome-card">
            <div className="card-decoration">✦ &nbsp; ✧ &nbsp; ✦</div>
            <div className="card-kicker">MULAI BERMAIN</div>
            <h2>
              {mode === "create"
                ? "Buat petualangan"
                : mode === "join"
                  ? "Gabung ke party"
                  : "Ayo mulai bermain."}
            </h2>
            <p className="card-subtitle">
              {mode === "create"
                ? "Jadilah Dungeon Master dan undang party-mu."
                : mode === "join"
                  ? "Masukkan kode ruang dari Dungeon Master-mu."
                  : "Pilih jalan ceritamu untuk mulai."}
            </p>
            {mode === "home" ? (
              <div className="entry-options">
                <button
                  className="entry-button primary"
                  onClick={() => {
                    setMode("create");
                    setError("");
                  }}
                >
                  <span className="entry-icon">
                    <Crown size={22} />
                  </span>
                  <span>
                    <strong>Buat ruang baru</strong>
                    <small>Jadi Dungeon Master</small>
                  </span>
                  <ArrowRight size={19} />
                </button>
                <button
                  className="entry-button"
                  onClick={() => {
                    setMode("join");
                    setError("");
                  }}
                >
                  <span className="entry-icon">
                    <Users size={22} />
                  </span>
                  <span>
                    <strong>Gabung ruang</strong>
                    <small>Masuk sebagai pemain</small>
                  </span>
                  <ArrowRight size={19} />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void enter();
                }}
              >
                <label>
                  Nama panggilan
                  <input
                    maxLength={24}
                    placeholder="Contoh: Gandalf"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                {mode === "create" ? (
                  <label>
                    Nama petualangan
                    <input
                      maxLength={60}
                      placeholder="Contoh: The Lost Mines"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                ) : (
                  <label>
                    Kode ruang
                    <input
                      maxLength={20}
                      placeholder="Contoh: A1B2C3D4"
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                    />
                  </label>
                )}
                <button className="submit-button" disabled={busy}>
                  {busy
                    ? "Sedang menyiapkan..."
                    : mode === "create"
                      ? "Buat ruang"
                      : "Masuk ke ruang"}{" "}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    setMode("home");
                    setError("");
                  }}
                >
                  <ArrowLeft size={15} /> Kembali
                </button>
              </form>
            )}
            {error && <div className="form-error">{error}</div>}
            <div className="card-footer">
              <Shield size={14} /> Ruang privat, hanya untuk party-mu
            </div>
          </div>
        </main>
        <div className="landing-bottom">
          <span>✧ EVERY GREAT STORY STARTS SOMEWHERE</span>
          <span>BUILT FOR THE ADVENTUROUS</span>
        </div>
      </div>
    );

  return (
    <div className="app-shell">
      <span className="campaign-save-status" role="status">
        {!connected
          ? "Koneksi terputus"
          : saveStatus === "saving"
            ? "Menyimpan…"
            : saveStatus === "saved"
              ? "Tersimpan"
              : saveStatus === "error"
                ? "Gagal menyimpan. Periksa server."
                : ""}
      </span>
      {isDM && (
        <button
          className="dm-launch"
          onClick={() => window.dispatchEvent(new Event("tabletop:dm-menu"))}
        >
          <Crown size={18} />
          DM
        </button>
      )}
      {canEditSelected && selectedToken?.characterId && (
        <button
          className="token-sheet-launch"
          onClick={() => {
            setRequestedCharacter({
              id: selectedToken.characterId!,
              nonce: Date.now(),
            });
            setCharactersLoaded(true);
          }}
        >
          Buka sheet {selectedToken.name}
        </button>
      )}
      <label className="dice-effects-setting">
        <input
          type="checkbox"
          checked={diceEffects}
          onChange={(e) => {
            setDiceEffects(e.target.checked);
            localStorage.setItem(
              "meja-dice-animation",
              e.target.checked ? "on" : "off",
            );
          }}
        />
        Animasi dadu
      </label>
      {charactersLoaded ? (
        <Suspense fallback={<span role="status">Memuat karakter…</span>}>
          <Characters
            initialOpen
            requestedCharacter={requestedCharacter}
            characters={room?.characters || []}
            socket={socketRef.current}
            connected={connected}
            tokens={room?.tokens || []}
            playerId={identity.playerId}
            dm={isDM}
          />
        </Suspense>
      ) : (
        <button
          className="character-launch"
          onClick={() => setCharactersLoaded(true)}
        >
          Karakter
        </button>
      )}
      {diceAnimation && boardRef.current && createPortal(
        <div className="dice-animation">
          <div
            className={`dice-animation-card ${diceAnimation.revealed ? "revealed" : ""}`}
          >
            <div className="dice-animation-heading">
              <span>
                {diceAnimation.name} melempar d{diceAnimation.roll.sides}
              </span>
              {diceAnimation.revealed && (
                <button onClick={finishAnimation} aria-label="Tutup hasil dadu">
                  <X size={20} />
                </button>
              )}
            </div>
            {createPortal(<div className="map-dice-layer"><DiceScene
              zoom={zoom}
              key={diceAnimation.id}
              roll={diceAnimation.roll}
              onComplete={() =>
                setDiceAnimation((current) =>
                  current?.id === diceAnimation.id
                    ? { ...current, revealed: true }
                    : current,
                )
              }
            /></div>, mapRef.current || boardRef.current)}
            <NaturalRollEffect
              rollId={diceAnimation.id}
              sides={diceAnimation.roll.sides}
              values={diceAnimation.roll.values}
              revealed={diceAnimation.revealed}
            />
            <div className="dice-outcome" role="status" aria-live="polite">
              {diceAnimation.revealed ? (
                <>
                  <span>Hasil lemparan</span>
                  <strong>{diceAnimation.roll.total}</strong>
                  <p>{diceAnimation.text}</p>
                  <small>
                    {diceAnimation.roll.sides === 4
                      ? "d4 dibaca dari sisi bawah."
                      : diceAnimation.roll.sides === 100
                        ? "Dua d10: puluhan + satuan. 00 + 0 berarti 100."
                        : "Angka dibaca dari sisi atas setelah dadu berhenti."}
                  </small>
                </>
              ) : (
                <>
                  <strong className="dice-rolling-label">Dadu bergulir…</strong>
                  <p>Menunggu dadu berhenti.</p>
                </>
              )}
            </div>
          </div>
        </div>, boardRef.current
      )}
      <div className={`workspace ${panelOpen ? "panel-visible" : ""}`}>
        <nav className="tabletop-rail" aria-label="Alat meja">
          <button
            className="rail-menu"
            title="Keluar ke beranda"
            onClick={() => navigate("", null)}
          >
            <ArrowLeft size={19} />
          </button>
          <div className="rail-separator" />
          <button
            className={mapTool === "select" ? "active" : ""}
            aria-pressed={mapTool === "select"}
            title="Pilih dan geser token"
            onClick={() => setMapTool("select")}
          >
            <MousePointer2 size={21} />
          </button>
          <button
            className={mapTool === "pan" ? "active" : ""}
            aria-pressed={mapTool === "pan"}
            title="Geser peta"
            onClick={() => setMapTool("pan")}
          >
            <Hand size={20} />
          </button>
          <div className="rail-caption">ALAT</div>
          <button
            className={gridVisible ? "active" : ""}
            aria-pressed={gridVisible}
            title="Tampilkan atau sembunyikan grid"
            onClick={() => setGridVisible((value) => !value)}
          >
            <Grid2X2 size={20} />
          </button>
          <button
            className={toolsOpen ? "active" : ""}
            aria-expanded={toolsOpen}
            title="Peta dan token"
            onClick={() => {
              setToolsOpen((value) => !value);
              setDiceOpen(false);
            }}
          >
            <ImagePlus size={20} />
          </button>
          <button
            className={diceOpen ? "active" : ""}
            aria-expanded={diceOpen}
            title="Lempar dadu"
            onClick={() => {
              setDiceOpen((value) => !value);
              setToolsOpen(false);
            }}
          >
            <Dice5 size={20} />
          </button>
          <div className="rail-spacer" />
          <div className="rail-caption">RUANG</div>
          <button
            title="Chat"
            className={panelOpen && sidebar === "chat" ? "active" : ""}
            onClick={() => {
              setSidebar("chat");
              setPanelOpen(true);
            }}
          >
            <MessageCircle size={20} />
          </button>
          <button
            title="Party"
            className={panelOpen && sidebar === "players" ? "active" : ""}
            onClick={() => {
              setSidebar("players");
              setPanelOpen(true);
            }}
          >
            <Users size={20} />
          </button>
        </nav>
        <main className="stage">
          <div
            className="map-viewport"
            ref={boardRef}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={startPan}
            onPointerMove={panMove}
            onPointerUp={stopPan}
            onPointerCancel={stopPan}
          >
            {room?.map ? (
              <div
                className="map-canvas"
                ref={mapRef}
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                  backgroundImage: `url("${room.map}")`,
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  if (
                    e.target !== e.currentTarget ||
                    (e.button !== 0 && e.button !== 2)
                  )
                    return;
                  e.stopPropagation();
                  panning.current = {
                    pointerId: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    startX: pan.x,
                    startY: pan.y,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={panMove}
                onPointerUp={stopPan}
                onPointerCancel={stopPan}
              >
                {gridVisible && (
                  <div
                    className="map-grid"
                    style={{
                      backgroundSize: `${canvasWidth / columns}px ${canvasWidth / columns}px`,
                      backgroundPosition: `${(((activeScene?.grid.offsetX ?? 0) / 100) * canvasWidth) / columns}px ${(((activeScene?.grid.offsetY ?? 0) / 100) * canvasWidth) / columns}px`,
                    }}
                  />
                )}
                {room.tokens.map((token) => (
                  <button
                    key={token.id}
                    className={`map-token ${selected === token.id ? "selected" : ""}`}
                    style={{
                      left: `${token.x}%`,
                      top: `${token.y}%`,
                      width: `${((token.size ?? 1) * 100) / columns}%`,
                    }}
                    onClick={(e) => {
                      if (mapTool === "select") { setSelected(token.id); if (token.minigame && !e.shiftKey) setOpenMinigame(token.id); }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                      if (mapTool === "pan" || e.button === 2) {
                        e.stopPropagation();
                        panning.current = {
                          pointerId: e.pointerId,
                          x: e.clientX,
                          y: e.clientY,
                          startX: pan.x,
                          startY: pan.y,
                        };
                        e.currentTarget.setPointerCapture(e.pointerId);
                        return;
                      }
                      e.stopPropagation();
                      setSelected(token.id);
                      if ((isDM || token.ownerId === identity.playerId) && (!token.minigame || e.shiftKey)) {
                        dragging.current = token.id;
                        tokenDragStart.current = { x: e.clientX, y: e.clientY };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }
                    }}
                    onPointerMove={(e) => {
                      if (panning.current?.pointerId === e.pointerId)
                        panMove(e);
                      else if (dragging.current === token.id) moveToken(e);
                    }}
                    onPointerUp={(e) => {
                      if (panning.current?.pointerId === e.pointerId)
                        stopPan(e);
                      else if (dragging.current === token.id) finishDrag(e);
                    }}
                    onPointerCancel={(e) => {
                      if (panning.current?.pointerId === e.pointerId)
                        stopPan(e);
                      else if (dragging.current === token.id) finishDrag(e);
                    }}
                    title={token.name}
                  >
                    {token.minigame ? <div className="minigame-token-mark" aria-hidden="true">{gameCatalog[token.minigame].mark}</div> : <img src={token.image} alt={token.name} />}
                    <span>
                      {token.name}
                      {token.maxHp
                        ? ` · HP ${token.hp ?? 0}/${token.maxHp}`
                        : ""}
                      {token.conditions?.length
                        ? ` · ${token.conditions.join(", ")}`
                        : ""}
                      {token.hidden ? " · DM saja" : ""}
                    </span>
                  </button>
                ))}
                {movement && activeScene && (
                  <svg
                    className="token-movement"
                    viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                  >
                    <line
                      x1={(movement.a.x / 100) * canvasWidth}
                      y1={(movement.a.y / 100) * canvasHeight}
                      x2={(movement.b.x / 100) * canvasWidth}
                      y2={(movement.b.y / 100) * canvasHeight}
                    />
                    <text
                      x={(movement.b.x / 100) * canvasWidth}
                      y={(movement.b.y / 100) * canvasHeight - 12}
                    >
                      {distance(
                        movement.a,
                        movement.b,
                        activeScene.grid,
                      ).toFixed(1)}{" "}
                      {activeScene.grid.unit}
                    </text>
                  </svg>
                )}
              </div>
            ) : (
              <div className="empty-board">
                <div className="empty-emblem">
                  <Compass size={45} strokeWidth={1.25} />
                  <span>✦</span>
                </div>
                <span className="empty-eyebrow">THE WORLD AWAITS</span>
                <h2>Peta belum digelar.</h2>
                <p>
                  {isDM
                    ? "Unggah peta untuk membuka dunia baru bagi party-mu."
                    : "Dungeon Master sedang menyiapkan dunia untukmu."}
                </p>
                {isDM && (
                  <button
                    className="gold-button"
                    onClick={() => window.dispatchEvent(new Event('tabletop:dm-menu'))}
                  >
                    <Crown size={17} /> Buka menu DM
                  </button>
                )}
              </div>
            )}
          </div>
          {activeScene && (
            <Minigames games={room?.minigames || []} socket={socketRef.current} dm={isDM} playerId={identity.playerId} members={room?.members || []} connected={connected} openToken={openMinigame} onClose={() => setOpenMinigame(null)} onOpen={setOpenMinigame} />
          )}
          {activeScene && (
            <BoardTools
              scene={activeScene}
              scenes={room?.scenes || []}
              socket={socketRef.current}
              dm={isDM}
              playerId={identity.playerId}
              selected={selected}
              connected={connected}
              width={canvasWidth}
              height={canvasHeight}
              onFocus={(point) =>
                setPan({
                  x: ((50 - point.x) / 100) * canvasWidth * zoomRef.current,
                  y: ((50 - point.y) / 100) * canvasHeight * zoomRef.current,
                })
              }
            />
          )}
          <div className="map-controls">
            <button
              title="Perbesar peta"
              disabled={!room?.map || zoom >= 4}
              onClick={() => changeZoom(zoom * 1.25)}
            >
              <Plus size={18} />
            </button>
            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            <input
              aria-label="Zoom peta"
              title="Zoom peta"
              type="range"
              min="50"
              max="400"
              step="1"
              value={Math.round(zoom * 100)}
              disabled={!room?.map}
              onChange={(e) => changeZoom(Number(e.target.value) / 100)}
            />
            <button
              title="Perkecil peta"
              disabled={!room?.map || zoom <= 0.5}
              onClick={() => changeZoom(zoom / 1.25)}
            >
              <Minus size={18} />
            </button>
            <button
              title="Kembalikan posisi dan zoom"
              disabled={!room?.map}
              onClick={() => {
                zoomRef.current = 1;
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="canvas-info">
            <strong>{room?.title || "Memuat petualangan..."}</strong>
            <span className={`canvas-status ${connected ? "online" : ""}`}>
              {connected ? "Terhubung" : "Menghubungkan..."}
            </span>
            <button
              className="invite-button"
              onClick={() => {
                navigator.clipboard
                  .writeText(
                    `${location.origin}${location.pathname}?room=${roomId}`,
                  )
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2200);
                  })
                  .catch(() =>
                    setError(
                      "Tidak bisa menyalin tautan. Salin URL dari browser.",
                    ),
                  );
              }}
              title="Salin tautan undangan"
            >
              {copied ? <Check size={15} /> : <Link2 size={15} />}
              <span>{copied ? "Tersalin" : `Undang · ${roomId}`}</span>
            </button>
          </div>
          <div className="canvas-help">
            {room?.map
              ? mapTool === "pan"
                ? "Seret untuk menggeser · scroll untuk zoom"
                : "Seret token untuk memindahkan · klik kanan dan seret untuk menggeser"
              : isDM
                ? "Unggah peta lewat alat gambar untuk mulai"
                : "Menunggu peta dari Dungeon Master"}
          </div>
          {!panelOpen && (
            <button
              className="sidebar-toggle"
              title="Buka chat dan party"
              onClick={() => setPanelOpen(true)}
            >
              <MessageCircle size={19} />
              <span>Chat & Party</span>
            </button>
          )}
          {panelOpen && (
            <button
              className="sidebar-close"
              title="Tutup panel chat dan party"
              onClick={() => setPanelOpen(false)}
            >
              <X size={18} />
            </button>
          )}
          {toolsOpen && (
            <div className="tabletop-popover tools-popover">
              <div className="popover-heading">
                <strong>Peralatan</strong>
                <button
                  title="Tutup peralatan"
                  onClick={() => setToolsOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="popover-actions">
                <button
                  onClick={() => tokenInput.current?.click()}
                  disabled={uploading}
                >
                  <Plus size={18} />
                  {uploading ? "Mengunggah..." : "Tambah token"}
                </button>
                {canEditSelected && (
                  <button
                    className="remove-action"
                    onClick={() => {
                      socketRef.current?.emit("token:remove", selected);
                      setSelected(null);
                    }}
                  >
                    <Trash2 size={18} />
                    Hapus {selectedToken?.name}
                  </button>
                )}
              </div>
            </div>
          )}
          {canEditSelected && selectedToken && (
            <div className="token-size-control">
              <label htmlFor="token-size">Ukuran {selectedToken.name}</label>
              <div>
                <input
                  id="token-size"
                  aria-label="Ukuran token dalam kotak grid"
                  type="number"
                  min="0.25"
                  max="6"
                  step="0.25"
                  value={selectedToken.size ?? 1}
                  disabled={!connected}
                  onChange={(event) => {
                    const size = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(size) && size >= 0.25 && size <= 6)
                      socketRef.current?.emit("token:resize", {
                        id: selectedToken.id,
                        size,
                      });
                  }}
                />
                <span>kotak</span>
              </div>
            </div>
          )}
          {diceOpen && (
            <div className="tabletop-popover dice-popover">
              <div className="popover-heading">
                <strong>Lempar dadu</strong>
                <button title="Tutup dadu" onClick={() => setDiceOpen(false)}>
                  <X size={17} />
                </button>
              </div>
              <div className="dice-tray">
                <span>{rolling ? "Menyiapkan lemparan…" : "Pilih dadu"}</span>
                {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                  <button
                    key={sides}
                    disabled={!connected || rolling || !!diceAnimation}
                    onClick={() => throwDice(sides)}
                  >
                    d{sides}
                  </button>
                ))}
                <label>
                  Modifier{" "}
                  <input
                    type="number"
                    min={-99}
                    max={99}
                    value={modifier}
                    onChange={(e) =>
                      setModifier(
                        Math.max(
                          -99,
                          Math.min(99, Number(e.target.value) || 0),
                        ),
                      )
                    }
                  />
                </label>
                {rollError && <p role="alert">{rollError}</p>}
              </div>
            </div>
          )}
          {error && (
            <div className="toast-error" onClick={() => setError("")}>
              {error} <X size={16} />
            </div>
          )}
        </main>
        <aside className="side-panel">
          <div className="side-tabs">
            <button
              className={sidebar === "chat" ? "active" : ""}
              onClick={() => setSidebar("chat")}
            >
              <MessageCircle size={17} /> Chat & Dadu
            </button>
            <button
              className={sidebar === "players" ? "active" : ""}
              onClick={() => setSidebar("players")}
            >
              <Users size={17} /> Party
            </button>
          </div>
          {sidebar === "chat" ? (
            <>
              <div className="chat-topline">
                <span>OBROLAN PARTY</span>
                <span>{room?.messages.length || 0} PESAN</span>
              </div>
              <div className="messages">
                <div className="chat-intro">
                  <div className="chat-intro-icon">
                    <Sparkles size={21} />
                  </div>
                  <strong>Petualangan dimulai!</strong>
                  <p>
                    Setiap cerita punya awal. Sapa party-mu dan mulai
                    petualangan bersama.
                  </p>
                </div>
                {room?.messages.map((message) => (
                  <div className={`message ${message.kind}`} key={message.id}>
                    <div className="message-avatar">
                      {message.kind === "roll" ? (
                        <Dice5 size={17} />
                      ) : (
                        message.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="message-body">
                      <div className="message-meta">
                        <strong>{message.name}</strong>
                        <span>
                          {new Date(message.time).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="message-text">
                        {message.kind === "roll" && <Dice5 size={15} />}{" "}
                        {message.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>
              <form
                className="chat-compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chat.trim()) {
                    socketRef.current?.emit("chat:send", chat);
                    setChat("");
                  }
                }}
              >
                <input
                  placeholder="Tulis pesan..."
                  value={chat}
                  maxLength={500}
                  onChange={(e) => setChat(e.target.value)}
                />
                <button disabled={!connected || !chat.trim()} title="Kirim">
                  <Send size={18} />
                </button>
              </form>
              <div className="chat-tip">
                <Dice5 size={15} /> Klik “Lempar dadu” untuk roll bersama
              </div>
            </>
          ) : (
            <>
              <div className="chat-topline">
                <span>ANGGOTA PARTY</span>
                <span>
                  {room?.members.filter((m) => m.online).length || 0} ONLINE
                </span>
              </div>
              <div className="players-list">
                {room?.members.map((member) => (
                  <div className="player-row" key={member.id}>
                    <div className="player-avatar">
                      {member.name.charAt(0).toUpperCase()}
                      <i className={member.online ? "online" : ""} />
                    </div>
                    <div>
                      <strong>
                        {member.name}{" "}
                        {member.id === identity.playerId && "(Kamu)"}
                      </strong>
                      <small>
                        {member.dm ? "Dungeon Master" : "Petualang"} ·{" "}
                        {member.online ? "Online" : "Offline"}
                      </small>
                    </div>
                    {member.dm && <Crown size={17} className="crown" />}
                  </div>
                ))}
              </div>
              <div className="party-invite">
                <Users size={24} />
                <strong>Ajak temanmu bergabung</strong>
                <p>
                  Bagikan kode <b>{roomId}</b> atau klik tombol undang di atas.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
      <input
        ref={mapInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => void upload("map", e.target.files?.[0])}
      />
      <input
        ref={tokenInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => void upload("token", e.target.files?.[0])}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
