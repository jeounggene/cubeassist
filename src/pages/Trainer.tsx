import { useState } from "react";
import TrainerCross from "./TrainerCross";
import TrainerLookahead from "./TrainerLookahead";

type TrainerKey = "cross" | "lookahead";

export default function Trainer() {
  const [trainer, setTrainer] = useState<TrainerKey>("cross");

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-4 flex items-center gap-2">
        <select
          value={trainer}
          onChange={(e) => setTrainer(e.target.value as TrainerKey)}
          aria-label="Select trainer"
          className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-100"
        >
          <option value="cross">Cross</option>
          <option value="lookahead">Look-ahead</option>
        </select>
      </div>

      {trainer === "cross" && <TrainerCross />}
      {trainer === "lookahead" && <TrainerLookahead />}
    </>
  );
}
