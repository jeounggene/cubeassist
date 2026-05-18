import { useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import type { Stage } from "../types/profile";

const STAGES: { key: Stage; label: string }[] = [
  { key: "cross", label: "Cross" },
  { key: "f2l", label: "F2L" },
  { key: "oll", label: "OLL" },
  { key: "pll", label: "PLL" },
];

function StageTimeInput({ stage, label }: { stage: Stage; label: string }) {
  const { profile, addTime } = useProfile();
  const [value, setValue] = useState("");

  const submit = () => {
    const n = Number(value);
    if (n > 0 && Number.isFinite(n)) {
      addTime(stage, n);
      setValue("");
    }
  };

  const avg = profile.times[stage].avg;
  return (
    <div className="flex items-center gap-3 py-2">
      <label
        htmlFor={`${stage}-time`}
        className="w-20 font-medium"
      >
        {label}
      </label>
      <input
        id={`${stage}-time`}
        aria-label={`${label} time`}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-24 rounded border border-slate-300 px-2 py-1"
      />
      <button
        type="button"
        onClick={submit}
        aria-label={`Add ${label} time`}
        className="rounded bg-slate-900 px-3 py-1 text-white"
      >
        Add
      </button>
      <span className="text-sm text-slate-600">
        avg:{" "}
        <span data-testid={`${stage}-avg`}>
          {avg === null ? "—" : avg.toFixed(2)}
        </span>
        s ({profile.times[stage].samples.length} samples)
      </span>
    </div>
  );
}

export default function Profile() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Your profile</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Stage times</h2>
        <p className="text-sm text-slate-600 mb-3">
          Enter your most recent times for each CFOP stage. We keep a rolling
          average of your last 12 entries.
        </p>
        {STAGES.map((s) => (
          <StageTimeInput key={s.key} stage={s.key} label={s.label} />
        ))}
      </section>
    </main>
  );
}
