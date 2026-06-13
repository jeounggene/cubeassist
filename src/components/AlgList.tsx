import LastLayerDiagram from "./LastLayerDiagram";

export type AlgCase = { id: string; name: string; algs?: string[] };

export default function AlgList({ kind, cases }: { kind: "oll" | "pll"; cases: AlgCase[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cases.map((c) => {
        const algs = c.algs ?? [];
        return (
          <div
            key={c.id}
            className="flex gap-3 rounded border border-slate-200 dark:border-slate-700 p-3"
          >
            <div className="shrink-0">
              {algs[0] ? <LastLayerDiagram alg={algs[0]} kind={kind} /> : null}
            </div>
            <div className="min-w-0">
              <div className="font-semibold mb-1">{c.name}</div>
              <ul className="font-mono text-sm space-y-0.5">
                {algs.map((a, i) => (
                  <li key={a} className={i === 0 ? "" : "text-slate-500 dark:text-slate-400"}>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
