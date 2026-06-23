import { useEffect, useState } from "react";
import LastLayerDiagram from "../components/LastLayerDiagram";
import CaseChip from "../components/CaseChip";
import AlgText from "../components/AlgText";
import { AUFS } from "../lib/pll";
import {
  OLL_CASES,
  PLL_CASES,
  ALL_CASES,
  OLL_GROUPS,
  scrambleForCase,
  caseShort,
} from "../lib/algset";
import type { AlgCase } from "../lib/algset";

type Round = { id: string; auf: string };

function pickRound(ids: string[]): Round {
  return {
    id: ids[Math.floor(Math.random() * ids.length)],
    auf: AUFS[Math.floor(Math.random() * AUFS.length)],
  };
}

export default function TrainerAlgSet() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(ALL_CASES.map((c) => c.id)),
  );
  const [round, setRound] = useState<Round | null>(() => pickRound(ALL_CASES.map((c) => c.id)));
  const [revealed, setRevealed] = useState(false);

  const selectedIds = [...selected];

  // Keep the dealt round consistent with the selection: clear it when the pool
  // empties, and deal a fresh one when the current case is no longer selected.
  useEffect(() => {
    if (selectedIds.length === 0) {
      setRound(null);
      return;
    }
    if (!round || !selected.has(round.id)) {
      setRound(pickRound(selectedIds));
      setRevealed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const current: AlgCase | null = round
    ? ALL_CASES.find((c) => c.id === round.id) ?? null
    : null;
  const scramble = current ? scrambleForCase(current.algs[0], round!.auf) : "";

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const setKind = (cases: AlgCase[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      cases.forEach((c) => (on ? n.add(c.id) : n.delete(c.id)));
      return n;
    });

  const next = () => {
    if (selectedIds.length === 0) return;
    setRound(pickRound(selectedIds));
    setRevealed(false);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">OLL / PLL alg trainer</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Pick the cases you want to drill. Each scramble, applied to a solved cube, sets up
        one of your selected cases — recognise it and execute the algorithm.
      </p>

      <OllSection
        selected={selected}
        onToggle={toggle}
        onAll={() => setKind(OLL_CASES, true)}
        onNone={() => setKind(OLL_CASES, false)}
        onSetShape={setKind}
      />
      <Section
        title="PLL"
        cases={PLL_CASES}
        selected={selected}
        onToggle={toggle}
        onAll={() => setKind(PLL_CASES, true)}
        onNone={() => setKind(PLL_CASES, false)}
      />

      <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        {current ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Scramble (apply from a solved cube)
              </div>
              <div data-testid="scramble" className="font-mono text-xl">
                {scramble}
              </div>
            </div>

            {revealed ? (
              <div className="flex flex-col items-center gap-2">
                <div data-testid="reveal-name" className="text-lg font-semibold">
                  {current.name}
                </div>
                <LastLayerDiagram
                  alg={`${current.algs[0]} ${round!.auf}`.trim()}
                  kind={current.kind}
                  size={20}
                />
                <div className="font-mono text-base">
                  <AlgText alg={current.algs[0]} inserts={false} />
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  Adjust your U face (AUF) as needed before the algorithm.
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="rounded border border-slate-300 dark:border-slate-700 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Reveal case &amp; algorithm
              </button>
            )}

            <button
              type="button"
              onClick={next}
              className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2 text-white"
            >
              Next scramble
            </button>
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Select at least one case above to start drilling.
          </p>
        )}
      </div>
    </main>
  );
}

// Section header with a live count and bulk Select-all / Clear controls.
function SectionControls({
  title,
  count,
  total,
  onAll,
  onNone,
}: {
  title: string;
  count: number;
  total: number;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {count}/{total}
      </span>
      <button
        type="button"
        onClick={onAll}
        className="rounded border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Select all {title}
      </button>
      <button
        type="button"
        onClick={onNone}
        className="rounded border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Clear {title}
      </button>
    </div>
  );
}

function Chip({
  c,
  on,
  onToggle,
}: {
  c: AlgCase;
  on: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <CaseChip
      alg={c.algs[0]}
      kind={c.kind}
      label={caseShort(c.name)}
      ariaLabel={c.name}
      on={on}
      onToggle={() => onToggle(c.id)}
    />
  );
}

// Flat section (used for PLL).
function Section({
  title,
  cases,
  selected,
  onToggle,
  onAll,
  onNone,
}: {
  title: string;
  cases: AlgCase[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  const count = cases.filter((c) => selected.has(c.id)).length;
  return (
    <section className="mb-5">
      <SectionControls
        title={title}
        count={count}
        total={cases.length}
        onAll={onAll}
        onNone={onNone}
      />
      <div className="flex flex-wrap gap-1.5">
        {cases.map((c) => (
          <Chip key={c.id} c={c} on={selected.has(c.id)} onToggle={onToggle} />
        ))}
      </div>
    </section>
  );
}

// OLL section grouped by named shape; each shape header toggles its whole group.
function OllSection({
  selected,
  onToggle,
  onAll,
  onNone,
  onSetShape,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
  onSetShape: (cases: AlgCase[], on: boolean) => void;
}) {
  const count = OLL_CASES.filter((c) => selected.has(c.id)).length;
  return (
    <section className="mb-5">
      <SectionControls
        title="OLL"
        count={count}
        total={OLL_CASES.length}
        onAll={onAll}
        onNone={onNone}
      />
      {/* All shape clusters flow in one area, separated by spacing, each with its
          name on top — rather than each shape taking its own full-width row. */}
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {OLL_GROUPS.map((g) => {
          const on = g.cases.filter((c) => selected.has(c.id)).length;
          const allOn = on === g.cases.length;
          return (
            <div key={g.shape} className="flex flex-col">
              <button
                type="button"
                onClick={() => onSetShape(g.cases, !allOn)}
                title={allOn ? `Clear ${g.shape}` : `Select all ${g.shape}`}
                className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              >
                <span>{g.shape}</span>
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  {on}/{g.cases.length}
                </span>
              </button>
              <div className="flex flex-wrap gap-1.5">
                {g.cases.map((c) => (
                  <Chip key={c.id} c={c} on={selected.has(c.id)} onToggle={onToggle} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
