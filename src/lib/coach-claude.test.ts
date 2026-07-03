import { describe, it, expect } from "vitest";
import { parseCoachReport, makeClaudeCoach } from "./coach-claude";

describe("parseCoachReport", () => {
  it("parses a well-formed report", () => {
    const report = parseCoachReport(
      JSON.stringify({
        summary: "F2L is your bottleneck",
        insights: [
          { id: "bottleneck-f2l", area: "f2l", severity: "focus", headline: "h", detail: "d" },
        ],
      }),
    );
    expect(report.summary).toBe("F2L is your bottleneck");
    expect(report.insights[0].area).toBe("f2l");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCoachReport("not json")).toThrow();
  });

  it("throws when summary or insights are missing", () => {
    expect(() => parseCoachReport(JSON.stringify({ summary: "x" }))).toThrow();
    expect(() => parseCoachReport(JSON.stringify({ insights: [] }))).toThrow();
  });
});

describe("makeClaudeCoach", () => {
  it("returns a provider with an analyze method", () => {
    const provider = makeClaudeCoach("sk-test");
    expect(typeof provider.analyze).toBe("function");
  });
});
