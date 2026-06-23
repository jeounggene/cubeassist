import { useMemo, useState } from "react";
import {
  F2L_CASES,
  SLOTS,
  slotAlgorithms,
  feliksAlgorithms,
  slotSetup,
  slotFacelets,
  caseFacelets,
  pairFacelets,
  slotCells,
  f2lGroups,
} from "../lib/f2l";
import type { Slot } from "../lib/f2l";
import CubeF2LDiagram from "../components/CubeF2LDiagram";
import MiniF2LCube from "../components/MiniF2LCube";
import AlgText from "../components/AlgText";

const SLOT_LABELS: Record<Slot, string> = {
  FR: "Front-right",
  FL: "Front-left",
  BL: "Back-left",
  BR: "Back-right",
};

// Pick a case from the left sidebar, pick a slot, drill the algorithm. The
// algorithm source is switchable via the dropdown — Feliks by default,
// SpeedCubeDB as an alternative.
type AlgSet = "feliks" | "speedcubedb";
const SET_LABELS: Record<AlgSet, string> = {
  feliks: "Feliks",
  speedcubedb: "SpeedCubeDB",
};

const FRONT_VIEW = { x: -28, y: -38 };
const SLOT_HOME: Record<Slot, { x: number; y: number }> = {
  FR: FRONT_VIEW,
  FL: FRONT_VIEW,
  BR: FRONT_VIEW,
  BL: FRONT_VIEW,
};

export default function F2L() {
  const [selectedId, setSelectedId] = useState(F2L_CASES[0]?.id ?? "");
  const [slot, setSlot] = useState<Slot>("FR");
  const [algSet, setAlgSet] = useState<AlgSet>("feliks");
  const [hideAlg, setHideAlg] = useState(false);
  const [seeThrough, setSeeThrough] = useState(false);
  const [play, setPlay] = useState({ alg: "", nonce: 0 });
  const playAlg = (a: string) => setPlay((p) => ({ alg: a, nonce: p.nonce + 1 }));

  const current = useMemo(
    () => F2L_CASES.find((c) => c.id === selectedId) ?? F2L_CASES[0],
    [selectedId],
  );

  // Precompute each case's canonical (front-right) diagram for the picker.
  const previews = useMemo(() => {
    const m = new Map<string, { facelets: number[]; highlight: number[] }>();
    for (const c of F2L_CASES) {
      m.set(c.id, { facelets: caseFacelets(c), highlight: pairFacelets(c, "FR") });
    }
    return m;
  }, []);

  const algs = useMemo(
    () => (algSet === "feliks" ? feliksAlgorithms(current, slot) : slotAlgorithms(current, slot)),
    [current, slot, algSet],
  );
  const setup = useMemo(() => slotSetup(current, slot), [current, slot]);
  const facelets = useMemo(() => slotFacelets(current, slot), [current, slot]);
  const highlight = useMemo(() => pairFacelets(current, slot), [current, slot]);

  const hasAlg = algs.length > 0;
  const showAlg = !hideAlg;
  const setLabel = SET_LABELS[algSet];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-1">F2L — {setLabel}</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-4">
        Pick a case and drill the {setLabel} algorithm for each slot.
      </p>

      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Left sidebar: the case picker. */}
        <aside className="sm:w-48 sm:shrink-0">
          <div className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Cases</div>
          <div className="max-h-[70vh] overflow-y-auto px-1.5 py-1">
            {f2lGroups().map((g) => (
              <div key={g} className="mb-3">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {g}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {F2L_CASES.filter((c) => c.group === g).map((c) => {
                    const p = previews.get(c.id)!;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-label={c.name}
                        onClick={() => setSelectedId(c.id)}
                        className={`flex flex-col items-center rounded border px-1 pt-1 pb-0.5 ${
                          c.id === current.id
                            ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-900 dark:ring-slate-100"
                            : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <MiniF2LCube facelets={p.facelets} highlight={p.highlight} />
                        <span className="text-[11px] text-slate-600 dark:text-slate-300">
                          {c.name.replace("F2L case ", "#")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main: controls + the always-visible cube diagram + algorithm. */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium">Algorithm set</span>
              <select
                value={algSet}
                onChange={(e) => setAlgSet(e.target.value as AlgSet)}
                aria-label="Choose algorithm set"
                className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-100"
              >
                <option value="feliks">Feliks</option>
                <option value="speedcubedb">SpeedCubeDB</option>
              </select>
            </label>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-medium">Direction:</span>
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  s === slot
                    ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white border-slate-900 dark:border-slate-100"
                    : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {SLOT_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideAlg}
                onChange={(e) => setHideAlg(e.target.checked)}
                aria-label="Hide algorithm"
              />
              <span>Hide algorithm</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={seeThrough}
                onChange={(e) => setSeeThrough(e.target.checked)}
                aria-label="See-through cube"
              />
              <span>See-through cube (reveal back slots)</span>
            </label>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="text-xl font-semibold">{current.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">{current.group}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Setup</div>
              <div data-testid="setup" className="font-mono text-lg mb-3">
                {setup}
              </div>
              {showAlg ? (
                hasAlg ? (
                  <>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {setLabel} algorithm ({SLOT_LABELS[slot]}) — ▶ plays it on the cube
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Play ${algs[0]}`}
                        onClick={() => playAlg(algs[0])}
                        className="rounded bg-emerald-600 px-1.5 text-xs text-white hover:bg-emerald-700"
                      >
                        ▶
                      </button>
                      <span data-testid="algorithm" className="font-mono text-lg">
                        <AlgText alg={algs[0]} />
                      </span>
                    </div>
                    {algs.length > 1 ? (
                      <div className="mt-1">
                        <div className="text-xs text-slate-400 dark:text-slate-500">Alternatives</div>
                        <ul className="font-mono text-sm text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5">
                          {algs.slice(1).map((a) => (
                            <li key={a} className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Play ${a}`}
                                onClick={() => playAlg(a)}
                                className="rounded border border-emerald-600 px-1 text-[10px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              >
                                ▶
                              </button>
                              <AlgText alg={a} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {current.recognition}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    No {setLabel} algorithm for this slot — try another direction or the SpeedCubeDB
                    set.
                  </p>
                )
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Algorithm hidden — uncheck to reveal.
                </p>
              )}
            </div>
            <CubeF2LDiagram
              facelets={facelets}
              highlight={highlight}
              slotCells={slotCells(slot)}
              homeX={SLOT_HOME[slot].x}
              homeY={SLOT_HOME[slot].y}
              play={play}
              seeThrough={seeThrough}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
