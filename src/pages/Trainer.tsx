import { useSearchParams } from "react-router-dom";
import TrainerCross from "./TrainerCross";
import TrainerLookahead from "./TrainerLookahead";
import TrainerPLL from "./TrainerPLL";
import TrainerAlgSet from "./TrainerAlgSet";

const KEYS = ["cross", "lookahead", "pll", "algset"] as const;
type TrainerKey = (typeof KEYS)[number];

export default function Trainer() {
  // The active sub-trainer lives in the URL (?mode=…) so the training plan can
  // deep-link to it; falls back to cross for anything unrecognised.
  const [params, setParams] = useSearchParams();
  const raw = params.get("mode");
  const trainer: TrainerKey = (KEYS as readonly string[]).includes(raw ?? "")
    ? (raw as TrainerKey)
    : "cross";
  const setTrainer = (t: TrainerKey) => setParams({ mode: t }, { replace: true });

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
          <option value="pll">PLL recognition</option>
          <option value="algset">OLL / PLL algs</option>
        </select>
      </div>

      {trainer === "cross" && <TrainerCross />}
      {trainer === "lookahead" && <TrainerLookahead />}
      {trainer === "pll" && <TrainerPLL />}
      {trainer === "algset" && <TrainerAlgSet />}
    </>
  );
}
