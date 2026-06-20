import { useCallback, useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import { mean, avgOfLast } from "../lib/stats";
import Timer from "./Timer";

type Props = {
  title: string;
  description: string;
  generate: () => string;
  caseId: string;
};

// A plain speedcube timer: show a scramble, time the solve with the spacebar
// Timer, and track Ao5 / Ao12 across the session. The scramble source is
// injected via `generate`, so the same UI powers 3x3, RU, RUL, etc.
export default function ScrambleTimer({ title, description, generate, caseId }: Props) {
  const { profile, addDrill } = useProfile();
  const [scramble, setScramble] = useState(() => generate());
  const [times, setTimes] = useState<number[]>([]);

  const handleComplete = useCallback((seconds: number) => {
    setTimes((t) => [...t, seconds]);
  }, []);

  const next = () => setScramble(generate());

  const endSession = () => {
    if (times.length === 0) return;
    addDrill({
      date: new Date().toISOString().slice(0, 10),
      caseId,
      attempts: times.length,
      avgTime: Number(mean(times).toFixed(3)),
    });
    setTimes([]);
    setScramble(generate());
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">{title}</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">{description}</p>

      <div className="mb-6">
        <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Scramble</div>
        <div data-testid="scramble" className="font-mono text-xl">
          {scramble}
        </div>
      </div>

      <div className="mb-6">
        <Timer
          inspection={profile.settings.inspection}
          useMs={profile.settings.useMs}
          onComplete={handleComplete}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={next}
          className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2 text-white"
        >
          Next scramble
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
