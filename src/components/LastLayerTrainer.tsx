import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { solved, applyAlg, invertAlg } from "../lib/facecube";
import LastLayerDiagram from "./LastLayerDiagram";
import LastLayerCube from "./LastLayerCube";
import AlgText from "./AlgText";

export type AlgCase = { id: string; name: string; algs?: string[] };

// "OLL 01" -> "#01"; "PLL Aa perm" -> "Aa";
// "2-look OLL — Sune (OCLL)" -> "Sune".
function shortLabel(name: string): string {
  return name
    .replace(/^2-look OLL — /, "")
    .replace(/\s*\(.*\)$/, "")
    .replace(/^OLL /, "#")
    .replace(/^PLL /, "")
    .replace(/ perm$/, "");
}

// Same shape as the F2L page (case sidebar + always-visible animated cube +
// algorithm with ▶). The sidebar uses compact 2D last-layer diagrams for quick
// recognition; the main panel plays the alg on a 3D cube. No slot/direction or
// alg-set controls (they don't apply to OLL/PLL).
export default function LastLayerTrainer({
  kind,
  title,
  cases,
  subtitle = "Pick a case from the list and drill its algorithm.",
  intro,
}: {
  kind: "oll" | "pll";
  title: string;
  cases: AlgCase[];
  subtitle?: string;
  intro?: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? "");
  const [hideAlg, setHideAlg] = useState(false);
  const [play, setPlay] = useState({ alg: "", nonce: 0 });
  const playAlg = (a: string) => setPlay((p) => ({ alg: a, nonce: p.nonce + 1 }));

  const current = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? cases[0],
    [cases, selectedId],
  );
  const algs = current?.algs ?? [];
  const hasAlg = algs.length > 0;
  const setup = useMemo(() => (hasAlg ? invertAlg(algs[0]) : ""), [algs, hasAlg]);
  // The case state the algorithms solve: invert the favoured alg onto a solved cube.
  const facelets = useMemo(
    () => (hasAlg ? applyAlg(solved(), invertAlg(algs[0])) : solved()),
    [algs, hasAlg],
  );
  const showAlg = !hideAlg;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-1">{title}</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-4">{subtitle}</p>

      {intro}

      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Left sidebar: the case picker. */}
        <aside className="sm:w-48 sm:shrink-0">
          <div className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Cases</div>
          <div className="max-h-[70vh] overflow-y-auto px-1.5 py-1">
            <div className="flex flex-wrap gap-1.5">
              {cases.map((c) => {
                const a0 = (c.algs ?? [])[0];
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.name}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex flex-col items-center rounded border px-1 pt-1 pb-0.5 ${
                      c.id === current?.id
                        ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-900 dark:ring-slate-100"
                        : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {a0 ? <LastLayerDiagram alg={a0} kind={kind} size={13} /> : null}
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      {shortLabel(c.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main: hide toggle + always-visible diagram + algorithm. */}
        <div className="min-w-0 flex-1">
          <label className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={hideAlg}
              onChange={(e) => setHideAlg(e.target.checked)}
              aria-label="Hide algorithm"
            />
            <span>Hide algorithm</span>
          </label>

          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="text-xl font-semibold mb-3">{current?.name}</div>
              {hasAlg ? (
                <>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Setup</div>
                  <div data-testid="setup" className="font-mono text-lg mb-3">
                    {setup}
                  </div>
                </>
              ) : null}
              {showAlg ? (
                hasAlg ? (
                  <>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Algorithm — ▶ plays it on the cube
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Play ${algs[0]}`}
                        onClick={() => playAlg(algs[0])}
                        className="rounded bg-emerald-600 px-1.5 text-xs text-white hover:bg-emerald-700"
                      >
                        ▶
                      </button>
                      <span data-testid="algorithm" className="font-mono text-lg">
                        <AlgText alg={algs[0]} inserts={false} />
                      </span>
                    </div>
                    {algs.length > 1 ? (
                      <div className="mt-1">
                        <div className="text-xs text-slate-400 dark:text-slate-500">Alternatives</div>
                        <ul className="font-mono text-sm text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5">
                          {algs.slice(1).map((a) => (
                            <li key={a} className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Play ${a}`}
                                onClick={() => playAlg(a)}
                                className="rounded border border-emerald-600 px-1 text-[10px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              >
                                ▶
                              </button>
                              <AlgText alg={a} inserts={false} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    No algorithm for this case.
                  </p>
                )
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Algorithm hidden — uncheck to reveal.
                </p>
              )}
            </div>
            {hasAlg ? (
              <div className="shrink-0">
                <LastLayerCube facelets={facelets} play={play} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
