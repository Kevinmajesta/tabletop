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
  GripVertical,
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
import "./theme.css";
import "./start-templates/template-3.css"; // ganti ke template-1.css / template-2.css untuk tampilan lain
import CoinFlip, { type CoinResult } from './CoinFlip';
import IntroSplash from "./IntroSplash";
import DieIcon from "./DieIcon";
import "./table-polish.css";
import "./weather.css";
import "./table-motion.css";
const AnimatedDiceScene = lazy(() => import("./DiceScene"));
const NaturalRollEffect = lazy(() => import("./NaturalRollEffect"));
const BoardTools = lazy(() => import("./BoardTools"));
const Minigames = lazy(() => import("./Minigames"));
function DiceScene(props: { roll: DiceRoll; onComplete: () => void; zoom?: number; color?: number }) {
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
import type { Game } from '../server/minigames';
import { gameCatalog } from '../server/game-catalog';
import type { Character } from "../server/characters";
import { blocksMovement, distance, type BoardToken, type Scene } from "../server/tabletop";
import type { DiceRoll } from "../server/dice-physics";
import { randomId } from "./random-id";

type Token = BoardToken;
const conditionDescriptions: Record<string, string> = {
  Prone: "Prone: hanya crawl; serangan melee dari dekat mendapat advantage.",
  Poisoned: "Poisoned: disadvantage pada attack roll dan ability check.",
  Stunned: "Stunned: tidak bisa bergerak atau bertindak; serangan terhadapmu advantage.",
  Blinded: "Blinded: tidak bisa melihat; attack-mu disadvantage, serangan terhadapmu advantage.",
  Restrained: "Restrained: speed 0; attack-mu disadvantage, serangan terhadapmu advantage.",
  Unconscious: "Unconscious: incapacitated dan prone; serangan dari dekat critical jika mengenai.",
  Defeated: "Defeated: keluar dari combat.",
};
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
  publishedSceneId?: string;
  shownImage?: string | null;
  ambience?: { url: string; name: string } | null;
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
  const [tokenScreen, setTokenScreen] = useState<string[]>([]);
  const [introReplay, setIntroReplay] = useState(0);
  const [joinCode, setJoinCode] = useState(getRoomId);
  const [mode] = useState<"create">("create");
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
  const [imageOpen, setImageOpen] = useState(true);
  useEffect(() => setImageOpen(true), [room?.shownImage]);
  const [audioMuted, setAudioMuted] = useState(() => localStorage.getItem("meja-audio-muted") === "1");
  const [audioVolume, setAudioVolume] = useState(() => Number(localStorage.getItem("meja-audio-volume") ?? 0.5));
  const ambience = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ambience.current;
    if (!el) return;
    el.volume = audioVolume;
    el.muted = audioMuted;
    // Browsers block autoplay until a user gesture; the catch keeps a silent failure from throwing.
    if (room?.ambience) el.play().catch(() => undefined);
    localStorage.setItem("meja-audio-muted", audioMuted ? "1" : "0");
    localStorage.setItem("meja-audio-volume", String(audioVolume));
  }, [room?.ambience?.url, audioMuted, audioVolume]);
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
  useEffect(() => {
    void fetch('/api/token-screen').then(response => response.ok ? response.json() : null).then(data => setTokenScreen(data?.portraits || []));
  }, []);
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
  const [rollMode, setRollMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  type DiceAnimation = {
    id: string;
    name: string;
    text: string;
    roll: DiceRoll;
    color: number;
    revealed: boolean;
    revealedAt?: number;
  };
  const [diceAnimations, setDiceAnimations] = useState<DiceAnimation[]>([]);
  const [pendingRollIds, setPendingRollIds] = useState<string[]>([]);
  const [coinAnimations, setCoinAnimations] = useState<CoinResult[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rollError, setRollError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const mapInput = useRef<HTMLInputElement>(null);
  const tokenInput = useRef<HTMLInputElement>(null);
  const handoutInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
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
  const copiedToken = useRef<string | null>(null);
  const lastTokenMove = useRef(0);
  const tokenDragStart = useRef<{ x: number; y: number } | null>(null);
  const [movement, setMovement] = useState<{
    id: string;
    a: { x: number; y: number };
    b: { x: number; y: number };
  } | null>(null);
  const [previewTokenId, setPreviewTokenId] = useState<string | null>(null);
  const [combatOrderOpen, setCombatOrderOpen] = useState(true);
  // Panel urutan combat bisa diseret lewat judulnya. Posisinya diingat per browser.
  const combatOrderRef = useRef<HTMLElement>(null);
  const combatDrag = useRef<{ pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const combatDragged = useRef(false);
  const [combatOrderPos, setCombatOrderPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("meja-combat-order-pos") || "null");
      return saved && typeof saved.x === "number" && typeof saved.y === "number" ? saved : null;
    } catch {
      return null;
    }
  });
  const clampCombatOrder = (x: number, y: number) => {
    const panel = combatOrderRef.current;
    const area = panel?.offsetParent as HTMLElement | null;
    if (!panel || !area) return { x, y };
    return {
      x: Math.round(Math.max(0, Math.min(x, area.clientWidth - panel.offsetWidth))),
      y: Math.round(Math.max(0, Math.min(y, area.clientHeight - panel.offsetHeight))),
    };
  };
  useEffect(() => {
    if (!combatOrderPos) return;
    const keepInside = () => setCombatOrderPos((pos) => (pos ? clampCombatOrder(pos.x, pos.y) : pos));
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, [!!combatOrderPos]);
  function startCombatDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !combatOrderRef.current) return;
    const rect = combatOrderRef.current.getBoundingClientRect();
    combatDrag.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveCombatDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = combatDrag.current;
    const area = combatOrderRef.current?.offsetParent as HTMLElement | null;
    if (!drag || drag.pointerId !== event.pointerId || !area) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
    drag.moved = true;
    const box = area.getBoundingClientRect();
    setCombatOrderPos(clampCombatOrder(event.clientX - box.left - drag.offsetX, event.clientY - box.top - drag.offsetY));
  }
  function endCombatDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = combatDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    combatDrag.current = null;
    combatDragged.current = drag.moved;
    if (drag.moved) {
      setCombatOrderPos((pos) => {
        try { if (pos) localStorage.setItem("meja-combat-order-pos", JSON.stringify(pos)); } catch { /* storage diblokir: posisi hanya bertahan sampai reload */ }
        return pos;
      });
    }
  }
  const activeScene = room?.scenes?.find((s) => s.id === room.activeSceneId);

  const combatants = activeScene?.combat.active
    ? activeScene.combat.ids.map((id) => activeScene.tokens.find((token) => token.id === id)).filter((token): token is Token => !!token)
    : [];
  const combatTurn = activeScene?.combat.turn ?? -1;
  // Tirai transisi saat DM mengganti scene. Tidak muncul saat pertama kali masuk room.
  const [sceneCurtain, setSceneCurtain] = useState<{ id: string; name: string } | null>(null);
  const lastSceneId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = activeScene?.id;
    if (id && lastSceneId.current && lastSceneId.current !== id) setSceneCurtain({ id, name: activeScene?.name || "" });
    lastSceneId.current = id;
  }, [activeScene?.id]);
  const nextCombatant = combatants.length > 1 ? combatants[(combatTurn + 1) % combatants.length] : undefined;
  const displayMap = activeScene?.map;
  const columns = activeScene?.grid.columns ?? 20;
  const selectedToken = room?.tokens.find((token) => token.id === selected);
  const canEditSelected = selectedToken && (isDM || selectedToken.ownerId === identity?.playerId);
  useEffect(() => {
    setSelected(null);
    setPan({ x: 0, y: 0 });
    setMovement(null);
    dragging.current = null;
    copiedToken.current = null;
  }, [room?.activeSceneId]);
  // One floating panel at a time: announce ours, close ours when another opens.
  useEffect(() => {
    if (toolsOpen || diceOpen) window.dispatchEvent(new Event("tabletop:popover-open"));
  }, [toolsOpen, diceOpen]);
  useEffect(() => {
    const close = () => { setToolsOpen(false); setDiceOpen(false); };
    for (const name of ["tabletop:tools-open", "tabletop:quick-open", "tabletop:pages-open"]) window.addEventListener(name, close);
    return () => { for (const name of ["tabletop:tools-open", "tabletop:quick-open", "tabletop:pages-open"]) window.removeEventListener(name, close); };
  }, []);
  useEffect(() => {
    // Plain-key rail shortcuts; R/P are owned by BoardTools.
    const hotkeys = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement)?.closest("input,textarea,select,[contenteditable]")) return;
      const key = event.key.toLowerCase();
      if (key === "v") setMapTool("select");
      else if (key === "h") setMapTool("pan");
      else if (key === "g") setGridVisible((value) => !value);
      else if (key === "d") { setDiceOpen((value) => !value); setToolsOpen(false); }
    };
    window.addEventListener("keydown", hotkeys);
    return () => window.removeEventListener("keydown", hotkeys);
  }, []);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || (event.target as HTMLElement)?.closest("input,textarea,select,[contenteditable]")) return;
      if (event.key.toLowerCase() === "c" && canEditSelected && !selectedToken?.minigame) {
        event.preventDefault();
        copiedToken.current = selectedToken!.id;
      }
      if (event.key.toLowerCase() === "v" && copiedToken.current && socketRef.current) {
        event.preventDefault();
        socketRef.current.timeout(5000).emit("token:duplicate", copiedToken.current, (timeout: Error | null, result?: { error?: string; id?: string }) => {
          if (timeout || result?.error) setError(result?.error || "Token gagal ditempel.");
          else if (result?.id) { copiedToken.current = result.id; setSelected(result.id); }
        });
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [canEditSelected, selectedToken]);
  // Delete / Backspace menghapus token yang dipilih. Tidak aktif saat mengetik atau saat ada dialog terbuka.
  const [removedNotice, setRemovedNotice] = useState<{ name: string; at: number } | null>(null);
  useEffect(() => {
    if (!removedNotice) return;
    const timer = window.setTimeout(() => setRemovedNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [removedNotice]);
  function removeSelectedToken() {
    if (!selectedToken || !canEditSelected || !socketRef.current) return;
    socketRef.current.emit("token:remove", selectedToken.id);
    setSelected(null);
    if (!selectedToken.minigame) setRemovedNotice({ name: selectedToken.name, at: Date.now() });
  }
  useEffect(() => {
    const onDelete = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement)?.closest("input,textarea,select,[contenteditable]")) return;
      if (document.querySelector("dialog[open]")) return;
      if (!selectedToken || !canEditSelected) return;
      event.preventDefault();
      if (selectedToken.minigame) { setError("Token minigame dihapus lewat menu Minigame, karena ronde permainannya ikut terhapus."); return; }
      removeSelectedToken();
    };
    window.addEventListener("keydown", onDelete);
    return () => window.removeEventListener("keydown", onDelete);
  }, [canEditSelected, selectedToken]);

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
    const rollTimers = new Set<number>();
    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on(
      "dice:animation",
      (animation: {
        id: string;
        name: string;
        text: string;
        roll: DiceRoll;
        color: number;
      }) => {
        setDiceAnimations((current) => [...current, { ...animation, revealed: false }].slice(-8));
        if (localStorage.getItem("meja-dice-animation") !== "off") {
          setPendingRollIds((current) => [...current, animation.id]);
          const timer = window.setTimeout(() => {
            setPendingRollIds((current) => current.filter(id => id !== animation.id));
            rollTimers.delete(timer);
          }, 2500);
          rollTimers.add(timer);
        }
      },
    );
    socket.on('coin:animation', (result: CoinResult) => setCoinAnimations(current => [...current, result].slice(-4)));
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
    socket.on("token:moved", ({ id, x, y }: { id: string; x: number; y: number }) =>
      setRoom((current) =>
        current
          ? {
              ...current,
              tokens: current.tokens.map((token) =>
                token.id === id ? { ...token, x, y } : token,
              ),
              scenes: current.scenes?.map((scene) => ({
                ...scene,
                tokens: scene.tokens.map((token) =>
                  token.id === id ? { ...token, x, y } : token,
                ),
              })),
            }
          : current,
      ),
    );
    return () => {
      rollTimers.forEach(window.clearTimeout);
      setPendingRollIds([]);
      socket.disconnect();
      socketRef.current = null;
      setDiceAnimations([]);
      setCoinAnimations([]);
      setRolling(false);
      setConnected(false);
    };
  }, [roomId, identity]);

  useEffect(() => {
    const active = diceAnimations.filter((animation) => animation.revealed);
    if (!active.length) return;
    const expiresAt = Math.min(...active.map((animation) => animation.revealedAt! + 2000));
    const timer = window.setTimeout(() => {
      setDiceAnimations((current) => current.filter((animation) => !animation.revealed || animation.revealedAt! + 2000 > Date.now()));
    }, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [diceAnimations]);

  function finishAnimation(id: string) {
    setDiceAnimations((current) => current.filter((animation) => animation.id !== id));
  }

  function throwDice(sides: number | 'coin') {
    if (!socketRef.current || rolling) return;
    setDiceOpen(false);
    setRolling(true);
    setRollError("");
    socketRef.current
      .timeout(15000)
      .emit(
        "dice:roll",
        { expression: sides === 'coin' ? 'coin' : `${rollMode === "normal" || sides !== 20 ? 1 : 2}d${sides}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""}`, mode: sides === 20 ? rollMode : "normal" },
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
  }, [room?.messages.at(-1)?.id, pendingRollIds]);
  useEffect(() => {
    if (!displayMap) return;
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
    image.src = displayMap;
    return () => {
      active = false;
    };
  }, [displayMap, isDM, activeScene?.id]);
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
    if (!board || !displayMap) return;
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
  }, [displayMap]);
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
      const response = await fetch("/api/hero-lobby", { method: "POST" });
      if (!response.ok) throw new Error((await response.json()).error || "Game sudah dimulai.");
      const created = await response.json();
      const id = created.id;
      const enteredName = name.trim().slice(0, 24);
      const saved = readIdentity(id);
      const who = saved?.name.toLowerCase() === enteredName.toLowerCase()
        ? saved
        : {
            name: enteredName,
            playerId: randomId(),
            playerSecret: randomId(),
            ...(created.dmKey ? { dmKey: created.dmKey } : {}),
          };
      localStorage.setItem(identityKey(id), JSON.stringify(who));
      navigate(id, who);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  async function resetSession() {
    if (prompt("Ketik RESET untuk menghapus campaign dan membuka klaim DM baru:") !== "RESET") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hero-lobby/reset", { method: "POST" });
      if (!response.ok) throw new Error("Session gagal di-reset.");
      localStorage.removeItem(identityKey("AGEOFHEROES"));
      setError("Session di-reset. Orang berikutnya yang START GAME menjadi DM.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Session gagal di-reset.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAudio(file?: File) {
    if (!file || !identity) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", file);
      const response = await fetch(`/api/rooms/${roomId}/audio`, { method: "POST", headers: { "x-player-id": identity.playerId, "x-player-secret": identity.playerSecret, "x-dm-key": identity.dmKey || "" }, body: form });
      if (!response.ok) throw new Error((await response.json()).error || "Upload audio gagal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload audio gagal.");
    } finally {
      setUploading(false);
      if (audioInput.current) audioInput.current.value = "";
    }
  }

  async function upload(kind: "map" | "token" | "handout", file?: File, extra?: { name?: string; characterId?: string }) {
    if (!file || !identity) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      setError("Gunakan gambar PNG, JPG, WebP, atau GIF.");
      return;
    }
    if (kind === "token" && file.size > 10 * 1024 * 1024) {
      setError("Gambar token maksimal 10 MB.");
      return;
    }
    const tokenName =
      kind === "token"
        ? extra?.name ?? prompt("Nama token:", file.name.replace(/\.[^.]+$/, "").slice(0, 32))
        : null;
    if (kind === "token" && tokenName === null) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      if (tokenName) form.append("name", tokenName);
      if (extra?.characterId) form.append("characterId", extra.characterId);
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
      if (handoutInput.current) handoutInput.current.value = "";
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
    if (!isDM && original && activeScene && blocksMovement(original, { x, y }, activeScene.marks)) return;
    const now = performance.now();
    if (now - lastTokenMove.current >= 50) {
      lastTokenMove.current = now;
      socketRef.current?.emit("token:move", { id: dragging.current, x, y, final: false });
    }
    if (original)
      setMovement((current) => ({
        id: dragging.current!,
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
            scenes: current.scenes?.map((scene) => ({
              ...scene,
              tokens: scene.tokens.map((t) =>
                t.id === dragging.current ? { ...t, x, y } : t,
              ),
            })),
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
    const destination = tokenPosition(event);
    const token = room?.tokens.find((item) => item.id === dragging.current);
    const blockedMove = !isDM && token && activeScene && blocksMovement(token, destination, activeScene.marks);
    socketRef.current?.emit("token:move", {
      id: dragging.current,
      ...(blockedMove ? { x: token.x, y: token.y } : destination),
      final: true,
    });
    dragging.current = null;
    tokenDragStart.current = null;
  }

  function changeZoom(next: number, clientX?: number, clientY?: number) {
    const clamped = Math.max(0.5, Math.min(8, Math.round(next * 100) / 100));
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
    if (event.button !== 0) return;
    if (event.target !== event.currentTarget && mapTool !== "pan") return;
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

  const mapRatio = mapSize.width / mapSize.height;
  const mapScale = activeScene?.mapScale ?? 1;
  const canvasWidth = Math.min(
    (viewportSize.width || 1200) * 0.92,
    (viewportSize.height || 800) * 0.92 * mapRatio,
  ) * mapScale;
  const canvasHeight = canvasWidth / mapRatio;

  if (!roomId || !identity)
    return (
      <main className="game-start">
        <div className="game-start-background-party" aria-hidden="true">
          {tokenScreen.map((src, index) => <img key={src} src={src} alt="" className={`hero-background hero-background-${index + 1}`} />)}
        </div>
        <IntroSplash portraits={tokenScreen} replay={introReplay} />
        <section className="game-start-card">
          <div className="game-start-heading">
            <div className="game-start-kicker">ONE SHOT</div>
            <h1>THE AGE<br /><em>OF HEROES</em></h1>
            <p>ENTER THE ADVENTURE</p>
          </div>
          <div className="game-start-entry">
            <label>
              PLAYER NAME
              <input maxLength={24} placeholder="Masukkan namamu" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="submit-button game-start-button" disabled={busy} onClick={() => void enter()}>
              {busy ? "STARTING…" : "START GAME"} <ArrowRight size={18} />
            </button>
            <button className="game-start-reset" disabled={busy} onClick={() => void resetSession()}>
              RESET SESSION / CLAIM DM AGAIN
            </button>
            {tokenScreen.length === 4 && (
              <button type="button" className="intro-replay" onClick={() => setIntroReplay(n => n + 1)}>
                LIHAT INTRO KARAKTER
              </button>
            )}
          </div>
          {error && <div className="form-error">{error}</div>}
        </section>
      </main>
    );

  return (
    <div className="app-shell">
      <div className="session-toolbar" role="region" aria-label="Kontrol sesi">
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
            uploadToken={(file, name, characterId) => upload("token", file, { name, characterId })}
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
      {activeScene && (
        <Suspense fallback={null}>
          <Minigames games={room?.minigames || []} socket={socketRef.current} dm={isDM} playerId={identity.playerId} members={room?.members || []} connected={connected} openToken={openMinigame} onClose={() => setOpenMinigame(null)} onOpen={setOpenMinigame} />
        </Suspense>
      )}
      </div>
      {coinAnimations.length > 0 && boardRef.current && createPortal(
        <div className="coin-animation-layer">{coinAnimations.map(result => <CoinFlip key={result.id} result={result} onComplete={() => setCoinAnimations(current => current.filter(item => item.id !== result.id))} />)}</div>, boardRef.current
      )}
      {diceAnimations.length > 0 && boardRef.current && createPortal(
        <div className="dice-animation">
          {diceAnimations.map((animation) => (
            <div className={`dice-animation-card ${animation.revealed ? "revealed" : ""}`} key={animation.id}>
              <div className="dice-animation-heading">
                <span>{animation.name} melempar d{animation.roll.sides}</span>
                {animation.revealed && <button onClick={() => finishAnimation(animation.id)} aria-label="Tutup hasil dadu"><X size={20} /></button>}
              </div>
              {createPortal(<div className="map-dice-layer"><DiceScene
                zoom={zoom}
                key={animation.id}
                roll={animation.roll}
                color={animation.color}
                onComplete={() => setDiceAnimations((current) => current.map((item) => item.id === animation.id ? { ...item, revealed: true, revealedAt: item.revealedAt ?? Date.now() } : item))}
              /></div>, mapRef.current || boardRef.current!)}
              {animation.revealed && diceEffects && <Suspense fallback={null}>
                <NaturalRollEffect rollId={animation.id} sides={animation.roll.sides} values={animation.roll.values} />
              </Suspense>}
              {animation.revealed && <div className="dice-outcome" role="status" aria-live="polite"><span>Hasil lemparan</span><strong>{animation.roll.total}</strong><p>{animation.text}</p></div>}
            </div>
          ))}
        </div>, boardRef.current
      )}
      <div className={`workspace ${panelOpen ? "panel-visible" : ""}`}>
        {room?.shownImage && imageOpen && (
          <div className="player-image-overlay" role="dialog" aria-modal="true" aria-label="Gambar dari DM" onClick={() => setImageOpen(false)}>
            <img src={room.shownImage} alt="Gambar yang ditampilkan DM" onClick={(event) => event.stopPropagation()} />
            {isDM && <button type="button" onClick={(event) => { event.stopPropagation(); socketRef.current?.emit("tabletop:action", { type: "image:hide", sceneId: activeScene?.id }); }}>Tutup untuk semua</button>}
          </div>
        )}
        <nav className="tabletop-rail" aria-label="Alat meja">
          <button
            className="rail-menu"
            title="Keluar ke beranda"
            onClick={() => navigate("", null)}
          >
            <ArrowLeft size={19} /><span className="rail-label">Keluar</span>
          </button>
          <div className="rail-separator" />
          <button
            className={`rail-mode${mapTool === "select" ? " active" : ""}`}
            aria-pressed={mapTool === "select"}
            title="Pilih dan geser token (V)"
            onClick={() => setMapTool("select")}
          >
            <MousePointer2 size={21} /><span className="rail-label">Pilih</span>
          </button>
          <button
            className={`rail-mode${mapTool === "pan" ? " active" : ""}`}
            aria-pressed={mapTool === "pan"}
            title="Geser peta (H)"
            onClick={() => setMapTool("pan")}
          >
            <Hand size={20} /><span className="rail-label">Geser</span>
          </button>
          <div className="rail-caption">ALAT</div>
          <div id="player-tools-slot" />
          <button
            className={`rail-toggle${gridVisible ? " active" : ""}`}
            aria-pressed={gridVisible}
            title="Tampilkan atau sembunyikan grid (G)"
            onClick={() => setGridVisible((value) => !value)}
          >
            <Grid2X2 size={20} /><span className="rail-label">Grid</span>
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
            <ImagePlus size={20} /><span className="rail-label">Token</span>
          </button>
          <button
            className={diceOpen ? "active" : ""}
            aria-expanded={diceOpen}
            title="Lempar dadu (D)"
            onClick={() => {
              setDiceOpen((value) => !value);
              setToolsOpen(false);
            }}
          >
            <Dice5 size={20} /><span className="rail-label">Dadu</span>
          </button>
          <div className="rail-spacer" />
          <div className="rail-caption">RUANG</div>
          <button
            title="Chat"
            className={panelOpen && sidebar === "chat" ? "active" : ""}
            onClick={() => {
              setSidebar("chat");
              setPanelOpen(true);
              setToolsOpen(false);
              setDiceOpen(false);
              window.dispatchEvent(new Event("tabletop:popover-open"));
            }}
          >
            <MessageCircle size={20} /><span className="rail-label">Chat</span>
          </button>
          <button
            title="Party"
            className={panelOpen && sidebar === "players" ? "active" : ""}
            onClick={() => {
              setSidebar("players");
              setPanelOpen(true);
              setToolsOpen(false);
              setDiceOpen(false);
              window.dispatchEvent(new Event("tabletop:popover-open"));
            }}
          >
            <Users size={20} /><span className="rail-label">Party</span>
          </button>
        </nav>
        <main className="stage">
          <div
            className="map-viewport"
            ref={boardRef}
            onPointerDown={startPan}
            onPointerMove={panMove}
            onPointerUp={stopPan}
            onPointerCancel={stopPan}
          >
            {displayMap ? (
              <div
                className="map-canvas"
                ref={mapRef}
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                  backgroundImage: `url("${displayMap}")`,
                }}
                onPointerDown={(e) => {
                  if (e.target !== e.currentTarget || e.button !== 0) return;
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
                {activeScene?.weather && <div className={`weather weather-${activeScene.weather}`} aria-hidden="true"><i /><i /></div>}
                {room?.tokens.map((token) => (
                  <button
                    key={token.id}
                    className={`map-token ${selected === token.id ? "selected" : ""} ${dragging.current === token.id ? "dragging" : ""} ${activeScene?.combat.active && activeScene.combat.ids[activeScene.combat.turn] === token.id ? "combat-active" : ""}`}
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
                    {token.minigame ? <div className="minigame-token-mark" aria-hidden="true">{isDM ? gameCatalog[token.minigame].mark : '?'}</div> : <img src={token.image} alt={token.name} loading="lazy" decoding="async" />}
                    {isDM && !!token.maxHp && <div className="token-hp-bar" aria-label={`HP ${token.name}: ${token.hp ?? 0}/${token.maxHp}`}><i style={{ width: `${Math.max(0, Math.min(100, ((token.hp ?? 0) / token.maxHp) * 100))}%` }} /></div>}
                    {isDM && token.ac !== undefined && <b className="token-ac" title={`AC ${token.ac}`} style={{ transform: `scale(${1 / zoom})` }}>{token.ac}</b>}
                    {token.dead && <svg className="token-dead-mark" viewBox="0 0 100 100" role="img" aria-label={`${token.name}: Dead`}><path d="M 18 18 L 82 82 M 82 18 L 18 82" /></svg>}
                    {!!token.conditions?.length && <div className="token-conditions" aria-label={`Kondisi ${token.name}: ${token.conditions.join(', ')}`}>{token.conditions.map((condition) => <b key={condition} title={conditionDescriptions[condition] || condition}>{condition[0]}</b>) }</div>}
                    <span style={{ transform: `translateX(-50%) scale(${1 / zoom})` }}>
                      {token.name}
                      {token.hidden ? " · DM saja" : ""}
                    </span>
                  </button>
                ))}
                {movement && activeScene && (() => {
                  const movedToken = activeScene.tokens.find((token) => token.id === movement.id);
                  const moved = distance(movement.a, movement.b, activeScene.grid);
                  const speedFt = movedToken?.characterId ? room?.characters?.find((character) => character.id === movedToken.characterId)?.sheet.speed : undefined;
                  const speed = speedFt === undefined ? undefined : activeScene.grid.unit === "m" ? speedFt * 0.3048 : speedFt;
                  const overSpeed = speed !== undefined && moved > speed;
                  return <svg className="token-movement" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
                    <line x1={(movement.a.x / 100) * canvasWidth} y1={(movement.a.y / 100) * canvasHeight} x2={(movement.b.x / 100) * canvasWidth} y2={(movement.b.y / 100) * canvasHeight} className={overSpeed ? "over-speed" : ""} />
                    <text x={(movement.b.x / 100) * canvasWidth} y={(movement.b.y / 100) * canvasHeight - 12} className={overSpeed ? "over-speed" : ""}>{moved.toFixed(1)} {activeScene.grid.unit}{overSpeed ? ` / maks. ${speed?.toFixed(1)} ${activeScene.grid.unit}` : ""}</text>
                  </svg>;
                })()}
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
            {sceneCurtain && (
              <div
                key={sceneCurtain.id}
                className="scene-curtain"
                role="status"
                onAnimationEnd={(event) => { if (event.animationName === "scene-curtain") setSceneCurtain(null); }}
              >
                <span>Change Map</span>
                {sceneCurtain.name && <strong>{sceneCurtain.name}</strong>}
              </div>
            )}
          </div>
          {!!combatants.length && <section ref={combatOrderRef} className={`combat-order ${combatOrderOpen ? '' : 'collapsed'} ${combatOrderPos ? 'moved' : ''}`} style={combatOrderPos ? { left: combatOrderPos.x, top: combatOrderPos.y } : undefined} aria-label={`Urutan combat ronde ${activeScene?.combat.round}`}>
            <button className="combat-order-handle" aria-expanded={combatOrderOpen} title="Seret untuk memindahkan, klik untuk menciutkan" onPointerDown={startCombatDrag} onPointerMove={moveCombatDrag} onPointerUp={endCombatDrag} onPointerCancel={endCombatDrag} onDoubleClick={() => { setCombatOrderPos(null); try { localStorage.removeItem("meja-combat-order-pos"); } catch { /* abaikan */ } }} onClick={() => { if (combatDragged.current) { combatDragged.current = false; return; } setCombatOrderOpen((open) => !open); }}><em className="combat-round-label"><GripVertical size={12} aria-hidden="true" />RONDE <b key={activeScene?.combat.round} className="combat-round-number">{activeScene?.combat.round}</b></em> <span>{combatOrderOpen ? '−' : '+'}</span></button>
            {combatOrderOpen && <><ol className="combat-turn-track" style={{ ["--count" as string]: combatants.length, ["--turn" as string]: Math.max(combatTurn, 0) }}>{combatants.map((token, index) => <li key={token.id} className={index === combatTurn ? 'current' : ''}>{index + 1}. {token.name}</li>)}</ol>{nextCombatant && <small>Berikutnya: {nextCombatant.name}</small>}</>}
          </section>}
          {activeScene && (
            <Suspense fallback={null}>
              <BoardTools
                scene={activeScene}
                publishedSceneId={room?.publishedSceneId}
                scenes={room?.scenes || []}
                socket={socketRef.current}
                dm={isDM}
                previewTokenId={previewTokenId}
                onPreviewToken={setPreviewTokenId}
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
            </Suspense>
          )}
          <div className="map-controls">
            <button
              title="Perbesar peta"
              disabled={!room?.map || zoom >= 8}
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
              max="800"
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
                {isDM && (
                  <button onClick={() => audioInput.current?.click()} disabled={uploading || !connected}>
                    <Plus size={18} />
                    Putar audio latar (MP3/OGG/WAV)
                  </button>
                )}
                {isDM && room?.ambience && (
                  <button onClick={() => socketRef.current?.emit("tabletop:action", { type: "audio:stop", sceneId: activeScene?.id })}>
                    Hentikan: {room.ambience.name}
                  </button>
                )}
                {room?.ambience && (
                  <label className="ambience-volume">
                    <button type="button" onClick={() => setAudioMuted((v) => !v)}>{audioMuted ? "Bunyikan" : "Bisukan"}</button>
                    <input type="range" min={0} max={1} step={0.05} value={audioVolume} aria-label="Volume audio latar" onChange={(e) => setAudioVolume(Number(e.target.value))} />
                  </label>
                )}
                {isDM && (
                  <button onClick={() => handoutInput.current?.click()} disabled={uploading || !connected}>
                    <Plus size={18} />
                    Unggah &amp; tampilkan gambar
                  </button>
                )}
                {isDM && (
                  <button
                    disabled={!connected || !(selectedToken?.image || activeScene?.map)}
                    onClick={() => socketRef.current?.timeout(5000).emit("tabletop:action", { type: "image:show", sceneId: activeScene?.id, url: selectedToken?.image || activeScene?.map }, (timeout: Error | null, result?: { error?: string }) => { if (timeout || result?.error) setError(result?.error || "Gambar gagal ditampilkan."); })}
                  >
                    Tampilkan ke pemain
                  </button>
                )}
                {canEditSelected && (
                  <button
                    className="remove-action"
                    title="Hapus token (Delete)"
                    onClick={removeSelectedToken}
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
              {isDM && <button disabled={!connected} aria-pressed={!!selectedToken.dead} onClick={() => {
                socketRef.current?.timeout(5000).emit('tabletop:action', { type: 'token:update', sceneId: activeScene?.id, id: selectedToken.id, dead: !selectedToken.dead }, (timeout: Error | null, result?: { error?: string }) => {
                  if (timeout || result?.error) setError(result?.error || 'Status Dead gagal diperbarui.');
                });
              }}>{selectedToken.dead ? 'Batalkan Dead' : 'Dead'}</button>}
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
              <div className="dice-tray dice-tray-v2">
                <p className="dice-tray-status">{rolling ? "Menyiapkan lemparan…" : "Pilih dadu untuk dilempar"}</p>
                <div className="dice-grid">
                  {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                    <button
                      key={sides}
                      type="button"
                      className={`die-btn d${sides}`}
                      disabled={!connected || rolling}
                      onClick={() => throwDice(sides)}
                      aria-label={`Lempar d${sides}`}
                    >
                      <DieIcon sides={sides} />
                      <span>d{sides}</span>
                    </button>
                  ))}
                  <button type="button" className="die-btn coin" disabled={!connected || rolling} onClick={() => throwDice('coin')} aria-label="Lempar koin">
                    <DieIcon sides={0} />
                    <span>Koin</span>
                  </button>
                </div>
                <div className="dice-option">
                  <span>Mode d20</span>
                  <div className="dice-mode" role="radiogroup" aria-label="Mode d20">
                    {([["normal", "Normal"], ["advantage", "Advantage"], ["disadvantage", "Disadvantage"]] as const).map(([value, label]) => (
                      <button key={value} type="button" role="radio" aria-checked={rollMode === value} onClick={() => setRollMode(value)}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="dice-option">
                  <span>Modifier</span>
                  <div className="dice-stepper">
                    <button type="button" aria-label="Kurangi modifier" onClick={() => setModifier((m) => Math.max(-99, m - 1))}><Minus size={15} /></button>
                    <input
                      type="number"
                      aria-label="Modifier"
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
                    <button type="button" aria-label="Tambah modifier" onClick={() => setModifier((m) => Math.min(99, m + 1))}><Plus size={15} /></button>
                  </div>
                </div>
                <label className="dice-effects-setting dice-effects-inline">
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
                  Animasi dadu 3D
                </label>
                {rollError && <p role="alert">{rollError}</p>}
              </div>
            </div>
          )}
          {removedNotice && (
            <div className="toast-removed" role="status" key={removedNotice.at}>
              <span>Token <b>{removedNotice.name}</b> dihapus.</span>
              {isDM && (
                <button
                  type="button"
                  onClick={() => {
                    socketRef.current?.timeout(5000).emit("campaign:undo", (timeout: Error | null, result?: { error?: string }) => {
                      if (timeout || result?.error) setError(result?.error || "Undo gagal.");
                    });
                    setRemovedNotice(null);
                  }}
                >
                  Batalkan
                </button>
              )}
              <button type="button" className="toast-close" aria-label="Tutup" onClick={() => setRemovedNotice(null)}><X size={14} /></button>
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
                {!room?.messages.length && <div className="chat-intro">
                  <div className="chat-intro-icon">
                    <Sparkles size={21} />
                  </div>
                  <strong>Petualangan dimulai!</strong>
                  <p>
                    Setiap cerita punya awal. Sapa party-mu dan mulai
                    petualangan bersama.
                  </p>
                </div>}
                {room?.messages.filter((message) => !pendingRollIds.includes(message.id)).map((message) => (
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
        ref={audioInput}
        type="file"
        accept="audio/mpeg,audio/ogg,audio/wav"
        hidden
        onChange={(e) => void uploadAudio(e.target.files?.[0])}
      />
      {room?.ambience && <audio ref={ambience} src={room.ambience.url} loop preload="auto" />}
      <input
        ref={handoutInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => void upload("handout", e.target.files?.[0])}
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
