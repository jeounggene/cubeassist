import { useMemo, useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import {
  F2L_CASES,
  SLOTS,
  slotAlgorithms,
  slotSetup,
  slotFacelets,
  caseFacelets,
  pairFacelets,
  slotCells,
  f2lGroups,
} from "../lib/f2l";
import type { Slot } from "../lib/f2l";
import Timer from "../components/Timer";
import CubeF2LDiagram from "../components/CubeF2LDiagram";
import MiniF2LCube from "../components/MiniF2LCube";

const SLOT_LABELS: Record<Slot, string> = {
  FR: "Front-right",
  FL: "Front-left",
  BL: "Back-left",
  BR: "Back-right",
};

// Cube rotation that brings each slot round to the front-right, so the standard
// Front-right algorithm can be used instead of the in-place (F/B) version.
const ROTATION_HINT: Record<Slot, string> = { FR: "", FL: "y'", BR: "y", BL: "y2" };

// One fixed orientation for every direction, so each slot stays in its REAL
// position (FR near-right, FL front-left, BR back-right, BL back-left) instead
// of rotating each slot to face front (which made them all look identical). The
// back slots (BL/BR) sit behind the cube; the "see-through" toggle reveals them.
const FRONT_VIEW = { x: -28, y: -38 };
const SLOT_HOME: Record<Slot, { x: number; y: number }> = {
  FR: FRONT_VIEW,
  FL: FRONT_VIEW,
  BR: FRONT_VIEW,
  BL: FRONT_VIEW,
};

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function avgOfLast(xs: number[], n: number): string {
  if (xs.length < n) return "—";
  return mean(xs.slice(-n)).toFixed(2);
}

export default function TrainerF2L() {
  const { profile, addDrill } = useProfile();
  const [selectedId, setSelectedId] = useState(F2L_CASES[0]?.id ?? "");
  const [slot, setSlot] = useState<Slot>("FR");
  const [hideAlg, setHideAlg] = useState(false);
  const [seeThrough, setSeeThrough] = useState(false);
  const [times, setTimes] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
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
  const algs = useMemo(() => slotAlgorithms(current, slot), [current, slot]);
  const setup = useMemo(() => slotSetup(current, slot), [current, slot]);
  // Position-accurate per direction: the pair shows in the chosen slot, and the
  // cube's home orientation rotates so that slot faces the viewer.
  const facelets = useMemo(() => slotFacelets(current, slot), [current, slot]);
  const highlight = useMemo(() => pairFacelets(current, slot), [current, slot]);

  const selectCase = (id: string) => {
    setSelectedId(id);
    setTimes([]);
    setSolved(false);
  };

  const showAlg = !hideAlg || solved;

  const endSession = () => {
    if (times.length === 0) return;
    addDrill({
      date: new Date().toISOString().slice(0, 10),
      caseId: current.id,
      attempts: times.length,
      avgTime: Number(mean(times).toFixed(3)),
    });
    setTimes([]);
    setSolved(false);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">F2L trainer</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Pick a case, apply its setup to a solved cube, then drill the algorithm and
        time yourself.
      </p>

      <div className="mb-6">
        {f2lGroups().map((g) => (
          <div key={g} className="mb-3">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{g}</div>
            <div className="flex flex-wrap gap-2">
              {F2L_CASES.filter((c) => c.group === g).map((c) => {
                const p = previews.get(c.id)!;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.name}
                    onClick={() => selectCase(c.id)}
                    className={`flex flex-col items-center rounded border px-1 pt-1 pb-0.5 ${
                      c.id === current.id
                        ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-900 dark:ring-slate-100"
                        : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <MiniF2LCube facelets={p.facelets} highlight={p.highlight} />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{c.name.replace("F2L case ", "#")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      <label className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={hideAlg}
          onChange={(e) => setHideAlg(e.target.checked)}
          aria-label="Hide algorithm until solve"
        />
        <span>Hide algorithm until solve</span>
      </label>

      <label className="mb-6 flex items-center gap-2">
        <input
          type="checkbox"
          checked={seeThrough}
          onChange={(e) => setSeeThrough(e.target.checked)}
          aria-label="See-through cube"
        />
        <span>See-through cube (reveal back slots)</span>
      </label>

      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-xl font-semibold">{current.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">{current.group}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Setup</div>
          <div data-testid="setup" className="font-mono text-lg mb-3">
            {setup}
          </div>
          {showAlg ? (
            <>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Algorithm ({SLOT_LABELS[slot]}) — ▶ plays it on the cube
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
                  {algs[0]}
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
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {slot !== "FR" ? (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  Tip: many cubers rotate{" "}
                  <span className="font-mono font-semibold">{ROTATION_HINT[slot]}</span> to bring this
                  slot to the front-right, then use the Front-right alg{" "}
                  <span className="font-mono">{current.algs.FR[0]}</span>.
                </p>
              ) : null}
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{current.recognition}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Algorithm hidden — solve, then it reveals.
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

      <div className="mb-6">
        <Timer
          inspection={profile.settings.inspection}
          useMs={profile.settings.useMs}
          onComplete={(seconds) => {
            setTimes((t) => [...t, seconds]);
            setSolved(true);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setSolved(false)}
          className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2 text-white"
        >
          Next rep
        </button>
        <button
          type="button"
          onClick={endSession}
          className="ml-auto rounded border border-red-300 dark:border-red-800 px-4 py-2 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
        >
          End session
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-200 dark:border-slate-700 pt-4">
        <Stat label="Solves" value={String(times.length)} />
        <Stat label="Ao5" value={avgOfLast(times, 5)} />
        <Stat label="Ao12" value={avgOfLast(times, 12)} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
