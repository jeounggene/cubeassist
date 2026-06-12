import { useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import type { ChecklistKey, Stage } from "../types/profile";

import f2lCases from "../data/cases/f2l.json";
import oll2lookCases from "../data/cases/oll2look.json";
import pll2lookCases from "../data/cases/pll2look.json";
import ollCases from "../data/cases/oll.json";
import pllCases from "../data/cases/pll.json";

type Case = { id: string; name: string };

const STAGES: { key: Stage; label: string }[] = [
  { key: "cross", label: "Cross" },
  { key: "f2l", label: "F2L" },
  { key: "oll", label: "OLL" },
  { key: "pll", label: "PLL" },
];

const CHECKLISTS: { key: ChecklistKey; label: string; cases: Case[] }[] = [
  { key: "f2l", label: "F2L", cases: f2lCases as Case[] },
  { key: "oll2look", label: "2-look OLL", cases: oll2lookCases as Case[] },
  { key: "pll2look", label: "2-look PLL", cases: pll2lookCases as Case[] },
  { key: "oll", label: "OLL", cases: ollCases as Case[] },
  { key: "pll", label: "PLL", cases: pllCases as Case[] },
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
      <label htmlFor={`${stage}-time`} className="w-20 font-medium">
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
        className="w-24 rounded border border-slate-300 dark:border-slate-700 px-2 py-1"
      />
      <button
        type="button"
        onClick={submit}
        aria-label={`Add ${label} time`}
        className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-3 py-1 text-white"
      >
        Add
      </button>
      <span className="text-sm text-slate-600 dark:text-slate-300">
        avg:{" "}
        <span data-testid={`${stage}-avg`}>
          {avg === null ? "—" : avg.toFixed(2)}
        </span>
        s ({profile.times[stage].samples.length} samples)
      </span>
    </div>
  );
}

function Checklist({
  list,
  label,
  cases,
}: {
  list: ChecklistKey;
  label: string;
  cases: Case[];
}) {
  const { profile, toggleKnown } = useProfile();
  const total = cases.length;
  const knownCount = cases.filter((c) => profile.known[list][c.id]).length;

  return (
    <section
      aria-labelledby={`heading-${list}`}
      role="region"
      aria-label={label}
      className="mb-6"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 id={`heading-${list}`} className="text-xl font-semibold">
          {label}
        </h2>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {knownCount} / {total} known
        </span>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-1">
        {cases.map((c) => {
          const checked = !!profile.known[list][c.id];
          return (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleKnown(list, c.id, e.target.checked)}
                  aria-label={c.name}
                />
                <span>{c.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SettingsSection() {
  const { profile, setSetting, resetProfile } = useProfile();
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={profile.settings.inspection}
          onChange={(e) => setSetting("inspection", e.target.checked)}
          aria-label="Enable 15s inspection"
        />
        <span>Enable 15s inspection (WCA-style)</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={profile.settings.useMs}
          onChange={(e) => setSetting("useMs", e.target.checked)}
          aria-label="Show milliseconds"
        />
        <span>Show milliseconds in timer</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={profile.settings.theme === "dark"}
          onChange={(e) => setSetting("theme", e.target.checked ? "dark" : "light")}
          aria-label="Dark mode"
        />
        <span>Dark mode</span>
      </label>
      <button
        type="button"
        onClick={() => {
          if (confirm("Reset all profile data? This cannot be undone.")) {
            resetProfile();
          }
        }}
        className="rounded border border-red-300 dark:border-red-800 px-3 py-1 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
      >
        Reset all data
      </button>
    </div>
  );
}

export default function Profile() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Your profile</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Stage times</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Enter your most recent times for each CFOP stage. We keep a rolling
          average of your last 12 entries.
        </p>
        {STAGES.map((s) => (
          <StageTimeInput key={s.key} stage={s.key} label={s.label} />
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Algorithms known</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Check the ones you've memorized. Used by the recommendation engine.
        </p>
        {CHECKLISTS.map((cl) => (
          <Checklist
            key={cl.key}
            list={cl.key}
            label={cl.label}
            cases={cl.cases}
          />
        ))}
      </section>

      <section className="mt-10 border-t border-slate-200 dark:border-slate-700 pt-6">
        <h2 className="text-xl font-semibold mb-2">Settings</h2>
        <SettingsSection />
      </section>
    </main>
  );
}
