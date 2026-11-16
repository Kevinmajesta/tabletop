import { useEffect, useRef, useState } from "react";
import SpeciesCard from "./SpeciesCard";
import ActionEconomy, { Requirement } from "./ActionEconomy";
import SpellBook from "./SpellBook";
import OptionPicker from "./OptionPicker";
import CurrencyWallet from "./CurrencyWallet";
import { choiceLabel } from "./character-labels";
import "./species-guide.css";
import { speciesSource, speciesForSource, selectSpecies } from "../server/catalog/motm";
import type { Socket } from "socket.io-client";
import {
  BookOpen,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Dice5,
} from "lucide-react";
import {
  abilities,
  asiLevels,
  featFor,
  featsForLevel,
  buildGroups,
  revisedCatalog as catalog,
  deriveSheet,
  emptyBuild,
  equipmentChatDescription,
  finalScores,
  levelFourFeats,
  modifier,
  pointCost,
  spellLimits,
  standardArray,
  validateBuild,
  equippedWeapons,
  visibleAttacks,
  masteryGlossary,
  weaponMasteryCount,
  type BuildInput,
  type Ability,
  type Character,
  type ChoiceGroup,
} from "../server/characters";
import type { BoardToken } from "../server/tabletop";
import "./characters.css";
import "./builder.css";
import { resources } from "../server/resources";

const steps = [
  "Class",
  "Background",
  "Species",
  "Ability Scores",
  "Equipment",
  "Spells",
  "Detail",
  "Review",
];
const REVIEW_STEP = steps.length - 1;
// Setiap grup pilihan ditampilkan di langkah asalnya (class, background, species, ...).
function stepForGroup(g: ChoiceGroup) {
  if (g.kind === "ability" || g.key.startsWith("level4.")) return 3;
  if (g.kind === "equipment") return 4;
  if (g.kind === "spell") return 5;
  if (/^(background\.|origin\.)/.test(g.key)) return 1;
  if (/^(race\.|subrace\.|human\.|trait\.|motm\.|character\.languages)/.test(g.key)) return 2;
  return 0;
}
// Pilihan milik class (dibuang saat ganti class); sisanya (background/species) dipertahankan.
// Weapon Mastery: id mastery sebuah senjata, penjelasan di builder, dan daftar di sheet.
const masteryOf = (weaponId: string) => (catalog.equipment.find((w) => w.index === weaponId) as { mastery?: { index: string } } | undefined)?.mastery?.index;
function MasteryGlossaryList({ only }: { only?: string[] }) {
  const ids = only?.length ? Object.keys(masteryGlossary).filter((id) => only.includes(id)) : Object.keys(masteryGlossary);
  return (
    <dl className="mastery-glossary">
      {ids.map((id) => (
        <div key={id}>
          <dt><b className="mastery-tag">{masteryGlossary[id].name}</b></dt>
          <dd>{masteryGlossary[id].text}</dd>
        </div>
      ))}
    </dl>
  );
}
function WeaponMasteryIntro({ classId, count }: { classId: string; count: number }) {
  const swapAll = ["paladin", "ranger", "rogue"].includes(classId);
  return (
    <div className="mastery-intro">
      <p>
        <b>Weapon Mastery</b> memberi efek khusus setiap kali kamu menyerang dengan <b>jenis senjata</b> yang kamu kuasai.
        Pilih <b>{count}</b> jenis senjata di bawah. Efeknya hanya berlaku saat memakai senjata itu, dan tiap senjata punya satu mastery tetap
        (misalnya Handaxe selalu <b>Vex</b>).
      </p>
      <p className="builder-muted">
        Setelah Long Rest kamu boleh mengganti {swapAll ? "pilihan senjata ini" : "satu pilihan"} lewat Edit pilihan. Saat roll attack,
        efek mastery otomatis muncul di kartu roll di chat sebagai pengingat.
      </p>
      <details>
        <summary>Arti tiap mastery</summary>
        <MasteryGlossaryList />
      </details>
    </div>
  );
}
function WeaponMasterySheet({ character }: { character: Character }) {
  const picks = character.build.choices["class.weapon-mastery"] || [];
  const count = weaponMasteryCount(character.build.classId, character.build.level || 1);
  const rows = picks.map((id) => {
    const weapon = catalog.equipment.find((w) => w.index === id) as { name: string; mastery?: { index: string } } | undefined;
    const attack = character.sheet.attacks.find((x) => x.id === id);
    const masteryId = weapon?.mastery?.index || "";
    return { id, name: weapon?.name || id, masteryId, note: attack?.mastery?.note || masteryGlossary[masteryId]?.text || "", owned: !!attack };
  });
  return (
    <section className="mastery-sheet">
      <h4>Weapon Mastery <small>{picks.length}/{count}</small></h4>
      {!rows.length ? (
        <p className="sheet-empty-note">Belum memilih senjata. Buka <b>Edit pilihan</b> → langkah Class → Weapon Mastery.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <b className="mastery-tag">{masteryGlossary[row.masteryId]?.name || row.masteryId}</b>
                {!row.owned && <small className="mastery-missing">tidak ada di inventory</small>}
              </div>
              <p>{row.note}</p>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>Apa itu Weapon Mastery?</summary>
        <p className="sheet-empty-note">Efek khusus saat menyerang dengan jenis senjata yang kamu kuasai. Efeknya muncul otomatis di kartu roll attack sebagai pengingat; jalankan efeknya bersama DM. Pilihan bisa diganti setelah Long Rest lewat Edit pilihan.</p>
        <MasteryGlossaryList />
      </details>
    </section>
  );
}
type SubclassFeatureRow = { index: string; name: string; level?: number; desc?: string[] };
type SubclassBlock = { kind: "p" | "sub"; text: string } | { kind: "table"; rows: string[][] };
type SubclassFeature = { name: string; summary: string; blocks: SubclassBlock[] };
const normName = (text: string) => text.toLowerCase().replace(/[’']/g, "'").trim();
const firstSentence = (text: string) => {
  const match = text.match(/^.+?[.!?](?=\s|$)/);
  const sentence = (match ? match[0] : text).trim();
  return sentence.length > 170 ? `${sentence.slice(0, 167).trimEnd()}…` : sentence;
};
// Teks subclass XPHB berbentuk baris-baris: "Level N", nama fitur, paragraf, sub-judul pendek, dan baris tabel "a | b".
// Nama fitur dicocokkan dengan catalog.features agar sub-judul (mis. "Archer") tidak dikira fitur baru.
function parseSubclassText(sub: { name: string; description?: string; levels?: { level: number; features?: { index: string }[] }[] }, features: SubclassFeatureRow[]) {
  const id = (sub as { index?: string }).index || "";
  const ownFeatures = features.filter((feature) => feature.index.startsWith(`xphb:${id}:`) || feature.index.startsWith(`${id}-`) || !!sub.levels?.some((row) => row.features?.some((ref) => ref.index === feature.index)));
  const known = new Set(ownFeatures.map((feature) => normName(feature.name)));
  const indoSummary = new Map(features.filter((feature) => /^[a-z-]+-\d+$/.test(feature.index) && feature.index.startsWith(`${id}-`)).map((feature) => [normName(feature.name), feature.desc?.[0] || ""]));
  let tagline = "";
  const intro: string[] = [];
  const levels: { level: number; features: SubclassFeature[] }[] = [];
  let level = 3;
  let feature: SubclassFeature | null = null;
  const lines = (sub.description || "").split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const levelMatch = line.match(/^Level (\d+)$/);
    if (levelMatch) { level = Number(levelMatch[1]); feature = null; continue; }
    // Nama subclass menandai blok intro (tagline + flavor), yang kadang muncul setelah fitur pertama.
    if (normName(line) === normName(sub.name)) { feature = null; continue; }
    const isHeading = line.length <= 48 && !/[.,:;]$/.test(line) && !line.includes("|");
    if (isHeading && known.has(normName(line))) {
      let group = levels.find((row) => row.level === level);
      if (!group) levels.push((group = { level, features: [] }));
      feature = { name: line, summary: "", blocks: [] };
      group.features.push(feature);
      continue;
    }
    if (!feature) {
      if (!tagline && isHeading) tagline = line;
      else intro.push(line);
      continue;
    }
    if (line.includes("|")) {
      const cells = line.split("|").map((cell) => cell.trim());
      const last = feature.blocks[feature.blocks.length - 1];
      if (last?.kind === "table") last.rows.push(cells);
      else feature.blocks.push({ kind: "table", rows: [cells] });
    } else if (isHeading) feature.blocks.push({ kind: "sub", text: line });
    else feature.blocks.push({ kind: "p", text: line });
  }
  for (const group of levels)
    for (const row of group.features) {
      const firstText = row.blocks.find((block) => block.kind === "p") as { text: string } | undefined;
      row.summary = indoSummary.get(normName(row.name)) || (firstText ? firstSentence(firstText.text) : "");
    }
  levels.sort((a, b) => a.level - b.level);
  return { tagline, intro: intro.join(" "), levels };
}
// Teks background XPHB: paragraf cerita, lalu pasangan "Label:" + isi (Ability Scores, Feat, Skill, Tool, Equipment).
const abilityShort = (name: string) => name.slice(0, 3).toUpperCase();
function parseBackgroundText(desc: string) {
  const lines = (desc || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const lore: string[] = [];
  const fields: Record<string, string> = {};
  let key = "";
  for (const line of lines) {
    const label = line.match(/^([A-Za-z ]+):$/);
    if (label) { key = label[1].toLowerCase(); fields[key] = ""; continue; }
    if (key) fields[key] = fields[key] ? `${fields[key]} ${line}` : line;
    else lore.push(line);
  }
  const equipmentRaw = fields["equipment"] || "";
  const options = [...equipmentRaw.matchAll(/\(([A-Z])\)\s*([^;]+?)(?=;?\s*(?:or\s*)?\([A-Z]\)|$)/g)].map((m) => ({ label: `Opsi ${m[1]}`, text: m[2].replace(/\s*\(same as above\)/g, "").trim().replace(/[;,]\s*$/, "") }));
  return {
    lore: lore.join(" "),
    abilities: (fields["ability scores"] || "").split(",").map((part) => part.trim()).filter(Boolean),
    feat: fields["feat"] || "",
    skills: fields["skill proficiencies"] || "",
    tool: fields["tool proficiency"] || "",
    equipment: options.length ? options : equipmentRaw ? [{ label: "", text: equipmentRaw }] : [],
  };
}
const classChoice = (key: string) => /^(class\.|subclass\.|feature\.|invocation\.|level4\.)/.test(key);
const backgroundChoice = (key: string) => /^(background\.|origin\.)/.test(key);
const keepChoices = (choices: Record<string, string[]>, drop: (key: string) => boolean) =>
  Object.fromEntries(Object.entries(choices).filter(([key]) => !drop(key)));
export default function Characters({
  initialOpen = false,
  requestedCharacter,
  characters: savedCharacters,
  socket,
  connected,
  tokens,
  playerId,
  dm,
  uploadToken,
}: {
  initialOpen?: boolean;
  requestedCharacter?: { id: string; nonce: number } | null;
  characters: Character[];
  socket: Socket | null;
  connected: boolean;
  tokens: BoardToken[];
  playerId: string;
  dm: boolean;
  uploadToken?: (file: File, name: string, characterId: string) => void;
}) {
  const characters = savedCharacters.filter((c) => c.ruleset === "srd-2024");
  // Jumlah Hit Dice yang dipakai saat Short Rest dari sheet.
  const [restDice, setRestDice] = useState(0);
  const [rollMode, setRollMode] = useState<
    "normal" | "advantage" | "disadvantage"
  >("normal");
  const [quickOpen, setQuickOpen] = useState(false);
  useEffect(() => {
    const close = () => setQuickOpen(false);
    for (const name of ["tabletop:tools-open", "tabletop:popover-open", "tabletop:pages-open"]) window.addEventListener(name, close);
    return () => { for (const name of ["tabletop:tools-open", "tabletop:popover-open", "tabletop:pages-open"]) window.removeEventListener(name, close); };
  }, []);
  useEffect(() => {
    if (quickOpen) window.dispatchEvent(new Event("tabletop:quick-open"));
  }, [quickOpen]);
  const [critical, setCritical] = useState(false);
  const [sheetTab, setSheetTab] = useState("combat");
  const [healthAmount, setHealthAmount] = useState(1);
  // Token picked during creation; uploaded and linked automatically once the sheet is saved.
  const [tokenFile, setTokenFile] = useState<File | null>(null);
  const [tokenPreview, setTokenPreview] = useState("");
  useEffect(() => {
    if (!tokenFile) { setTokenPreview(""); return; }
    const url = URL.createObjectURL(tokenFile);
    setTokenPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [tokenFile]);
  const quickRef = useRef<HTMLDivElement>(null);
  const saveQuick = () => {
    const el = quickRef.current;
    if (el) localStorage.setItem("meja-quick-sheet", JSON.stringify({ left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height }));
  };
  // Restore saved geometry when the panel mounts; resize saved on pointer release.
  const quickPanel = (node: HTMLDivElement | null) => {
    quickRef.current = node;
    if (!node || node.dataset.restored) return;
    node.dataset.restored = "1";
    try { Object.assign(node.style, JSON.parse(localStorage.getItem("meja-quick-sheet") || "{}")); } catch { /* ignore bad data */ }
    if (node.style.top) node.style.bottom = "auto";
  };
  const dragQuick = (e: React.PointerEvent) => {
    const el = quickRef.current;
    if (!el || (e.target as HTMLElement).closest("button")) return;
    const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = (ev: PointerEvent) => {
      el.style.left = `${Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - 60)}px`;
      el.style.top = `${Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - 40)}px`;
      el.style.bottom = "auto";
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); saveQuick(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const [speciesBook, setSpeciesBook] = useState("phb-2024");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(initialOpen),
    [build, setBuild] = useState<BuildInput | null>(null),
    [step, setStep] = useState(0),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<{ id: string; revision: number } | null>(
      null,
    );
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationTarget, setValidationTarget] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!validationTarget) return;
    const target = document.getElementById(validationTarget);
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    setValidationTarget(null);
  }, [step, validationTarget]);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (build) setSpeciesBook(speciesSource(build.race)); }, [build?.race]);
  const character = characters.find((c) => c.id === selected);
  useEffect(() => {
    if (
      requestedCharacter &&
      characters.some((c) => c.id === requestedCharacter.id)
    ) {
      setSelected(requestedCharacter.id);
      setBuild(null);
      setOpen(true);
    }
  }, [requestedCharacter]);
  useEffect(() => {
    if (!character && characters[0]) setSelected(characters[0].id);
  }, [character, characters]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else {
      dialog.current?.close();
      trigger.current?.focus();
    }
  }, [open]);
  function request(
    payload: Record<string, unknown>,
    done?: (id?: string) => void,
  ) {
    if (!socket || !connected || busy) return;
    setBusy(true);
    setError("");
    socket
      .timeout(10000)
      .emit(
        "character:action",
        payload,
        (err: Error | null, result?: { error?: string; id?: string }) => {
          setBusy(false);
          if (err || result?.error)
            setError(
              result?.error ||
                "Perubahan belum terkonfirmasi. Periksa koneksi.",
            );
          else done?.(result?.id);
        },
      );
  }
  function sendToChat(title: string, description: string) {
    if (!socket || !connected) return;
    socket.emit("chat:send", `${title}\n${description}`.slice(0, 500));
  }
  function roll(kind: string, key = "") {
    if (!character || !socket || busy) return;
    setBusy(true);
    setError("");
    socket
      .timeout(15000)
      .emit(
        "dice:roll",
        {
          characterId: character.id,
          kind,
          key,
          mode: rollMode,
          critical: kind === "damage" && critical,
        },
        (err: Error | null, result?: { error?: string }) => {
          setBusy(false);
          if (err || result?.error)
            setError(result?.error || "Roll belum terkonfirmasi.");
          else setOpen(false);
        },
      );
  }
  const groups = build ? buildGroups(build) : [];
  function choose(group: ChoiceGroup, id: string) {
    if (!build) return;
    // Buang pilihan yang sudah tidak ada di daftar (mis. bahasa yang kini dipilih di grup lain), supaya slotnya terbuka lagi.
    const allowed = new Set(group.options.map((o) => o.id));
    const previous = (build.choices[group.key] || []).filter((v) => allowed.has(v));
    const values = previous.includes(id)
      ? previous.filter((v) => v !== id)
      : group.count === 1
        ? [id]
        : previous.length < group.count
          ? [...previous, id]
          : previous;
    setBuild({ ...build, choices: { ...build.choices, [group.key]: values } });
  }
  // Pilihan yang opsinya cuma satu (mis. skill tetap dari background) langsung diisi otomatis.
  useEffect(() => {
    if (!build) return;
    const add: Record<string, string[]> = {};
    for (const g of buildGroups(build)) {
      // Hanya pilihan tetap dari background/species; grup yang opsinya bergantung pilihan lain (mis. expertise) tidak diisi diam-diam.
      if (!/^(background\.|race\.|subrace\.|trait\.)/.test(g.key)) continue;
      if (!g.options.length || g.options.length !== g.count) continue;
      const current = (build.choices[g.key] || []).filter((id) => g.options.some((o) => o.id === id));
      if (current.length < g.count) add[g.key] = g.options.map((o) => o.id);
    }
    if (!Object.keys(add).length) return;
    // Skill/bahasa tetap yang baru masuk dilepas dari grup lain (mis. skill class yang sama), supaya slotnya bisa diganti.
    const groupsNow = buildGroups(build);
    const kindOf = (key: string) => groupsNow.find((g) => g.key === key)?.kind;
    const choices = { ...build.choices, ...add };
    for (const [key, ids] of Object.entries(add)) {
      const kind = kindOf(key);
      if (kind !== "skill" && kind !== "language") continue;
      for (const g of groupsNow) {
        if (g.key === key || g.kind !== kind || add[g.key]) continue;
        const kept = (choices[g.key] || []).filter((id) => !ids.includes(id));
        if (kept.length !== (choices[g.key] || []).length) choices[g.key] = kept;
      }
    }
    setBuild({ ...build, choices });
  }, [build]);
  // Skill/bahasa tidak boleh ganda: kumpulkan yang sudah dipegang grup lain beserta asalnya.
  const exclusive = (g: ChoiceGroup) => (g.kind === "skill" || g.kind === "language" || g.key === "origin.skills" || g.key === "human.skilled" ? (g.kind === "language" ? "language" : "skill") : "");
  function takenElsewhere(group: ChoiceGroup) {
    const kind = exclusive(group);
    const taken = new Map<string, string>();
    if (!kind || !build) return taken;
    for (const g of groups) {
      if (g.key === group.key || exclusive(g) !== kind) continue;
      const ids = g.options.length === g.count ? g.options.map((o) => o.id) : (build.choices[g.key] || []).filter((id) => g.options.some((o) => o.id === id));
      const source =
        g.key.startsWith("background.") ? "Background"
        : g.key.startsWith("origin.") ? "Origin feat"
        : g.key.startsWith("subclass.") ? "Subclass"
        : g.key.startsWith("class.") ? "Class"
        : /^(race\.|subrace\.|human\.|trait\.|motm\.)/.test(g.key) ? "Species"
        : g.key === "character.languages" ? "Bahasa karakter"
        : g.name.length > 32 ? `${g.name.slice(0, 30)}…` : g.name;
      for (const id of ids) if (!taken.has(id)) taken.set(id, source);
    }
    return taken;
  }
  function groupUI(group: ChoiceGroup) {
    const taken = takenElsewhere(group);
    return (
      <fieldset key={group.key}>
        <legend id={`character-choice-${group.key}`} tabIndex={-1}>
          {group.name}{" "}
          <small>
            ({build?.choices[group.key]?.filter((v) => group.options.some((o) => o.id === v)).length || 0}/{group.count})
          </small>
        </legend>
        {group.key === "class.weapon-mastery" && <WeaponMasteryIntro classId={build?.classId || ""} count={group.count} />}
        <div className="character-options">
          {group.options.map((option) => {
            const checked = build?.choices[group.key]?.includes(option.id) || false;
            const from = taken.get(option.id);
            return (
              <label key={option.id} className={from ? (checked ? "option-conflict" : "option-taken") : ""}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!!from && !checked}
                  onChange={() => choose(group, option.id)}
                />
                <span>
                  {choiceLabel(option)}
                  {group.key === "class.weapon-mastery" && masteryOf(option.id) && <small className="option-from mastery-option-hint">{masteryGlossary[masteryOf(option.id)!]?.short}</small>}
                  {from && <small className="option-from">{checked ? `Ganda dengan ${from} — ganti` : `Sudah dari ${from}`}</small>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
  // Detail class ala builder: info dasar + progresi fitur per level (level yang sudah dicapai ditandai).
  function classDetail(id: string) {
    const k = catalog.classes.find((c) => c.index === id) as
      | (typeof catalog.classes[number] & { primary_ability?: { desc?: string }; saving_throws?: { name: string }[]; proficiency_choices?: { desc?: string }[]; proficiencies?: { name: string }[] })
      | undefined;
    if (!k) return null;
    const features = (catalog.features as { index: string; name: string; level?: number; desc?: string[] }[]).filter((f) => f.index.startsWith(`xphb:${id}:`));
    const level = id === build?.classId ? build?.level || 1 : 1;
    return (
      <>
        <dl className="builder-facts">
          <div><dt>Hit die</dt><dd>d{k.hit_die}</dd></div>
          <div><dt>Ability utama</dt><dd>{k.primary_ability?.desc || "—"}</dd></div>
          <div><dt>Saving throw</dt><dd>{k.saving_throws?.map((s) => s.name).join(", ") || "—"}</dd></div>
          <div><dt>Skill</dt><dd>{k.proficiency_choices?.[0]?.desc || "—"}</dd></div>
        </dl>
        {!!k.proficiencies?.length && <p className="builder-muted">Proficiency: {k.proficiencies.map((p) => p.name).join(", ")}</p>}
        <h4>Progresi class</h4>
        <ol className="builder-progression">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((lv) => {
            const rows = features.filter((f) => f.level === lv);
            if (!rows.length) return null;
            return (
              <li key={lv} className={lv <= level ? "reached" : ""}>
                <details>
                  <summary><b>Lv {lv}</b> {rows.map((f) => f.name).join(" · ")}</summary>
                  {rows.map((f) => (
                    <div key={f.index}>
                      <h5>{f.name}</h5>
                      <p className="builder-text">{f.desc?.join("\n")}</p>
                    </div>
                  ))}
                </details>
              </li>
            );
          })}
        </ol>
      </>
    );
  }
  // Detail subclass: teks XPHB yang panjang dipecah jadi tagline, sekilas fitur, dan teks lengkap per level.
  function subclassDetail(id: string) {
    const sub = catalog.subclasses.find((s) => s.index === id) as
      | { name: string; description?: string; levels?: { level: number; features?: { index: string }[] }[] }
      | undefined;
    if (!sub) return null;
    const parsed = parseSubclassText(sub, catalog.features as SubclassFeatureRow[]);
    const level = build?.level || 1;
    const glance = parsed.levels.flatMap((group) => group.features.map((feature) => ({ ...feature, level: group.level })));
    const next = glance.find((feature) => feature.level > level);
    return (
      <div className="subclass-detail">
        {parsed.tagline && <p className="subclass-tagline">{parsed.tagline}</p>}
        {parsed.intro && (
          <details className="subclass-lore">
            <summary>Latar cerita</summary>
            <p className="builder-muted">{parsed.intro}</p>
          </details>
        )}
        <dl className="builder-facts">
          <div><dt>Fitur aktif di Lv {level}</dt><dd>{glance.filter((feature) => feature.level <= level).length} fitur</dd></div>
          <div><dt>Fitur berikutnya</dt><dd>{next ? `Lv ${next.level} · ${next.name}` : "Semua sudah terbuka"}</dd></div>
        </dl>
        <h4>Sekilas fitur</h4>
        <ul className="subclass-glance">
          {glance.map((feature) => (
            <li key={`${feature.level}-${feature.name}`} className={feature.level <= level ? "reached" : ""}>
              <b>Lv {feature.level}</b>
              <div>
                <strong>{feature.name}</strong>
                <span>{feature.summary}</span>
              </div>
            </li>
          ))}
        </ul>
        <h4>Teks lengkap</h4>
        <p className="builder-muted">Klik level untuk membuka aturan lengkap tiap fitur. Level yang sudah kamu capai ditandai emas.</p>
        <ol className="builder-progression">
          {parsed.levels.map((group) => (
            <li key={group.level} className={group.level <= level ? "reached" : ""}>
              <details>
                <summary><b>Lv {group.level}</b> {group.features.map((feature) => feature.name).join(" · ")}</summary>
                {group.features.map((feature) => (
                  <div key={feature.name} className="subclass-feature">
                    <h5>{feature.name}</h5>
                    {feature.blocks.map((block, index) =>
                      block.kind === "table" ? (
                        <table key={index} className="subclass-table">
                          <thead><tr>{block.rows[0].map((cell, i) => <th key={i}>{cell}</th>)}</tr></thead>
                          <tbody>{block.rows.slice(1).map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody>
                        </table>
                      ) : block.kind === "sub" ? (
                        <h6 key={index}>{block.text}</h6>
                      ) : (
                        <p key={index} className="builder-text">{block.text}</p>
                      ),
                    )}
                  </div>
                ))}
              </details>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  function stepForIssue(issue: { section: string; groupKey?: string }) {
    const group = groups.find((g) => g.key === issue.groupKey);
    if (group) return stepForGroup(group);
    if (issue.groupKey && ["cantrips", "spells", "prepared"].includes(issue.groupKey)) return 5;
    if (issue.groupKey?.startsWith("asi.")) return 3;
    return ({ identity: 0, ability: 3, proficiency: 0, equipment: 4, spell: 5 } as Record<string, number>)[issue.section] ?? 0;
  }
  const preview = build ? deriveSheet(build) : null;
  const limits = build ? spellLimits(build) : null;
  const validationResult = build ? validateBuild(build) : null;
  const validation = validationResult?.errors || [];
  const issueSteps = new Set((validationResult?.issues || []).map(stepForIssue));
  if (build && !build.name.trim()) issueSteps.add(6);
  if (build && !build.classId) issueSteps.add(0);
  if (build && !build.background) issueSteps.add(1);
  if (build && !build.race) issueSteps.add(2);
  return (
    <>
      <button
        className="character-launch"
        ref={trigger}
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        <BookOpen size={18} />
        Sheet penuh
      </button>
      {character && !build && (
        <aside className="character-quick" aria-label="Quick sheet karakter">
          <button
            className="character-quick-toggle"
            aria-expanded={quickOpen}
            onClick={() => setQuickOpen((value) => !value)}
          >
            {quickOpen ? "Tutup quick sheet" : "Quick sheet"}
          </button>
          {quickOpen && (() => {
            const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
            const avatar = tokens.find((t) => t.characterId === character.id)?.image;
            const hpPct = Math.max(0, Math.min(100, (character.hp / Math.max(1, character.sheet.hp)) * 100));
            const slots = Object.entries(character.sheet.slotsByLevel || {}).filter(([, max]) => max > 0);
            const extra = resources(character.build, character.sheet).filter((resource) => resource.id !== "hit-dice");
            const off = !connected || busy;
            return (
            <div className="character-quick-panel" ref={quickPanel} onPointerUp={saveQuick}>
              {error && <p className="character-error" role="alert">{error}</p>}
              <div className="quick-sheet-heading qs-head" onPointerDown={dragQuick} title="Tarik untuk memindahkan">
                <span className="qs-avatar">{avatar ? <img src={avatar} alt="" /> : character.sheet.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{character.sheet.name}</strong>
                  <span>Lv {character.sheet.level} {character.sheet.className}{character.sheet.subclassName ? ` · ${character.sheet.subclassName}` : ""}</span>
                </div>
                <button type="button" onClick={() => { setOpen(true); setError(""); }} title="Buka sheet penuh">
                  <BookOpen size={14} /> Penuh
                </button>
              </div>

              <div className="qs-hp">
                <div className="qs-hp-top">
                  <span>HP</span>
                  <strong>{character.hp}<small>/{character.sheet.hp}</small></strong>
                  {!!character.tempHp && <em>+{character.tempHp} temp</em>}
                </div>
                <div className="qs-hp-bar"><i style={{ width: `${hpPct}%` }} className={hpPct <= 25 ? "low" : hpPct <= 50 ? "mid" : ""} /></div>
                <div className="qs-hp-actions">
                  <input aria-label="Jumlah damage atau heal" type="number" min={1} max={9999} value={healthAmount} onChange={(event) => setHealthAmount(event.target.valueAsNumber)} />
                  {(["damage", "heal"] as const).map((kind) => (
                    <button
                      key={kind}
                      className={`qs-${kind}`}
                      disabled={off || !Number.isInteger(healthAmount) || healthAmount < 1 || healthAmount > 9999}
                      onClick={() => request({ type: "health", kind, amount: healthAmount, id: character.id, revision: character.revision })}
                    >
                      {kind === "damage" ? "Damage" : "Heal"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="qs-vitals">
                <div><span>AC</span><strong>{character.sheet.ac}</strong></div>
                <button disabled={off} onClick={() => roll("initiative")} title="Roll initiative"><span>Init</span><strong>{sign(character.sheet.initiative)}</strong></button>
                <div><span>Speed</span><strong>{character.sheet.speed}</strong></div>
                <div><span>Prof</span><strong>+{character.sheet.proficiency}</strong></div>
              </div>

              <div className="qs-mode" role="radiogroup" aria-label="Mode d20">
                {([["disadvantage", "Disadv"], ["normal", "Normal"], ["advantage", "Adv"]] as const).map(([mode, label]) => (
                  <button key={mode} type="button" role="radio" aria-checked={rollMode === mode} onClick={() => setRollMode(mode)}>{label}</button>
                ))}
              </div>

              {(!!character.conditions.length || character.concentration) && (
                <div className="quick-status-list" aria-label="Status aktif">
                  {character.conditions.map((condition) => <span key={condition}>{condition}</span>)}
                  {character.concentration && (
                    <span className="qs-conc">◎ {catalog.spells.find((spell) => spell.index === character.concentration)?.name || character.concentration}</span>
                  )}
                </div>
              )}

              <div className="qs-abilities">
                {abilities.map((a) => {
                  const save = character.sheet.saves.find((s) => s.id === a);
                  return (
                    <div key={a}>
                      <button disabled={off} onClick={() => roll("ability", a)} title={`${a.toUpperCase()} check`}>
                        <span>{a.toUpperCase()}</span>
                        <strong>{sign(character.sheet.modifiers[a])}</strong>
                      </button>
                      <button className={save?.proficient ? "prof" : ""} disabled={off} onClick={() => roll("save", a)} title={`${a.toUpperCase()} saving throw`}>
                        Save {sign(save?.bonus ?? 0)}
                      </button>
                    </div>
                  );
                })}
              </div>

              {(!!visibleAttacks(character).length || character.sheet.spellAbility) && (
                <section className="qs-section">
                  <h3>Serangan</h3>
                  {visibleAttacks(character).slice(0, 6).map((attack) => (
                    <div className="qs-attack" key={attack.id}>
                      <span title={attack.name}>{attack.name}{attack.mastery && <b className="mastery-tag" title={`Weapon Mastery · ${attack.mastery.name}: ${attack.mastery.note}`}>{attack.mastery.name}</b>}<Requirement label="?" text="Roll serangan bukan satu aksi tersendiri. Ikuti Attack action atau fitur yang mengizinkan serangan ini." /></span>
                      <button disabled={off} onClick={() => roll("attack", attack.id)}>{sign(attack.bonus)}</button>
                      <button disabled={off} onClick={() => roll("damage", attack.id)}>{attack.damage}</button>
                    </div>
                  ))}
                  {character.sheet.spellAbility && (
                    <div className="qs-attack">
                      <span>Spell · DC {character.sheet.spellDC}</span>
                      <button disabled={off} onClick={() => roll("spell")}>+{character.sheet.spellAttack}</button>
                      <span />
                    </div>
                  )}
                </section>
              )}

              {(!!slots.length || !!extra.length) && (
                <section className="qs-section">
                  <h3>Resource</h3>
                  {slots.map(([level, max]) => {
                    const used = character.spellSlotsUsed?.[level] || 0;
                    return (
                      <div className="qs-resource" key={level}>
                        <span>{character.build.classId === "warlock" ? "Pact" : "Slot"} Lv {level}</span>
                        <span className="qs-pips">{Array.from({ length: max }, (_, i) => <i key={i} className={i < max - used ? "on" : ""} />)}</span>
                        <b>{max - used}/{max}</b>
                      </div>
                    );
                  })}
                  {extra.map((resource) => {
                    const used = character.resourcesUsed?.[resource.id] || 0;
                    return (
                      <div className="qs-resource" key={resource.id}>
                        <span>{resource.name}</span>
                        {resource.max <= 10 ? <span className="qs-pips">{Array.from({ length: resource.max }, (_, i) => <i key={i} className={i < resource.max - used ? "on" : ""} />)}</span> : <span />}
                        <b>{resource.max - used}/{resource.max}</b>
                      </div>
                    );
                  })}
                </section>
              )}

              <details className="qs-section qs-skills">
                <summary>Skills <small>Passive Perception {character.sheet.passivePerception}</small></summary>
                <div>
                  {character.sheet.skills.map((skill) => (
                    <button key={skill.id} disabled={off} onClick={() => roll("skill", skill.id)}>
                      <i className={skill.expertise ? "expertise" : skill.proficient ? "proficient" : ""} />
                      <span>{skill.name}</span>
                      <b>{sign(skill.bonus)}</b>
                    </button>
                  ))}
                </div>
              </details>
            </div>
            );
          })()}
        </aside>
      )}
      <dialog
        className="character-dialog"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <header>
          <div>
            <span>
              D&D 2024 · Level {build?.level || character?.build.level || 1}
            </span>
            <h2>
              {build
                ? editing
                  ? "Edit karakter"
                  : "Buat karakter"
                : character?.sheet.name || "Karakter campaign"}
            </h2>
          </div>
          <button aria-label="Tutup karakter" onClick={() => setOpen(false)}>
            <X size={22} />
          </button>
        </header>
        <div className="character-workspace">
          <aside>
            <button
              disabled={!connected || busy}
              onClick={() => {
                setBuild({ ...emptyBuild(), classId: "", race: "", background: "" });
                setTokenFile(null);
                setEditing(null);
                setStep(0);
                setError("");
              }}
            >
              <Plus size={17} />
              Buat karakter
            </button>
            {characters.map((c) => (
              <button
                key={c.id}
                aria-pressed={!build && c.id === selected}
                onClick={() => {
                  setSelected(c.id);
                  setBuild(null);
                  setEditing(null);
                  setError("");
                }}
              >
                <strong>{c.sheet.name}</strong>
                <small>
                  {c.sheet.raceName} · {c.sheet.className}
                </small>
              </button>
            ))}
            {!characters.length && (
              <p>
                Belum ada karakter. Buat dari awal; pilihan dan sheet tersimpan
                di campaign.
              </p>
            )}
          </aside>
          <main>
            {error && (
              <p className="character-error" role="alert">
                {error}
              </p>
            )}
            {!connected && (
              <p role="status">Koneksi terputus. Tunggu tersambung kembali.</p>
            )}
            {build && (
              <div className="builder-shell">
                <nav
                  className="character-steps"
                  aria-label="Langkah pembuatan karakter"
                >
                  {steps.map((title, i) => (
                    <button
                      key={title}
                      aria-current={i === step ? "step" : undefined}
                      className={i < step ? (issueSteps.has(i) ? "todo" : "done") : ""}
                      onClick={() => setStep(i)}
                    >
                      <b>{i < step ? (issueSteps.has(i) ? "!" : "✓") : i + 1}</b>
                      <span>{title}</span>
                    </button>
                  ))}
                </nav>
                <div className="builder-scroll">
                {step === 0 && (
                  <div className="builder-step">
                    <div className="builder-intro">
                      <p>Pilih class dari daftar, baca progresinya, lalu tekan <b>Pilih</b>. Pilihan class (skill, expertise, fighting style, dll.) muncul di bawah.</p>
                      <label className="builder-level">
                        Level karakter
                        <select
                          value={build.level || 1}
                          onChange={(e) =>
                            setBuild({
                              ...build,
                              level: Number(e.target.value),
                              subclassId: Number(e.target.value) < 3 ? "" : build.subclassId,
                              asi: Number(e.target.value) < 4 ? {} : build.asi,
                              cantrips: [],
                              spells: [],
                              prepared: [],
                            })
                          }
                        >
                          {Array.from({ length: 20 }, (_, index) => index + 1).map((level) => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <OptionPicker
                      label="Class"
                      items={catalog.classes.map((c) => ({
                        id: c.index,
                        name: c.name,
                        sub: `d${c.hit_die} · ${(c as { primary_ability?: { desc?: string } }).primary_ability?.desc || ""}`,
                      }))}
                      selected={build.classId}
                      onSelect={(id) =>
                        id !== build.classId &&
                        setBuild({
                          ...build,
                          classId: id,
                          subclassId: "",
                          choices: keepChoices(build.choices, classChoice),
                          cantrips: [],
                          spells: [],
                          prepared: [],
                          armor: "",
                          shield: false,
                        })
                      }
                      detail={classDetail}
                      onClear={() => setBuild({ ...build, classId: "", subclassId: "", choices: keepChoices(build.choices, classChoice), cantrips: [], spells: [], prepared: [], armor: "", shield: false })}
                    />
                    {(build.level || 1) >= 3 && (
                      <section className="builder-section">
                        <h3 id="character-choice-subclass" tabIndex={-1}>Subclass</h3>
                        <OptionPicker
                          label="Subclass"
                          searchable={false}
                          items={catalog.subclasses
                            .filter((s) => s.class?.index === build.classId)
                            .map((s) => ({ id: s.index, name: s.name, sub: (s as { summary?: string }).summary || parseSubclassText(s as { name: string; description?: string }, []).tagline }))}
                          selected={build.subclassId || ""}
                          onSelect={(id) => setBuild({ ...build, subclassId: id, choices: keepChoices(build.choices, (key) => key.startsWith("subclass.")) })}
                          onClear={() => setBuild({ ...build, subclassId: "", choices: keepChoices(build.choices, (key) => key.startsWith("subclass.")) })}
                          detail={subclassDetail}
                        />
                      </section>
                    )}
                    {groups.filter((g) => stepForGroup(g) === 0).map(groupUI)}
                  </div>
                )}
                {step === 1 && (
                  <div className="builder-step">
                    <div className="builder-intro">
                      <p>Background memberi bonus ability, origin feat, skill, tool, dan equipment. Bonus ability diatur di langkah Ability Scores.</p>
                    </div>
                    <OptionPicker
                      label="Background"
                      items={catalog.backgrounds
                        .filter((b) => b.available)
                        .map((b) => {
                          const info = parseBackgroundText(b.desc);
                          return { id: b.id, name: b.name, sub: info.abilities.length ? `${info.abilities.map(abilityShort).join(" · ")} · ${b.feature || info.feat}` : b.source };
                        })}
                      selected={build.background}
                      onSelect={(id) =>
                        id !== build.background &&
                        setBuild({ ...build, background: id, choices: keepChoices(build.choices, backgroundChoice) })
                      }
                      onClear={() => setBuild({ ...build, background: "", backgroundName: "", choices: keepChoices(build.choices, backgroundChoice) })}
                      detail={(id) => {
                        const b = catalog.backgrounds.find((x) => x.id === id);
                        if (!b) return null;
                        const info = parseBackgroundText(b.desc);
                        const feat = b.feature || info.feat;
                        return (
                          <div className="subclass-detail">
                            <dl className="builder-facts">
                              <div><dt>Ability score</dt><dd>{info.abilities.join(", ") || "—"}</dd></div>
                              <div><dt>Origin feat</dt><dd>{info.feat || feat || "—"}</dd></div>
                              <div><dt>Skill</dt><dd>{info.skills || "—"}</dd></div>
                              <div><dt>Tool</dt><dd>{(/^Choose/.test(info.tool) ? b.toolsText : info.tool) || b.toolsText || "—"}</dd></div>
                            </dl>
                            <p className="builder-muted">Bonus ability dari background dibagikan ke tiga ability di atas (+2/+1 atau +1/+1/+1) pada langkah Ability Scores.</p>
                            {feat && (
                              <>
                                <h4>Origin feat: {feat}</h4>
                                <p className="builder-text">{b.featureDesc}</p>
                              </>
                            )}
                            {(info.equipment.length > 0 || b.equipmentText) && (
                              <>
                                <h4>Equipment awal</h4>
                                {info.equipment.length > 1 ? (
                                  <ul className="subclass-glance">
                                    {info.equipment.map((option) => (
                                      <li key={option.label} className="reached">
                                        <b>{option.label}</b>
                                        <div><span>{option.text}</span></div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="builder-text">{info.equipment[0]?.text || b.equipmentText}</p>
                                )}
                              </>
                            )}
                            {info.lore && (
                              <details className="subclass-lore">
                                <summary>Latar cerita</summary>
                                <p className="builder-muted">{info.lore}</p>
                              </details>
                            )}
                          </div>
                        );
                      }}
                    />
                    {build.background === "custom" && (
                      <label>
                        Nama custom background
                        <input
                          value={build.backgroundName}
                          maxLength={60}
                          onChange={(e) => setBuild({ ...build, backgroundName: e.target.value })}
                        />
                      </label>
                    )}
                    {groups.filter((g) => stepForGroup(g) === 1).map(groupUI)}
                  </div>
                )}
                {step === 2 && (
                  <div className="builder-step">
                    <OptionPicker
                      label="Species"
                      toolbar={
                        <label className="option-picker-book">
                          Buku
                          <select value={speciesBook} onChange={(e) => setSpeciesBook(e.target.value)}>
                            <option value="phb-2024">Player’s Handbook 2024</option>
                            <option value="motm">Monsters of the Multiverse (2022)</option>
                          </select>
                        </label>
                      }
                      items={speciesForSource(catalog, speciesBook).map((r) => ({
                        id: r.index,
                        name: r.name,
                        sub: `${(r as { size?: string }).size || ""} · ${(r as { speed?: number }).speed || 30} ft`,
                      }))}
                      selected={speciesSource(build.race) === speciesBook ? build.race : ""}
                      onSelect={(id) => setBuild(selectSpecies(build, id, catalog))}
                      onClear={() => setBuild({ ...build, race: "", subrace: "", choices: keepChoices(build.choices, (key) => /^(race\.|subrace\.|human\.|trait\.|motm\.)/.test(key)) })}
                      detail={(id) =>
                        id === build.race ? (
                          <SpeciesCard build={build} sheet={preview || undefined} />
                        ) : (
                          <SpeciesCard build={selectSpecies(build, id, catalog)} eyebrow="PRATINJAU SPECIES" />
                        )
                      }
                    />
                    {!!catalog.races.find((r) => r.index === build.race)?.subraces?.length && (
                      <label>
                        Subrace
                        <select value={build.subrace} onChange={(e) => setBuild({ ...build, subrace: e.target.value })}>
                          <option value="">Pilih subrace</option>
                          {catalog.races
                            .find((r) => r.index === build.race)
                            ?.subraces?.map((r) => (
                              <option key={r.index} value={r.index}>{r.name}</option>
                            ))}
                        </select>
                      </label>
                    )}
                    {groups.filter((g) => stepForGroup(g) === 2).map(groupUI)}
                  </div>
                )}
                {step === 6 && (
                  <div className="character-form">
                    <label>
                      Nama karakter
                      <input maxLength={60} value={build.name} onChange={(e) => setBuild({ ...build, name: e.target.value })} />
                    </label>
                    {!editing && uploadToken && (
                      <label className="character-token-pick file-pick">
                        Token di peta (opsional)
                        <span className="character-token-row">
                          {tokenPreview ? <img src={tokenPreview} alt="" /> : <span className="character-token-empty">?</span>}
                          <span className="file-pick-btn">{tokenPreview ? "Ganti gambar…" : "Pilih gambar…"}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (file && file.size > 10 * 1024 * 1024) { setError("Gambar token maksimal 10 MB."); e.target.value = ""; return; }
                              setTokenFile(file);
                            }}
                          />
                        </span>
                        <small>Otomatis terhubung ke sheet ini setelah disimpan.</small>
                      </label>
                    )}
                    <label>
                      Catatan / biografi
                      <textarea maxLength={4000} value={build.notes} onChange={(e) => setBuild({ ...build, notes: e.target.value })} />
                    </label>
                  </div>
                )}
                {step === 3 && (
                  <>
                    <label>
                      Metode ability score
                      <select
                        value={build.method}
                        onChange={(e) =>
                          setBuild({
                            ...build,
                            method: e.target.value as BuildInput["method"],
                            scores:
                              e.target.value === "point-buy"
                                ? {
                                    str: 8,
                                    dex: 8,
                                    con: 8,
                                    int: 8,
                                    wis: 8,
                                    cha: 8,
                                  }
                                : emptyBuild().scores,
                          })
                        }
                      >
                        <option value="standard">Standard array</option>
                        <option value="point-buy">Point buy (27 poin)</option>
                        <option value="manual">
                          Manual
                        </option>
                      </select>
                    </label>
                    <p>
                      {build.method === "standard"
                        ? "Pakai 15, 14, 13, 12, 10, 8 masing-masing sekali. Bonus background dihitung setelah ini."
                        : build.method === "point-buy"
                          ? `${Object.values(build.scores).reduce((sum, v) => sum + pointCost(v), 0)} / 27 poin terpakai`
                          : "Isi nilai dasar 3–18. Builder tidak mengklaim nilai ini berasal dari roll."}
                    </p>
                    <div className="character-abilities">
                      {abilities.map((a) => (
                        <label key={a}>
                          {a.toUpperCase()}
                          {build.method === "standard" ? (
                            <select
                              value={build.scores[a]}
                              onChange={(e) =>
                                setBuild({
                                  ...build,
                                  scores: {
                                    ...build.scores,
                                    [a]: Number(e.target.value),
                                  },
                                })
                              }
                            >
                              {standardArray.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              min={build.method === "point-buy" ? 8 : 3}
                              max={build.method === "point-buy" ? 15 : 18}
                              value={build.scores[a]}
                              onChange={(e) =>
                                setBuild({
                                  ...build,
                                  scores: {
                                    ...build.scores,
                                    [a]: e.target.valueAsNumber || 8,
                                  },
                                })
                              }
                            />
                          )}
                          <small>
                            Total {finalScores(build)[a]} (
                            {modifier(finalScores(build)[a]) >= 0 ? "+" : ""}
                            {modifier(finalScores(build)[a])})
                          </small>
                        </label>
                      ))}
                    </div>
                    {groups.filter((g) => stepForGroup(g) === 3).map(groupUI)}
                    {(build.level || 1) >= 4 && (
                      <fieldset>
                        <legend id="character-choice-asi.4" tabIndex={-1}>Peningkatan level 4</legend>
                        <label>
                          Feat
                          <select
                            value={
                              build.levelFourFeat || "ability-score-improvement"
                            }
                            onChange={(e) =>
                              setBuild({
                                ...build,
                                levelFourFeat: e.target.value,
                                asi: { ...build.asi, 4: [] },
                              })
                            }
                          >
                            <option value="ability-score-improvement">
                              Ability Score Improvement (+2 atau +1/+1)
                            </option>
                            {levelFourFeats.map((f) => (
                              <option key={f.index} value={f.index}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {(!build.levelFourFeat ||
                          build.levelFourFeat ===
                            "ability-score-improvement") &&
                          [0, 1].map((i) => (
                            <label key={i}>
                              Ability +1 ({i + 1})
                              <select
                                value={build.asi?.["4"]?.[i] || ""}
                                onChange={(e) => {
                                  const selected = [
                                    ...(build.asi?.["4"] || ["", ""]),
                                  ];
                                  selected[i] = e.target.value as Ability;
                                  setBuild({
                                    ...build,
                                    asi: { ...build.asi, 4: selected as Ability[] },
                                  });
                                }}
                              >
                                <option value="">Pilih ability</option>
                                {abilities.map((a) => (
                                  <option key={a} value={a} disabled={a !== build.asi?.["4"]?.[i] && finalScores(build)[a] >= 20}>
                                    {a.toUpperCase()} ({finalScores(build)[a]})
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        <p>
                          Pilih ability sama dua kali untuk +2. Maksimum score
                          20. HP memakai nilai rata-rata hit die setiap level
                          setelah level 1.
                        </p>
                      </fieldset>
                    )}
                    {asiLevels(build).filter(level => level !== 4).map(level => (
                      <fieldset key={level}>
                        <legend id={`character-choice-asi.${level}`} tabIndex={-1}>Peningkatan level {level}</legend>
                        <label>Feat
                          <select value={featFor(build, level)} onChange={e => setBuild({ ...build, feats: { ...build.feats, [level]: e.target.value } })}>
                            <option value="ability-score-improvement">Ability Score Improvement (+2 atau +1/+1)</option>
                            {featsForLevel(level).map(feat => <option key={feat.index} value={feat.index}>{feat.name}</option>)}
                          </select>
                        </label>
                        {featFor(build, level) === "ability-score-improvement" && [0, 1].map(index => (
                          <label key={index}>Ability +1 ({index + 1})
                            <select value={build.asi?.[level]?.[index] || ""} onChange={e => {
                              const selected = [...(build.asi?.[level] || ["", ""])];
                              selected[index] = e.target.value as Ability;
                              setBuild({ ...build, asi: { ...build.asi, [level]: selected as Ability[] } });
                            }}>
                              <option value="">Pilih ability</option>
                              {abilities.map(ability => <option key={ability} value={ability} disabled={ability !== build.asi?.[level]?.[index] && finalScores(build)[ability] >= 20}>{ability.toUpperCase()} ({finalScores(build)[ability]})</option>)}
                            </select>
                          </label>
                        ))}
                      </fieldset>
                    ))}
                  </>
                )}
                {step === 4 && (
                  <>
                    {groups.filter((g) => stepForGroup(g) === 4).map(groupUI)}
                    <label>
                      Armor dipakai
                      <select
                        value={build.armor}
                        onChange={(e) =>
                          setBuild({ ...build, armor: e.target.value })
                        }
                      >
                        <option value="">Tanpa armor</option>
                        {preview?.equipment
                          .filter((e) => {
                            const armor = catalog.equipment.find(
                              (a) => a.index === e.id,
                            );
                            return (
                              armor?.armor_class &&
                              armor.armor_category !== "Shield"
                            );
                          })
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {preview?.equipment.some((e) => e.id === "shield") && (
                      <label className="character-check">
                        <input
                          type="checkbox"
                          checked={build.shield}
                          onChange={(e) =>
                            setBuild({ ...build, shield: e.target.checked })
                          }
                        />
                        Pakai shield
                      </label>
                    )}
                    <p>
                      AC: {preview?.ac}. Equipment background tambahan
                      ditampilkan sebagai catatan sumber.
                    </p>
                  </>
                )}
                {step === 5 && (
                  <>
                    {limits && !limits.cantrips && !limits.spells && (
                      <p>
                        Class ini belum memakai spell pada level 1. Cantrip dari
                        race tetap bisa dipilih di bawah.
                      </p>
                    )}
                    {(["cantrips", "spells", "prepared"] as const).map(
                      (key) => {
                        const count = limits?.[key] || 0;
                        if (!count) return null;
                        const options = catalog.spells.filter((s) =>
                          key === "prepared"
                            ? [
                                ...build.spells,
                                ...(build.choices["subclass.savant"] || []),
                                ...(build.choices["subclass.savant.5"] || []),
                              ].includes(s.index)
                            : (key === "cantrips"
                                ? s.level === 0
                                : !!s.level &&
                                  s.level <= (limits?.maxSpellLevel || 0)) &&
                              s.classes?.some(
                                (c) => c.index === limits?.spellClass,
                              ) &&
                              !(
                                key === "cantrips" &&
                                build.subclassId === "arcane-trickster" &&
                                s.index === "mage-hand"
                              ),
                        );
                        return (
                          <fieldset key={key}>
                            <legend id={`character-choice-${key}`} tabIndex={-1}>
                              {key === "prepared"
                                ? "Prepared (dari spellbook)"
                                : key === "spells" && build.classId === "wizard"
                                  ? "Spellbook"
                                  : key}{" "}
                              ({build[key].filter((id) => options.some((o) => o.index === id)).length}/{count})
                            </legend>
                            <div className="character-options">
                              {[...options].sort((a, b) => (a.level || 0) - (b.level || 0) || a.name.localeCompare(b.name)).map((s) => {
                                const x = s as { school?: { name?: string } | string; concentration?: boolean; ritual?: boolean };
                                const school = typeof x.school === "string" ? x.school : x.school?.name;
                                return (
                                <div key={s.index} className="spell-option">
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={build[key].includes(s.index)}
                                    onChange={(e) =>
                                      {
                                        // Buang spell yang sudah tidak ada di daftar (mis. dikeluarkan dari spellbook) supaya slotnya terbuka.
                                        const current = build[key].filter((id) => options.some((o) => o.index === id));
                                        setBuild({
                                          ...build,
                                          [key]: e.target.checked
                                            ? current.length < count
                                              ? [...current, s.index]
                                              : current
                                            : current.filter((id) => id !== s.index),
                                        });
                                      }
                                    }
                                  />
                                  <span className="spell-option-main">
                                    <strong>{s.name}</strong>
                                    <small>
                                      {[s.level ? `Lv ${s.level}` : "Cantrip", school, s.casting_time, x.concentration && "Konsentrasi", x.ritual && "Ritual"].filter(Boolean).join(" · ")}
                                    </small>
                                  </span>
                                </label>
                                  <details>
                                    <summary>Detail</summary>
                                    <p>{s.desc?.join("\n")}</p>
                                  </details>
                                </div>
                                );
                              })}
                            </div>
                          </fieldset>
                        );
                      },
                    )}
                    {groups.filter((g) => stepForGroup(g) === 5).map(groupUI)}
                  </>
                )}
                {step === REVIEW_STEP && (
                  <>
                    <div className="character-stats">
                      <div>
                        <span>HP</span>
                        <strong>{preview?.hp}</strong>
                      </div>
                      <div>
                        <span>AC</span>
                        <strong>{preview?.ac}</strong>
                      </div>
                      <div>
                        <span>Speed</span>
                        <strong>{preview?.speed} ft</strong>
                      </div>
                      <div>
                        <span>Proficiency</span>
                        <strong>+{preview?.proficiency}</strong>
                      </div>
                    </div>
                    <h3>{build.name || "Nama belum diisi"}</h3>
                    <p>
                      {preview?.raceName} · {preview?.className} ·{" "}
                      {preview?.backgroundName}
                    </p>
                    {!validation.length && (
                      <p>Semua pilihan wajib lengkap. Sheet siap disimpan.</p>
                    )}
                    <h3>Fitur sampai level {build.level || 1}</h3>
                    {preview?.features.map((f, i) => (
                      <details key={i}>
                        <summary>{f.name} <ActionEconomy description={f.desc.join(" ")} /></summary>
                        <p>{f.desc.join("\n")}</p>
                      </details>
                    ))}
                  </>
                )}
                {(step === REVIEW_STEP || validationOpen) && !!validation.length && (
                  <div className="character-error" role="region" aria-label="Pilihan belum lengkap" aria-live="polite">
                    <strong>Pilihan belum lengkap</strong>
                    <ul>
                      {validation.map((message, i) => {
                        const issue = validationResult?.issues?.find((item) => item.message === message);
                        return (
                          <li key={i}>
                            <span>{message}</span>{" "}
                            {issue?.groupKey && (
                              <button type="button" aria-label={`Perbaiki: ${message}`} onClick={() => {
                                setValidationOpen(true);
                                setStep(stepForIssue(issue));
                                setValidationTarget(`character-choice-${issue.groupKey}`);
                              }}>Perbaiki</button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                </div>
                <footer className="character-builder-footer">
                  <button
                    disabled={step === 0}
                    onClick={() => setStep((v) => v - 1)}
                  >
                    <ChevronLeft size={17} />
                    Kembali
                  </button>
                  {step < REVIEW_STEP ? (
                    <button onClick={() => setStep((v) => v + 1)}>
                      Lanjut
                      <ChevronRight size={17} />
                    </button>
                  ) : (
                    <button
                      disabled={!connected || busy || !!validation.length}
                      onClick={() =>
                        request(
                          {
                            type: editing ? "rebuild" : "create",
                            build,
                            ...editing,
                          },
                          (id) => {
                            if (!editing && id && tokenFile) uploadToken?.(tokenFile, build.name.slice(0, 32), id);
                            setTokenFile(null);
                            setBuild(null);
                            setSelected(id || "");
                            setEditing(null);
                          },
                        )
                      }
                    >
                      Simpan karakter
                    </button>
                  )}
                </footer>
              </div>
            )}
            {!build && character && (() => {
              const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
              const skillBonus = (id: string) => character.sheet.skills.find((s) => s.id === id)?.bonus ?? 0;
              const avatar = tokens.find((t) => t.characterId === character.id)?.image;
              const hitDiceLeft = character.sheet.level - (character.resourcesUsed?.["hit-dice"] || 0);
              return (
              <div className="sheet2">
                <header className="sheet2-head">
                  <div className="sheet2-avatar">
                    {avatar ? <img src={avatar} alt="" /> : <span>{character.sheet.name.slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <div className="sheet2-identity">
                    <h2>{character.sheet.name}</h2>
                    <span>
                      {character.sheet.raceName} · {character.sheet.className}{character.sheet.subclassName ? ` (${character.sheet.subclassName})` : ""} · Level {character.sheet.level}
                    </span>
                    <small>Background: {character.sheet.backgroundName}</small>
                  </div>
                  <div className="sheet2-head-actions">
                    <label className="sheet2-rollmode" title="Mode d20 untuk semua roll dari sheet">
                      d20
                      <select value={rollMode} onChange={(e) => setRollMode(e.target.value as typeof rollMode)}>
                        <option value="normal">Normal</option>
                        <option value="advantage">Advantage</option>
                        <option value="disadvantage">Disadvantage</option>
                      </select>
                    </label>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setBuild(structuredClone(character.build));
                        setEditing({ id: character.id, revision: character.revision });
                        setStep(0);
                      }}
                    >
                      Edit pilihan
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify({ version: 1, ruleset: character.ruleset, build: character.build }, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${character.sheet.name.replace(/[^a-z0-9]/gi, "-")}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export JSON
                    </button>
                  </div>
                </header>
                <div className="sheet2-vitals">
                  <div className="sheet2-vital"><span>Proficiency</span><strong>+{character.sheet.proficiency}</strong></div>
                  <div className="sheet2-vital sheet2-ac"><span>Armor Class</span><strong>{character.sheet.ac}</strong></div>
                  <button className="sheet2-vital" disabled={!connected || busy} onClick={() => roll("initiative")} title="Roll initiative (tersimpan di tracker)">
                    <span>Initiative</span><strong>{sign(character.sheet.initiative)}</strong><Dice5 size={13} />
                  </button>
                  <div className="sheet2-vital">
                    <span>Speed</span><strong>{character.sheet.speed} ft</strong>
                    {Object.entries(character.sheet.movement || {}).map(([mode, speed]) => <small key={mode}>{({ swim: "Renang", climb: "Panjat", fly: "Terbang" } as Record<string, string>)[mode] || mode} {speed} ft</small>)}
                  </div>
                  <div className="sheet2-vital"><span>Hit Dice</span><strong>{hitDiceLeft}/{character.sheet.level}</strong></div>
                  <div className="sheet2-hp">
                    <div className="sheet2-hp-numbers">
                      <div><span>HP</span><strong>{character.hp}<small>/{character.sheet.hp}</small></strong></div>
                      <div><span>Temp</span><strong>{character.tempHp}</strong></div>
                    </div>
                    <div className="sheet2-hp-bar"><i style={{ width: `${Math.max(0, Math.min(100, (character.hp / Math.max(1, character.sheet.hp)) * 100))}%` }} /></div>
                    <div className="sheet2-hp-actions">
                      <input aria-label="Jumlah damage atau heal" type="number" min={1} max={9999} value={healthAmount} onChange={(e) => setHealthAmount(e.target.valueAsNumber)} />
                      {(["damage", "heal"] as const).map((kind) => (
                        <button
                          key={kind}
                          className={`sheet2-${kind}`}
                          disabled={!connected || busy || !Number.isInteger(healthAmount) || healthAmount < 1 || healthAmount > 9999}
                          onClick={() => request({ type: "health", kind, amount: healthAmount, id: character.id, revision: character.revision })}
                        >
                          {kind === "damage" ? "Damage" : "Heal"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {character.concentrationSaveDC && (
                  <p role="status" className="character-error">
                    Concentration: lakukan CON save DC {character.concentrationSaveDC}. Jika gagal, akhiri concentration di tab Spells.
                  </p>
                )}
                <div className="sheet2-abilities">
                  {abilities.map((a) => {
                    const save = character.sheet.saves.find((s) => s.id === a);
                    return (
                      <div className="sheet2-ability" key={a}>
                        <button disabled={!connected || busy} onClick={() => roll("ability", a)} title={`Roll ${a.toUpperCase()} check`}>
                          <span>{({ str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" } as Record<string, string>)[a]}</span>
                          <strong>{sign(character.sheet.modifiers[a])}</strong>
                          <small>{character.sheet.scores[a]}</small>
                        </button>
                        <button className={`sheet2-save${save?.proficient ? " proficient" : ""}`} disabled={!connected || busy} onClick={() => roll("save", a)} title={`Roll ${a.toUpperCase()} saving throw`}>
                          <i aria-label={save?.proficient ? "Proficient" : "Tidak proficient"} />Save <b>{sign(save?.bonus ?? 0)}</b>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="sheet2-body">
                  <div className="sheet2-side">
                    <section>
                      <h3>Skills</h3>
                      <ul className="sheet2-skills">
                        {character.sheet.skills.map((s) => {
                          const ability = (catalog.skills.find((k) => k.index === s.id) as { ability_score?: { name?: string } } | undefined)?.ability_score?.name;
                          return (
                            <li key={s.id}>
                              <button disabled={!connected || busy} onClick={() => roll("skill", s.id)}>
                                <i className={s.expertise ? "expertise" : s.proficient ? "proficient" : ""} aria-label={s.expertise ? "Expertise" : s.proficient ? "Proficient" : "Tidak proficient"} />
                                <span>{s.name}</span>
                                <small>{ability}</small>
                                <b>{sign(s.bonus)}</b>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                    <section className="sheet2-passives">
                      <h3>Passive</h3>
                      <div><span>Perception</span><b>{character.sheet.passivePerception}</b></div>
                      <div><span>Insight</span><b>{10 + skillBonus("insight")}</b></div>
                      <div><span>Investigation</span><b>{10 + skillBonus("investigation")}</b></div>
                    </section>
                    <section className="sheet2-profs">
                      <h3>Proficiency & bahasa</h3>
                      <p><b>Bahasa:</b> {character.sheet.languages.join(", ") || "—"}</p>
                      <p><b>Lainnya:</b> {character.sheet.toolsNotes || character.sheet.proficiencies.join(", ") || "—"}</p>
                    </section>
                  </div>
                  <div className="sheet2-main">
                <nav className="sheet-navigation" aria-label="Bagian character sheet">
                  {[
                    ["combat", "Combat"],
                    ["spells", "Spells"],
                    ["equipment", "Inventory"],
                    ["features", "Features"],
                    ["resources", "Rest & Resource"],
                    ["notes", "Notes"],
                  ].map(([id, label]) => (
                    <button key={id} aria-pressed={sheetTab === id} onClick={() => setSheetTab(id)}>
                      {label}
                    </button>
                  ))}
                </nav>
                <section
                  hidden={sheetTab !== "resources"}
                  className="sheet-section"
                >
                  <h3>HP, death saves & spell slots</h3>
                  <div className="character-form character-resources">
                    {(
                      [
                        "hp",
                        "tempHp",
                        "slotsUsed",
                        "deathSuccess",
                        "deathFailure",
                      ] as const
                    )
                      .filter((key) => key !== "slotsUsed")
                      .map((key) => (
                        <label key={key}>
                          {
                            {
                              hp: "HP sekarang",
                              tempHp: "Temporary HP",
                              slotsUsed: `Slot level 1 terpakai / ${character.sheet.slots}`,
                              deathSuccess: "Death save sukses",
                              deathFailure: "Death save gagal",
                            }[key]
                          }
                          <input
                            disabled={!connected || busy}
                            type="number"
                            min={0}
                            max={
                              key === "hp"
                                ? character.sheet.hp
                                : key.startsWith("death")
                                  ? 3
                                  : 999
                            }
                            value={character[key]}
                            onChange={(e) => {
                              if (Number.isInteger(e.target.valueAsNumber))
                                request({
                                  type: "resources",
                                  id: character.id,
                                  revision: character.revision,
                                  [key]: e.target.valueAsNumber,
                                });
                            }}
                          />
                        </label>
                      ))}
                    {Object.entries(character.sheet.slotsByLevel || {})
                      .filter(([, count]) => count > 0)
                      .map(([level, count]) => (
                        <label key={level}>
                          {character.build.classId === "warlock"
                            ? "Pact slot"
                            : "Spell slot"}{" "}
                          level {level}: terpakai / {count}
                          <input
                            type="number"
                            min={0}
                            max={count}
                            disabled={!connected || busy}
                            value={
                              character.spellSlotsUsed?.[level] ??
                              (level === "1" ? character.slotsUsed : 0)
                            }
                            onChange={(e) => {
                              if (Number.isInteger(e.target.valueAsNumber))
                                request({
                                  type: "resources",
                                  id: character.id,
                                  revision: character.revision,
                                  spellSlotsUsed: {
                                    [level]: e.target.valueAsNumber,
                                  },
                                });
                            }}
                          />
                        </label>
                      ))}
                  </div>
                  <p>
                    Level {character.sheet.level} ·{" "}
                    {character.sheet.subclassName ||
                      "Subclass tersedia mulai level 3"}{" "}
                    · Proficiency +{character.sheet.proficiency}
                  </p>
                  <fieldset>
                    <legend>Resource class</legend>
                    <div className="character-form">
                      {resources(character.build, character.sheet).map(
                        (resource) => (
                          <label key={resource.id}>
                            {resource.name}: terpakai / {resource.max}
                            <input
                              type="number"
                              min={0}
                              max={resource.max}
                              value={
                                character.resourcesUsed?.[resource.id] || 0
                              }
                              disabled={!connected || busy}
                              onChange={(e) => {
                                if (Number.isInteger(e.target.valueAsNumber))
                                  request({
                                    type: "resources",
                                    id: character.id,
                                    revision: character.revision,
                                    resourcesUsed: {
                                      [resource.id]: e.target.valueAsNumber,
                                    },
                                  });
                              }}
                            />
                          </label>
                        ),
                      )}
                    </div>
                    <div className="sheet-rest-short">
                      <label title="Hit Dice yang dilempar untuk memulihkan HP saat Short Rest">
                        Pakai Hit Dice
                        <input
                          type="number"
                          min={0}
                          max={character.sheet.level - (character.resourcesUsed?.["hit-dice"] || 0)}
                          value={Math.min(restDice, character.sheet.level - (character.resourcesUsed?.["hit-dice"] || 0))}
                          disabled={!connected || busy || character.hp >= character.sheet.hp}
                          onChange={(e) => setRestDice(Math.max(0, Math.min(20, Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)))}
                        />
                      </label>
                      <button
                        disabled={!connected || busy}
                        onClick={() => {
                          request({
                            type: "rest",
                            rest: "short",
                            hitDice: character.hp >= character.sheet.hp ? 0 : Math.min(restDice, character.sheet.level - (character.resourcesUsed?.["hit-dice"] || 0)),
                            id: character.id,
                            revision: character.revision,
                          });
                          setRestDice(0);
                        }}
                      >
                        Short rest
                      </button>
                    </div>
                    <button
                      disabled={!connected || busy}
                      title="Roll 1 Hit Die + CON untuk memulihkan HP (memakai 1 Hit Dice)"
                      onClick={() =>
                        request({
                          type: "hitdie",
                          id: character.id,
                          revision: character.revision,
                        })
                      }
                    >
                      Pakai Hit Die ({character.sheet.level - (character.resourcesUsed?.["hit-dice"] || 0)} sisa)
                    </button>
                    <button
                      disabled={!connected || busy}
                      onClick={() =>
                        request({
                          type: "rest",
                          rest: "long",
                          id: character.id,
                          revision: character.revision,
                        })
                      }
                    >
                      Long rest
                    </button>
                    <p>
                      Short rest memulihkan kemampuan short rest (dan slot Pact Magic Warlock), lalu melempar Hit Dice
                      yang dipilih untuk HP. Long rest memulihkan HP, semua spell slot, kemampuan, dan Hit Dice.
                      Hasilnya tercatat di chat.
                    </p>
                  </fieldset>
                </section>
                <section
                  hidden={sheetTab !== "combat"}
                  className="sheet-section"
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={critical}
                      onChange={(e) => setCritical(e.target.checked)}
                    />
                    Critical damage (dua kali damage dice)
                  </label>
                  <h3>Serangan</h3>
                  <p className="sheet-empty-note">Umumnya lewat Aksi (Attack). Aksi Bonus atau Reaksi hanya jika fitur/pemicu mengizinkan; tombol roll tidak menghabiskan aksi otomatis. Waktu spell ada di tab Spell.</p>
                  {visibleAttacks(character).length < character.sheet.attacks.length && (
                    <p className="sheet-empty-note equip-hint">
                      {character.sheet.attacks.length - visibleAttacks(character).length} senjata tidak dipakai disembunyikan. Pakai lewat tab{" "}
                      <button type="button" className="link-button" onClick={() => setSheetTab("equipment")}>Inventory</button>.
                    </p>
                  )}
                  {visibleAttacks(character).map((a) => (
                    <div className="character-attack" key={a.id}>
                      <strong>{a.name}{a.mastery && <b className="mastery-tag" title={`Weapon Mastery · ${a.mastery.name}: ${a.mastery.note}`}>{a.mastery.name}</b>}<Requirement label="Serangan · lihat syarat" text="Attack action dapat mencakup beberapa serangan. Serangan sebagai Aksi Bonus atau Reaksi memerlukan fitur atau pemicu yang sesuai." /></strong>
                      <button
                        disabled={!connected || busy}
                        onClick={() => roll("attack", a.id)}
                      >
                        Attack {a.bonus >= 0 ? "+" : ""}
                        {a.bonus}
                      </button>
                      <button
                        disabled={!connected || busy}
                        onClick={() => roll("damage", a.id)}
                      >
                        Damage {a.damage}
                      </button>
                    </div>
                  ))}
                  {weaponMasteryCount(character.build.classId, character.build.level || 1) > 0 && (
                    <WeaponMasterySheet character={character} />
                  )}
                  {character.sheet.spellAbility && (
                    <div className="character-attack spell-attack-row">
                      <strong>
                        Spell attack
                        <small>
                          {character.sheet.spellAbility.toUpperCase()} · DC {character.sheet.spellDC}
                        </small>
                      </strong>
                      <button
                        disabled={!connected || busy}
                        onClick={() => roll("spell")}
                      >
                        Attack +{character.sheet.spellAttack}
                      </button>
                    </div>
                  )}
                </section>
                <section
                  hidden={sheetTab !== "spells"}
                  className="sheet-section"
                >
                  <SpellBook character={character} connected={connected} busy={busy} request={request} roll={roll} sendToChat={sendToChat} />
                </section>
                <section
                  hidden={sheetTab !== "equipment"}
                  className="sheet-section"
                >
                  <h3>Inventory</h3>
                  <p className="sheet-empty-note">Nyalakan saklar <b>Dipakai</b> pada senjata yang sedang dipegang — hanya itu yang muncul di Combat. Armor & shield yang dipakai langsung mengubah AC.</p>
                  <ul className="inventory-list">
                    {character.sheet.equipment.filter(e => !['cp', 'sp', 'ep', 'gp', 'pp'].includes(e.id)).map((e) => {
                      const equipment = catalog.equipment.find(
                        (item) => item.index === e.id,
                      );
                      const description = equipment
                        ? equipmentChatDescription(equipment, e.count)
                        : `${e.count} × ${e.name}`;
                      return (
                        <li className="shareable-row" key={e.id}>
                          <span>{e.count} × {e.name}{equipment?.damage ? <small> · {equipment.damage.damage_dice} {equipment.weapon_range === "Ranged" ? "ranged" : "melee"}</small> : equipment?.armor_class ? <small> · AC {equipment.armor_category === "Shield" ? "+2" : equipment.armor_class.base}</small> : null}</span>
                          {(equipment?.damage || equipment?.armor_class) && (() => {
                            const on = equipment.damage
                              ? equippedWeapons(character).includes(e.id)
                              : equipment.armor_category === "Shield"
                                ? character.build.shield
                                : character.build.armor === e.id;
                            return (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                className="equip-switch"
                                disabled={!connected || busy}
                                title={on ? "Lepas" : "Pakai"}
                                onClick={() => request({ type: "equip", id: character.id, revision: character.revision, item: e.id, on: !on })}
                              >
                                <i />{on ? "Dipakai" : "Tidak dipakai"}
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            title="Kirim penjelasan ke chat"
                            aria-label={`Kirim penjelasan ${e.name} ke chat`}
                            disabled={!connected}
                            onClick={() => sendToChat(`🎒 ${e.name}`, description)}
                          >
                            ↗
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p>{character.sheet.equipmentNotes}</p>
                  <CurrencyWallet key={`${character.id}:${character.revision}`} currency={character.currency} disabled={!connected || busy} onSave={currency => request({ type: "currency", id: character.id, revision: character.revision, currency })} />
                  <p>
                    Tools:{" "}
                    {character.sheet.toolsNotes ||
                      character.sheet.proficiencies.join(", ")}
                  </p>
                  <p>Bahasa: {character.sheet.languages.join(", ")}</p>
                </section>
                <section
                  hidden={sheetTab !== "features"}
                  className="sheet-section"
                >
                  <h3>Fitur class, species & background</h3>
                  <label>
                    Cari fitur
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nama atau deskripsi fitur"
                    />
                  </label>
                  {character.sheet.features
                    .filter((f) =>
                      `${f.name} ${f.desc.join(" ")}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((f, i) => (
                      <div className="shareable-feature" key={i}>
                        <details>
                          <summary>{f.name} <ActionEconomy description={f.desc.join(" ")} /></summary>
                          <p>{f.desc.join("\n")}</p>
                        </details>
                        <button
                          type="button"
                          title="Kirim penjelasan ke chat"
                          aria-label={`Kirim penjelasan ${f.name} ke chat`}
                          disabled={!connected}
                          onClick={() =>
                            sendToChat(`📜 ${f.name}`, f.desc.join("\n"))
                          }
                        >
                          ↗
                        </button>
                      </div>
                    ))}
                </section>
                <section
                  hidden={sheetTab !== "notes"}
                  className="sheet-section"
                >
                  <h3>Catatan / biografi</h3>
                  <p className="sheet2-notes">{character.build.notes || "Belum ada catatan. Tambahkan lewat Edit pilihan → Detail."}</p>
                  <h3>Hubungkan token</h3>
                  <p>HP token terhubung mengikuti sheet di semua scene.</p>
                  {tokens
                    .filter(
                      (t) =>
                        t.ownerId === character.ownerId &&
                        (dm || t.ownerId === playerId),
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        disabled={!connected || busy}
                        onClick={() =>
                          request({
                            type:
                              t.characterId === character.id
                                ? "unlink"
                                : "link",
                            id: character.id,
                            tokenId: t.id,
                          })
                        }
                      >
                        {t.characterId === character.id ? "Lepas" : "Hubungkan"}{" "}
                        {t.name}
                      </button>
                    ))}
                </section>
                  </div>
                </div>
              </div>
              );
            })()}
            {!build && !character && (
              <div className="character-empty">
                <BookOpen size={40} />
                <h3>Mulai dari pilihan, selesai dengan sheet.</h3>
                <p>
                  Pilih class, race, background, ability, equipment, dan spell.
                  Kalkulasi dasar divalidasi server.
                </p>
                <label className="file-pick">
                  Import pilihan JSON
                  <span className="file-pick-btn">Pilih file JSON…</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        if (file.size > 64000)
                          throw new Error("File maksimal 64 KB.");
                        const data = JSON.parse(await file.text());
                        if (data.ruleset !== "srd-2024")
                          throw new Error("Ruleset harus srd-2024.");
                        const result = validateBuild({
                          ...data.build,
                          ruleset: "srd-2024",
                        });
                        if (!result.build) throw new Error("Data tidak valid.");
                        setBuild(result.build);
                        setEditing(null);
                        setStep(REVIEW_STEP);
                      } catch (error) {
                        setError(
                          error instanceof Error
                            ? error.message
                            : "Import gagal.",
                        );
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </main>
        </div>
      </dialog>
    </>
  );
}
