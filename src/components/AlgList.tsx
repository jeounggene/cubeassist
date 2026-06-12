import { useProfile } from "../state/ProfileProvider";
import LastLayerDiagram from "./LastLayerDiagram";

export type AlgCase = { id: string; name: string; algs?: string[] };

function Star({ active, onClick, alg }: { active: boolean; onClick: () => void; alg: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${active ? "Remove bookmark" : "Bookmark"} ${alg}`}
      title={active ? "Bookmarked" : "Bookmark this alg"}
      className={`px-1 text-base leading-none ${
        active ? "text-amber-500" : "text-slate-300 dark:text-slate-600 hover:text-amber-500"
      }`}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

function Check({ active, onClick, alg }: { active: boolean; onClick: () => void; alg: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${active ? "Mark not learned" : "Mark learned"} ${alg}`}
      title={active ? "Learned" : "Mark as learned"}
      className={`px-1 text-base leading-none ${
        active ? "text-emerald-500" : "text-slate-300 dark:text-slate-600 hover:text-emerald-500"
      }`}
    >
      ✓
    </button>
  );
}

export default function AlgList({ kind, cases }: { kind: "oll" | "pll"; cases: AlgCase[] }) {
  const { profile, toggleBookmark, toggleLearned } = useProfile();
  const bookmarks = profile.bookmarks ?? {};
  const learned = profile.learned ?? {};

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
                {algs.map((a, i) => {
                  const key = `${c.id}::${a}`;
                  return (
                    <li key={a} className="flex items-start gap-1">
                      <Check
                        active={!!learned[key]}
                        alg={a}
                        onClick={() => toggleLearned(key)}
                      />
                      <Star
                        active={!!bookmarks[key]}
                        alg={a}
                        onClick={() => toggleBookmark(key)}
                      />
                      <span className={i === 0 ? "" : "text-slate-500 dark:text-slate-400"}>{a}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
