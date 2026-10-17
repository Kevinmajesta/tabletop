import { useEffect, useRef, useState } from "react";
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
  Lamp,
  Scan,
  SlidersHorizontal,
  X,
  Layers,
  Swords,
  UserRound,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  conditions,
  distance,
  visible,
  type Scene,
  type Point,
  type Mark,
} from "../server/tabletop";
import "./board-tools.css";

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
  ["text", "Teks"],
  ["wall", "Dinding"],
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
  text: Type,
  wall: BrickWall,
  light: Lamp,
  reveal: Scan,
};
const tabIcons = {
  tools: SlidersHorizontal,
  scene: Layers,
  combat: Swords,
  token: UserRound,
};
const toolGroups: { name: string; description: string; ids: Tool[] }[] = [
  {
    name: "Navigasi",
    description: "Pilih, ukur, dan tunjuk lokasi.",
    ids: ["select", "ruler", "ping"],
  },
  {
    name: "Area & catatan",
    description: "Template spell dan penanda peta.",
    ids: ["circle", "cone", "rect", "line", "text"],
  },
  {
    name: "Visibilitas DM",
    description: "Atur pandangan dan area terbuka.",
    ids: ["wall", "light", "reveal"],
  },
];

export default function BoardTools({
  scene,
  scenes,
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
  const [dmMenu, setDmMenu] = useState(false);
  const [tokenId, setTokenId] = useState<string | null>(selected ?? null);
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
  const [pings, setPings] = useState<Ping[]>([]);
  const [pointers, setPointers] = useState<Record<string, Pointer>>({});
  const [error, setError] = useState("");
  const pointerThrottle = useRef(0);
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
    const send = (event: PointerEvent, state: boolean) => {
      const rect = svg.current?.getBoundingClientRect();
      if (!connected || !socket || !rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      socket.emit("tabletop:pointer", { sceneId: scene.id, x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100, active: state });
    };
    const down = (event: PointerEvent) => { if (event.button === 2) { active = true; event.preventDefault(); send(event, true); } };
    const move = (event: PointerEvent) => { if (active && performance.now() - pointerThrottle.current > 40) { pointerThrottle.current = performance.now(); send(event, true); } };
    const up = (event: PointerEvent) => { if (active && event.button === 2) { send(event, false); active = false; } };
    const menu = (event: MouseEvent) => { if (active) event.preventDefault(); };
    window.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("contextmenu", menu);
    return () => { window.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("contextmenu", menu); };
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
    if (tool !== "ruler" || event.altKey) return { x, y };
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
  function shape(mark: Pick<Mark, "kind" | "a" | "b" | "text">, key: string) {
    const a = { x: (mark.a.x / 100) * width, y: (mark.a.y / 100) * height },
      b = { x: (mark.b.x / 100) * width, y: (mark.b.y / 100) * height };
    const radius = Math.hypot(b.x - a.x, b.y - a.y);
    const properties = {
      stroke:
        selectedMarkId === key
          ? "#ffffff"
          : mark.kind === "wall"
            ? "#ffc1b4"
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
  const fogCells: React.ReactNode[] = [];
  if ((previewTokenId || !dm) && (scene.fog || scene.vision)) {
    const columns = 80,
      rows = Math.ceil((80 * height) / width);
    for (let x = 0; x < columns; x++)
      for (let y = 0; y < rows; y++) {
        if (
          !visible(
            { x: ((x + 0.5) / columns) * 100, y: ((y + 0.5) / rows) * 100 },
            scene,
            playerId,
            previewTokenId,
          )
        )
          fogCells.push(
            <rect
              key={`${x}:${y}`}
              x={(x * width) / columns}
              y={(y * height) / rows}
              width={width / columns + 0.5}
              height={height / rows + 0.5}
              fill="#11151c"
            />,
          );
      }
  }
  const panel = (
    <div
      className="board-tools-panel"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className="board-tools-toggle"
        onClick={() => { setDmMenu(false); setTab('tools'); setOpen((v) => !v); }}
        aria-expanded={open}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>{dmMenu ? 'Kontrol DM' : 'Alat pemain'}</span>
        <ChevronDown
          size={15}
          className={open ? "expanded" : ""}
          aria-hidden="true"
        />
      </button>
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
                      scene: "Scene",
                      combat: "Combat",
                      token: "Token",
                    }[t]
                  }
                </button>
              );
            })}
          </nav>
          <div className={`board-tab-content board-tab-${tab}`}>
            {dm && dmMenu && <button disabled={!connected} onClick={() => window.dispatchEvent(new Event('tabletop:dm-upload'))}>Unggah / ganti peta</button>}
            {dm && dmMenu && <><button disabled={!connected} onClick={()=>socket?.timeout(5000).emit('campaign:undo',(err:Error|null,result?:{error?:string})=>{if(err || result?.error)setError(result?.error || 'Undo gagal.');})}>Undo aksi DM terakhir</button><button disabled={!connected} onClick={backup}>Backup campaign & gambar</button></>}
            {error && <p role="alert">{error}</p>}
            {tab === "token" && dm && dmMenu && token && (
              <label className="board-checkbox">
                <input
                  type="checkbox"
                  checked={!!token.visionSource}
                  onChange={(e) =>
                    action({
                      type: "token:update",
                      id: token.id,
                      visionSource: e.target.checked,
                    })
                  }
                />
                Token menjadi sumber vision pemain
              </label>
            )}
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
            {tab === "scene" && dm && (
              <>
                {(["offsetX", "offsetY"] as const).map((key) => (
                  <label key={key}>
                    Offset grid {key === "offsetX" ? "X" : "Y"} (% kotak)
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={scene.grid[key] ?? 0}
                      onChange={(e) =>
                        action({ type: "grid", [key]: e.target.valueAsNumber })
                      }
                    />
                  </label>
                ))}
              </>
            )}
            {tab === "tools" && (
              <>
                {toolGroups
                  .filter((group) => group.name !== 'Visibilitas DM' || dm && dmMenu)
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
                          : "Seret peta untuk membuat bentuk."}
                  </p>
                </div>
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
              <>
                {dm && dmMenu ? (
                  <>
                    <label>
                      Preview pandangan player
                      <select
                        value={previewTokenId || ""}
                        onChange={(e) => onPreviewToken(e.target.value || null)}
                      >
                        <option value="">Map DM penuh</option>
                        {scene.tokens.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Scene aktif
                      <select
                        value={scene.id}
                        onChange={(e) =>
                          action({ type: "scene:activate", id: e.target.value })
                        }
                      >
                        {scenes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (name.trim()) {
                          action({ type: "scene:create", name });
                          setName("");
                        }
                      }}
                    >
                      <label>
                        Nama scene baru
                        <input
                          value={name}
                          maxLength={60}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                      <button disabled={!connected || !name.trim()}>
                        Buat scene
                      </button>
                    </form>
                    <label>
                      Kolom grid
                      <input
                        type="number"
                        min={4}
                        max={100}
                        value={scene.grid.columns}
                        onChange={(e) =>
                          action({
                            type: "grid",
                            columns: e.target.valueAsNumber,
                          })
                        }
                      />
                    </label>
                    <label>
                      Ukuran peta · {Math.round((scene.mapScale ?? 1) * 100)}%
                      <input
                        type="range"
                        min={50}
                        max={400}
                        step={10}
                        value={(scene.mapScale ?? 1) * 100}
                        onChange={(e) =>
                          action({
                            type: "grid",
                            mapScale: e.target.valueAsNumber / 100,
                          })
                        }
                      />
                    </label>
                    <label>
                      Jarak per kotak
                      <input
                        type="number"
                        min={0.1}
                        max={1000}
                        value={scene.grid.distance}
                        onChange={(e) =>
                          action({
                            type: "grid",
                            distance: e.target.valueAsNumber,
                          })
                        }
                      />
                    </label>
                    <label>
                      Satuan
                      <select
                        value={scene.grid.unit}
                        onChange={(e) =>
                          action({ type: "grid", unit: e.target.value })
                        }
                      >
                        <option value="ft">feet</option>
                        <option value="m">meter</option>
                      </select>
                    </label>
                    <label>
                      Diagonal
                      <select
                        value={scene.grid.diagonal}
                        onChange={(e) =>
                          action({ type: "grid", diagonal: e.target.value })
                        }
                      >
                        <option value="grid">Satu kotak (D&D 5e)</option>
                        <option value="euclidean">Garis lurus</option>
                      </select>
                    </label>
                    {(["fog", "vision", "daylight"] as const).map((key) => (
                      <label className="board-checkbox" key={key}>
                        <input
                          type="checkbox"
                          checked={scene[key]}
                          onChange={(e) =>
                            action({
                              type: "scene:settings",
                              [key]: e.target.checked,
                            })
                          }
                        />
                        {
                          {
                            fog: "Fog manual",
                            vision: "Vision dengan dinding",
                            daylight: "Cahaya siang",
                          }[key]
                        }
                      </label>
                    ))}
                    <button
                      disabled={!connected}
                      onClick={() => action({ type: "fog:reset" })}
                    >
                      Tutup semua fog
                    </button>
                    <p>
                      Buka fog dengan alat Buka fog. Dinding membatasi
                      pandangan; cahaya dipakai saat cahaya siang mati.
                    </p>
                  </>
                ) : (
                  <p>
                    {scene.name}. Skala: {scene.grid.distance} {scene.grid.unit}{" "}
                    / kotak. Pengaturan scene dikelola DM.
                  </p>
                )}
              </>
            )}
            {tab === "token" && (
              <>
                {dm && dmMenu && (
                  <label className="token-picker">
                    Token yang diatur
                    <select value={tokenId || ""} onChange={(e) => setTokenId(e.target.value || null)}>
                      <option value="">Pilih token…</option>
                      {scene.tokens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                )}
                {editable && token ? (
                  <details className="token-stats">
                    <summary>{token.name} — buka statistik</summary>
                    {(
                      ["hp", "maxHp", "initiative", "visionRange", "lightRange"] as const
                    ).filter(key => !["visionRange", "lightRange"].includes(key) || dm && dmMenu).map((key) => (
                      <label key={key}>
                        {
                          {
                            hp: "HP",
                            maxHp: "HP maksimum",
                            initiative: "Initiative",
                            visionRange: `Jarak pandang (${scene.grid.unit})`,
                            lightRange: `Jarak cahaya (${scene.grid.unit})`,
                          }[key]
                        }
                        <input
                          type="number"
                          min={key === "initiative" ? -100 : 0}
                          max={["visionRange", "lightRange"].includes(key) ? 1000 : 9999}
                          value={token[key] ?? (key === "visionRange" ? 60 : 0)}
                          onChange={(e) =>
                            action({
                              type: "token:update",
                              id: token.id,
                              [key]: e.target.valueAsNumber,
                            })
                          }
                        />
                      </label>
                    ))}
                    {conditions.map((c) => (
                      <label className="board-checkbox" key={c}>
                        <input
                          type="checkbox"
                          checked={token.conditions?.includes(c) || false}
                          onChange={(e) =>
                            action({
                              type: "token:update",
                              id: token.id,
                              conditions: e.target.checked
                                ? [...(token.conditions || []), c]
                                : token.conditions?.filter((v) => v !== c) ||
                                  [],
                            })
                          }
                        />
                        {c}
                      </label>
                    ))}
                    {dm && dmMenu && (
                      <label className="board-checkbox">
                        <input
                          type="checkbox"
                          checked={!!token.hidden}
                          onChange={(e) =>
                            action({
                              type: "token:update",
                              id: token.id,
                              hidden: e.target.checked,
                            })
                          }
                        />
                        Sembunyikan dari pemain
                      </label>
                    )}
                  </details>
                ) : (
                  <p>
                    Pilih token milikmu untuk mengatur HP dan kondisi. DM dapat
                    mengatur semua token.
                  </p>
                )}
              </>
            )}
            {tab === "combat" && (
              <>
                <strong>
                  {scene.combat.active
                    ? `Ronde ${scene.combat.round}`
                    : "Combat belum dimulai"}
                </strong>
                <ol>
                  {(scene.combat.active ? scene.combat.ids.map((id) => scene.tokens.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t) : scene.tokens).map((t) => (
                    <li key={t.id} className={scene.combat.ids[scene.combat.turn] === t.id ? "current-turn" : ""}>
                      {t.name}{" "}
                      {dm && dmMenu ? <label className="combat-initiative">Initiative <input type="number" min={-100} max={9999} value={t.initiative ?? 0} onChange={(e) => action({ type: "token:update", id: t.id, initiative: e.target.valueAsNumber })} /></label> : `(${t.initiative ?? 0})`}{" "}
                      {t.conditions?.includes("Defeated") ? "Defeated" : ""}
                    </li>
                  ))}
                </ol>
                {dm && dmMenu && (
                  <button
                    disabled={!connected || !scene.tokens.length}
                    onClick={() =>
                      action({
                        type: "combat:set",
                        ids: scene.tokens.map((t) => t.id),
                      })
                    }
                  >
                    Mulai / urutkan semua token
                  </button>
                )}
                {scene.combat.active &&
                  (dm ||
                    scene.tokens.find(
                      (t) => t.id === scene.combat.ids[scene.combat.turn],
                    )?.ownerId === playerId) && (
                    <button
                      disabled={!connected}
                      onClick={() => action({ type: "combat:next" })}
                    >
                      Giliran berikutnya
                    </button>
                  )}
                {dm && dmMenu && scene.combat.active && (
                  <button
                    disabled={!connected}
                    onClick={() => action({ type: "combat:end" })}
                  >
                    Akhiri combat
                  </button>
                )}
              </>
            )}
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
        setWaypoints([]);
        setDraft({ a, b: a });
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (draft && drawing.current) {
          e.stopPropagation();
          setDraft({ ...draft, b: point(e) });
        }
      }}
      onPointerUp={(e) => {
        drawing.current = false;
        if (!draft) return;
        e.stopPropagation();
        const b = point(e);
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        if (tool === "ruler") {
          setDraft({ ...draft, b });
          return;
        }
        if (tool !== "select" && tool !== "ping")
          action({ type: "mark:add", kind: tool, a: draft.a, b, text });
        setDraft(null);
      }}
      onPointerCancel={() => {
        drawing.current = false;
        setDraft(null);
        setWaypoints([]);
      }}
    >
      {scene.marks
        .filter((m) => m.kind !== "reveal")
        .map((m) => shape(m, m.id))}
      {draft &&
        tool !== "ruler" &&
        shape({ kind: tool as Mark["kind"], ...draft, text }, "draft")}
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
      {fogCells}
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
      {Object.values(pointers).map((pointer) => (
        <g key={pointer.playerId} className="board-pointer" transform={`translate(${(pointer.x / 100) * width} ${(pointer.y / 100) * height})`}>
          <circle r="7" />
          <text x="11" y="4">{pointer.name}</text>
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
