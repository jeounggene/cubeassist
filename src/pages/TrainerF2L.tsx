import { useMemo, useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import {
  F2L_CASES,
  SLOTS,
  slotAlgorithms,
  slotSetup,
  slotFacelets,
  pairFacelets,
  f2lGroups,
} from "../lib/f2l";
import type { Slot } from "../lib/f2l";
import Timer from "../components/Timer";
import CubeF2LDiagram from "../components/CubeF2LDiagram";

const SLOT_LABELS: Record<Slot, string> = {
  FR: "Front-right",
  FL: "Front-left",
  BL: "Back-left",
  BR: "Back-right",
};

// Default cube orientation per direction, so each slot faces the viewer.
const SLOT_HOME: Record<Slot, { x: number; y: number }> = {
  FR: { x: -30, y: -45 },
  FL: { x: -30, y: 45 },
  BL: { x: -30, y: 135 },
  BR: { x: -30, y: -135 },
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
  const [times, setTimes] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  const current = useMemo(
    () => F2L_CASES.find((c) => c.id === selectedId) ?? F2L_CASES[0],
    [selectedId],
  );
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
      <p className="text-slate-600 mb-6">
        Pick a case, apply its setup to a solved cube, then drill the algorithm and
        time yourself.
      </p>

      <div className="mb-6">
        {f2lGroups().map((g) => (
          <div key={g} className="mb-3">
            <div className="text-sm font-medium text-slate-500 mb-1">{g}</div>
            <div className="flex flex-wrap gap-1">
              {F2L_CASES.filter((c) => c.group === g).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCase(c.id)}
                  className={`rounded border px-2 py-1 text-sm ${
                    c.id === current.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {c.name}
                </button>
              ))}
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
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {SLOT_LABELS[s]}
          </button>
        ))}
      </div>

      <label className="mb-6 flex items-center gap-2">
        <input
          type="checkbox"
          checked={hideAlg}
          onChange={(e) => setHideAlg(e.target.checked)}
          aria-label="Hide algorithm until solve"
        />
        <span>Hide algorithm until solve</span>
      </label>

      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-xl font-semibold">{current.name}</div>
          <div className="text-sm text-slate-500 mb-3">{current.group}</div>
          <div className="text-sm text-slate-500">Setup</div>
          <div data-testid="setup" className="font-mono text-lg mb-3">
            {setup}
          </div>
          {showAlg ? (
            <>
              <div className="text-sm text-slate-500">
                Algorithm ({SLOT_LABELS[slot]})
              </div>
              <div data-testid="algorithm" className="font-mono text-lg">
                {algs[0]}
              </div>
              {algs.length > 1 ? (
                <div className="mt-1">
                  <div className="text-xs text-slate-400">Alternatives</div>
                  <ul className="font-mono text-sm text-slate-600">
                    {algs.slice(1).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-2 text-sm text-slate-600">{current.recognition}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Algorithm hidden — solve, then it reveals.
            </p>
          )}
        </div>
        <CubeF2LDiagram
          facelets={facelets}
          highlight={highlight}
          homeX={SLOT_HOME[slot].x}
          homeY={SLOT_HOME[slot].y}
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
          className="rounded bg-slate-900 px-4 py-2 text-white"
        >
          Next rep
        </button>
        <button
          type="button"
          onClick={endSession}
          className="ml-auto rounded border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50"
        >
          End session
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-200 pt-4">
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
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
