import { useMemo, useState } from "react";
import pllCases from "../data/cases/pll.json";
import LastLayerDiagram from "../components/LastLayerDiagram";
import LastLayerCube from "../components/LastLayerCube";
import AlgText from "../components/AlgText";
import { solved, applyAlg, invertAlg } from "../lib/facecube";
import { pllShortName, pllLetter, PLL_GROUPS, PLL_LETTERS, AUFS } from "../lib/pll";

type Case = { id: string; name: string; algs?: string[] };
const CASES = pllCases as Case[];

// A round is a case, a random AUF, and a random stationary viewing angle for the
// 3D cube — so the same case is shown from a different corner each time. The
// negative tilt keeps the top face in view; the four 90° corners each show a
// clean three-sided angle, plus a little jitter so repeats still look fresh.
function randomRound() {
  const corner = Math.floor(Math.random() * 4);
  return {
    caseIndex: Math.floor(Math.random() * CASES.length),
    auf: AUFS[Math.floor(Math.random() * AUFS.length)],
    viewX: -50 + Math.random() * 18, // -50..-32
    viewY: -34 + corner * 90 + (Math.random() * 24 - 12),
  };
}

export default function TrainerPLL() {
  const [round, setRound] = useState(randomRound);
  const [picked, setPicked] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0 });
  const [mode, setMode] = useState<"full" | "letter">("full");
  const [view, setView] = useState<"flat" | "cube">("flat");

  const current = CASES[round.caseIndex];
  const caseShort = pllShortName(current.name); // the specific case, e.g. "Aa"
  // Letter-only mode asks just for the family ("A"); full mode wants the case.
  const answer = mode === "letter" ? pllLetter(caseShort) : caseShort;
  const groups = mode === "letter" ? [PLL_LETTERS] : PLL_GROUPS;
  const algs = current.algs ?? [];
  // Appending the AUF rotates the shown case to one of its four angles without
  // changing which PLL it is.
  const displayAlg = [algs[0], round.auf].filter(Boolean).join(" ");
  // The 3D cube needs the actual case state: invert the (AUF-adjusted) alg.
  const facelets = useMemo(() => applyAlg(solved(), invertAlg(displayAlg)), [displayAlg]);
  const answered = picked !== null;
  const isCorrect = picked === answer;

  const choose = (name: string) => {
    if (answered) return;
    setPicked(name);
    setStats((s) => ({
      correct: s.correct + (name === answer ? 1 : 0),
      total: s.total + 1,
      streak: name === answer ? s.streak + 1 : 0,
    }));
  };

  const next = () => {
    setRound(randomRound());
    setPicked(null);
  };

  // Switching difficulty clears the verdict and resets the count so the
  // streak/accuracy don't mix the two modes.
  const setLetterOnly = (letterOnly: boolean) => {
    setMode(letterOnly ? "letter" : "full");
    setPicked(null);
    setStats({ correct: 0, total: 0, streak: 0 });
  };

  const base =
    "rounded border px-2 py-1.5 text-sm font-medium tabular-nums min-w-[2.5rem] text-center";
  const buttonClass = (name: string) => {
    if (!answered)
      return `${base} border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`;
    if (name === answer) return `${base} bg-emerald-600 border-emerald-600 text-white`;
    if (name === picked) return `${base} bg-red-600 border-red-600 text-white`;
    return `${base} border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600`;
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">PLL recognition</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Identify the permutation. The case is shown from a random angle each round — pick
        the PLL, then check yourself.
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mode === "letter"}
            onChange={(e) => setLetterOnly(e.target.checked)}
            aria-label="Letter only"
          />
          <span>Letter only — name the family (A, G, J…), not the exact case</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={view === "cube"}
            onChange={(e) => setView(e.target.checked ? "cube" : "flat")}
            aria-label="3D view"
          />
          <span>3D view — a stationary cube from a new angle each time</span>
        </label>
      </div>

      <div className="flex flex-col items-center gap-2 mb-6">
        {view === "cube" ? (
          <LastLayerCube facelets={facelets} homeX={round.viewX} homeY={round.viewY} />
        ) : (
          <LastLayerDiagram alg={displayAlg} kind="pll" size={28} />
        )}
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {mode === "letter" ? "Which PLL family is this?" : "Which PLL is this?"}
          {view === "cube" ? " · drag to inspect" : ""}
        </div>
      </div>

      {/* One horizontal bank that wraps; each family stays together as a cluster,
          separated by the wider gap-x so groups remain easy to scan. */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-6">
        {groups.map((group, gi) => (
          <div key={gi} className="flex gap-1.5">
            {group.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => choose(name)}
                disabled={answered}
                className={buttonClass(name)}
              >
                {name}
              </button>
            ))}
          </div>
        ))}
      </div>

      {answered ? (
        <div className="flex flex-col items-center gap-3 mb-6">
          <div
            data-testid="result"
            className={`text-lg font-semibold ${
              isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {isCorrect ? "Correct!" : `Incorrect — it's ${answer} perm`}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-sm text-slate-500 dark:text-slate-400">{caseShort} perm</div>
            <div className="font-mono text-base">
              <AlgText alg={algs[0]} inserts={false} />
            </div>
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2 text-white"
          >
            Next case
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-200 dark:border-slate-700 pt-4">
        <Stat label="Correct" value={String(stats.correct)} testId="stat-correct" />
        <Stat label="Attempts" value={String(stats.total)} testId="stat-total" />
        <Stat label="Streak" value={String(stats.streak)} testId="stat-streak" />
      </div>
    </main>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div>
      <div data-testid={testId} className="text-2xl font-semibold tabular-nums">
        {value}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
