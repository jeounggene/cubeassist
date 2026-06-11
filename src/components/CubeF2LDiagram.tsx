// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];
const MUTED = "#e2e8f0"; // irrelevant stickers
const EMPTY = -1;

// Unfolded cube net (9 rows x 12 cols). Each face is a 3x3 block placed in the
// standard cross. Facelet bases: U 0, R 9, F 18, D 27, L 36, B 45 (row-major).
// Showing the whole cube lets a case render correctly whether the pair is lifted
// into the top layer or sitting in a slot, for any of the four directions.
const COLS = 12;
const ROWS = 9;
const FACE_LAYOUT = [
  { base: 0, r0: 0, c0: 3 }, // U
  { base: 36, r0: 3, c0: 0 }, // L
  { base: 18, r0: 3, c0: 3 }, // F
  { base: 9, r0: 3, c0: 6 }, // R
  { base: 45, r0: 3, c0: 9 }, // B
  { base: 27, r0: 6, c0: 3 }, // D
];
const GRID: number[] = new Array(ROWS * COLS).fill(EMPTY);
for (const f of FACE_LAYOUT) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      GRID[(f.r0 + r) * COLS + (f.c0 + c)] = f.base + r * 3 + c;
    }
  }
}

type Props = { facelets: number[]; highlight?: number[] };

export default function CubeF2LDiagram({ facelets, highlight = [] }: Props) {
  const hl = new Set(highlight);
  return (
    <div
      role="img"
      aria-label="F2L case"
      className="grid w-max gap-0.5"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1rem)` }}
    >
      {GRID.map((idx, i) => {
        if (idx === EMPTY) return <div key={i} className="h-4 w-4" />;
        const on = hl.has(idx);
        return (
          <div
            key={i}
            data-testid="sticker"
            data-hl={on ? "1" : undefined}
            className="h-4 w-4 rounded-[2px] border border-slate-300"
            style={{ backgroundColor: on ? COLORS[facelets[idx]] : MUTED }}
          />
        );
      })}
    </div>
  );
}
