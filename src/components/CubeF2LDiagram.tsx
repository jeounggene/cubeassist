// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];
const MUTED = "#e2e8f0"; // irrelevant stickers
const EMPTY = -1;

// Conventional 3-face F2L view: the U face on top, with the F face below-left and
// the R face below-right, so the front-right slot (the F/R seam) is visible. This
// shows a case whether its pair is lifted into the top layer or sitting in the slot.
// Facelet indices: U 0-8, R 9-17, F 18-26 (row-major).
const COLS = 6;
const CELLS = [
  EMPTY, 0, 1, 2, EMPTY, EMPTY,
  EMPTY, 3, 4, 5, EMPTY, EMPTY,
  EMPTY, 6, 7, 8, EMPTY, EMPTY,
  18, 19, 20, 9, 10, 11,
  21, 22, 23, 12, 13, 14,
  24, 25, 26, 15, 16, 17,
];

type Props = { facelets: number[]; highlight?: number[] };

export default function CubeF2LDiagram({ facelets, highlight = [] }: Props) {
  const hl = new Set(highlight);
  return (
    <div
      role="img"
      aria-label="F2L case"
      className="grid w-max gap-0.5"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1.5rem)` }}
    >
      {CELLS.map((idx, i) => {
        if (idx === EMPTY) return <div key={i} className="h-6 w-6" />;
        const on = hl.has(idx);
        return (
          <div
            key={i}
            data-testid="sticker"
            data-hl={on ? "1" : undefined}
            className="h-6 w-6 rounded-sm border border-slate-300"
            style={{ backgroundColor: on ? COLORS[facelets[idx]] : MUTED }}
          />
        );
      })}
    </div>
  );
}
