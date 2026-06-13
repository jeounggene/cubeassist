import { useMemo } from "react";
import { useProfile } from "../state/ProfileProvider";
import {
  F2L_CASES,
  SLOTS,
  feliksAlgorithms,
  caseFacelets,
  pairFacelets,
  f2lGroups,
} from "../lib/f2l";
import type { Slot } from "../lib/f2l";
import MiniF2LCube from "../components/MiniF2LCube";

const SLOT_LABELS: Record<Slot, string> = {
  FR: "Front-right",
  FL: "Front-left",
  BL: "Back-left",
  BR: "Back-right",
};

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

export default function F2LFeliks() {
  const { profile, toggleBookmark } = useProfile();
  const bookmarks = profile.bookmarks ?? {};

  const previews = useMemo(() => {
    const m = new Map<string, { facelets: number[]; highlight: number[] }>();
    for (const c of F2L_CASES) {
      m.set(c.id, { facelets: caseFacelets(c), highlight: pairFacelets(c, "FR") });
    }
    return m;
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">F2L — Feliks algorithms</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Feliks Zemdegs &amp; Andy Klise's "all four slot angles" set, solved in a fixed
        orientation. Tap ☆ to bookmark.
      </p>

      {f2lGroups().map((g) => (
        <section key={g} className="mb-6">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {F2L_CASES.filter((c) => c.group === g).map((c) => {
              const p = previews.get(c.id)!;
              return (
                <div
                  key={c.id}
                  className="flex gap-3 rounded border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="shrink-0">
                    <MiniF2LCube facelets={p.facelets} highlight={p.highlight} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold mb-1">{c.name}</div>
                    {SLOTS.map((s) => {
                      const algs = feliksAlgorithms(c, s);
                      return (
                        <div key={s} className="mb-1">
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            {SLOT_LABELS[s]}
                          </div>
                          {algs.length ? (
                            <ul className="font-mono text-sm">
                              {algs.map((a) => {
                                const key = `${c.id}:${s}:${a}`;
                                return (
                                  <li key={a} className="flex items-start gap-1">
                                    <Star
                                      active={!!bookmarks[key]}
                                      alg={a}
                                      onClick={() => toggleBookmark(key)}
                                    />
                                    <span>{a}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="text-sm text-slate-400 dark:text-slate-500">
                              — (see SpeedCubeDB)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
