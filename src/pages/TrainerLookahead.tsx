import { useState } from "react";
import { generateScramble } from "../lib/scramble";
import Metronome from "../components/Metronome";
import Timer from "../components/Timer";

export default function TrainerLookahead() {
  const [tps, setTps] = useState(2);
  const [running, setRunning] = useState(false);
  const [scramble, setScramble] = useState(() => generateScramble(20));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">Look-ahead trainer</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Solve on a real cube and keep every turn on the beat with no pauses. Start
        slow and raise the tempo as your look-ahead improves.
      </p>

      <div className="mb-6">
        <div className="text-sm text-slate-500 dark:text-slate-400">Scramble</div>
        <div data-testid="scramble" className="font-mono text-lg">
          {scramble}
        </div>
        <button
          type="button"
          onClick={() => setScramble(generateScramble(20))}
          className="mt-2 rounded border border-slate-300 dark:border-slate-700 px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          New scramble
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium">Tempo</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={tps}
            onChange={(e) => setTps(Number(e.target.value))}
            aria-label="Tempo (turns per second)"
          />
          <span className="w-16 font-mono text-sm">{tps.toFixed(1)} tps</span>
        </label>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2 text-white"
        >
          {running ? "Stop" : "Start"} metronome
        </button>
        <Metronome tps={tps} running={running} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <Timer inspection={false} useMs={false} onComplete={() => {}} />
      </div>
    </main>
  );
}
