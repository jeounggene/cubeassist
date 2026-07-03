import type { CoachInput, CoachProvider, CoachReport } from "./coach";

// A Claude-backed coach behind the same CoachProvider seam as heuristicCoach.
// The SDK is dynamic-imported so it stays out of the main bundle, and the request
// runs directly from the browser (the user's key + solve data go to the Anthropic
// API). Callers should treat any thrown error as "fall back to the heuristic coach".

const MODEL = "claude-opus-4-8";

// The routes the coach may link to — mirror the ones heuristicCoach uses.
const ROUTES = [
  "/trainer?mode=cross",
  "/trainer?mode=lookahead",
  "/trainer?mode=algset",
  "/trainer?mode=pll",
  "/algorithms/oll",
  "/algorithms/pll",
  "/plan",
] as const;

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "insights"],
  properties: {
    summary: { type: "string" },
    insights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "area", "severity", "headline", "detail"],
        properties: {
          id: { type: "string" },
          area: { type: "string", enum: ["cross", "f2l", "oll", "pll", "overall"] },
          severity: { type: "string", enum: ["focus", "tip", "info"] },
          headline: { type: "string" },
          detail: { type: "string" },
          action: {
            type: "object",
            additionalProperties: false,
            required: ["label", "to"],
            properties: {
              label: { type: "string" },
              to: { type: "string", enum: ROUTES },
            },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = [
  "You are an expert speedcubing coach analysing a CFOP solver's per-stage split times",
  "(cross, F2L, OLL, PLL) captured from a smart cube.",
  "Identify the biggest bottleneck, comment on consistency, and note any trend.",
  "Return one 'focus' insight (the single top priority), then 'tip' and 'info' insights.",
  "Keep each detail to one or two concrete sentences. Give every insight a stable kebab-case id.",
  `For action.to use only these routes: ${ROUTES.join(", ")}. Omit action when none fits.`,
].join(" ");

function buildUserContent(input: CoachInput): string {
  const recent = input.solves.slice(-12);
  const lines = recent.map(
    (s, i) =>
      `${i + 1}. total ${s.total.toFixed(1)}s — cross ${s.splits.cross.toFixed(1)} / F2L ${s.splits.f2l.toFixed(1)} / OLL ${s.splits.oll.toFixed(1)} / PLL ${s.splits.pll.toFixed(1)} (${s.moves} moves, ${s.tps.toFixed(1)} TPS)`,
  );
  return `My last ${recent.length} smart-cube solves (splits in seconds):\n${lines.join("\n")}\n\nCoach me: what's my biggest bottleneck, how consistent am I, and what should I drill next?`;
}

// Parse and validate the model's JSON into a CoachReport; throws on malformed output.
export function parseCoachReport(text: string): CoachReport {
  const data = JSON.parse(text) as Partial<CoachReport>;
  if (typeof data?.summary !== "string" || !Array.isArray(data.insights)) {
    throw new Error("Coach response missing summary/insights");
  }
  return data as CoachReport;
}

export function makeClaudeCoach(apiKey: string): CoachProvider {
  return {
    async analyze(input: CoachInput): Promise<CoachReport> {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        output_config: { effort: "low", format: { type: "json_schema", schema: REPORT_SCHEMA } },
        system: SYSTEM,
        messages: [{ role: "user", content: buildUserContent(input) }],
      });
      const block = res.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") throw new Error("Coach response had no text");
      return parseCoachReport(block.text);
    },
  };
}
