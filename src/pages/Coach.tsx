import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProfile } from "../state/ProfileProvider";
import { getSmartSolves } from "../lib/profile";
import { heuristicCoach } from "../lib/coach";
import type { CoachInsight } from "../lib/coach";
import { SimulatorCube } from "../lib/smartcube/simulator";
import type { SmartCube } from "../lib/smartcube/smartcube";
import SmartCubeSession from "../components/SmartCubeSession";

const hasBluetooth = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

export default function Coach() {
  const { profile } = useProfile();
  const [params] = useSearchParams();
  const sim = params.get("sim") === "1";

  // A stable cube instance for this mount (simulator in tests / dev).
  const [cube] = useState<SmartCube | null>(() => {
    if (sim) {
      const c = new SimulatorCube();
      void c.connect();
      return c;
    }
    return null;
  });

  const solves = getSmartSolves(profile);
  const report = useMemo(() => heuristicCoach.analyze({ solves }), [solves]);

  if (!cube && !hasBluetooth()) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold mb-2">Coach</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          The coach works with a <strong>smart cube</strong> — a Bluetooth cube that streams every
          turn. Your browser doesn't support Web Bluetooth (try Chrome/Edge on desktop or Android),
          so there's no cube to connect.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You can still explore your{" "}
          <Link className="underline" to="/plan">
            training plan
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">Coach</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Solve on your smart cube — I'll break down every solve by stage and tell you what to work on.
      </p>

      {cube ? (
        <div className="mb-6">
          <SmartCubeSession cube={cube} />
        </div>
      ) : (
        <ConnectPrompt />
      )}

      <section
        data-testid="coach-report"
        className="border-t border-slate-200 dark:border-slate-700 pt-4"
      >
        <div className="text-sm font-medium mb-3">{report.summary}</div>
        <ul className="space-y-3">
          {report.insights.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </ul>
      </section>
    </main>
  );
}

function ConnectPrompt() {
  // Real-hardware connect flow (GAN driver) is a later task. Until then, prompt to use ?sim=1.
  return (
    <div className="mb-6 rounded border border-dashed border-slate-300 dark:border-slate-600 p-4 text-sm text-slate-600 dark:text-slate-300">
      Connect a smart cube to begin. (Hardware pairing lands next; append <code>?sim=1</code> to try
      the simulator.)
    </div>
  );
}

const SEVERITY_STYLE: Record<CoachInsight["severity"], string> = {
  focus: "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/40",
  tip: "border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/40",
  info: "border-l-4 border-slate-400 bg-slate-50 dark:bg-slate-800/60",
};

function InsightCard({ insight }: { insight: CoachInsight }) {
  return (
    <li className={`rounded p-3 ${SEVERITY_STYLE[insight.severity]}`}>
      <div className="font-semibold">{insight.headline}</div>
      <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{insight.detail}</div>
      {insight.action ? (
        <Link className="mt-2 inline-block text-sm underline" to={insight.action.to}>
          {insight.action.label}
        </Link>
      ) : null}
    </li>
  );
}
