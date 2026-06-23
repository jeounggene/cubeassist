// Pure training-plan generator. Given what the user knows and how fast their
// cross is, produce a deterministic, mixed daily checklist — one task per CFOP
// area, each adapting between "learn new" and "drill" depending on progress.
import type { UserProfile } from "../types/profile";
import { OLL_GROUPS, PLL_CASES, caseShort } from "./algset";
import f2lCases from "../data/cases/f2l.json";

export type TaskId = "cross" | "f2l" | "oll" | "pll";
export type Task = {
  id: TaskId;
  title: string;
  detail: string;
  link: string;
  linkLabel: string;
};

// Learn OLL in shape order (Dot, Line, …) rather than numeric order.
const OLL_BY_SHAPE = OLL_GROUPS.flatMap((g) => g.cases);
const F2L = f2lCases as { id: string; name: string }[];

const f2lShort = (id: string) => `#${Number(id.split("-")[1])}`;
const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

function learnDetail(shorts: string[], remaining: number): string {
  return `next: ${shorts.join(", ")} · ${remaining} left`;
}

export function buildPlan(profile: UserProfile, date: string, newPerDay = 2): Task[] {
  void date; // plan is deterministic per-state; date is for callers keying the day
  const { known, times } = profile;

  const ollUnknown = OLL_BY_SHAPE.filter((c) => !known.oll[c.id]);
  const pllUnknown = PLL_CASES.filter((c) => !known.pll[c.id]);
  const f2lUnknown = F2L.filter((c) => !known.f2l[c.id]);

  // Cross is a timing skill: weak if untimed, slow, or barely sampled.
  const cross = times.cross;
  const crossWeak = cross.avg == null || cross.avg > 2.5 || cross.samples.length < 5;
  const crossTask: Task = {
    id: "cross",
    title: crossWeak ? "Cross training" : "Cross — keep sharp",
    detail: crossWeak ? "10 timed cross solves" : "5 solves to stay fast",
    link: "/trainer?mode=cross",
    linkLabel: "Open cross trainer",
  };

  const n = Math.max(1, newPerDay);

  const f2lTask: Task = f2lUnknown.length
    ? {
        id: "f2l",
        title: `Learn ${Math.min(n, f2lUnknown.length)} new F2L ${plural(Math.min(n, f2lUnknown.length), "case")}`,
        detail: learnDetail(f2lUnknown.slice(0, n).map((c) => f2lShort(c.id)), f2lUnknown.length),
        link: "/algorithms",
        linkLabel: "Open F2L algorithms",
      }
    : {
        id: "f2l",
        title: "F2L look-ahead drill",
        detail: "all 41 known — train smoothness",
        link: "/trainer?mode=lookahead",
        linkLabel: "Open look-ahead trainer",
      };

  const ollTask: Task = ollUnknown.length
    ? {
        id: "oll",
        title: `Learn ${Math.min(n, ollUnknown.length)} new OLL ${plural(Math.min(n, ollUnknown.length), "alg")}`,
        detail: learnDetail(ollUnknown.slice(0, n).map((c) => caseShort(c.name)), ollUnknown.length),
        link: "/algorithms/oll",
        linkLabel: "Open OLL algorithms",
      }
    : {
        id: "oll",
        title: "Drill your OLLs",
        detail: "all 57 known — drill execution",
        link: "/trainer?mode=algset",
        linkLabel: "Open alg trainer",
      };

  const pllTask: Task = pllUnknown.length
    ? {
        id: "pll",
        title: `Learn ${Math.min(n, pllUnknown.length)} new PLL ${plural(Math.min(n, pllUnknown.length), "alg")}`,
        detail: learnDetail(pllUnknown.slice(0, n).map((c) => caseShort(c.name)), pllUnknown.length),
        link: "/algorithms/pll",
        linkLabel: "Open PLL algorithms",
      }
    : {
        id: "pll",
        title: "PLL recognition practice",
        detail: "all 21 known — sharpen recognition",
        link: "/trainer?mode=pll",
        linkLabel: "Open PLL recognition",
      };

  return [crossTask, f2lTask, ollTask, pllTask];
}
