// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];

// Oblique F2L view as a 4x4 grid: the U face (3x3), the R top row folded to the
// right (R2,R1,R0 = 11,10,9), and the F top row folded below (F0,F1,F2 = 18,19,20).
// -1 marks an empty cell.
const CELLS = [
  0, 1, 2, 11,
  3, 4, 5, 10,
  6, 7, 8, 9,
  18, 19, 20, -1,
];

export default function CubeF2LDiagram({ facelets }: { facelets: number[] }) {
  return (
    <div
      role="img"
      aria-label="F2L case"
      className="grid w-max grid-cols-4 gap-0.5 rounded bg-slate-800 p-1"
    >
      {CELLS.map((idx, i) =>
        idx < 0 ? (
          <div key={i} className="h-7 w-7" />
        ) : (
          <div
            key={i}
            data-testid="sticker"
            className="h-7 w-7 rounded-sm border border-slate-700"
            style={{ backgroundColor: COLORS[facelets[idx]] }}
          />
        ),
      )}
    </div>
  );
}
