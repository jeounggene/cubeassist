import type { SmartSolve, StageSplits } from "../types/profile";

export type CoachArea = "cross" | "f2l" | "oll" | "pll" | "overall";

export type CoachInsight = {
  id: string;
  area: CoachArea;
  severity: "focus" | "tip" | "info";
  headline: string;
  detail: string;
  action?: { label: string; to: string };
};

export type CoachReport = { summary: string; insights: CoachInsight[] };
export type CoachInput = { solves: SmartSolve[] };

export interface CoachProvider {
  analyze(input: CoachInput): CoachReport | Promise<CoachReport>;
}

const STAGES = ["cross", "f2l", "oll", "pll"] as const;
type StageKey = (typeof STAGES)[number];
const WINDOW = 12;
const MIN_SOLVES = 3;

const STAGE_META: Record<StageKey, { label: string; action: { label: string; to: string } }> = {
  cross: { label: "cross", action: { label: "Open cross trainer", to: "/trainer?mode=cross" } },
  f2l: { label: "F2L", action: { label: "Open look-ahead trainer", to: "/trainer?mode=lookahead" } },
  oll: { label: "OLL", action: { label: "Open alg trainer", to: "/trainer?mode=algset" } },
  pll: { label: "PLL", action: { label: "Open PLL recognition", to: "/trainer?mode=pll" } },
};

// Target stage splits (seconds) per total-time bracket. Coarse but useful.
const BENCHMARKS: { maxTotal: number; target: StageSplits }[] = [
  { maxTotal: 20, target: { cross: 1.5, f2l: 9, oll: 2.5, pll: 2 } },
  { maxTotal: 30, target: { cross: 2.5, f2l: 14, oll: 4, pll: 3.5 } },
  { maxTotal: 45, target: { cross: 4, f2l: 22, oll: 6, pll: 5 } },
  { maxTotal: Infinity, target: { cross: 6, f2l: 34, oll: 10, pll: 8 } },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function stageAverages(solves: SmartSolve[]): StageSplits {
  return {
    cross: mean(solves.map((s) => s.splits.cross)),
    f2l: mean(solves.map((s) => s.splits.f2l)),
    oll: mean(solves.map((s) => s.splits.oll)),
    pll: mean(solves.map((s) => s.splits.pll)),
  };
}

function benchmarkFor(total: number): StageSplits {
  return BENCHMARKS.find((b) => total <= b.maxTotal)!.target;
}

// Stage with the largest gap above its benchmark (in seconds).
function bottleneck(avgs: StageSplits, bench: StageSplits): { stage: StageKey; gap: number } {
  let best: { stage: StageKey; gap: number } = { stage: "f2l", gap: -Infinity };
  for (const st of STAGES) {
    const gap = avgs[st] - bench[st];
    if (gap > best.gap) best = { stage: st, gap };
  }
  return best;
}

// Coefficient of variation of a stage across solves.
function cvOf(solves: SmartSolve[], st: StageKey): number {
  const xs = solves.map((s) => s.splits[st]);
  const m = mean(xs);
  if (m === 0) return 0;
  const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  return sd / m;
}

// `satisfies` (not `: CoachProvider`) keeps the concrete synchronous return type
// so callers get a `CoachReport` directly, while still conforming to the provider
// seam that allows a future async (LLM-backed) provider.
export const heuristicCoach = {
  analyze({ solves }: CoachInput): CoachReport {
    if (solves.length < MIN_SOLVES) {
      return {
        summary: "Do a few solves and I'll start coaching.",
        insights: [
          {
            id: "warmup",
            area: "overall",
            severity: "info",
            headline: `Need ${MIN_SOLVES - solves.length} more solve(s)`,
            detail: "The coach analyses your recent solves — keep going.",
            action: { label: "See your plan", to: "/plan" },
          },
        ],
      };
    }

    const recent = solves.slice(-WINDOW);
    const avgs = stageAverages(recent);
    const avgTotal = mean(recent.map((s) => s.total));
    const bench = benchmarkFor(avgTotal);
    const insights: CoachInsight[] = [];

    // Focus: biggest gap above benchmark.
    const bn = bottleneck(avgs, bench);
    if (bn.gap > 0.5) {
      const meta = STAGE_META[bn.stage];
      insights.push({
        id: `bottleneck-${bn.stage}`,
        area: bn.stage,
        severity: "focus",
        headline: `${meta.label} is your biggest time sink`,
        detail: `Your ${meta.label} averages ${avgs[bn.stage].toFixed(1)}s vs a ${bench[bn.stage].toFixed(1)}s target for a ${avgTotal.toFixed(0)}s solve — about ${bn.gap.toFixed(1)}s to gain.`,
        action: meta.action,
      });
    }

    // Tip: least consistent stage (excluding the one already flagged as focus).
    const cvRanked = STAGES.filter((st) => st !== bn.stage)
      .map((st) => ({ st, cv: cvOf(recent, st) }))
      .sort((a, b) => b.cv - a.cv);
    if (cvRanked[0] && cvRanked[0].cv > 0.35) {
      const st = cvRanked[0].st;
      const meta = STAGE_META[st];
      insights.push({
        id: `consistency-${st}`,
        area: st,
        severity: "tip",
        headline: `${meta.label} is inconsistent`,
        detail: `Your ${meta.label} time swings a lot (CV ${(cvRanked[0].cv * 100).toFixed(0)}%) — usually a recognition gap. Drill it for smoother, more predictable times.`,
        action: meta.action,
      });
    }

    // Info: trend across the recent window (first half vs second half).
    if (recent.length >= 4) {
      const half = Math.floor(recent.length / 2);
      const older = mean(recent.slice(0, half).map((s) => s.total));
      const newer = mean(recent.slice(half).map((s) => s.total));
      const delta = older - newer;
      if (Math.abs(delta) > 0.3) {
        insights.push({
          id: "trend",
          area: "overall",
          severity: "info",
          headline: delta > 0 ? "Trending faster" : "Slower than earlier",
          detail:
            delta > 0
              ? `You're ${delta.toFixed(1)}s faster across this session — keep the momentum.`
              : `You've slowed ${Math.abs(delta).toFixed(1)}s this session — take a breath and reset.`,
        });
      }
    }

    const order = { focus: 0, tip: 1, info: 2 };
    insights.sort((a, b) => order[a.severity] - order[b.severity]);

    const summary =
      insights.find((i) => i.severity === "focus")?.headline ??
      `Solid ${avgTotal.toFixed(1)}s average — keep drilling.`;
    return { summary, insights };
  },
} satisfies CoachProvider;
