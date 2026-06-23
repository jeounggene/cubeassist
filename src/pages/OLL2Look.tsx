import LastLayerTrainer from "../components/LastLayerTrainer";
import type { AlgCase } from "../components/LastLayerTrainer";
import CrossPattern from "../components/CrossPattern";
import AlgText from "../components/AlgText";
import oll2lookCases from "../data/cases/oll2look.json";

// Step 1: the three edge-orientation ("make the cross") cases. Only edge
// orientation matters, so these are shown as flat edge patterns + their algs.
const CROSS = [
  {
    shape: "dot",
    name: "Dot",
    alg: "F R U R' U' F'",
    note: "no edges up — apply, then solve the line/L it leaves",
  },
  { shape: "line", name: "Line", alg: "F R U R' U' F'", note: "2 opposite edges up" },
  { shape: "L", name: "L-shape", alg: "f R U R' U' f'", note: "2 adjacent edges up" },
] as const;

export default function OLL2Look() {
  // Step 2: the seven corner-orientation (OCLL) cases, drilled on the cube.
  const ocll = (oll2lookCases as AlgCase[]).filter((c) => c.id.startsWith("2oll-oc"));

  const intro = (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-1">Step 1 — make the yellow cross</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        Look at the yellow edges on top, then apply the matching algorithm to get a cross.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {CROSS.map((c) => (
          <div
            key={c.shape}
            className="flex items-center gap-3 rounded border border-slate-200 dark:border-slate-700 p-3"
          >
            <div className="shrink-0">
              <CrossPattern shape={c.shape} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">{c.name}</div>
              <div className="font-mono text-sm">
                <AlgText alg={c.alg} inserts={false} />
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{c.note}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-1">Step 2 — orient the corners</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        With the cross done, recognise the corner case below and drill its algorithm on the cube.
      </p>
    </section>
  );

  return (
    <LastLayerTrainer
      kind="oll"
      title="2-look OLL"
      subtitle="Two looks: make the yellow cross, then orient the corners."
      intro={intro}
      cases={ocll}
    />
  );
}
