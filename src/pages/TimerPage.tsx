import { useState } from "react";
import {
  generateScramble,
  generateRUScramble,
  generateRULScramble,
} from "../lib/scramble";
import ScrambleTimer from "../components/ScrambleTimer";

type TrainerKey = "3x3" | "ru" | "rul";

export default function TimerPage() {
  const [trainer, setTrainer] = useState<TrainerKey>("3x3");

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-4 flex items-center gap-2">
        <select
          value={trainer}
          onChange={(e) => setTrainer(e.target.value as TrainerKey)}
          aria-label="Select event"
          className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-100"
        >
          <option value="3x3">3x3</option>
          <option value="ru">RU (2-gen)</option>
          <option value="rul">RUL (3-gen)</option>
        </select>
      </div>

      {trainer === "3x3" && (
        <ScrambleTimer
          title="3x3 timer"
          description="Standard 3x3 scramble. Hold Space, release to start, any key to stop."
          generate={() => generateScramble(20)}
          caseId="timer-3x3"
        />
      )}
      {trainer === "ru" && (
        <ScrambleTimer
          title="RU (2-gen) timer"
          description="Scrambles use only R and U turns — drill 2-gen finger tricks and last-layer cases."
          generate={() => generateRUScramble()}
          caseId="timer-ru"
        />
      )}
      {trainer === "rul" && (
        <ScrambleTimer
          title="RUL (3-gen) timer"
          description="Scrambles use only R, U and L turns."
          generate={() => generateRULScramble()}
          caseId="timer-rul"
        />
      )}
    </>
  );
}
