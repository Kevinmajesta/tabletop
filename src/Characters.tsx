import { useEffect, useRef, useState } from "react";
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
  buildGroups,
  revisedCatalog as catalog,
  deriveSheet,
  emptyBuild,
  finalScores,
  levelFourFeats,
  modifier,
  pointCost,
  spellLimits,
  standardArray,
  validateBuild,
  type BuildInput,
  type Ability,
  type Character,
  type ChoiceGroup,
} from "../server/characters";
import type { BoardToken } from "../server/tabletop";
import "./characters.css";
import { resources } from "../server/resources";

const steps = [
  "Identitas",
  "Ability",
  "Proficiency",
  "Equipment",
  "Spell",
  "Tinjau",
];
export default function Characters({
  initialOpen = false,
  requestedCharacter,
  characters: savedCharacters,
  socket,
  connected,
  tokens,
  playerId,
  dm,
}: {
  initialOpen?: boolean;
  requestedCharacter?: { id: string; nonce: number } | null;
  characters: Character[];
  socket: Socket | null;
  connected: boolean;
  tokens: BoardToken[];
  playerId: string;
  dm: boolean;
}) {
  const characters = savedCharacters.filter((c) => c.ruleset === "srd-2024");
  const [rollMode, setRollMode] = useState<
    "normal" | "advantage" | "disadvantage"
  >("normal");
  const [quickOpen, setQuickOpen] = useState(false);
  const [critical, setCritical] = useState(false);
  const [sheetTab, setSheetTab] = useState("combat");
  const [healthAmount, setHealthAmount] = useState(1);
  const [search, setSearch] = useState("");
  const [spellFilter, setSpellFilter] = useState("all");
  const [preparedDraft, setPreparedDraft] = useState<string[] | null>(null);
  const [open, setOpen] = useState(initialOpen),
    [build, setBuild] = useState<BuildInput | null>(null),
    [step, setStep] = useState(0),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<{ id: string; revision: number } | null>(
      null,
    );
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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
    const previous = build.choices[group.key] || [];
    const values = previous.includes(id)
      ? previous.filter((v) => v !== id)
      : group.count === 1
        ? [id]
        : previous.length < group.count
          ? [...previous, id]
          : previous;
    setBuild({ ...build, choices: { ...build.choices, [group.key]: values } });
  }
  function groupUI(group: ChoiceGroup) {
    return (
      <fieldset key={group.key}>
        <legend>
          {group.name}{" "}
          <small>
            ({build?.choices[group.key]?.length || 0}/{group.count})
          </small>
        </legend>
        <div className="character-options">
          {group.options.map((option) => (
            <label key={option.id}>
              <input
                type="checkbox"
                checked={
                  build?.choices[group.key]?.includes(option.id) || false
                }
                onChange={() => choose(group, option.id)}
              />
              <span>{option.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  const preview = build ? deriveSheet(build) : null;
  const limits = build ? spellLimits(build) : null;
  const validation = build ? validateBuild(build).errors : [];
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
        Karakter
      </button>
      {character && !build && (
        <aside className="character-quick" aria-label="Roll karakter">
          <button
            className="character-quick-toggle"
            aria-expanded={quickOpen}
            onClick={() => setQuickOpen((value) => !value)}
          >
            {quickOpen ? "Tutup" : "Karakter"}
          </button>
          {quickOpen && (
            <div className="character-quick-panel">
              <strong>{character.sheet.name}</strong>
              <span>
                HP {character.hp}/{character.sheet.hp} · AC {character.sheet.ac}
              </span>
              <div className="character-quick-rolls">
                {character.sheet.skills.map((skill) => (
                  <button
                    key={skill.id}
                    disabled={!connected || busy}
                    onClick={() => roll("skill", skill.id)}
                  >
                    {skill.name}
                    <strong>
                      {skill.bonus >= 0 ? "+" : ""}
                      {skill.bonus}
                    </strong>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                setBuild(emptyBuild());
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
              <>
                <nav
                  className="character-steps"
                  aria-label="Langkah pembuatan karakter"
                >
                  {steps.map((title, i) => (
                    <button
                      key={title}
                      aria-current={i === step ? "step" : undefined}
                      onClick={() => setStep(i)}
                    >
                      {i + 1}. {title}
                    </button>
                  ))}
                </nav>
                {step === 0 && (
                  <div className="character-form">
                    <label>
                      Nama karakter
                      <input
                        maxLength={60}
                        value={build.name}
                        onChange={(e) =>
                          setBuild({ ...build, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Class
                      <select
                        value={build.classId}
                        onChange={(e) =>
                          setBuild({
                            ...build,
                            classId: e.target.value,
                            subclassId: "",
                            choices: {},
                            cantrips: [],
                            spells: [],
                            prepared: [],
                            armor: "",
                            shield: false,
                          })
                        }
                      >
                        {catalog.classes.map((c) => (
                          <option key={c.index} value={c.index}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Level
                      <select
                        value={build.level || 1}
                        onChange={(e) =>
                          setBuild({
                            ...build,
                            level: Number(e.target.value),
                            subclassId:
                              Number(e.target.value) < 3
                                ? ""
                                : build.subclassId,
                            asi: Number(e.target.value) < 4 ? {} : build.asi,
                            cantrips: [],
                            spells: [],
                            prepared: [],
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(build.level || 1) >= 3 && (
                      <label>
                        Subclass
                        <select
                          value={build.subclassId || ""}
                          onChange={(e) =>
                            setBuild({ ...build, subclassId: e.target.value })
                          }
                        >
                          <option value="">Pilih subclass</option>
                          {catalog.subclasses
                            .filter((s) => s.class?.index === build.classId)
                            .map((s) => (
                              <option key={s.index} value={s.index}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <p>
                      Hit die d
                      {
                        catalog.classes.find((c) => c.index === build.classId)
                          ?.hit_die
                      }
                      . Subclass dipilih mulai level 3. Empat pilihan Player's
                      Handbook 2024 per class.
                    </p>
                    <label>
                      Race
                      <select
                        value={build.race}
                        onChange={(e) =>
                          setBuild({
                            ...build,
                            race: e.target.value,
                            subrace:
                              catalog.races.find(
                                (r) => r.index === e.target.value,
                              )?.subraces?.[0]?.index || "",
                            choices: {},
                          })
                        }
                      >
                        {catalog.races.map((r) => (
                          <option key={r.index} value={r.index}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!!catalog.races.find((r) => r.index === build.race)
                      ?.subraces?.length && (
                      <label>
                        Subrace
                        <select
                          value={build.subrace}
                          onChange={(e) =>
                            setBuild({ ...build, subrace: e.target.value })
                          }
                        >
                          <option value="">Pilih subrace</option>
                          {catalog.races
                            .find((r) => r.index === build.race)
                            ?.subraces?.map((r) => (
                              <option key={r.index} value={r.index}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Background
                      <select
                        value={build.background}
                        onChange={(e) =>
                          setBuild({
                            ...build,
                            background: e.target.value,
                            choices: {},
                          })
                        }
                      >
                        {catalog.backgrounds
                          .filter((b) => b.available)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} · {b.source}
                            </option>
                          ))}
                      </select>
                    </label>
                    {build.background === "custom" ? (
                      <label>
                        Nama custom background
                        <input
                          value={build.backgroundName}
                          maxLength={60}
                          onChange={(e) =>
                            setBuild({
                              ...build,
                              backgroundName: e.target.value,
                            })
                          }
                        />
                      </label>
                    ) : (
                      <details>
                        <summary>Background dan sumber</summary>
                        <p>
                          {
                            catalog.backgrounds.find(
                              (b) => b.id === build.background,
                            )?.desc
                          }
                        </p>
                        <strong>
                          {
                            catalog.backgrounds.find(
                              (b) => b.id === build.background,
                            )?.feature
                          }
                        </strong>
                        <p>
                          {
                            catalog.backgrounds.find(
                              (b) => b.id === build.background,
                            )?.featureDesc
                          }
                        </p>
                      </details>
                    )}
                    <p className="character-note">
                      {catalog.backgrounds.filter((b) => b.available).length}{" "}
                      background D&D 2024. Bonus ability, origin feat, skill,
                      tool, dan equipment mengikuti background pilihan.
                    </p>
                    <label>
                      Catatan / biografi
                      <textarea
                        maxLength={4000}
                        value={build.notes}
                        onChange={(e) =>
                          setBuild({ ...build, notes: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
                {step === 1 && (
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
                          Manual (nilai disetujui DM)
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
                    {groups.filter((g) => g.kind === "ability").map(groupUI)}
                    {(build.level || 1) >= 4 && (
                      <fieldset>
                        <legend>Peningkatan level 4</legend>
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
                                asi: {},
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
                                    asi: { 4: selected as Ability[] },
                                  });
                                }}
                              >
                                <option value="">Pilih ability</option>
                                {abilities.map((a) => (
                                  <option key={a} value={a}>
                                    {a.toUpperCase()}
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
                  </>
                )}
                {step === 2 && (
                  <>
                    {groups
                      .filter(
                        (g) =>
                          !["equipment", "ability", "spell"].includes(g.kind),
                      )
                      .map(groupUI)}
                    <p className="character-note">
                      Proficiency yang sama tidak ditumpuk. Background tools dan
                      fitur berbasis narasi dicatat pada sheet; tindakan khusus
                      diputuskan DM.
                    </p>
                  </>
                )}
                {step === 3 && (
                  <>
                    {groups.filter((g) => g.kind === "equipment").map(groupUI)}
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
                {step === 4 && (
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
                            <legend>
                              {key === "prepared"
                                ? "Prepared (dari spellbook)"
                                : key === "spells" && build.classId === "wizard"
                                  ? "Spellbook"
                                  : key}{" "}
                              ({build[key].length}/{count})
                            </legend>
                            <div className="character-options">
                              {options.map((s) => (
                                <label key={s.index}>
                                  <input
                                    type="checkbox"
                                    checked={build[key].includes(s.index)}
                                    onChange={(e) =>
                                      setBuild({
                                        ...build,
                                        [key]: e.target.checked
                                          ? build[key].length < count
                                            ? [...build[key], s.index]
                                            : build[key]
                                          : build[key].filter(
                                              (id) => id !== s.index,
                                            ),
                                      })
                                    }
                                  />
                                  <span>{s.name}</span>
                                  <details>
                                    <summary>Detail</summary>
                                    <p>{s.desc?.join("\n")}</p>
                                  </details>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        );
                      },
                    )}
                    {groups.filter((g) => g.kind === "spell").map(groupUI)}
                  </>
                )}
                {step === 5 && (
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
                    {validation.length ? (
                      <div className="character-error">
                        <strong>Pilihan belum lengkap</strong>
                        <ul>
                          {validation.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>Semua pilihan wajib lengkap. Sheet siap disimpan.</p>
                    )}
                    <h3>Fitur sampai level {build.level || 1}</h3>
                    {preview?.features.map((f, i) => (
                      <details key={i}>
                        <summary>{f.name}</summary>
                        <p>{f.desc.join("\n")}</p>
                      </details>
                    ))}
                  </>
                )}
                <footer className="character-builder-footer">
                  <button
                    disabled={step === 0}
                    onClick={() => setStep((v) => v - 1)}
                  >
                    <ChevronLeft size={17} />
                    Kembali
                  </button>
                  {step < 5 ? (
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
                            setBuild(null);
                            setSelected(id || "");
                            setEditing(null);
                          },
                        )
                      }
                    >
                      {busy ? "Menyimpan…" : "Simpan karakter"}
                    </button>
                  )}
                </footer>
              </>
            )}
            {!build && character && (
              <>
                <div className="character-sheet-heading">
                  <div className="sheet-identity">
                    <h2>{character.sheet.name}</h2>
                    <span>
                      Level {character.sheet.level} ·{" "}
                      {character.sheet.subclassName ||
                        character.sheet.className}{" "}
                      · Proficiency +{character.sheet.proficiency}
                    </span>
                  </div>
                  <p>
                    {character.sheet.raceName} · {character.sheet.className} ·{" "}
                    {character.sheet.backgroundName}
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setBuild(structuredClone(character.build));
                      setEditing({
                        id: character.id,
                        revision: character.revision,
                      });
                      setStep(0);
                    }}
                  >
                    Edit pilihan
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob(
                        [
                          JSON.stringify(
                            {
                              version: 1,
                              ruleset: character.ruleset,
                              build: character.build,
                            },
                            null,
                            2,
                          ),
                        ],
                        { type: "application/json" },
                      );
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
                <div className="character-stats">
                  <div>
                    <span>HP</span>
                    <strong>
                      {character.hp}/{character.sheet.hp}
                    </strong>
                  </div>
                  <div>
                    <span>AC</span>
                    <strong>{character.sheet.ac}</strong>
                  </div>
                  <div>
                    <span>Speed</span>
                    <strong>{character.sheet.speed} ft</strong>
                  </div>
                  <div>
                    <span>Passive perception</span>
                    <strong>{character.sheet.passivePerception}</strong>
                  </div>
                </div>
                <div className="character-abilities">
                  {abilities.map((a) => (
                    <button
                      key={a}
                      disabled={!connected || busy}
                      onClick={() => roll("ability", a)}
                    >
                      <span>{a.toUpperCase()}</span>
                      <strong>{character.sheet.scores[a]}</strong>
                      <small>
                        {character.sheet.modifiers[a] >= 0 ? "+" : ""}
                        {character.sheet.modifiers[a]} <Dice5 size={13} />
                      </small>
                    </button>
                  ))}
                </div>
                <nav
                  className="sheet-navigation"
                  aria-label="Bagian character sheet"
                >
                  {[
                    ["combat", "Combat"],
                    ["resources", "HP & Rest"],
                    ["spells", "Spell"],
                    ["features", "Fitur"],
                    ["equipment", "Equipment"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={sheetTab === id}
                      onClick={() => setSheetTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                <section
                  hidden={sheetTab !== "resources"}
                  className="sheet-section"
                >
                  <h3>HP, death saves & spell slots</h3>
                  <div className="sheet-health-actions">
                    <label>
                      Jumlah damage / heal
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={healthAmount}
                        onChange={(e) =>
                          setHealthAmount(e.target.valueAsNumber)
                        }
                      />
                    </label>
                    {(["damage", "heal"] as const).map((kind) => (
                      <button
                        key={kind}
                        disabled={
                          !connected ||
                          busy ||
                          !Number.isInteger(healthAmount) ||
                          healthAmount < 1 ||
                          healthAmount > 9999
                        }
                        onClick={() =>
                          request({
                            type: "health",
                            kind,
                            amount: healthAmount,
                            id: character.id,
                            revision: character.revision,
                          })
                        }
                      >
                        {kind === "damage" ? "Damage" : "Heal"}
                      </button>
                    ))}
                  </div>
                  {character.concentrationSaveDC && (
                    <p role="status" className="character-error">
                      Concentration: lakukan CON save DC{" "}
                      {character.concentrationSaveDC}. Jika gagal, akhiri
                      concentration pada bagian Spell.
                    </p>
                  )}
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
                    <button
                      disabled={!connected || busy}
                      onClick={() =>
                        request({
                          type: "rest",
                          rest: "short",
                          id: character.id,
                          revision: character.revision,
                        })
                      }
                    >
                      Short rest
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
                      Short rest memulihkan resource sesuai class. Healing Hit
                      Dice dicatat lewat HP dan Hit Dice terpakai.
                    </p>
                  </fieldset>
                </section>
                <section
                  hidden={sheetTab !== "combat"}
                  className="sheet-section"
                >
                  <label>
                    Mode D20
                    <select
                      value={rollMode}
                      onChange={(e) =>
                        setRollMode(e.target.value as typeof rollMode)
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="advantage">Advantage</option>
                      <option value="disadvantage">Disadvantage</option>
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={critical}
                      onChange={(e) => setCritical(e.target.checked)}
                    />
                    Critical damage (dua kali damage dice)
                  </label>
                  <h3>Saving throws</h3>
                  <div className="character-rolls">
                    {character.sheet.saves.map((s) => (
                      <button
                        key={s.id}
                        disabled={!connected || busy}
                        onClick={() => roll("save", s.id)}
                      >
                        {s.id.toUpperCase()} {s.proficient ? "•" : ""}
                        <strong>
                          {s.bonus >= 0 ? "+" : ""}
                          {s.bonus}
                        </strong>
                      </button>
                    ))}
                  </div>
                  <h3>Skills</h3>
                  <div className="character-rolls">
                    {character.sheet.skills.map((s) => (
                      <button
                        key={s.id}
                        disabled={!connected || busy}
                        onClick={() => roll("skill", s.id)}
                      >
                        {s.name}{" "}
                        {s.expertise ? "(expertise)" : s.proficient ? "•" : ""}
                        <strong>
                          {s.bonus >= 0 ? "+" : ""}
                          {s.bonus}
                        </strong>
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={!connected || busy}
                    onClick={() => roll("initiative")}
                  >
                    Roll & simpan initiative (
                    {character.sheet.initiative >= 0 ? "+" : ""}
                    {character.sheet.initiative})
                  </button>
                  <h3>Serangan</h3>
                  {character.sheet.attacks.map((a) => (
                    <div className="character-attack" key={a.id}>
                      <strong>{a.name}</strong>
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
                </section>
                <section
                  hidden={sheetTab !== "spells"}
                  className="sheet-section"
                >
                  <h3>Spellbook & prepared spells</h3>
                  <label>
                    Cari spell
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nama atau deskripsi spell"
                    />
                  </label>
                  <label>
                    Filter spell
                    <select
                      value={spellFilter}
                      onChange={(e) => setSpellFilter(e.target.value)}
                    >
                      <option value="all">Semua</option>
                      <option value="prepared">Prepared</option>
                      <option value="concentration">Concentration</option>
                      <option value="ritual">Ritual</option>
                      {[0, 1, 2, 3].map((level) => (
                        <option key={level} value={String(level)}>
                          {level === 0 ? "Cantrip" : `Level ${level}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Concentration
                    <select
                      disabled={!connected || busy}
                      value={character.concentration || ""}
                      onChange={(e) =>
                        request({
                          type: "concentration",
                          spell: e.target.value,
                          id: character.id,
                          revision: character.revision,
                        })
                      }
                    >
                      <option value="">Tidak concentration</option>
                      {catalog.spells
                        .filter(
                          (s) =>
                            character.sheet.prepared.includes(s.index) &&
                            (s as typeof s & { concentration?: boolean })
                              .concentration,
                        )
                        .map((s) => (
                          <option key={s.index} value={s.index}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {["wizard", "cleric", "druid", "paladin"].includes(
                    character.build.classId,
                  ) && (
                    <>
                      <button
                        onClick={() =>
                          setPreparedDraft(
                            character.build.classId === "wizard"
                              ? [...character.build.prepared]
                              : [...character.build.spells],
                          )
                        }
                      >
                        Ganti prepared spells
                      </button>
                      {preparedDraft && (
                        <fieldset>
                          <legend>
                            Prepared spells ({preparedDraft.length}/
                            {character.build.classId === "wizard"
                              ? spellLimits(character.build).prepared
                              : spellLimits(character.build).spells}
                            )
                          </legend>
                          <p>
                            Ganti sesuai aturan rest class. Spell yang selalu prepared tetap otomatis. Spell Savant masuk spellbook dan perlu dipilih sebagai prepared.
                          </p>
                          <div className="character-options">
                            {catalog.spells
                              .filter((s) =>
                                character.build.classId === "wizard"
                                  ? [
                                      ...character.build.spells,
                                      ...(character.build.choices[
                                        "subclass.savant"
                                      ] || []),
                                      ...(character.build.choices[
                                        "subclass.savant.5"
                                      ] || []),
                                    ].includes(s.index)
                                  : s.level &&
                                    s.level <=
                                      spellLimits(character.build)
                                        .maxSpellLevel &&
                                    s.classes?.some(
                                      (c) =>
                                        c.index === character.build.classId,
                                    ),
                              )
                              .map((s) => (
                                <label key={s.index}>
                                  <input
                                    type="checkbox"
                                    checked={preparedDraft.includes(s.index)}
                                    onChange={(e) =>
                                      setPreparedDraft(
                                        e.target.checked
                                          ? [...preparedDraft, s.index]
                                          : preparedDraft.filter(
                                              (id) => id !== s.index,
                                            ),
                                      )
                                    }
                                  />
                                  {s.name}
                                </label>
                              ))}
                          </div>
                          <button
                            disabled={!connected || busy}
                            onClick={() =>
                              request(
                                {
                                  type: "prepared",
                                  spells: preparedDraft,
                                  id: character.id,
                                  revision: character.revision,
                                },
                                () => setPreparedDraft(null),
                              )
                            }
                          >
                            Simpan prepared
                          </button>
                          <button onClick={() => setPreparedDraft(null)}>
                            Batal
                          </button>
                        </fieldset>
                      )}
                    </>
                  )}
                  {!character.sheet.cantrips.length &&
                    !character.sheet.spells.length && (
                      <p className="sheet-empty-note">
                        Karakter belum memiliki spell pada level ini.
                      </p>
                    )}
                  {character.sheet.spellAbility && (
                    <p>
                      Ability {character.sheet.spellAbility.toUpperCase()} · DC{" "}
                      {character.sheet.spellDC} · Attack +
                      {character.sheet.spellAttack}
                      <button
                        disabled={!connected || busy}
                        onClick={() => roll("spell")}
                      >
                        Roll spell attack
                      </button>
                    </p>
                  )}
                  {[
                    ...new Set([
                      ...character.sheet.cantrips,
                      ...character.sheet.spells,
                    ]),
                  ]
                    .filter((id) => {
                      const s = catalog.spells.find((s) => s.index === id);
                      return (
                        `${s?.name || id} ${s?.desc?.join(" ") || ""}`
                          .toLowerCase()
                          .includes(search.toLowerCase()) &&
                        (spellFilter === "all" ||
                          (spellFilter === "prepared" &&
                            character.sheet.prepared.includes(id)) ||
                          (spellFilter === "concentration" &&
                            (s as typeof s & { concentration?: boolean })
                              ?.concentration) ||
                          (spellFilter === "ritual" &&
                            (s as typeof s & { ritual?: boolean })?.ritual) ||
                          String(s?.level) === spellFilter)
                      );
                    })
                    .map((id) => {
                      const spell = catalog.spells.find((s) => s.index === id);
                      return (
                        <details key={id}>
                          <summary>
                            {spell?.name || id}
                            {character.sheet.prepared.includes(id)
                              ? " · Prepared"
                              : ""}
                          </summary>
                          <p>
                            {spell?.casting_time} · {spell?.range} ·{" "}
                            {spell?.duration}
                          </p>
                          <p>{spell?.desc?.join("\n")}</p>
                        </details>
                      );
                    })}
                </section>
                <section
                  hidden={sheetTab !== "equipment"}
                  className="sheet-section"
                >
                  <h3>Equipment & bahasa</h3>
                  <ul>
                    {character.sheet.equipment.map((e) => (
                      <li key={e.id}>
                        {e.count} × {e.name}
                      </li>
                    ))}
                  </ul>
                  <p>{character.sheet.equipmentNotes}</p>
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
                      <details key={i}>
                        <summary>{f.name}</summary>
                        <p>{f.desc.join("\n")}</p>
                      </details>
                    ))}
                  <p>{character.build.notes}</p>
                </section>
                <section
                  hidden={sheetTab !== "equipment"}
                  className="sheet-section"
                >
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
              </>
            )}
            {!build && !character && (
              <div className="character-empty">
                <BookOpen size={40} />
                <h3>Mulai dari pilihan, selesai dengan sheet.</h3>
                <p>
                  Pilih class, race, background, ability, equipment, dan spell.
                  Kalkulasi dasar divalidasi server.
                </p>
                <label>
                  Import pilihan JSON
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
                        setStep(5);
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
        <div className="character-attribution">
          D&D 2024. Katalog dasar: D&D 5e API, SRD 5.2 oleh Wizards of the
          Coast, CC BY 4.0. Background: 16 pilihan Player's Handbook 2024,
          deskripsi dan ringkasan aturan ditulis ulang. Efek situasional feat
          dijalankan bersama DM.
        </div>
      </dialog>
    </>
  );
}
