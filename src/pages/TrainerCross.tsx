import { useCallback, useEffect, useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import { generateCrossScramble } from "../lib/scramble";
import { solveCross } from "../lib/cross";
import Timer from "../components/Timer";
import CubeDiagram from "../components/CubeDiagram";

const DIFFICULTIES = [2, 3, 4, 5, 6, 7, 8];

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function avgOfLast(xs: number[], n: number): string {
  if (xs.length < n) return "—";
  return mean(xs.slice(-n)).toFixed(2);
}

export default function TrainerCross() {
  const { profile, addDrill } = useProfile();
  const [difficulty, setDifficulty] = useState(4);
  const [scramble, setScramble] = useState("");
  const [times, setTimes] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);

  const newScramble = useCallback((len: number) => {
    setScramble(generateCrossScramble(len));
    setSolved(false);
    setSolution(null);
  }, []);

  useEffect(() => {
    newScramble(difficulty);
  }, [difficulty, newScramble]);

  const handleComplete = useCallback((seconds: number) => {
    setTimes((t) => [...t, seconds]);
    setSolved(true);
  }, []);

  const endSession = () => {
    if (times.length === 0) return;
    addDrill({
      date: new Date().toISOString().slice(0, 10),
      caseId: "cross",
      attempts: times.length,
      avgTime: Number(mean(times).toFixed(3)),
    });
    setTimes([]);
    setSolved(false);
    setSolution(null);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">Cross trainer</h1>
      <p className="text-slate-600 mb-6">
        Solve only the white cross on a real cube. Pick a difficulty (optimal cross
        length), then time yourself.
      </p>

      <div className="mb-6 flex items-center gap-2">
        <span className="font-medium">Difficulty:</span>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={`h-9 w-9 rounded border ${
              d === difficulty
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between gap-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">Scramble</div>
          <div data-testid="scramble" className="font-mono text-xl">
            {scramble}
          </div>
        </div>
        <CubeDiagram />
      </div>

      <div className="mb-6">
        <Timer
          inspection={profile.settings.inspection}
          useMs={profile.settings.useMs}
          onComplete={handleComplete}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => newScramble(difficulty)}
          className="rounded bg-slate-900 px-4 py-2 text-white"
        >
          Next scramble
        </button>
        {solved ? (
          solution === null ? (
            <button
              type="button"
              onClick={() => setSolution(solveCross(scramble))}
              className="rounded border border-slate-300 px-4 py-2"
            >
              Show optimal solution
            </button>
          ) : (
            <span data-testid="solution" className="font-mono text-slate-700">
              {solution}
            </span>
          )
        ) : null}
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
