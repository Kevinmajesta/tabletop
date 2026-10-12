import express from "express";
import multer from "multer";
import { createServer } from "node:http";
import { randomBytes, randomUUID, randomInt } from "node:crypto";
import { Worker } from "node:worker_threads";
import { persistence } from "./persistence.js";
import { resources } from "./resources.js";
import { DicePool } from "./dice-pool.js";
import { applyInitiative } from "./initiative.js";
import { adjustHealth, updatePrepared } from "./character-actions.js";
import compression from "compression";
import { readdir, stat, unlink } from "node:fs/promises";
import type { DiceRoll } from "./dice-physics.js";
import {
  newScene,
  visible,
  blocked,
  conditions,
  type Scene,
  type BoardToken,
  type Mark,
} from "./tabletop.js";
import { catalogFor, validateBuild, type Character } from "./characters.js";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { gameKinds, gameCatalog, newGame, gameView, gameAction, declareGame, type Game, type GameKind } from './minigames.js';

type Member = { name: string; secret: string };
type Token = BoardToken;
type Message = {
  id: string;
  name: string;
  text: string;
  time: number;
  kind: "chat" | "roll" | "system";
  roll?: Omit<DiceRoll, "frames">;
};
type Room = {
  id: string;
  title: string;
  dmKey: string;
  map: string | null;
  members: Record<string, Member>;
  tokens: Token[];
  messages: Message[];
  scenes?: Scene[];
  activeSceneId?: string;
  characters?: Character[];
  minigames?: Game[];
};
type SafeRoom = Omit<Room, "dmKey" | "members"> & {
  members: { id: string; name: string; online: boolean; dm: boolean }[];
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(root, "data");
const uploadDir = path.join(dataDir, "uploads");
mkdirSync(uploadDir, { recursive: true });
const dbFile = path.join(dataDir, "rooms.json");
let rooms: Record<string, Room> = {};
try {
  if (existsSync(dbFile)) rooms = JSON.parse(readFileSync(dbFile, "utf8"));
} catch (error) {
  console.error("Gagal membaca data ruang:", error);
  process.exit(1);
}

const campaignStorage = persistence(
  dbFile,
  () => rooms,
  (status) => {
    for (const socket of io.sockets.sockets.values())
      if (socket.data.roomId) socket.emit("campaign:saved", { status });
  },
);
const save = campaignStorage.save;
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    void campaignStorage
      .flush()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  });

const app = express();
const http = createServer(app);
const io = new Server(http, { maxHttpBufferSize: 1e6 });
app.use(compression());
app.use(express.json({ limit: "16kb" }));
app.get("/api/character-catalog", (_req, res) =>
  res.json(catalogFor({ ruleset: "srd-2024" })),
);
app.use("/uploads", express.static(uploadDir, { maxAge: "1d" }));
const code = () => randomBytes(4).toString("hex").toUpperCase();
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const admission = new Map<string, { start: number; count: number }>();
function admitted(key: string, limit: number) {
  const now = Date.now();
  for (const [id, entry] of admission)
    if (now - entry.start > 60000) admission.delete(id);
  const entry = admission.get(key) || { start: now, count: 0 };
  entry.count++;
  admission.set(key, entry);
  return entry.count <= limit;
}

app.post("/api/rooms", (req, res) => {
  if (!admitted(`create:${req.ip}`, 10)) {
    res
      .status(429)
      .json({ error: "Terlalu banyak ruang baru. Tunggu satu menit." });
    return;
  }
  const title = clean(req.body?.title, 60) || "Petualangan Baru";
  let id = code();
  while (rooms[id]) id = code();
  const dmKey = randomBytes(24).toString("hex");
  rooms[id] = {
    id,
    title,
    dmKey,
    map: null,
    members: {},
    tokens: [],
    messages: [],
  };
  save();
  res.json({ id, dmKey });
});

app.get("/api/rooms/:id", (req, res) => {
  const room = rooms[req.params.id.toUpperCase()];
  if (!room) {
    res.status(404).json({ error: "Ruang tidak ditemukan." });
    return;
  }
  res.json({ id: room.id, title: room.title });
});

function sceneFor(room: Room) {
  if (!room.scenes?.length) {
    const scene = newScene("Peta pertama", randomUUID());
    scene.map = room.map;
    scene.tokens = room.tokens;
    room.scenes = [scene];
    room.activeSceneId = scene.id;
  }
  return room.scenes.find((s) => s.id === room.activeSceneId) || room.scenes[0];
}
function safeRoom(room: Room, playerId = "", dm = false): SafeRoom {
  const scene = sceneFor(room);
  const tokens = scene.tokens
    .filter(
      (t) =>
        (!t.minigame || gameKinds.includes(t.minigame)) &&
        (dm || (!t.hidden && (t.ownerId === playerId || visible(t, scene, playerId)))),
    )
    .map((t) => ({
      ...t,
      characterRevision: room.characters?.find((c) => c.id === t.characterId)
        ?.revision,
    }));
  const combatIds = scene.combat.ids.filter((id) =>
    tokens.some((t) => t.id === id),
  );
  const sceneView = {
    ...scene,
    tokens,
    marks: scene.marks.filter(
      (m) =>
        dm ||
        ["wall", "light", "reveal"].includes(m.kind) ||
        visible(m.a, scene, playerId),
    ),
    combat: {
      ...scene.combat,
      ids: combatIds,
      turn: combatIds.indexOf(scene.combat.ids[scene.combat.turn]),
    },
  };
  const connected = Array.from(io.sockets.sockets.values()).filter(
    (s) => s.data.roomId === room.id,
  );
  return {
    id: room.id,
    title: room.title,
    map: scene.map,
    tokens,
    messages: room.messages,
    minigames: (room.minigames || []).filter(game => gameKinds.includes(game.kind) && (tokens.some(token => token.id === game.tokenId) || (game.declaration && game.players.includes(playerId) && scene.tokens.some(token => token.id === game.tokenId)))).map(game => gameView(game, playerId, dm)),
    activeSceneId: scene.id,
    scenes: dm
      ? room.scenes!.map((s) =>
          s.id === scene.id ? sceneView : { ...s, tokens: [], marks: [] },
        )
      : [sceneView],
    characters: (room.characters || [])
      .filter((c) => dm || c.ownerId === playerId)
      .map((c) => ({
        ...c,
        sheet: {
          ...c.sheet,
          features: c.sheet.features.map((feature) => {
            if (feature.desc.some((text) => text.trim())) return feature;
            const entry = catalogFor({ ruleset: "srd-2024" }).traits.find(
              (trait) => trait.name === feature.name,
            );
            return entry ? { ...feature, desc: entry.desc || [] } : feature;
          }),
        },
      })),
    members: Object.entries(room.members).map(([id, member]) => ({
      id,
      name: member.name,
      online: connected.some((s) => s.data.playerId === id),
      dm: connected.some((s) => s.data.playerId === id && s.data.isDM),
    })),
  };
}
const sentStates = new WeakMap<object, SafeRoom>();
function broadcast(room: Room) {
  for (const socket of io.sockets.sockets.values())
    if (socket.data.roomId === room.id) {
      const next = safeRoom(room, socket.data.playerId, socket.data.isDM);
      const previous = sentStates.get(socket);
      if (!socket.data.patches || !previous || previous.id !== next.id)
        socket.emit("room:state", next);
      else {
        const patch: Record<string, unknown> = {};
        for (const key of Object.keys(next) as (keyof SafeRoom)[])
          if (JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
            patch[key] = next[key];
        if (Object.keys(patch).length)
          socket.emit("room:patch", { id: next.id, patch });
      }
      sentStates.set(socket, structuredClone(next));
    }
}
const resizeFlushes = new Map<string, ReturnType<typeof setTimeout>>();
function flushResize(room: Room) {
  if (resizeFlushes.has(room.id)) return;
  resizeFlushes.set(
    room.id,
    setTimeout(() => {
      resizeFlushes.delete(room.id);
      save();
      broadcast(room);
    }, 100),
  );
}
const dicePool = new DicePool(2);
let activeSimulations = 0;
const roomRollTimes = new Map<string, number>();
const pendingCallers = new Set<string>();
const pendingRooms = new Set<string>();
const jobs: { run: () => Promise<void> }[] = [];
function drainJobs() {
  while (activeSimulations < 2 && jobs.length) {
    const job = jobs.shift()!;
    activeSimulations++;
    void job.run().finally(() => {
      activeSimulations--;
      drainJobs();
    });
  }
}
function scheduleRoll(
  sides: number,
  count: number,
  modifier: number,
): Promise<DiceRoll> {
  return new Promise((resolve, reject) => {
    jobs.push({
      run: async () => {
        try {
          resolve(await physicalRoll(sides, count, modifier));
        } catch (error) {
          reject(error);
        }
      },
    });
    drainJobs();
  });
}

function physicalRoll(
  sides: number,
  count: number,
  modifier: number,
): Promise<DiceRoll> {
  return dicePool.roll(sides, count, modifier);
}

const undoStates = new Map<
  string,
  { scenes?: Scene[]; characters?: Character[]; activeSceneId?:string; after: string }
>();
const pendingExports=new Set<string>();
io.on("connection", (socket) => {
  socket.on("campaign:undo", (reply?: (result: unknown) => void) => {
    const room = rooms[socket.data.roomId];
    if (!room || !socket.data.isDM) {
      if (typeof reply === "function") reply({ error: "Hanya DM boleh undo." });
      return;
    }
    const previous = undoStates.get(room.id);
    if (!previous) {
      if (typeof reply === "function")
        reply({ error: "Belum ada aksi DM yang bisa di-undo." });
      return;
    }
    if (
      JSON.stringify({ scenes: room.scenes, characters: room.characters }) !==
      previous.after
    ) {
      if (typeof reply === "function")
        reply({
          error:
            "Campaign berubah setelah aksi itu. Undo dibatalkan agar perubahan pemain tidak tertimpa.",
        });
      return;
    }
    room.scenes = previous.scenes;
    const currentRevisions=new Map((room.characters || []).map(c=>[c.id,c.revision]));
    room.characters = previous.characters?.map(c=>({...c,revision:Math.max(c.revision,currentRevisions.get(c.id) || 0)+1}));
    if(previous.activeSceneId)room.activeSceneId=previous.activeSceneId;
    const active = sceneFor(room);
    room.map = active.map;
    room.tokens = active.tokens;
    undoStates.delete(room.id);
    save();
    broadcast(room);
    if (typeof reply === "function") reply({ ok: true });
  });
  socket.on("campaign:export", async (reply?: (result: unknown) => void) => {
    const room = rooms[socket.data.roomId];
    if (!room || !socket.data.isDM) {
      if (typeof reply === "function")
        reply({ error: "Hanya DM boleh export campaign." });
      return;
    }
    const { dmKey, members, ...campaign } = room;
    if(pendingExports.size>=1 || !admitted(`export:${socket.handshake.address}`,2)){if(typeof reply==='function')reply({error:'Backup sedang berjalan atau terlalu sering. Tunggu satu menit.'});return;}
    pendingExports.add(room.id);
    const references = new Set<string>();
    for (const scene of room.scenes || []) {
      if (scene.map) references.add(scene.map);
      for (const token of scene.tokens) references.add(token.image);
    }
    if (room.map) references.add(room.map);
    try {
      const images = [];
      let total = 0;
      for (const url of references) {
        if (!url.startsWith("/uploads/")) continue;
        const size=(await stat(path.join(uploadDir,path.basename(url)))).size;
        if(total+size>100*1024*1024)throw new Error('Backup gambar maksimal 100 MB.');
        const buffer = await import("node:fs/promises").then((fs) =>
          fs.readFile(path.join(uploadDir, path.basename(url))),
        );
        total += buffer.length;
        if (total > 100 * 1024 * 1024)
          throw new Error("Backup gambar maksimal 100 MB.");
        images.push({ url, data: buffer.toString("base64") });
      }
      if (typeof reply === "function") reply({ version: 1, campaign, images });
    } catch (error) {
      if (typeof reply === "function")
        reply({
          error: error instanceof Error ? error.message : "Export gagal.",
        });
    } finally {pendingExports.delete(room.id);}
  });
  socket.on(
    "character:action",
    (
      payload: unknown,
      reply?: (result: { ok?: boolean; id?: string; error?: string }) => void,
    ) => {
      const respond = (result: {
        ok?: boolean;
        id?: string;
        error?: string;
      }) => {
        if (typeof reply === "function") reply(result);
      };
      const room = rooms[socket.data.roomId];
      if (!room || !payload || typeof payload !== "object") {
        respond({ error: "Masuk ke ruang dulu." });
        return;
      }
      if (!admitted(`character:${socket.handshake.address}`, 100)) {
        respond({ error: "Terlalu banyak perubahan karakter." });
        return;
      }
      const p = payload as Record<string, unknown>;
      room.characters ||= [];
      let character = room.characters.find((c) => c.id === p.id);
      if (
        p.type !== "create" &&
        (!character ||
          (!socket.data.isDM && character.ownerId !== socket.data.playerId))
      ) {
        respond({ error: "Karakter tidak tersedia." });
        return;
      }
      if (p.type === "create" || p.type === "rebuild") {
        if (p.type === "create" && room.characters.length >= 100) {
          respond({ error: "Maksimal 100 karakter per campaign." });
          return;
        }
        if (p.type === "rebuild" && p.revision !== character!.revision) {
          respond({
            error: "Karakter berubah di perangkat lain. Buka ulang sheet.",
          });
          return;
        }
        const result = validateBuild(p.build);
        if (result.errors.length || !result.build || !result.sheet) {
          respond({ error: result.errors.join("\n") });
          return;
        }
        if (p.type === "create") {
          character = {
            id: randomUUID(),
            ownerId: socket.data.playerId,
            revision: 1,
            ruleset: result.build.ruleset || "srd-2014",
            build: result.build,
            sheet: result.sheet,
            hp: result.sheet.hp,
            tempHp: 0,
            slotsUsed: 0,
            spellSlotsUsed: {},
            deathSuccess: 0,
            deathFailure: 0,
            conditions: [],
          };
          room.characters.push(character);
        } else {
          const gainedHp = Math.max(0, result.sheet.hp - character!.sheet.hp);
          character!.ruleset = result.build.ruleset || "srd-2014";
          character!.build = result.build;
          character!.sheet = result.sheet;
          character!.hp = Math.min(character!.hp + gainedHp, result.sheet.hp);
          character!.slotsUsed = Math.min(
            character!.slotsUsed,
            result.sheet.slots,
          );
          character!.spellSlotsUsed = Object.fromEntries(
            Object.entries(result.sheet.slotsByLevel || {}).map(
              ([level, count]) => [
                level,
                Math.min(character!.spellSlotsUsed?.[level] || 0, count),
              ],
            ),
          );
          character!.revision++;
        }
      } else if (
        p.type === "health" ||
        p.type === "concentration" ||
        p.type === "prepared"
      ) {
        if (p.revision !== character!.revision) {
          respond({
            error: "Karakter berubah. Coba lagi dengan data terbaru.",
          });
          return;
        }
        try {
          if (p.type === "health") {
            if (p.kind !== "damage" && p.kind !== "heal")
              throw new Error("Pilih damage atau heal.");
            adjustHealth(character!, p.kind, p.amount as number);
          }
          if (p.type === "prepared") updatePrepared(character!, p.spells);
          if (p.type === "concentration") {
            const id = clean(p.spell, 120);
            const spell = catalogFor({ ruleset: "srd-2024" }).spells.find(
              (s) => s.index === id,
            );
            if (
              id &&
              (!character!.sheet.prepared.includes(id) ||
                !(spell as typeof spell & { concentration?: boolean })
                  ?.concentration)
            )
              throw new Error("Pilih spell concentration yang prepared.");
            character!.concentration = id;
            character!.concentrationSaveDC = undefined;
          }
        } catch (error) {
          respond({
            error: error instanceof Error ? error.message : "Perubahan gagal.",
          });
          return;
        }
        character!.revision++;
      } else if (p.type === "rest") {
        if (p.revision !== character!.revision) {
          respond({ error: "Sheet berubah. Coba lagi." });
          return;
        }
        if (p.rest !== "short" && p.rest !== "long") {
          respond({ error: "Pilih short atau long rest." });
          return;
        }
        character!.resourcesUsed ||= {};
        for (const resource of resources(character!.build, character!.sheet)) {
          if (p.rest === "long" || resource.shortRest)
            character!.resourcesUsed[resource.id] = 0;
          else if (resource.shortRecovery)
            character!.resourcesUsed[resource.id] = Math.max(
              0,
              (character!.resourcesUsed[resource.id] || 0) -
                resource.shortRecovery,
            );
        }
        if (p.rest === "long") {
          character!.hp = character!.sheet.hp;
          character!.tempHp = 0;
          character!.deathSuccess = 0;
          character!.deathFailure = 0;
          character!.concentration = "";
          character!.concentrationSaveDC = undefined;
        }
        if (p.rest === "long" || character!.build.classId === "warlock") {
          character!.spellSlotsUsed = {};
          character!.slotsUsed = 0;
        }
        character!.revision++;
      } else if (p.type === "resources") {
        if (p.revision !== character!.revision) {
          respond({
            error: "Karakter berubah. Coba lagi dengan data terbaru.",
          });
          return;
        }
        for (const key of [
          "hp",
          "tempHp",
          "slotsUsed",
          "deathSuccess",
          "deathFailure",
        ] as const)
          if (
            typeof p[key] === "number" &&
            Number.isInteger(p[key]) &&
            Number.isFinite(p[key])
          )
            character![key] = Math.max(
              0,
              Math.min(
                key === "hp"
                  ? character!.sheet.hp
                  : key === "slotsUsed"
                    ? character!.sheet.slots
                    : key.startsWith("death")
                      ? 3
                      : 999,
                p[key] as number,
              ),
            );
        if (p.spellSlotsUsed && typeof p.spellSlotsUsed === "object") {
          const submitted = p.spellSlotsUsed as Record<string, unknown>;
          character!.spellSlotsUsed ||= {};
          for (const [level, count] of Object.entries(
            character!.sheet.slotsByLevel || {},
          )) {
            const value = submitted[level];
            if (typeof value === "number" && Number.isInteger(value))
              character!.spellSlotsUsed[level] = Math.max(
                0,
                Math.min(count, value),
              );
          }
        }
        if (p.resourcesUsed && typeof p.resourcesUsed === "object") {
          character!.resourcesUsed ||= {};
          for (const resource of resources(
            character!.build,
            character!.sheet,
          )) {
            const value = (p.resourcesUsed as Record<string, unknown>)[
              resource.id
            ];
            if (typeof value === "number" && Number.isInteger(value))
              character!.resourcesUsed[resource.id] = Math.max(
                0,
                Math.min(resource.max, value),
              );
          }
        }
        character!.revision++;
      } else if (p.type === "link") {
        const token = sceneFor(room).tokens.find((t) => t.id === p.tokenId);
        if (
          !token ||
          (!socket.data.isDM && token.ownerId !== socket.data.playerId) ||
          token.ownerId !== character!.ownerId
        ) {
          respond({ error: "Token dan karakter harus dimiliki pemain sama." });
          return;
        }
        token.characterId = character!.id;
      } else if (p.type === "unlink") {
        const token = sceneFor(room).tokens.find((t) => t.id === p.tokenId);
        if (
          !token ||
          token.characterId !== character!.id ||
          (!socket.data.isDM && token.ownerId !== socket.data.playerId)
        ) {
          respond({ error: "Token tidak tersedia." });
          return;
        }
        delete token.characterId;
      } else {
        respond({ error: "Aksi karakter tidak dikenal." });
        return;
      }
      for (const scene of room.scenes || [])
        for (const token of scene.tokens) {
          const linked = room.characters.find(
            (c) => c.id === token.characterId,
          );
          if (linked) {
            token.hp = linked.hp;
            token.maxHp = linked.sheet.hp;
            token.conditions = linked.conditions;
          }
        }
      save();
      broadcast(room);
      respond({ ok: true, id: character!.id });
    },
  );
  socket.on(
    "tabletop:action",
    (
      payload: unknown,
      reply?: (result: { ok?: boolean; error?: string }) => void,
    ) => {
      const fail = (error: string) => {
        if (typeof reply === "function") reply({ error });
      };
      const room = rooms[socket.data.roomId];
      if (!room || !payload || typeof payload !== "object") {
        fail("Masuk ke ruang dulu.");
        return;
      }
      if (!admitted(`tabletop:${socket.handshake.address}`, 180)) {
        fail("Terlalu banyak perubahan. Tunggu sebentar.");
        return;
      }
      const p = payload as Record<string, unknown>;
      const scene = sceneFor(room);
      if (p.sceneId !== scene.id) {
        fail("Scene sudah berganti. Coba lagi.");
        return;
      }
      const dm = socket.data.isDM;
      const beforeUndo = dm
        ? structuredClone({ scenes: room.scenes, characters: room.characters,activeSceneId:room.activeSceneId })
        : undefined;
      const number = (value: unknown, min: number, max: number) =>
        typeof value === "number" && Number.isFinite(value)
          ? Math.max(min, Math.min(max, value))
          : undefined;
      const point = (value: unknown) => {
        if (!value || typeof value !== "object") return undefined;
        const v = value as Record<string, unknown>,
          x = number(v.x, 0, 100),
          y = number(v.y, 0, 100);
        return x === undefined || y === undefined ? undefined : { x, y };
      };
      if (p.type === "grid") {
        if (!dm) {
          fail("Hanya DM bisa mengatur grid.");
          return;
        }
        for (const [key, min, max] of [
          ["columns", 4, 100],
          ["distance", 0.1, 1000],
          ["width", 1, 20000],
          ["height", 1, 20000],
          ["offsetX", 0, 99],
          ["offsetY", 0, 99],
        ] as const) {
          const value = number(p[key], min, max);
          if (value !== undefined)
            scene.grid[key] = key === "columns" ? Math.round(value) : value;
        }
        if (p.unit === "ft" || p.unit === "m") scene.grid.unit = p.unit;
        if (p.diagonal === "grid" || p.diagonal === "euclidean")
          scene.grid.diagonal = p.diagonal;
      } else if (p.type === "scene:create") {
        if (!dm || room.scenes!.length >= 20) {
          fail("Hanya DM bisa membuat scene, maksimal 20.");
          return;
        }
        const created = newScene(
          clean(p.name, 60) || "Scene baru",
          randomUUID(),
        );
        room.scenes!.push(created);
        room.activeSceneId = created.id;
      } else if (p.type === "scene:activate") {
        if (!dm || !room.scenes!.some((s) => s.id === p.id)) {
          fail("Scene tidak tersedia.");
          return;
        }
        room.activeSceneId = p.id as string;
      } else if (p.type === "scene:settings") {
        if (!dm) {
          fail("Hanya DM bisa mengatur visibilitas.");
          return;
        }
        for (const key of ["fog", "vision", "daylight"] as const)
          if (typeof p[key] === "boolean") scene[key] = p[key];
      } else if (p.type === "token:update") {
        const token = scene.tokens.find((t) => t.id === p.id);
        if (!token || (!dm && token.ownerId !== socket.data.playerId)) {
          fail("Token bukan milikmu.");
          return;
        }
        const linkedCharacter = room.characters?.find(
          (c) => c.id === token.characterId,
        );
        if (
          linkedCharacter &&
          (p.hp !== undefined ||
            p.maxHp !== undefined ||
            p.conditions !== undefined) &&
          p.characterRevision !== linkedCharacter.revision
        ) {
          fail("Karakter berubah. Buka data token terbaru sebelum mengedit.");
          return;
        }
        for (const key of [
          "hp",
          "maxHp",
          "initiative",
          "visionRange",
        ] as const) {
          if (key === "visionRange" && !dm) continue;
          const value = number(
            p[key],
            key === "initiative" ? -100 : 0,
            key === "visionRange" ? 1000 : 9999,
          );
          if (value !== undefined) token[key] = value;
        }
        if (typeof p.hidden === "boolean" && dm) token.hidden = p.hidden;
        if (typeof p.visionSource === "boolean" && dm)
          token.visionSource = p.visionSource;
        if (Array.isArray(p.conditions))
          token.conditions = [
            ...new Set(
              p.conditions.filter(
                (v): v is string =>
                  typeof v === "string" && conditions.includes(v),
              ),
            ),
          ];
        if (token.characterId) {
          const linked = room.characters?.find(
            (c) => c.id === token.characterId,
          );
          if (linked) {
            if (p.hp !== undefined)
              linked.hp = Math.min(linked.sheet.hp, token.hp ?? linked.hp);
            if (p.conditions !== undefined)
              linked.conditions = token.conditions || [];
            if (p.hp !== undefined || p.conditions !== undefined)
              linked.revision++;
            for (const s of room.scenes || [])
              for (const t of s.tokens)
                if (t.characterId === linked.id) {
                  t.hp = linked.hp;
                  t.maxHp = linked.sheet.hp;
                  t.conditions = linked.conditions;
                }
          }
        }
      } else if (p.type === "mark:add") {
        const a = point(p.a),
          b = point(p.b);
        const kind = p.kind as Mark["kind"];
        if (
          ![
            "line",
            "circle",
            "cone",
            "rect",
            "text",
            "wall",
            "light",
            "reveal",
          ].includes(kind) ||
          !a ||
          !b
        ) {
          fail("Bentuk tidak valid.");
          return;
        }
        if (["wall", "light", "reveal"].includes(kind) && !dm) {
          fail("Alat ini khusus DM.");
          return;
        }
        if (scene.marks.length >= 200) {
          fail("Maksimal 200 bentuk per scene. Hapus bentuk lama dulu.");
          return;
        }
        scene.marks.push({
          id: randomUUID(),
          ownerId: socket.data.playerId,
          kind,
          a,
          b,
          text: clean(p.text, 120),
        });
      } else if (p.type === "mark:remove") {
        const mark = scene.marks.find((m) => m.id === p.id);
        if (!mark || (!dm && mark.ownerId !== socket.data.playerId)) {
          fail("Bentuk bukan milikmu.");
          return;
        }
        scene.marks = scene.marks.filter((m) => m.id !== mark.id);
      } else if (p.type === "fog:reset") {
        if (!dm) {
          fail("Hanya DM bisa menutup fog.");
          return;
        }
        scene.marks = scene.marks.filter((m) => m.kind !== "reveal");
        scene.fog = true;
      } else if (p.type === "combat:set") {
        if (!dm || !Array.isArray(p.ids)) {
          fail("Hanya DM mengatur combat.");
          return;
        }
        scene.combat.ids = [
          ...new Set(
            p.ids.filter(
              (id): id is string =>
                typeof id === "string" && scene.tokens.some((t) => t.id === id),
            ),
          ),
        ].sort(
          (a, b) =>
            (scene.tokens.find((t) => t.id === b)?.initiative ?? 0) -
            (scene.tokens.find((t) => t.id === a)?.initiative ?? 0),
        );
        scene.combat.turn = 0;
        scene.combat.round = 1;
        scene.combat.active = scene.combat.ids.length > 0;
      } else if (p.type === "combat:next") {
        const current = scene.tokens.find(
          (t) => t.id === scene.combat.ids[scene.combat.turn],
        );
        if (
          !scene.combat.active ||
          (!dm && current?.ownerId !== socket.data.playerId)
        ) {
          fail("Bukan giliranmu.");
          return;
        }
        const eligible = scene.combat.ids.filter(
          (id) =>
            !scene.tokens
              .find((t) => t.id === id)
              ?.conditions?.includes("Defeated"),
        );
        if (!eligible.length) {
          scene.combat.active = false;
        } else
          do {
            scene.combat.turn++;
            if (scene.combat.turn >= scene.combat.ids.length) {
              scene.combat.turn = 0;
              scene.combat.round++;
            }
          } while (!eligible.includes(scene.combat.ids[scene.combat.turn]));
      } else if (p.type === "combat:end") {
        if (!dm) {
          fail("Hanya DM mengakhiri combat.");
          return;
        }
        scene.combat.active = false;
      } else {
        fail("Alat tidak dikenal.");
        return;
      }
      const active = sceneFor(room);
      room.map = active.map;
      room.tokens = active.tokens;
      if (beforeUndo)
        undoStates.set(room.id, {
          ...beforeUndo,
          after: JSON.stringify({
            scenes: room.scenes,
            characters: room.characters,
          }),
        });
      save();
      broadcast(room);
      if (typeof reply === "function") reply({ ok: true });
    },
  );
  socket.on("tabletop:ping", (payload: unknown) => {
    const room = rooms[socket.data.roomId];
    if (
      !room ||
      !payload ||
      typeof payload !== "object" ||
      !admitted(`ping:${socket.handshake.address}`, 60)
    )
      return;
    const p = payload as Record<string, unknown>,
      scene = sceneFor(room);
    if (
      p.sceneId !== scene.id ||
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y)
    )
      return;
    const location = {
      x: Math.max(0, Math.min(100, p.x)),
      y: Math.max(0, Math.min(100, p.y)),
    };
    if (!socket.data.isDM && !visible(location, scene, socket.data.playerId))
      return;
    for (const peer of io.sockets.sockets.values())
      if (
        peer.data.roomId === room.id &&
        (peer.data.isDM || visible(location, scene, peer.data.playerId))
      )
        peer.emit("tabletop:ping", {
          ...location,
          id: randomUUID(),
          sceneId: scene.id,
          name: room.members[socket.data.playerId].name,
          focus: !!p.focus && !!socket.data.isDM,
        });
  });
  socket.on("tabletop:ruler", (payload: unknown) => {
    const room = rooms[socket.data.roomId];
    if (
      !room ||
      !payload ||
      typeof payload !== "object" ||
      !admitted(`ruler:${socket.handshake.address}`, 300)
    )
      return;
    const p = payload as Record<string, unknown>,
      scene = sceneFor(room);
    if (
      p.sceneId !== scene.id ||
      !Array.isArray(p.points) ||
      p.points.length > 32
    )
      return;
    const points = p.points.filter(
      (point): point is { x: number; y: number } =>
        !!point &&
        typeof point === "object" &&
        typeof point.x === "number" &&
        typeof point.y === "number" &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 0 &&
        point.x <= 100 &&
        point.y >= 0 &&
        point.y <= 100,
    );
    if (points.length !== p.points.length) return;
    if (
      !socket.data.isDM &&
      !points.every((point) => visible(point, scene, socket.data.playerId))
    )
      return;
    for (const peer of io.sockets.sockets.values())
      if (
        peer.data.roomId === room.id &&
        (peer.data.isDM ||
          points.every((point) => visible(point, scene, peer.data.playerId)))
      )
        peer.emit("tabletop:ruler", {
          sceneId: scene.id,
          playerId: socket.data.playerId,
          name: room.members[socket.data.playerId].name,
          points,
        });
  });
  socket.on(
    "room:join",
    (payload: unknown, reply: (result: unknown) => void) => {
      if (
        typeof reply !== "function" ||
        !payload ||
        typeof payload !== "object"
      )
        return;
      if (!admitted(`join:${socket.handshake.address}`, 60)) {
        reply({ error: "Terlalu banyak permintaan masuk. Tunggu satu menit." });
        return;
      }
      const p = payload as Record<string, unknown>;
      const roomId = clean(p.roomId, 20).toUpperCase();
      const room = rooms[roomId];
      const name = clean(p.name, 24);
      const playerId = clean(p.playerId, 100);
      const playerSecret = clean(p.playerSecret, 100);
      if (!room || !name || !playerId || !playerSecret) {
        reply({
          error: "Data masuk tidak lengkap atau ruang tidak ditemukan.",
        });
        return;
      }
      if (
        room.members[playerId] &&
        room.members[playerId].secret !== playerSecret
      ) {
        reply({ error: "Identitas pemain tidak cocok." });
        return;
      }
      if (socket.data.roomId) socket.leave(socket.data.roomId);
      room.members[playerId] = { name, secret: playerSecret };
      socket.data.roomId = roomId;
      socket.data.playerId = playerId;
      socket.data.isDM = p.dmKey === room.dmKey;
      socket.join(roomId);
      save();
      reply({ ok: true, isDM: socket.data.isDM });
      broadcast(room);
    },
  );

  socket.on("room:patches", () => {
    socket.data.patches = true;
  });
  socket.on('minigame:action', (payload: unknown, reply?: (result: { error?: string; ok?: boolean }) => void) => {
    const respond = (result: { error?: string; ok?: boolean }) => { if (typeof reply === 'function') reply(result); };
    const room = rooms[socket.data.roomId];
    if (!room || !payload || typeof payload !== 'object') { respond({ error: 'Ruang tidak tersedia.' }); return; }
    if (!admitted(`minigame:${socket.id}`, 120)) { respond({ error: 'Terlalu banyak aksi. Tunggu sebentar.' }); return; }
    const action = payload as Record<string, unknown>;
    if (typeof action.type !== 'string') { respond({ error: 'Aksi permainan tidak valid.' }); return; }
    const scene = sceneFor(room);
    if (action.type === 'create') {
      if (!socket.data.isDM || !gameKinds.includes(action.kind as GameKind) || (room.minigames?.length || 0) >= 30) { respond({ error: 'Token tidak bisa ditambahkan.' }); return; }
      const id = randomUUID();
      const kind = action.kind as GameKind;
      const positions = Array.from({ length: 64 }, (_, i) => ({ x: 15 + (i % 8) * 10, y: 15 + Math.floor(i / 8) * 10 }));
      const position = positions.find(point => scene.tokens.every(token => Math.hypot(token.x - point.x, token.y - point.y) >= 9)) || positions[(room.minigames?.length || 0) % positions.length];
      scene.tokens.push({ id, ownerId: socket.data.playerId, name: gameCatalog[kind].name, image: '', minigame: kind, ...position, size: 1.5 });
      room.tokens = scene.tokens;
      (room.minigames ??= []).push(newGame(id, kind));
    } else {
      const token = scene.tokens.find(token => token.id === action.tokenId);
      const game = room.minigames?.find(game => game.tokenId === token?.id);
      if (!token || !game || !gameKinds.includes(game.kind) || (!socket.data.isDM && !(game.declaration && game.players.includes(socket.data.playerId)) && (token.hidden || !visible(token, scene, socket.data.playerId)))) { respond({ error: 'Token permainan tidak tersedia.' }); return; }
      let error: string | null;
      if (action.type === 'declare') {
        if (!socket.data.isDM) { respond({ error: 'Hanya GM boleh deklarasikan permainan.' }); return; }
        const roomPeers = [...io.sockets.sockets.values()].filter(peer => peer.data.roomId === room.id);
        const gmIds = new Set(roomPeers.filter(peer => peer.data.isDM).map(peer => peer.data.playerId));
        const peers = gameCatalog[game.kind].mode === 'duel' ? roomPeers : roomPeers.filter(peer => !gmIds.has(peer.data.playerId));
        const eligible = [...new Set(peers.map(peer => peer.data.playerId as string))].filter(id => (gameCatalog[game.kind].mode === 'duel' && gmIds.has(id)) || (!token.hidden && visible(token, scene, id)));
        if (gameCatalog[game.kind].mode === 'duel') {
          if (!Array.isArray(action.players) || action.players.length !== 2 || !action.players.every(id => typeof id === 'string' && eligible.includes(id))) { respond({ error: 'Pilih dua pemain online yang bisa melihat token.' }); return; }
          error = declareGame(game, action.players as string[]);
        } else {
          if (!eligible.length) { respond({ error: 'Belum ada pemain online yang bisa melihat token.' }); return; }
          error = declareGame(game, eligible);
        }
      } else {
        if (['join', 'leave', 'remove-player'].includes(action.type) || (action.type === 'start' && !game.declaration)) { respond({ error: 'GM harus deklarasikan peserta lewat token.' }); return; }
        error = gameAction(game, socket.data.playerId, socket.data.isDM, action, randomInt);
      }
      if (error) { respond({ error }); return; }
    }
    save(); broadcast(room); respond({ ok: true });
  });
  socket.on("token:move", (payload: unknown) => {
    const room = rooms[socket.data.roomId];
    if (!room || !payload || typeof payload !== "object") return;
    const p = payload as Record<string, unknown>;
    const scene = sceneFor(room);
    const token = scene.tokens.find((t) => t.id === p.id);
    if (!token || (!socket.data.isDM && token.ownerId !== socket.data.playerId))
      return;
    if (
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y)
    )
      return;
    const destination = {
      x: Math.max(0, Math.min(100, p.x)),
      y: Math.max(0, Math.min(100, p.y)),
    };
    if (token.x === destination.x && token.y === destination.y) return;
    if (
      !socket.data.isDM &&
      scene.vision &&
      (!visible(destination, scene, socket.data.playerId) ||
        blocked(token, destination, scene.marks))
    )
      return;
    if (
      !admitted(`move:${socket.id}`, 3600) ||
      !admitted(`move-room:${room.id}`, 18000)
    )
      return;
    Object.assign(token, destination);
    flushResize(room);
  });

  socket.on("token:resize", (payload: unknown) => {
    const room = rooms[socket.data.roomId];
    if (!room || !payload || typeof payload !== "object") return;
    const p = payload as Record<string, unknown>;
    const token = sceneFor(room).tokens.find((t) => t.id === p.id);
    if (!token || (!socket.data.isDM && token.ownerId !== socket.data.playerId))
      return;
    if (typeof p.size !== "number" || !Number.isFinite(p.size)) return;
    const size = Math.round(Math.max(0.25, Math.min(6, p.size)) * 100) / 100;
    if ((token.size ?? 1) === size) return;
    if (
      !admitted(`resize:${socket.handshake.address}`, 120) ||
      !admitted(`resize-room:${room.id}`, 240)
    )
      return;
    token.size = size;
    flushResize(room);
  });

  socket.on("token:remove", (id: unknown) => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    const scene = sceneFor(room);
    const token = scene.tokens.find((t) => t.id === id);
    if (!token || (!socket.data.isDM && token.ownerId !== socket.data.playerId))
      return;
    scene.tokens = scene.tokens.filter((t) => t.id !== id);
    room.minigames = room.minigames?.filter(game => game.tokenId !== id);
    scene.combat.ids = scene.combat.ids.filter((value) => value !== id);
    scene.combat.turn = Math.min(
      scene.combat.turn,
      Math.max(0, scene.combat.ids.length - 1),
    );
    room.tokens = scene.tokens;
    save();
    broadcast(room);
  });

  socket.on("chat:send", (text: unknown) => {
    const room = rooms[socket.data.roomId];
    const message = clean(text, 500);
    if (!room || !message) return;
    room.messages.push({
      id: randomUUID(),
      name: room.members[socket.data.playerId]?.name || "Pemain",
      text: message,
      time: Date.now(),
      kind: "chat",
    });
    room.messages = room.messages.slice(-100);
    save();
    broadcast(room);
  });

  socket.on(
    "dice:roll",
    async (
      expression: unknown,
      reply?: (result: { error?: string; ok?: boolean }) => void,
    ) => {
      const room = rooms[socket.data.roomId];
      let characterName = "";
      let initiativeCharacter:
        | { id: string; ownerId: string; sceneId: string }
        | undefined;
      let rollMode: "normal" | "advantage" | "disadvantage" = "normal";
      if (room && expression && typeof expression === "object") {
        const request = expression as Record<string, unknown>;
        const character = room.characters?.find(
          (c) =>
            c.id === request.characterId &&
            (socket.data.isDM || c.ownerId === socket.data.playerId),
        );
        if (!character) {
          if (typeof reply === "function")
            reply({ error: "Karakter tidak tersedia." });
          return;
        }
        let bonus: number | undefined;
        if (request.kind === "skill")
          bonus = character.sheet.skills.find(
            (s) => s.id === request.key,
          )?.bonus;
        if (request.kind === "save")
          bonus = character.sheet.saves.find(
            (s) => s.id === request.key,
          )?.bonus;
        if (
          request.kind === "ability" &&
          ["str", "dex", "con", "int", "wis", "cha"].includes(
            String(request.key),
          )
        )
          bonus =
            character.sheet.modifiers[
              request.key as keyof typeof character.sheet.modifiers
            ];
        if (request.kind === "attack")
          bonus = character.sheet.attacks.find(
            (s) => s.id === request.key,
          )?.bonus;
        if (request.kind === "initiative") bonus = character.sheet.initiative;
        if (request.kind === "initiative") {
          const scene = sceneFor(room);
          if (
            !scene.tokens.some(
              (token) =>
                token.characterId === character.id &&
                (socket.data.isDM || token.ownerId === socket.data.playerId),
            )
          ) {
            if (typeof reply === "function")
              reply({
                error:
                  "Hubungkan karakter ke token pada scene aktif sebelum roll initiative.",
              });
            return;
          }
          initiativeCharacter = {
            id: character.id,
            ownerId: socket.data.playerId,
            sceneId: scene.id,
          };
        }
        if (request.kind === "spell") bonus = character.sheet.spellAttack;
        const damage =
          request.kind === "damage"
            ? character.sheet.attacks.find((s) => s.id === request.key)?.damage
            : undefined;
        if ((typeof bonus !== "number" || !Number.isFinite(bonus)) && !damage) {
          if (typeof reply === "function")
            reply({ error: "Roll tidak tersedia." });
          return;
        }
        if (damage && /^\d+$/.test(damage)) {
          room.messages.push({
            id: randomUUID(),
            name: character.sheet.name,
            text: `Unarmed Strike: ${damage} damage tetap (tanpa die).`,
            time: Date.now(),
            kind: "roll",
          });
          room.messages = room.messages.slice(-100);
          save();
          broadcast(room);
          if (typeof reply === "function") reply({ ok: true });
          return;
        }
        rollMode =
          request.mode === "advantage" || request.mode === "disadvantage"
            ? request.mode
            : "normal";
        expression = damage
          ? request.critical === true
            ? damage.replace(/^(\d+)d/, (_, n) => `${Number(n) * 2}d`)
            : damage
          : `${rollMode === "normal" ? 1 : 2}d20${bonus! >= 0 ? "+" : ""}${bonus}`;
        if (damage) rollMode = "normal";
        characterName = character.sheet.name;
      }
      if (!room || typeof expression !== "string" || expression.length > 64)
        return;
      const match = expression
        .replace(/\s/g, "")
        .toLowerCase()
        .match(/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/);
      if (!match) return;
      const count = Number(match[1]);
      if (count < 1 || count > 20) return;
      const caller = socket.handshake.address;
      if (
        pendingCallers.has(caller) ||
        pendingRooms.has(room.id) ||
        jobs.length >= 8 ||
        !admitted(`roll:${caller}`, 20) ||
        Date.now() - (roomRollTimes.get(room.id) || 0) < 1500
      ) {
        if (typeof reply === "function")
          reply({ error: "Tunggu sebentar sebelum lempar lagi." });
        return;
      }
      roomRollTimes.set(room.id, Date.now());
      const sides = Number(match[2]);
      const modifier = Number(match[3] || 0);
      let simulation: DiceRoll;
      pendingCallers.add(caller);
      pendingRooms.add(room.id);
      try {
        simulation = await scheduleRoll(sides, count, modifier);
      } catch (error) {
        console.error("Dice simulation failed:", error);
        if (typeof reply === "function")
          reply({ error: "Dadu belum berhenti. Coba lempar lagi." });
        return;
      } finally {
        pendingCallers.delete(caller);
        pendingRooms.delete(room.id);
      }
      if (rollMode !== "normal")
        simulation.total =
          (rollMode === "advantage"
            ? Math.max(...simulation.values)
            : Math.min(...simulation.values)) + modifier;
      if (!socket.connected || socket.data.roomId !== room.id) return;
      if (initiativeCharacter) {
        const scene = sceneFor(room);
        const character = room.characters?.find(
          (c) => c.id === initiativeCharacter!.id,
        );
        if (
          scene.id !== initiativeCharacter.sceneId ||
          !character ||
          (!socket.data.isDM && character.ownerId !== socket.data.playerId)
        ) {
          if (typeof reply === "function")
            reply({
              error:
                "Scene atau karakter berubah saat roll. Ulang initiative pada scene aktif.",
            });
          return;
        }
        if (
          !applyInitiative(
            scene,
            initiativeCharacter.id,
            initiativeCharacter.ownerId,
            simulation.total,
            !!socket.data.isDM,
          )
        ) {
          if (typeof reply === "function")
            reply({
              error:
                "Token tidak lagi terhubung. Ulang setelah menghubungkan token.",
            });
          return;
        }
      }
      const { frames, ...roll } = simulation;
      const id = randomUUID();
      const name =
        characterName || room.members[socket.data.playerId]?.name || "Pemain";
      const text = `${rollMode === "normal" ? "" : rollMode + ": "}${count}d${sides}${modifier ? (modifier > 0 ? "+" : "") + modifier : ""} → [${roll.values.join(", ")}]${modifier ? ` ${modifier > 0 ? "+" : "−"} ${Math.abs(modifier)}` : ""} = ${roll.total}`;
      io.to(room.id).emit("dice:animation", {
        id,
        name,
        text,
        roll: simulation,
      });
      room.messages.push({
        id,
        name,
        text,
        time: Date.now(),
        kind: "roll",
        roll,
      });
      room.messages = room.messages.slice(-100);
      save();
      broadcast(room);
      if (typeof reply === "function") reply({ ok: true });
    },
  );

  socket.on("disconnect", () => {
    const room = rooms[socket.data.roomId];
    if (room) broadcast(room);
  });
});

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) =>
    cb(
      null,
      `${randomUUID()}${({ "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" } as Record<string, string>)[file.mimetype] || ".bin"}`,
    ),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(
      null,
      ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.mimetype,
      ),
    );
  },
});

let pendingUploadBytes = 0;
let activeUploads = 0;
const uploadCapacity = 1024 * 1024 * 1024;
async function uploadedBytes() {
  const files = await readdir(uploadDir);
  const sizes = await Promise.all(
    files.map((file) => stat(path.join(uploadDir, file)).then((s) => s.size)),
  );
  return sizes.reduce((sum, size) => sum + size, 0);
}
app.post(
  "/api/rooms/:id/upload/:kind",
  (req, res, next) => {
    const room = rooms[req.params.id.toUpperCase()];
    const player = clean(req.headers["x-player-id"], 100);
    const kind = req.params.kind;
    const secret = req.headers["x-player-secret"];
    if (
      !room ||
      !Object.hasOwn(room.members, player) ||
      typeof secret !== "string" ||
      !secret ||
      room.members[player].secret !== secret ||
      !["map", "token"].includes(kind) ||
      (kind === "map" && req.headers["x-dm-key"] !== room.dmKey)
    ) {
      res.status(403).json({ error: "Upload ditolak." });
      return;
    }
    if (!admitted(`upload:${player}`, 12)) {
      res
        .status(429)
        .json({ error: "Terlalu banyak upload. Tunggu satu menit." });
      return;
    }
    if (activeUploads >= 4) {
      res.status(429).json({ error: "Upload sedang penuh. Coba lagi." });
      return;
    }
    activeUploads++;
    pendingUploadBytes += 10 * 1024 * 1024;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeUploads--;
      pendingUploadBytes -= 10 * 1024 * 1024;
    };
    res.once("finish", release);
    res.once("close", release);
    void uploadedBytes()
      .then((bytes) => {
        if (bytes + pendingUploadBytes > uploadCapacity) {
          res.status(507).json({ error: "Penyimpanan gambar penuh." });
          return;
        }
        next();
      })
      .catch(next);
  },
  upload.single("image"),
  (req, res) => {
    const room = rooms[req.params.id.toUpperCase()];
    const kind = req.params.kind;
    const playerId = clean(req.headers["x-player-id"], 100);
    const playerSecret = clean(req.headers["x-player-secret"], 100);
    const authorized = room && room.members[playerId]?.secret === playerSecret;
    const dm = room && req.headers["x-dm-key"] === room.dmKey;
    if (
      !room ||
      !authorized ||
      !["map", "token"].includes(kind) ||
      (kind === "map" && !dm) ||
      !req.file
    ) {
      if (req.file) unlinkSync(req.file.path);
      res
        .status(403)
        .json({
          error:
            "Upload ditolak. Periksa akses dan format gambar (PNG, JPG, WebP, GIF).",
        });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    const scene = sceneFor(room);
    if (kind === "token" && scene.tokens.length >= 100) {
      unlinkSync(req.file.path);
      res.status(429).json({ error: "Maksimal 100 token per scene." });
      return;
    }
    if (kind === "map") {
      const previous = scene.map;
      scene.map = url;
      room.map = url;
      if (
        previous?.startsWith("/uploads/") &&
        !Object.values(rooms).some(
          (r) =>
            r.map === previous ||
            r.tokens.some((t) => t.image === previous) ||
            r.scenes?.some(
              (s) =>
                s.map === previous ||
                s.tokens.some((t) => t.image === previous),
            ),
        )
      )
        void unlink(path.join(uploadDir, path.basename(previous))).catch(
          (error) => console.error("Gagal menghapus peta lama:", error),
        );
    } else
      scene.tokens.push({
        id: randomUUID(),
        name: clean(req.body.name, 32) || "Token",
        image: url,
        x: 50,
        y: 50,
        ownerId: playerId,
        size: 1,
      });
    room.tokens = scene.tokens;
    save();
    broadcast(room);
    res.json({ ok: true });
  },
);

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res
      .status(error instanceof multer.MulterError ? 413 : 500)
      .json({
        error:
          error instanceof multer.MulterError
            ? "Gambar maksimal 10 MB."
            : "Terjadi kesalahan server.",
      });
  },
);

const dist = path.join(root, "dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
const port = Number(process.env.PORT) || 3001;
http.listen(port, "0.0.0.0", () =>
  console.log(`Meja Petualang berjalan di http://localhost:${port}`),
);
