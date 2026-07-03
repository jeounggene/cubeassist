import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProfile } from "../state/ProfileProvider";
import { getSmartSolves } from "../lib/profile";
import { heuristicCoach } from "../lib/coach";
import type { CoachInsight, CoachReport } from "../lib/coach";
import { makeClaudeCoach } from "../lib/coach-claude";
import { SimulatorCube } from "../lib/smartcube/simulator";
import { GanCube, clearGanMac } from "../lib/smartcube/gan";
import type { SmartCube } from "../lib/smartcube/smartcube";
import SmartCubeSession from "../components/SmartCubeSession";

const hasBluetooth = () => typeof navigator !== "undefined" && "bluetooth" in navigator;
const MIN_SOLVES = 3;

export default function Coach() {
  const { profile, setSetting } = useProfile();
  const [params] = useSearchParams();
  const sim = params.get("sim") === "1";

  const [cube, setCube] = useState<SmartCube | null>(() => {
    if (sim) {
      const c = new SimulatorCube();
      void c.connect();
      return c;
    }
    return null;
  });
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const solves = getSmartSolves(profile);
  const solveKey = `${solves.length}:${solves[solves.length - 1]?.total ?? 0}`;
  const heuristicReport = useMemo(
    () => heuristicCoach.analyze({ solves }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solveKey],
  );

  // Claude coaching is user-initiated (it spends tokens and sends data to the API).
  const [claudeReport, setClaudeReport] = useState<CoachReport | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coaching, setCoaching] = useState(false);

  const connectGan = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const gan = new GanCube();
      await gan.connect();
      gan.onDisconnect(() => setCube(null));
      setCube(gan);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  };

  const askClaude = async () => {
    const key = profile.settings.anthropicKey;
    if (!key) return;
    setCoaching(true);
    setCoachError(null);
    try {
      const report = await makeClaudeCoach(key).analyze({ solves });
      setClaudeReport(report);
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : String(e));
    } finally {
      setCoaching(false);
    }
  };

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

  const report = claudeReport ?? heuristicReport;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">Coach</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Solve on your smart cube — I'll break down every solve by stage and tell you what to work on.
      </p>

      {cube ? (
        <div className="mb-6">
          <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Connected: <span className="font-medium">{cube.brand}</span>
          </div>
          <SmartCubeSession cube={cube} />
        </div>
      ) : (
        <div className="mb-6 rounded border border-dashed border-slate-300 dark:border-slate-600 p-4">
          <button
            type="button"
            onClick={connectGan}
            disabled={connecting}
            className="rounded bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect GAN cube"}
          </button>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Chrome/Edge only. Wake the cube (turn a face) and make sure it isn't still connected in
            the GAN app on your phone. No cube? Append <code>?sim=1</code> to try the simulator.
          </p>
          {connectError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{connectError}</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              clearGanMac();
              setConnectError(null);
            }}
            className="mt-2 text-xs text-slate-400 dark:text-slate-500 underline"
          >
            Reset saved cube MAC
          </button>
        </div>
      )}

      <section
        data-testid="coach-report"
        className="border-t border-slate-200 dark:border-slate-700 pt-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-medium">{report.summary}</span>
          {claudeReport ? (
            <span className="rounded bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 text-xs text-violet-700 dark:text-violet-300">
              ✨ Claude
            </span>
          ) : null}
        </div>
        <ul className="space-y-3">
          {report.insights.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </ul>
      </section>

      <ClaudePanel
        savedKey={profile.settings.anthropicKey}
        onSaveKey={(k) => setSetting("anthropicKey", k || undefined)}
        onAsk={askClaude}
        canAsk={solves.length >= MIN_SOLVES && !!profile.settings.anthropicKey && !coaching}
        coaching={coaching}
        error={coachError}
      />
    </main>
  );
}

function ClaudePanel({
  savedKey,
  onSaveKey,
  onAsk,
  canAsk,
  coaching,
  error,
}: {
  savedKey: string | undefined;
  onSaveKey: (key: string) => void;
  onAsk: () => void;
  canAsk: boolean;
  coaching: boolean;
  error: string | null;
}) {
  const [keyInput, setKeyInput] = useState(savedKey ?? "");

  return (
    <section className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-4">
      <h2 className="text-lg font-semibold mb-1">AI coach (Claude)</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Optional: use Claude for natural-language coaching. Your API key is stored in this browser
        and your solve splits are sent directly to the Anthropic API when you ask.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="Anthropic API key (sk-ant-…)"
          aria-label="Anthropic API key"
          className="min-w-64 flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => onSaveKey(keyInput.trim())}
          className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {savedKey ? "Update key" : "Save key"}
        </button>
        <button
          type="button"
          onClick={onAsk}
          disabled={!canAsk}
          className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {coaching ? "Asking Claude…" : "Get Claude's coaching"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Claude coaching failed ({error}). Showing the built-in coach instead.
        </p>
      ) : null}
    </section>
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
