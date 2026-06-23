// Recognise well-known triggers (sexy move, sledgehammer, inserts, …) inside an
// algorithm and split it into labelled segments. DISPLAY ONLY — the raw alg
// string is still what gets parsed to animate / play.

export type TriggerCat = "sexy" | "sledge" | "insert" | "fmove";
export type AlgSegment = { text: string; name?: string; cat?: TriggerCat };

type Trigger = { name: string; cat: TriggerCat; moves: string[] };

// Greedy longest-match, so 4-move triggers (sexy/sledge) win over the 3-move
// inserts nested inside them.
const TRIGGERS: Trigger[] = [
  // Sexy move family (4 moves)
  { name: "Sexy move", cat: "sexy", moves: ["R", "U", "R'", "U'"] },
  { name: "Sexy move", cat: "sexy", moves: ["L'", "U'", "L", "U"] },
  { name: "Sexy move", cat: "sexy", moves: ["F", "U", "F'", "U'"] },
  { name: "Reverse sexy", cat: "sexy", moves: ["U", "R", "U'", "R'"] },
  { name: "Reverse sexy", cat: "sexy", moves: ["U'", "L'", "U", "L"] },
  { name: "Reverse sexy", cat: "sexy", moves: ["R", "U'", "R'", "U"] },
  { name: "Reverse sexy", cat: "sexy", moves: ["L'", "U", "L", "U'"] },
  // Sledgehammer / hedgeslammer family (4 moves)
  { name: "Sledgehammer", cat: "sledge", moves: ["R'", "F", "R", "F'"] },
  { name: "Sledgehammer", cat: "sledge", moves: ["L", "F'", "L'", "F"] },
  { name: "Hedgeslammer", cat: "sledge", moves: ["F", "R'", "F'", "R"] },
  { name: "Hedgeslammer", cat: "sledge", moves: ["F'", "L", "F", "L'"] },
  // Pair inserts (3 moves)
  { name: "Insert", cat: "insert", moves: ["R", "U", "R'"] },
  { name: "Insert", cat: "insert", moves: ["R", "U'", "R'"] },
  { name: "Insert", cat: "insert", moves: ["R", "U2", "R'"] },
  { name: "Insert", cat: "insert", moves: ["R'", "U'", "R"] },
  { name: "Insert", cat: "insert", moves: ["R'", "U", "R"] },
  { name: "Insert", cat: "insert", moves: ["R'", "U2", "R"] },
  { name: "Insert", cat: "insert", moves: ["L", "U", "L'"] },
  { name: "Insert", cat: "insert", moves: ["L", "U'", "L'"] },
  { name: "Insert", cat: "insert", moves: ["L", "U2", "L'"] },
  { name: "Insert", cat: "insert", moves: ["L'", "U'", "L"] },
  { name: "Insert", cat: "insert", moves: ["L'", "U", "L"] },
  { name: "Insert", cat: "insert", moves: ["L'", "U2", "L"] },
  // F-triggers (3 moves)
  { name: "F-trigger", cat: "fmove", moves: ["F", "R", "F'"] },
  { name: "F-trigger", cat: "fmove", moves: ["F'", "R'", "F"] },
];

const BY_LEN = [...TRIGGERS].sort((a, b) => b.moves.length - a.moves.length);

// A "pair insert" (R U R', …) is an F2L concept — there is no pair to insert in
// the last layer — so OLL/PLL displays pass { inserts: false } to suppress it.
export function segmentAlg(alg: string, opts: { inserts?: boolean } = {}): AlgSegment[] {
  const triggers = opts.inserts === false ? BY_LEN.filter((t) => t.cat !== "insert") : BY_LEN;
  const moves = alg.trim().split(/\s+/).filter(Boolean);
  const segs: AlgSegment[] = [];
  let plain: string[] = [];
  const flush = () => {
    if (plain.length) {
      segs.push({ text: plain.join(" ") });
      plain = [];
    }
  };

  let i = 0;
  while (i < moves.length) {
    let m: Trigger | null = null;
    for (const t of triggers) {
      if (i + t.moves.length <= moves.length && t.moves.every((x, k) => x === moves[i + k])) {
        m = t;
        break;
      }
    }
    if (m) {
      flush();
      segs.push({ text: moves.slice(i, i + m.moves.length).join(" "), name: m.name, cat: m.cat });
      i += m.moves.length;
    } else {
      plain.push(moves[i]);
      i += 1;
    }
  }
  flush();
  return segs;
}
