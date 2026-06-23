import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "../state/ProfileProvider";
import { getRegimen } from "../lib/profile";
import { buildPlan } from "../lib/regimen";
import { OLL_GROUPS, PLL_CASES, caseShort } from "../lib/algset";
import CaseChip from "../components/CaseChip";
import f2lCases from "../data/cases/f2l.json";

const F2L = f2lCases as { id: string; name: string; group: string }[];
const F2L_GROUPS = [...new Set(F2L.map((c) => c.group))];
const OLL_ALL = OLL_GROUPS.flatMap((g) => g.cases);

const today = () => new Date().toISOString().slice(0, 10);
const countKnown = (ids: string[], known: Record<string, boolean>) =>
  ids.filter((id) => known[id]).length;

export default function TrainingPlan() {
  const { profile, toggleKnown, setTask } = useProfile();
  const date = today();
  const plan = useMemo(() => buildPlan(profile, date), [profile, date]);
  const reg = getRegimen(profile);
  const done = reg.done[date] ?? [];
  const taskIds = plan.map((t) => t.id);
  const doneCount = taskIds.filter((id) => done.includes(id)).length;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Training plan</h1>
        <div
          data-testid="streak"
          className="rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-300"
        >
          {reg.streak > 0 ? `🔥 ${reg.streak}-day streak` : "No streak yet"}
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        A daily checklist tuned to what you already know. Mark the cases you can solve below
        and the plan updates itself.
      </p>

      <section className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Today</h2>
          <span data-testid="progress" className="text-sm text-slate-500 dark:text-slate-400">
            {doneCount}/{plan.length} done
          </span>
        </div>
        <ul className="space-y-2">
          {plan.map((t) => {
            const checked = done.includes(t.id);
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded border border-slate-200 dark:border-slate-700 p-3"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={t.title}
                  onChange={(e) => setTask(date, t.id, e.target.checked, taskIds)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`font-medium ${
                      checked ? "text-slate-400 line-through dark:text-slate-500" : ""
                    }`}
                  >
                    {t.title}
                  </div>
                  {t.detail ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t.detail}</div>
                  ) : null}
                </div>
                <Link
                  to={t.link}
                  className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  {t.linkLabel} →
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">What you know</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Mark the cases you can already solve — this shapes the plan above.
        </p>

        <KnownShapes
          heading="OLL"
          testId="oll-count"
          total={OLL_ALL.length}
          count={countKnown(
            OLL_ALL.map((c) => c.id),
            profile.known.oll,
          )}
        >
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {OLL_GROUPS.map((g) => (
              <div key={g.shape} className="flex flex-col">
                <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {g.shape}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.cases.map((c) => (
                    <CaseChip
                      key={c.id}
                      alg={c.algs[0]}
                      kind="oll"
                      label={caseShort(c.name)}
                      ariaLabel={c.name}
                      on={!!profile.known.oll[c.id]}
                      onToggle={() => toggleKnown("oll", c.id, !profile.known.oll[c.id])}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </KnownShapes>

        <KnownShapes
          heading="PLL"
          testId="pll-count"
          total={PLL_CASES.length}
          count={countKnown(
            PLL_CASES.map((c) => c.id),
            profile.known.pll,
          )}
        >
          <div className="flex flex-wrap gap-1.5">
            {PLL_CASES.map((c) => (
              <CaseChip
                key={c.id}
                alg={c.algs[0]}
                kind="pll"
                label={caseShort(c.name)}
                ariaLabel={c.name}
                on={!!profile.known.pll[c.id]}
                onToggle={() => toggleKnown("pll", c.id, !profile.known.pll[c.id])}
              />
            ))}
          </div>
        </KnownShapes>

        <KnownShapes
          heading="F2L"
          testId="f2l-count"
          total={F2L.length}
          count={countKnown(
            F2L.map((c) => c.id),
            profile.known.f2l,
          )}
        >
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {F2L_GROUPS.map((grp) => (
              <div key={grp} className="flex flex-col">
                <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {grp}
                </div>
                <div className="flex flex-wrap gap-1">
                  {F2L.filter((c) => c.group === grp).map((c) => {
                    const on = !!profile.known.f2l[c.id];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-label={c.name}
                        aria-pressed={on}
                        onClick={() => toggleKnown("f2l", c.id, !on)}
                        className={`rounded border px-2 py-1 text-xs ${
                          on
                            ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        #{Number(c.id.split("-")[1])}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </KnownShapes>
      </section>
    </main>
  );
}

function KnownShapes({
  heading,
  testId,
  count,
  total,
  children,
}: {
  heading: string;
  testId: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-sm font-semibold">
        {heading}{" "}
        <span data-testid={testId} className="font-normal text-slate-400 dark:text-slate-500">
          {count}/{total}
        </span>
      </h3>
      {children}
    </div>
  );
}
