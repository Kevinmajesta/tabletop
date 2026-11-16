import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Socket } from "socket.io-client";
import {
  MousePointer2,
  Ruler,
  MapPin,
  Circle,
  Triangle,
  Square,
  Minus,
  Type,
  BrickWall,
  DoorOpen,
  SquareDashedBottom,
  Lamp,
  Scan,
  SlidersHorizontal,
  X,
  Layers,
  Swords,
  UserRound,
  Trash2,
  ChevronDown,
  BookOpen,
  Pencil,
} from "lucide-react";
import {
  conditions,
  distance,
  type Scene,
  type Point,
  type Mark,
} from "../server/tabletop";
import { monsters, type Monster } from "../server/monsters";
import "./monster-sheet.css";
const Bestiary = lazy(() => import("./Bestiary"));
import LightCone from "./LightCone";
import { polygonPath, sightPolygon, wallSegments } from "../server/lighting";
import "./board-tools.css";
import "./dm-menu.css";

type Tool = "select" | "ruler" | "ping" | Mark["kind"];
type Ping = Point & {
  id: string;
  sceneId: string;
  name: string;
  focus: boolean;
};
type Pointer = Point & { playerId: string; name: string };
type Props = {
  scene: Scene;
  scenes: Scene[];
  publishedSceneId?: string;
  // Split party: pemain (bukan DM) dan scene tujuan masing-masing.
  players?: { id: string; name: string; online: boolean }[];
  playerScenes?: Record<string, string>;
  socket: Socket | null;
  dm: boolean;
  previewTokenId?: string | null;
  onPreviewToken: (id: string | null) => void;
  playerId: string;
  selected?: string | null;
  connected: boolean;
  width: number;
  height: number;
  onFocus: (point: Point) => void;
};
const labels: [Tool, string][] = [
  ["select", "Token"],
  ["ruler", "Penggaris"],
  ["ping", "Ping"],
  ["circle", "Lingkaran"],
  ["cone", "Cone"],
  ["rect", "Kotak"],
  ["line", "Garis"],
  ["draw", "Pensil"],
  ["text", "Teks"],
  ["wall", "Dinding"],
  ["door", "Pintu"],
  ["window", "Jendela"],
  ["light", "Cahaya"],
  ["reveal", "Buka fog"],
];
const toolIcons = {
  select: MousePointer2,
  ruler: Ruler,
  ping: MapPin,
  circle: Circle,
  cone: Triangle,
  rect: Square,
  line: Minus,
  draw: Pencil,
  text: Type,
  wall: BrickWall,
  door: DoorOpen,
  window: SquareDashedBottom,
  light: Lamp,
  reveal: Scan,
};
const tabIcons = {
  tools: SlidersHorizontal,
  scene: Layers,
  combat: Swords,
  token: UserRound,
};
const penColors = ["#f3d49a", "#ff6b5e", "#6fcf86", "#62b6ff", "#ffffff", "#1b1b1b"];
const toolGroups: { name: string; description: string; ids: Tool[] }[] = [
  {
    name: "Navigasi",
    description: "Pilih, ukur, dan tunjuk lokasi.",
    ids: ["select", "ruler", "ping"],
  },
  {
    name: "Area & catatan",
    description: "Template spell, gambar bebas, dan penanda peta.",
    ids: ["draw", "circle", "cone", "rect", "line", "text"],
  },
  {
    name: "Visibilitas DM",
    description: "Atur pandangan dan area terbuka.",
    ids: ["wall", "door", "window", "light", "reveal"],
  },
];

// Tepi cahaya/vision: penuh sampai 50% jangkauan, lalu turun mengikuti kurva smootherstep dengan banyak titik
// supaya tidak ada garis-garis (Mach band) di sambungan titik gradien.
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lightFade: [number, number][] = [[0, 1], ...Array.from({ length: 25 }, (_, i): [number, number] => { const t = i / 24; return [Number((0.5 + 0.5 * t).toFixed(4)), Number((1 - smoother(t)).toFixed(4))]; })];
// Sisi kerucut: lapisan juring tipis tiap CONE_STEP derajat; opasitas tiap lapisan dihitung supaya gabungannya
// mengikuti kurva yang sama (dari terang di tepi inti ke 0 di lapisan terluar).
const CONE_STEP = 1.25, CONE_LAYERS = 12;
const coneFade = (() => {
  const target = (k: number) => 1 - smoother(k / (CONE_LAYERS + 1)); // cakupan yang diinginkan di pita ke-k (1..N)
  const out: number[] = [];
  for (let k = CONE_LAYERS; k >= 1; k--) out[k - 1] = 1 - (1 - target(k)) / (1 - (k === CONE_LAYERS ? 0 : target(k + 1)));
  return out;
})();
// Tekstur noise kecil (dibuat sekali) untuk dither di atas lapisan gelap.
let ditherCache: string | null | undefined;
function makeDither() {
  if (ditherCache !== undefined) return ditherCache;
  try {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"); if (!g) return (ditherCache = null);
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() < 0.5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 6; }
    g.putImageData(img, 0, 0);
    return (ditherCache = c.toDataURL());
  } catch { return (ditherCache = null); }
}

export default function BoardTools({
  scene,
  scenes,
  publishedSceneId,
  players = [],
  playerScenes = {},
  socket,
  dm,
  previewTokenId,
  onPreviewToken,
  playerId,
  selected,
  connected,
  width,
  height,
  onFocus,
}: Props) {
  const [tool, setTool] = useState<Tool>("select");
  const [open, setOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [sendPick, setSendPick] = useState<string[]>([]);
  const sceneOfPlayer = (id: string) => playerScenes[id] || publishedSceneId;
  const playersIn = (sceneId: string) => players.filter((pl) => sceneOfPlayer(pl.id) === sceneId);
  const pagesToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const toggle = () => { if (dm) { setPagesOpen(value => !value); setOpen(false); } };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pagesOpen) { setPagesOpen(false); pagesToggle.current?.focus(); }
    };
    window.addEventListener("tabletop:pages-menu", toggle);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("tabletop:pages-menu", toggle); window.removeEventListener("keydown", close); };
  }, [dm, pagesOpen]);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("tabletop:quick-open", close);
    return () => window.removeEventListener("tabletop:quick-open", close);
  }, []);
  useEffect(() => {
    if (open) window.dispatchEvent(new Event("tabletop:tools-open"));
  }, [open]);
  useEffect(() => {
    if (pagesOpen) window.dispatchEvent(new Event("tabletop:pages-open"));
  }, [pagesOpen]);
  useEffect(() => {
    const close = () => { setOpen(false); setPagesOpen(false); };
    window.addEventListener("tabletop:popover-open", close);
    return () => window.removeEventListener("tabletop:popover-open", close);
  }, []);
  const [dmMenu, setDmMenu] = useState(false);
  const [tokenId, setTokenId] = useState<string | null>(selected ?? null);
  const [monsterKey, setMonsterKey] = useState(monsters[0].key);
  const [monsterCount, setMonsterCount] = useState(1);
  const [monsterHidden, setMonsterHidden] = useState(false);
  // Buku monster (Bestiary): dimuat lazy saat dibuka.
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  const pickedMonster = monsters.find((m) => m.key === monsterKey);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  useEffect(() => { const toggle = () => { if(!dm)return;setDmMenu(true); setTab('scene'); setOpen(true); }; window.addEventListener('tabletop:dm-menu',toggle); return () => window.removeEventListener('tabletop:dm-menu',toggle); }, [dm]);
  useEffect(() => setSelectedMarkId(null), [scene.id]);
  function selectMark(event: React.PointerEvent<SVGElement>, id: string) {
    if (tool !== "select") return;
    event.stopPropagation();
    setSelectedMarkId(id);
  }
  const [tab, setTab] = useState<"tools" | "scene" | "combat" | "token">(
    "tools",
  );
  const [draft, setDraft] = useState<{ a: Point; b: Point } | null>(null);
  // Goresan pensil yang sedang digambar (persen peta) dan warnanya.
  const [stroke, setStroke] = useState<Point[] | null>(null);
  const [penColor, setPenColor] = useState(penColors[0]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [pointers, setPointers] = useState<Record<string, Pointer>>({});
  const [error, setError] = useState("");
  const pointerThrottle = useRef(0);
  const [localPointer, setLocalPointer] = useState<Point | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [waypoints, setWaypoints] = useState<Point[]>([]);
  const [sharedRulers, setSharedRulers] = useState<
    Record<string, { points: Point[]; name: string }>
  >({});
  const [broadcastRuler, setBroadcastRuler] = useState(true);
  const rulerThrottle = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const focus = useRef(onFocus);
  focus.current = onFocus;
  useEffect(() => { if (selected) setTokenId(selected); }, [selected]);
  const token = scene.tokens.find((t) => t.id === tokenId);
  const editable = token && (dm || token.ownerId === playerId);
  const sceneRef = useRef(scene.id);
  sceneRef.current = scene.id;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const ruler = (r: { sceneId: string; playerId: string; points: Point[]; name: string }) => {
      if (r.sceneId === sceneRef.current && r.playerId !== playerId) setSharedRulers((current) => ({ ...current, [r.playerId]: { points: r.points, name: r.name } }));
    };
    const ping = (p: Ping) => {
      if (p.sceneId !== sceneRef.current) return;
      setPings((current) => [...current.slice(-9), p]);
      if (p.focus) focus.current(p);
      const timer = setTimeout(() => setPings((current) => current.filter((item) => item.id !== p.id)), 2500);
      timers.current.push(timer);
    };
    const pointer = (p: Pointer & { sceneId: string; active: boolean }) => {
      if (p.sceneId !== sceneRef.current) return;
      setPointers((current) => { if (!p.active) { const { [p.playerId]: _, ...rest } = current; return rest; } return { ...current, [p.playerId]: p }; });
    };
    socket?.on("tabletop:pointer", pointer); socket?.on("tabletop:ping", ping); socket?.on("tabletop:ruler", ruler);
    return () => { socket?.off("tabletop:pointer", pointer); socket?.off("tabletop:ping", ping); socket?.off("tabletop:ruler", ruler); timers.current.forEach(clearTimeout); timers.current = []; };
  }, [socket, playerId]);
  useEffect(() => {
    let active = false;
    let suppressMenu = false;
    const point = (event: PointerEvent) => {
      const rect = svg.current?.getBoundingClientRect();
      if (!connected || !socket || !rect || !rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
      return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
    };
    const stop = () => {
      if (!active) return;
      active = false;
      setLocalPointer(null);
      socket?.emit("tabletop:pointer", { sceneId: scene.id, x: 0, y: 0, active: false });
    };
    const send = (p: Point) => {
      pointerThrottle.current = performance.now();
      socket?.emit("tabletop:pointer", { sceneId: scene.id, ...p, active: true });
    };
    const down = (event: PointerEvent) => {
      suppressMenu = false;
      if (event.button !== 2) return;
      const p = point(event);
      if (!p) return;
      active = true;
      suppressMenu = true;
      event.preventDefault();
      setLocalPointer(p);
      send(p);
    };
    const move = (event: PointerEvent) => {
      if (!active) return;
      const p = point(event);
      if (!(event.buttons & 2) || !p) { stop(); return; }
      setLocalPointer(p);
      if (performance.now() - pointerThrottle.current >= 40) send(p);
    };
    const up = (event: PointerEvent) => { if (event.button === 2) stop(); };
    const menu = (event: MouseEvent) => { if (suppressMenu) event.preventDefault(); };
    window.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("contextmenu", menu);
    window.addEventListener("pointercancel", stop); window.addEventListener("blur", stop);
    return () => {
      stop();
      window.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("contextmenu", menu);
      window.removeEventListener("pointercancel", stop); window.removeEventListener("blur", stop);
    };
  }, [connected, scene.id, socket]);
  useEffect(() => { setDraft(null); setWaypoints([]); setPings([]); setPointers({}); setSharedRulers({}); setTool("select"); }, [scene.id]);
  useEffect(() => {
    if (tool === "ruler" && draft && broadcastRuler && performance.now() - rulerThrottle.current > 200) { socket?.emit("tabletop:ruler", { sceneId: scene.id, points: [draft.a, ...waypoints, draft.b] }); rulerThrottle.current = performance.now(); }
  }, [draft, waypoints, broadcastRuler, tool, scene.id, socket]);
  useEffect(() => { if (tool !== "ruler" || !broadcastRuler) socket?.emit("tabletop:ruler", { sceneId: scene.id, points: [] }); }, [tool, broadcastRuler, scene.id, socket]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      if (event.key === "Escape") {
        setDraft(null);
        setWaypoints([]);
        setSelectedMarkId(null);
        setTool("select");
        setOpen(false);
        socket?.emit("tabletop:ruler", { sceneId: scene.id, points: [] });
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedMarkId) {
        const mark = scene.marks.find((item) => item.id === selectedMarkId);
        if (mark && (dm || mark.ownerId === playerId)) {
          action({ type: "mark:remove", id: selectedMarkId });
          setSelectedMarkId(null);
        }
      }
      if (event.key.toLowerCase() === "r") {
        setOpen(true);
        setTool((current) => (current === "ruler" ? "select" : "ruler"));
      }
      if (event.key.toLowerCase() === "p") {
        setOpen(true);
        setTool("ping");
      }
      if (event.key.toLowerCase() === "f" && draft && tool === "ruler")
        setWaypoints((current) => [...current, draft.b]);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [draft, tool, selectedMarkId, scene.marks, dm, playerId]);
  function action(payload: Record<string, unknown>) {
    if (!connected || !socket) {
      setError("Koneksi terputus. Tunggu tersambung kembali.");
      return;
    }
    setError("");
    socket
      .timeout(5000)
      .emit(
        "tabletop:action",
        {
          ...payload,
          characterRevision: token?.characterRevision,
          sceneId: scene.id,
        },
        (err: Error | null, result?: { error?: string }) => {
          if (err || result?.error)
            setError(
              result?.error ||
                "Perubahan belum terkonfirmasi. Periksa koneksi.",
            );
        },
      );
  }
  // Impor dinding dari file JSON (format "meja-dinding", mis. dari generator labirin). Mengganti dinding lama di scene ini.
  async function importWalls(file: File) {
    let data: { format?: string; name?: string; columns?: number; walls?: unknown[] };
    try { data = JSON.parse(await file.text()); } catch { setError("File dinding tidak bisa dibaca (harus .json)."); return; }
    if (data?.format !== "meja-dinding" || !Array.isArray(data.walls) || !data.walls.length) { setError("Ini bukan file dinding Meja Petualang."); return; }
    const old = scene.marks.filter((m) => m.kind === "wall" || m.kind === "door" || m.kind === "window").length;
    const grid = typeof data.columns === "number" ? ` dan atur grid ke ${data.columns} kolom` : "";
    if (!confirm(`Impor ${data.walls.length} dinding${data.name ? ` "${data.name}"` : ""}${grid}?${old ? ` ${old} dinding/pintu lama di scene ini akan diganti.` : ""} Bisa dibatalkan dengan Undo.`)) return;
    action({ type: "walls:import", walls: data.walls, columns: data.columns, offset: true, replace: true });
  }
  function backup() { if(!socket || !connected)return;socket.timeout(30000).emit('campaign:export',(err:Error|null,result?:{error?:string})=>{if(err || result?.error){setError(result?.error || 'Backup gagal.');return;}const url=URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='campaign-backup.json';a.click();URL.revokeObjectURL(url);}); }
  function point(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
    );
    const y = Math.max(
      0,
      Math.min(100, ((event.clientY - rect.top) / rect.height) * 100),
    );
    if (!["ruler", "circle", "cone", "rect", "line"].includes(tool) || event.altKey) return { x, y };
    const cell = 100 / scene.grid.columns,
      row = (cell * width) / height;
    const snap = (value: number, step: number, offset: number) => {
      const start = Math.floor((value - offset) / step) * step + offset;
      return (Math.max(0, start) + Math.min(100, start + step)) / 2;
    };
    return {
      x: snap(x, cell, ((scene.grid.offsetX ?? 0) / 100) * cell),
      y: snap(y, row, ((scene.grid.offsetY ?? 0) / 100) * row),
    };
  }
  function shape(mark: Pick<Mark, "kind" | "a" | "b" | "text" | "open" | "points">, key: string) {
    const a = { x: (mark.a.x / 100) * width, y: (mark.a.y / 100) * height },
      b = { x: (mark.b.x / 100) * width, y: (mark.b.y / 100) * height };
    if (mark.kind === "wall" && (!dm || previewTokenId)) return null;
    const radius = Math.hypot(b.x - a.x, b.y - a.y);
    const properties = {
      stroke:
        selectedMarkId === key
          ? "#ffffff"
          : mark.kind === "wall"
            ? "#ffc1b4"
            : mark.kind === "door"
              ? mark.open ? "#9fdca6" : "#f1b767"
              : mark.kind === "window"
                ? "#72c7ea"
                : "#f3d49a",
      strokeWidth: selectedMarkId === key ? 4 : 2,
      fill: "#d6ae7030",
      vectorEffect: "non-scaling-stroke" as const,
      pointerEvents: tool === "select" ? "visiblePainted" as const : "none" as const,
      onPointerDown:
        key !== "draft" && tool === "select"
          ? (event: React.PointerEvent<SVGElement>) => selectMark(event, key)
          : undefined,
    };
    if (mark.kind === "draw") {
      const pts = mark.points || [mark.a, mark.b];
      return (
        <polyline
          key={key}
          points={pts.map((q) => `${(q.x / 100) * width},${(q.y / 100) * height}`).join(" ")}
          {...properties}
          stroke={selectedMarkId === key ? "#ffffff" : mark.text || "#f3d49a"}
          strokeWidth={selectedMarkId === key ? 5 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    }
    if (mark.kind === "text")
      return (
        <text
          key={key}
          x={a.x}
          y={a.y}
          fill="#fff2d7"
          stroke="#171d1b"
          strokeWidth="3"
          paintOrder="stroke"
          fontSize="20"
        >
          {mark.text}
        </text>
      );
    if (mark.kind === "circle" || mark.kind === "light")
      return (
        <circle
          key={key}
          cx={a.x}
          cy={a.y}
          r={radius}
          {...properties}
          strokeDasharray={mark.kind === "light" ? "6 4" : undefined}
        />
      );
    if (mark.kind === "rect" || mark.kind === "reveal")
      return (
        <rect
          key={key}
          x={Math.min(a.x, b.x)}
          y={Math.min(a.y, b.y)}
          width={Math.abs(a.x - b.x)}
          height={Math.abs(a.y - b.y)}
          {...properties}
        />
      );
    if (mark.kind === "cone") {
      const angle = Math.atan2(b.y - a.y, b.x - a.x),
        spread = Math.PI / 6;
      return (
        <path
          key={key}
          d={`M ${a.x} ${a.y} L ${a.x + Math.cos(angle - spread) * radius} ${a.y + Math.sin(angle - spread) * radius} A ${radius} ${radius} 0 0 1 ${a.x + Math.cos(angle + spread) * radius} ${a.y + Math.sin(angle + spread) * radius} Z`}
          {...properties}
        />
      );
    }
    if (mark.kind === "door" || mark.kind === "window") {
      if (!dm || previewTokenId) return null;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const isDoor = mark.kind === "door";
      const strokeColor = isDoor
        ? mark.open ? "#9fdca6" : "#f1b767"
        : mark.open ? "#a5e8ff" : "#72c7ea";
      return (
        <g key={key} className={`board-portal board-portal-${mark.kind} ${mark.open ? "open" : "closed"}`}>
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={selectedMarkId === key ? "#ffffff" : strokeColor}
            strokeWidth={selectedMarkId === key ? 4 : 3}
            strokeDasharray={mark.open ? "8 6" : undefined}
            vectorEffect="non-scaling-stroke"
            pointerEvents={tool === "select" ? "visiblePainted" : "none"}
            onPointerDown={key !== "draft" && tool === "select" ? (e) => selectMark(e, key) : undefined}
          />
          {key !== "draft" && dm && (
            <g
              transform={`translate(${mid.x}, ${mid.y})`}
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                action({ type: "door:toggle", id: key });
              }}
            >
              <circle r={11} fill="#171d1b" stroke={strokeColor} strokeWidth={2} />
              <text textAnchor="middle" dy="3.5" fontSize="10" fill={strokeColor} fontWeight="bold" style={{ userSelect: "none" }}>
                {isDoor ? (mark.open ? "○" : "●") : (mark.open ? "◫" : "▥")}
              </text>
            </g>
          )}
        </g>
      );
    }
    return (
      <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...properties} />
    );
  }
  const path = draft ? [draft.a, ...waypoints, draft.b] : [];
  const measured = path
    .slice(1)
    .reduce(
      (total, p, i) =>
        total + distance(path[i], p, { ...scene.grid, width, height }),
      0,
    );
  // Pencahayaan seperti Owlbear: tiap sumber vision/cahaya jadi poligon yang dipotong dinding (bayangan tajam dan
  // meruncing), diisi gradien radial supaya tepi lingkarannya memudar. Gelap = 1 − (terlihat × terang × fog terbuka).
  const lightingVersion = useRef(0);
  const ditherUrl = useMemo(() => (typeof document === "undefined" ? null : makeDither()), []);
  const lighting = useMemo(() => {
    if (!((previewTokenId || !dm) && (scene.fog || scene.vision))) return null;
    const ftPx = width / scene.grid.columns / scene.grid.distance;
    const segs = wallSegments(scene.marks, width, height);
    const euclid = { ...scene.grid, diagonal: "euclidean" as const };
    const shape = (center: { x: number; y: number }, rangeFt: number, cone?: { dir: number; angle: number }) => {
      const c = { x: (center.x / 100) * width, y: (center.y / 100) * height }, r = Math.max(1, rangeFt * ftPx);
      if (!cone) return { cx: c.x, cy: c.y, r, layers: [{ d: polygonPath(sightPolygon(c, r, segs)), opacity: 1 }] };
      // Cahaya lancip: juring inti penuh, ditambah juring yang makin lebar dan tipis supaya sisi kerucut memudar.
      const rad = (deg: number) => (deg * Math.PI) / 180;
      const layer = (extra: number, opacity: number) => ({ d: polygonPath(sightPolygon(c, r, segs, 96, { dir: rad(cone.dir), width: rad(cone.angle + extra * 2) })), opacity });
      return { cx: c.x, cy: c.y, r, layers: [
        layer(0, 1), ...coneFade.map((a, k) => layer((k + 1) * CONE_STEP, a)),
        { d: polygonPath(sightPolygon(c, (width / scene.grid.columns) * 0.6, segs)), opacity: 1 },
      ] };
    };
    const coneOf = (t: { lightShape?: string; lightDir?: number; lightAngle?: number }) => (t.lightShape === "cone" ? { dir: t.lightDir ?? 0, angle: t.lightAngle ?? 90 } : undefined);
    const sources = scene.tokens.filter((t) => !t.hidden && (previewTokenId ? t.id === previewTokenId : t.ownerId === playerId && t.visionSource));
    // Chrome tidak menggambar ulang <mask> yang isinya berubah, jadi setiap perubahan cahaya memakai id mask baru.
    lightingVersion.current += 1;
    return {
      v: lightingVersion.current,
      sights: scene.vision ? sources.map((t) => shape(t, t.visionRange ?? 60)) : null,
      lights: scene.vision && !scene.daylight ? [
        ...scene.marks.filter((m) => m.kind === "light").map((m) => shape(m.a, distance(m.a, m.b, euclid))),
        ...scene.tokens.filter((t) => t.lightRange && !t.hidden).map((t) => shape(t, t.lightRange!, coneOf(t))),
      ] : null,
      fog: scene.fog ? {
        lights: sources.filter((t) => t.lightRange).map((t) => shape(t, t.lightRange!, coneOf(t))),
        reveals: scene.marks.filter((m) => m.kind === "reveal").map((m) => ({ x: (Math.min(m.a.x, m.b.x) / 100) * width, y: (Math.min(m.a.y, m.b.y) / 100) * height, w: (Math.abs(m.a.x - m.b.x) / 100) * width, h: (Math.abs(m.a.y - m.b.y) / 100) * height })),
      } : null,
    };
  }, [scene, playerId, previewTokenId, dm, width, height]);
  const panel = (
    <div
      className="board-tools-panel"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {document.getElementById('player-tools-slot') && createPortal(<button
        title="Opsi alat pemain"
        aria-label="Opsi alat pemain"
        className="board-tools-toggle"
        onClick={() => { setDmMenu(false); setTab('tools'); setOpen((v) => !v); }}
        aria-expanded={open}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span className="rail-label">Opsi</span>
        <ChevronDown
          size={15}
          className={open ? "expanded" : ""}
          aria-hidden="true"
        />
      </button>, document.getElementById('player-tools-slot')!)}
      {dm && (
        <button ref={pagesToggle} type="button" className="scene-pages-toggle" aria-label="Menu scene" aria-expanded={pagesOpen} aria-controls="scene-page-menu" onClick={() => { setPagesOpen(value => !value); setOpen(false); }}>
          <Layers size={17} aria-hidden="true" /> Scene
        </button>
      )}
      {dm && pagesOpen && (
        <section id="scene-page-menu" className="scene-page-menu" aria-label="Daftar scene">
          <header>
            <div><strong>Scene</strong><p>Preview DM tidak memindahkan pemain.</p></div>
            <button type="button" aria-label="Tutup menu scene" onClick={() => { setPagesOpen(false); pagesToggle.current?.focus(); }}><X size={18} /></button>
          </header>
          <div className="scene-page-cards">
            {scenes.map(page => {
              const map = page.map && /^(?:https?:\/\/|\/uploads\/)/i.test(page.map) ? page.map : null;
              return <button key={page.id} type="button" className="scene-page-card" disabled={!connected} aria-pressed={scene.id === page.id} aria-label={`Preview ${page.name}`} onClick={() => action({ type: "scene:activate", id: page.id })}>
                <span className="scene-page-thumbnail">
                  {map ? /\.(?:mp4|webm|ogg)(?:[?#]|$)/i.test(map) ? <video src={map} muted playsInline preload="metadata" aria-hidden="true" /> : <img src={map} alt="" loading="lazy" /> : <Layers size={30} aria-hidden="true" />}
                </span>
                <strong>{page.name}</strong>
                <span className="scene-page-badges">
                  {scene.id === page.id && <span>DM · Preview</span>}
                  {publishedSceneId === page.id && <span className="scene-player-ribbon">Scene utama</span>}
                </span>
                {!!playersIn(page.id).length && <span className="scene-page-players" aria-label={`Pemain di ${page.name}`}>
                  {playersIn(page.id).map((pl) => <i key={pl.id} title={pl.name} className={pl.online ? "online" : ""}>{pl.name.charAt(0).toUpperCase()}</i>)}
                </span>}
              </button>;
            })}
          </div>
          <footer className="scene-send">
            <div className="scene-send-head">
              <span>Kirim ke <strong>{scene.name}</strong></span>
              <small>{playersIn(scene.id).length ? `Di sini: ${playersIn(scene.id).map((pl) => pl.name).join(", ")}` : "Belum ada pemain di sini"}</small>
            </div>
            {!!players.length && <div className="scene-send-players" role="group" aria-label="Pilih pemain">
              {players.map((pl) => {
                const here = sceneOfPlayer(pl.id) === scene.id;
                const on = sendPick.includes(pl.id);
                return <button key={pl.id} type="button" aria-pressed={on} className={`${on ? "on" : ""}${here ? " here" : ""}`} title={here ? `${pl.name} sudah di scene ini` : `Sekarang di: ${scenes.find((sc) => sc.id === sceneOfPlayer(pl.id))?.name || "-"}`}
                  onClick={() => setSendPick((cur) => (cur.includes(pl.id) ? cur.filter((x) => x !== pl.id) : [...cur, pl.id]))}>
                  <i className={pl.online ? "online" : ""}>{pl.name.charAt(0).toUpperCase()}</i>{pl.name}
                </button>;
              })}
            </div>}
            <div className="scene-send-actions">
              <button type="button" disabled={!connected || !sendPick.length} onClick={() => { action({ type: "scene:send", players: sendPick }); setSendPick([]); }}>
                Kirim yang dipilih{sendPick.length ? ` (${sendPick.length})` : ""}
              </button>
              <button type="button" className="primary" disabled={!connected} onClick={() => { action({ type: "scene:publish" }); setSendPick([]); }}>Semua pemain ke sini</button>
            </div>
          </footer>
          <form onSubmit={event => { event.preventDefault(); if (name.trim()) { action({ type: "scene:create", name }); setName(""); } }}>
            <label>Scene baru<input value={name} maxLength={60} onChange={event => setName(event.target.value)} /></label>
            <button type="submit" disabled={!connected || !name.trim() || scenes.length >= 20}>Buat scene</button>
          </form>
          {error && <p role="alert">{error}</p>}
        </section>
      )}
      {!open && tool !== "select" && (
        <div className="board-active-compact">
          {labels.find(([id]) => id === tool)?.[1]} aktif
          <button
            aria-label="Kembali ke pilihan token"
            onClick={() => {
              setTool("select");
              setDraft(null);
              setWaypoints([]);
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {open && (
        <div className="board-tools-body">
          <header className="board-panel-heading">
            <div>
              <span>Meja permainan</span>
              <strong>{scene.name}</strong>
            </div>
            <button
              aria-label="Tutup panel alat"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          <nav aria-label="Panel meja">
            {(["tools", "scene", "combat", "token"] as const).filter(t => dmMenu || t !== 'scene').map((t) => {
              const Icon = tabIcons[t];
              return (
                <button
                  key={t}
                  aria-pressed={tab === t}
                  onClick={() => setTab(t)}
                >
                  <Icon size={17} aria-hidden="true" />
                  {
                    {
                      tools: "Alat",
                      scene: "Peta",
                      combat: "Combat",
                      token: "Token",
                    }[t]
                  }
                </button>
              );
            })}
          </nav>
          <div className={`board-tab-content board-tab-${tab}`}>
            {error && <p role="alert">{error}</p>}
            {tab === "tools" && tool === "ruler" && (
              <label className="board-checkbox">
                <input
                  type="checkbox"
                  checked={broadcastRuler}
                  onChange={(e) => setBroadcastRuler(e.target.checked)}
                />
                Bagikan pengukuran ke party
              </label>
            )}
            {tab === "tools" && (
              <>
                {toolGroups
                  .filter((group) => group.name !== 'Visibilitas DM' || dm)
                  .map((group) => (
                    <section className="board-tool-group" key={group.name}>
                      <h3>{group.name}</h3>
                      <p>{group.description}</p>
                      <div className="board-tool-buttons">
                        {group.ids.map((id) => {
                          const Icon = toolIcons[id];
                          const label = labels.find(
                            ([value]) => value === id,
                          )![1];
                          return (
                            <button
                              key={id}
                              disabled={!connected}
                              aria-pressed={tool === id}
                              onClick={() => {
                                setTool(id);
                                setDraft(null);
                                setWaypoints([]);
                              }}
                            >
                              <Icon size={21} aria-hidden="true" />
                              <span>{label}</span>
                              {id === "ruler" || id === "ping" ? (
                                <kbd>{id === "ruler" ? "R" : "P"}</kbd>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                <div className="board-tool-hint">
                  <strong>{labels.find(([id]) => id === tool)?.[1]}</strong>
                  <p>
                    {tool === "ruler"
                      ? "Seret untuk ukur. F menambah waypoint, Alt tanpa snap. Escape selesai."
                      : tool === "ping"
                        ? "Klik peta untuk ping. DM: Shift + klik memusatkan kamera party."
                        : tool === "select"
                          ? "Geser token mengikuti grid. Alt untuk bebas."
                          : tool === "draw"
                            ? "Seret untuk menggambar bebas. Gambar tetap di peta sampai dihapus (pilih lalu Delete, atau tombol di bawah)."
                          : "Seret peta untuk membuat bentuk."}
                  </p>
                </div>
                {tool === "draw" && (
                  <div className="board-pen">
                    <div className="board-pen-colors" role="radiogroup" aria-label="Warna pensil">
                      {penColors.map((c) => (
                        <button key={c} type="button" role="radio" aria-checked={penColor === c} aria-label={`Warna ${c}`} style={{ background: c }} onClick={() => setPenColor(c)} />
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={!connected || !scene.marks.some((m) => m.kind === "draw" && (dm || m.ownerId === playerId))}
                      onClick={() => action({ type: "draw:clear" })}
                    >
                      <Trash2 size={15} /> {dm ? "Hapus semua gambar" : "Hapus gambarku"}
                    </button>
                  </div>
                )}
                {tool === "text" && (
                  <label>
                    Teks
                    <input
                      maxLength={120}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </label>
                )}
                <details className="board-mark-section">
                  <summary>
                    Objek di peta{" "}
                    <span>
                      {
                        scene.marks.filter((m) => dm || m.ownerId === playerId)
                          .length
                      }
                    </span>
                  </summary>
                  <div className="board-mark-list">
                    {scene.marks
                      .filter((m) => dm || m.ownerId === playerId)
                      .map((m) => (
                        <div key={m.id}>
                          <span>
                            {labels.find(([id]) => id === m.kind)?.[1]} {m.text}
                          </span>
                          {dm && (m.kind === "door" || m.kind === "window") && (
                            <button
                              disabled={!connected}
                              onClick={() => action({ type: "door:toggle", id: m.id })}
                            >
                              {m.open ? "Tutup" : "Buka"}
                            </button>
                          )}
                          <button
                            disabled={!connected}
                            onClick={() =>
                              action({ type: "mark:remove", id: m.id })
                            }
                            aria-label={`Hapus ${m.kind}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    {!scene.marks.some((m) => dm || m.ownerId === playerId) && (
                      <p>Belum ada bentuk. Pilih alat lalu seret di peta.</p>
                    )}
                  </div>
                </details>
              </>
            )}
            {tab === "scene" && (
              dm && dmMenu ? (
                <div className="dm-sections">
                  <section className="dm-section">
                    <h3>Scene</h3>
                    <div className="dm-scene-now">
                      <strong>{scene.name}</strong>
                      <span className={playersIn(scene.id).length ? "live" : ""}>
                        {playersIn(scene.id).length ? `Dilihat: ${playersIn(scene.id).map((pl) => pl.name).join(", ")}` : "Belum ada pemain di sini"}
                      </span>
                    </div>
                    <div className="dm-row">
                      {playersIn(scene.id).length < players.length && (
                        <button type="button" className="dm-primary" disabled={!connected} onClick={() => action({ type: "scene:publish" })}>
                          Semua pemain ke sini
                        </button>
                      )}
                      <button type="button" onClick={() => { setOpen(false); setPagesOpen(true); }}>
                        Pilih pemain / ganti scene
                      </button>
                    </div>
                  </section>

                  <section className="dm-section">
                    <h3>Peta</h3>
                    <button type="button" disabled={!connected} onClick={() => window.dispatchEvent(new Event("tabletop:dm-upload"))}>
                      Unggah atau ganti peta
                    </button>
                    <label className="dm-file-button">
                      Impor dinding (.json)
                      <input type="file" accept=".json,application/json" disabled={!connected} onChange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void importWalls(file); }} />
                    </label>
                    {scene.marks.some((m) => m.kind === "wall" || m.kind === "door" || m.kind === "window") && (
                      <button type="button" disabled={!connected} onClick={() => { if (confirm("Hapus semua dinding, pintu, dan jendela di scene ini? Bisa dibatalkan dengan Undo.")) action({ type: "walls:clear" }); }}>
                        Hapus semua dinding ({scene.marks.filter((m) => m.kind === "wall" || m.kind === "door" || m.kind === "window").length})
                      </button>
                    )}
                    <label>
                      Ukuran peta · {Math.round((scene.mapScale ?? 1) * 100)}%
                      <input type="range" min={50} max={400} step={10} value={(scene.mapScale ?? 1) * 100} onChange={(e) => action({ type: "grid", mapScale: e.target.valueAsNumber / 100 })} />
                    </label>
                  </section>

                  <section className="dm-section">
                    <h3>Pandangan pemain</h3>
                    {(["fog", "vision", "daylight"] as const).map((key) => (
                      <label className="board-checkbox" key={key}>
                        <input type="checkbox" checked={scene[key]} onChange={(e) => action({ type: "scene:settings", [key]: e.target.checked })} />
                        {{ fog: "Fog manual", vision: "Vision dengan dinding", daylight: "Cahaya siang" }[key]}
                      </label>
                    ))}
                    {scene.fog && (
                      <button type="button" disabled={!connected} onClick={() => action({ type: "fog:reset" })}>
                        Tutup semua fog
                      </button>
                    )}
                    <label>
                      Lihat peta sebagai
                      <select value={previewTokenId || ""} onChange={(e) => onPreviewToken(e.target.value || null)}>
                        <option value="">DM (semua terlihat)</option>
                        {scene.tokens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <p className="dm-hint">Buka fog dan pasang dinding lewat tab Alat. Cahaya dipakai saat cahaya siang mati.</p>
                  </section>

                  <section className="dm-section">
                    <h3>Suasana</h3>
                    <div className="weather-chips" role="radiogroup" aria-label="Efek suasana">
                      {([["", "Tidak ada"], ["rain", "Hujan"], ["storm", "Badai"], ["snow", "Salju"], ["fog", "Kabut"], ["night", "Malam"], ["torch", "Cahaya obor"]] as const).map(([value, label]) => (
                        <button key={value || "none"} type="button" role="radio" className={`weather-chip w-${value || "none"}`} aria-checked={(scene.weather ?? "") === value} disabled={!connected} onClick={() => action({ type: "scene:settings", weather: value })}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="dm-hint">Efek tampil di atas peta untuk semua pemain di scene ini.</p>
                  </section>

                  <details className="dm-section dm-advanced">
                    <summary>Pengaturan grid</summary>
                    <div className="dm-grid-2">
                      <label>
                        Kolom
                        <input type="number" min={4} max={200} value={scene.grid.columns} onChange={(e) => action({ type: "grid", columns: e.target.valueAsNumber })} />
                      </label>
                      <label>
                        Jarak per kotak
                        <input type="number" min={0.1} max={1000} value={scene.grid.distance} onChange={(e) => action({ type: "grid", distance: e.target.valueAsNumber })} />
                      </label>
                      <label>
                        Satuan
                        <select value={scene.grid.unit} onChange={(e) => action({ type: "grid", unit: e.target.value })}>
                          <option value="ft">feet</option>
                          <option value="m">meter</option>
                        </select>
                      </label>
                      <label>
                        Diagonal
                        <select value={scene.grid.diagonal} onChange={(e) => action({ type: "grid", diagonal: e.target.value })}>
                          <option value="grid">Satu kotak (5e)</option>
                          <option value="euclidean">Garis lurus</option>
                        </select>
                      </label>
                      {(["offsetX", "offsetY"] as const).map((key) => (
                        <label key={key}>
                          Geser grid {key === "offsetX" ? "X" : "Y"} (%)
                          <input type="number" min={0} max={99} value={scene.grid[key] ?? 0} onChange={(e) => action({ type: "grid", [key]: e.target.valueAsNumber })} />
                        </label>
                      ))}
                    </div>
                  </details>

                  <section className="dm-section">
                    <h3>Campaign</h3>
                    <div className="dm-row">
                      <button type="button" disabled={!connected} onClick={() => socket?.timeout(5000).emit("campaign:undo", (err: Error | null, result?: { error?: string }) => { if (err || result?.error) setError(result?.error || "Undo gagal."); })}>
                        Undo aksi terakhir
                      </button>
                      <button type="button" disabled={!connected} onClick={backup}>
                        Backup campaign
                      </button>
                    </div>
                  </section>
                </div>
              ) : (
                <p>
                  {scene.name}. Skala: {scene.grid.distance} {scene.grid.unit} / kotak. Pengaturan scene dikelola DM.
                </p>
              )
            )}
            {tab === "token" && (
              <>
                {dm && dmMenu && (
                  <section className="dm-section monster-quick">
                    <h3>Tambah monster</h3>
                    <label>
                      Monster
                      <select value={monsterKey} onChange={(e) => setMonsterKey(e.target.value)}>
                        {[...new Set(monsters.map((m) => m.group))].map((group) => (
                          <optgroup key={group} label={group}>
                            {monsters.filter((m) => m.group === group).map((m) => <option key={m.key} value={m.key}>{m.name} · AC {m.ac} · HP {m.hp}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="bestiary-open" onClick={() => setBestiaryOpen(true)}>
                      <BookOpen size={16} /> Buka Bestiary <small>· semua monster + Monster Manual 2024</small>
                    </button>
                    <div className="monster-row">
                      <div className="monster-count" aria-label="Jumlah monster">
                        <button type="button" aria-label="Kurangi jumlah" disabled={monsterCount <= 1} onClick={() => setMonsterCount((n) => Math.max(1, n - 1))}>−</button>
                        <strong>{monsterCount}</strong>
                        <button type="button" aria-label="Tambah jumlah" disabled={monsterCount >= 8} onClick={() => setMonsterCount((n) => Math.min(8, n + 1))}>+</button>
                      </div>
                      <label className="board-checkbox">
                        <input type="checkbox" checked={monsterHidden} onChange={(e) => setMonsterHidden(e.target.checked)} />
                        Sembunyikan dulu
                      </label>
                    </div>
                    <button type="button" className="dm-primary" disabled={!connected} onClick={() => action({ type: "token:monster", monster: monsterKey, count: monsterCount, hidden: monsterHidden })}>
                      Taruh {monsterCount} {pickedMonster?.name} di peta
                    </button>
                    <p className="dm-hint">Token muncul di tengah peta. Initiative monster dilempar dengan bonusnya saat combat dimulai. Pilih token lalu buka <b>Stat block</b> untuk roll serangan. Sumber gambar: public/monsters/CREDITS.txt.</p>
                    {bestiaryOpen && createPortal(
                      <Suspense fallback={null}>
                        <Bestiary
                          connected={connected}
                          onClose={() => setBestiaryOpen(false)}
                          onPlace={(monster, count, hidden) => action({ type: "token:monster", monster, count, hidden })}
                          onRoll={(expression, mode, label) => socket?.emit("dice:roll", { expression, mode, label })}
                        />
                      </Suspense>,
                      document.body,
                    )}
                  </section>
                )}
                {dm && dmMenu && (
                  <label className="token-picker">
                    Token
                    <select value={tokenId || ""} onChange={(e) => setTokenId(e.target.value || null)}>
                      <option value="">Pilih token…</option>
                      {scene.tokens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                )}
                {editable && token ? (
                  <div className="token-editor">
                    <div className="token-editor-head">
                      <img src={token.image} alt="" />
                      <strong>{token.name}</strong>
                    </div>
                    <div className="dm-grid-2">
                      {(["hp", "maxHp", "ac", "initiative"] as const).map((key) => (
                        <label key={key}>
                          {{ hp: "HP", maxHp: "HP maks", ac: "AC", initiative: "Initiative" }[key]}
                          <input type="number" min={key === "initiative" ? -100 : 0} max={9999} value={token[key] ?? 0} onChange={(e) => action({ type: "token:update", id: token.id, [key]: e.target.valueAsNumber })} />
                        </label>
                      ))}
                    </div>
                    <h4>Kondisi</h4>
                    <div className="condition-chips">
                      {conditions.map((c) => {
                        const on = token.conditions?.includes(c) || false;
                        return (
                          <button type="button" key={c} className="condition-chip" aria-pressed={on} disabled={!connected} onClick={() => action({ type: "token:update", id: token.id, conditions: on ? token.conditions?.filter((v) => v !== c) || [] : [...(token.conditions || []), c] })}>
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    {!dm && token.lightShape === "cone" && !!token.lightRange && (
                      <>
                        <h4>Arah cahaya</h4>
                        <LightCone shape="cone" angle={token.lightAngle ?? 90} dir={token.lightDir ?? 0} canShape={false} disabled={!connected}
                          onChange={(patch) => action({ type: "token:update", id: token.id, ...patch })} />
                      </>
                    )}
                    {dm && dmMenu && (
                      <section className="dm-section">
                        <h3>Khusus DM</h3>
                        <label className="board-checkbox">
                          <input type="checkbox" checked={!!token.hidden} onChange={(e) => action({ type: "token:update", id: token.id, hidden: e.target.checked })} />
                          Sembunyikan dari pemain
                        </label>
                        <label className="board-checkbox">
                          <input type="checkbox" checked={!!token.visionSource} onChange={(e) => action({ type: "token:update", id: token.id, visionSource: e.target.checked })} />
                          Jadi sumber pandangan pemain
                        </label>
                        <div className="dm-grid-2">
                          {(["visionRange", "lightRange"] as const).map((key) => (
                            <label key={key}>
                              {key === "visionRange" ? "Jarak pandang" : "Jarak cahaya"} ({scene.grid.unit})
                              <input type="number" min={0} max={1000} value={token[key] ?? (key === "visionRange" ? 60 : 0)} onChange={(e) => action({ type: "token:update", id: token.id, [key]: e.target.valueAsNumber })} />
                            </label>
                          ))}
                        </div>
                        {!!token.lightRange && (
                          <LightCone shape={token.lightShape === "cone" ? "cone" : "circle"} angle={token.lightAngle ?? 90} dir={token.lightDir ?? 0} canShape disabled={!connected}
                            onChange={(patch) => action({ type: "token:update", id: token.id, ...patch })} />
                        )}
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="dm-hint">
                    {dm ? "Klik token di peta atau pilih dari daftar untuk mengaturnya." : "Klik token milikmu di peta untuk mengatur HP dan kondisi."}
                  </p>
                )}
              </>
            )}
            {tab === "combat" && (() => {
              const current = scene.tokens.find((t) => t.id === scene.combat.ids[scene.combat.turn]);
              const canAdvance = scene.combat.active && (dm || current?.ownerId === playerId);
              const list = scene.combat.active
                ? scene.combat.ids.map((id) => scene.tokens.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t)
                : scene.tokens;
              return (
                <>
                  <div className="combat-status">
                    <strong>{scene.combat.active ? `Ronde ${scene.combat.round}` : "Combat belum dimulai"}</strong>
                    {scene.combat.active && current && <span>Giliran {current.name}</span>}
                  </div>
                  {canAdvance && (
                    <button type="button" className="dm-primary" disabled={!connected} onClick={() => action({ type: "combat:next" })}>
                      Giliran berikutnya
                    </button>
                  )}
                  {dm && dmMenu && !scene.combat.active && (
                    <>
                      <button type="button" className="dm-primary" disabled={!connected || !scene.tokens.length} onClick={() => action({ type: "combat:roll-npc" })}>
                        Mulai combat
                      </button>
                      <p className="dm-hint">NPC otomatis roll initiative. Token yang terhubung ke sheet memakai initiative pemiliknya.</p>
                    </>
                  )}
                  <ol className="combat-list">
                    {list.map((t) => (
                      <li key={t.id} className={scene.combat.active && scene.combat.ids[scene.combat.turn] === t.id ? "current-turn" : ""}>
                        <span>{t.name}{t.conditions?.includes("Defeated") ? " · Defeated" : ""}</span>
                        {dm && dmMenu
                          ? <input type="number" aria-label={`Initiative ${t.name}`} min={-100} max={9999} value={t.initiative ?? 0} onChange={(e) => action({ type: "token:update", id: t.id, initiative: e.target.valueAsNumber })} />
                          : <b>{t.initiative ?? 0}</b>}
                      </li>
                    ))}
                  </ol>
                  {dm && dmMenu && (
                    <div className="dm-row">
                      <button type="button" disabled={!connected || !scene.tokens.length} title="Urutkan memakai angka initiative di daftar ini" onClick={() => action({ type: "combat:set", ids: scene.tokens.map((t) => t.id) })}>
                        {scene.combat.active ? "Urutkan ulang" : "Mulai pakai angka ini"}
                      </button>
                      {scene.combat.active && (
                        <button type="button" className="dm-danger" disabled={!connected} onClick={() => action({ type: "combat:end" })}>
                          Akhiri combat
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <footer className="board-panel-footer">
            <span>
              {scene.grid.distance} {scene.grid.unit} / kotak
            </span>
            <span>{connected ? "Tersinkron" : "Koneksi terputus"}</span>
          </footer>
        </div>
      )}
    </div>
  );
  const overlay = (
    <svg
      ref={svg}
      className={`board-overlay ${tool !== "select" ? "interactive" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      onPointerDown={(e) => {
        if (e.button !== 0 || !connected) return;
        e.stopPropagation();
        const a = point(e);
        if (tool === "ping") {
          socket?.emit("tabletop:ping", {
            ...a,
            sceneId: scene.id,
            focus: dm && e.shiftKey,
          });
          return;
        }
        drawing.current = true;
        if (tool === "draw") {
          setStroke([a]);
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
          return;
        }
        setWaypoints([]);
        setDraft({ a, b: a });
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }}
      onPointerMove={(e) => {
        if (stroke && drawing.current) {
          e.stopPropagation();
          const q = point(e), last = stroke[stroke.length - 1];
          // Lewati titik yang terlalu rapat supaya goresan tetap ringan (maks. 600 titik).
          if (Math.hypot(q.x - last.x, q.y - last.y) > 0.12 && stroke.length < 600) setStroke([...stroke, q]);
          return;
        }
        if (draft && drawing.current) {
          e.stopPropagation();
          setDraft({ ...draft, b: point(e) });
        }
      }}
      onPointerUp={(e) => {
        drawing.current = false;
        if (stroke) {
          e.stopPropagation();
          try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          const pts = stroke.length === 1 ? [stroke[0], { x: stroke[0].x + 0.05, y: stroke[0].y + 0.05 }] : stroke;
          action({ type: "mark:add", kind: "draw", points: pts, text: penColor });
          setStroke(null);
          return;
        }
        if (!draft) return;
        e.stopPropagation();
        const b = point(e);
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        if (tool === "ruler") {
          setDraft({ ...draft, b });
          return;
        }
        // Template shapes are previews only: gone on release. Walls, doors, lights, text, fog still persist.
        const temporary = ["circle", "cone", "rect", "line"].includes(tool);
        if (tool !== "select" && tool !== "ping" && !temporary)
          action({ type: "mark:add", kind: tool, a: draft.a, b, text });
        setDraft(null);
      }}
      onPointerCancel={() => {
        drawing.current = false;
        setStroke(null);
        setDraft(null);
        setWaypoints([]);
      }}
    >
      {scene.marks
        .filter((m) => m.kind !== "reveal")
        .map((m) => shape(m, m.id))}
      {stroke && shape({ kind: "draw", a: stroke[0], b: stroke[stroke.length - 1], points: stroke, text: penColor }, "draft")}
      {draft &&
        tool !== "ruler" &&
        shape({ kind: tool as Mark["kind"], ...draft, text }, "draft")}
      {draft && ["circle", "cone", "rect", "line"].includes(tool) && (() => {
        const g = { ...scene.grid, width, height }, u = scene.grid.unit;
        const fmt = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} ${u}`;
        const label = tool === "rect"
          ? `${fmt(distance(draft.a, { x: draft.b.x, y: draft.a.y }, g))} × ${fmt(distance(draft.a, { x: draft.a.x, y: draft.b.y }, g))}`
          : `${tool === "circle" ? "Radius " : ""}${fmt(distance(draft.a, draft.b, g))}`;
        return <text x={(draft.b.x / 100) * width} y={(draft.b.y / 100) * height - 10} fontSize="18" fill="#fff2d7" stroke="#171d1b" strokeWidth="4" paintOrder="stroke" pointerEvents="none">{label}</text>;
      })()}
      {draft && tool === "ruler" && (
        <>
          <polyline
            points={path
              .map((p) => `${(p.x / 100) * width},${(p.y / 100) * height}`)
              .join(" ")}
            fill="none"
            stroke="#f3d49a"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={(draft.b.x / 100) * width}
            y={(draft.b.y / 100) * height - 10}
            fontSize="18"
            fill="#fff2d7"
            stroke="#171d1b"
            strokeWidth="4"
            paintOrder="stroke"
          >
            {measured.toFixed(1)} {scene.grid.unit}
          </text>
        </>
      )}
      {lighting && (() => {
        const grad = (id: string, s: { cx: number; cy: number; r: number }, color: string) => (
          <radialGradient key={id} id={id} gradientUnits="userSpaceOnUse" cx={s.cx} cy={s.cy} r={s.r}>
            {lightFade.map(([o, a]) => <stop key={o} offset={o} stopColor={color} stopOpacity={a} />)}
          </radialGradient>
        );
        const box = { x: 0, y: 0, width, height, maskUnits: "userSpaceOnUse" as const };
        const id = (name: string) => `lm-${name}-${lighting.v}`;
        return <g key={lighting.v} pointerEvents="none">
          <defs>
            {lighting.sights?.map((s, i) => grad(id(`s${i}`), s, "#000"))}
            {lighting.lights?.map((s, i) => grad(id(`l${i}`), s, "#fff"))}
            {lighting.fog?.lights.map((s, i) => grad(id(`f${i}`), s, "#fff"))}
            {lighting.lights && <mask id={id("lit")} {...box}><rect width={width} height={height} fill="#000" />{lighting.lights.map((s, i) => s.layers.map((l, j) => <path key={`${i}-${j}`} d={l.d} fill={`url(#${id(`l${i}`)})`} fillOpacity={l.opacity} />))}</mask>}
            {lighting.fog && <mask id={id("fog")} {...box}><rect width={width} height={height} fill="#000" />
              {lighting.fog.reveals.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#fff" />)}
              {lighting.fog.lights.map((s, i) => s.layers.map((l, j) => <path key={`${i}-${j}`} d={l.d} fill={`url(#${id(`f${i}`)})`} fillOpacity={l.opacity} />))}
            </mask>}
            <mask id={id("dark")} {...box}>
              <rect width={width} height={height} fill="#fff" />
              <g mask={lighting.fog ? `url(#${id("fog")})` : undefined}>
                <g mask={lighting.lights ? `url(#${id("lit")})` : undefined}>
                  {lighting.sights ? lighting.sights.map((s, i) => s.layers.map((l, j) => <path key={`${i}-${j}`} d={l.d} fill={`url(#${id(`s${i}`)})`} fillOpacity={l.opacity} />)) : <rect width={width} height={height} fill="#000" />}
                </g>
              </g>
            </mask>
          </defs>
          <rect className="vision-darkness" width={width} height={height} fill="#11151c" mask={`url(#${id("dark")})`} />
          {/* Dither halus: memecah pita warna 8-bit di tepi gradien gelap. */}
          {ditherUrl && <>
            <pattern id={id("dither")} patternUnits="userSpaceOnUse" width={128} height={128}><image href={ditherUrl} width={128} height={128} style={{ imageRendering: "pixelated" }} /></pattern>
            <rect width={width} height={height} fill={`url(#${id("dither")})`} mask={`url(#${id("dark")})`} opacity={0.5} />
          </>}
        </g>;
      })()}
      {Object.entries(sharedRulers).map(
        ([id, ruler]) =>
          ruler.points.length > 1 && (
            <g key={id}>
              <polyline
                points={ruler.points
                  .map((p) => `${(p.x / 100) * width},${(p.y / 100) * height}`)
                  .join(" ")}
                fill="none"
                stroke="#b8d8f0"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={(ruler.points.at(-1)!.x / 100) * width}
                y={(ruler.points.at(-1)!.y / 100) * height - 12}
                fill="#fff2d7"
                stroke="#171d1b"
                paintOrder="stroke"
                strokeWidth="3"
                fontSize="16"
              >
                {ruler.name}:{" "}
                {ruler.points
                  .slice(1)
                  .reduce(
                    (total, p, i) =>
                      total + distance(ruler.points[i], p, scene.grid),
                    0,
                  )
                  .toFixed(1)}{" "}
                {scene.grid.unit}
              </text>
            </g>
          ),
      )}
      {localPointer && (
        <g className="board-pointer" transform={`translate(${(localPointer.x / 100) * width} ${(localPointer.y / 100) * height})`}>
          <circle r="4" />
        </g>
      )}
      {Object.values(pointers).filter((pointer) => pointer.playerId !== playerId).map((pointer) => (
        <g key={pointer.playerId} className="board-pointer board-pointer-remote" style={{ transform: `translate(${(pointer.x / 100) * width}px, ${(pointer.y / 100) * height}px)` }}>
          <circle r="4" />
          <text x="8" y="3">{pointer.name}</text>
        </g>
      ))}
      {pings.map((p) => (
        <g key={p.id} className="board-ping">
          <circle
            cx={(p.x / 100) * width}
            cy={(p.y / 100) * height}
            r={18}
            fill="none"
            stroke="#f3d49a"
            strokeWidth="4"
          />
          <text
            x={(p.x / 100) * width}
            y={(p.y / 100) * height - 26}
            fill="#fff2d7"
            stroke="#171d1b"
            paintOrder="stroke"
            strokeWidth="3"
            fontSize="16"
          >
            {p.name}
          </text>
        </g>
      ))}
    </svg>
  );
  const canvas = document.querySelector(".map-canvas");
  return (
    <>
      {panel}
      {canvas && createPortal(overlay, canvas)}
    </>
  );
}
