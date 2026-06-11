// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];

// Full top-layer plan view as a 5x5 grid: the U face (3x3) with each side face's
// top row folded outward — Back above, Front below, Left/Right at the sides — so a
// case in any of the four slots shows in its real position. -1 = empty corner.
//        B2 B1 B0          (47 46 45)
//   L0 [ U0 U1 U2 ] R2     (36 | 0 1 2 | 11)
//   L1 [ U3 U4 U5 ] R1     (37 | 3 4 5 | 10)
//   L2 [ U6 U7 U8 ] R0     (38 | 6 7 8 |  9)
//        F0 F1 F2          (18 19 20)
const CELLS = [
  -1, 47, 46, 45, -1,
  36, 0, 1, 2, 11,
  37, 3, 4, 5, 10,
  38, 6, 7, 8, 9,
  -1, 18, 19, 20, -1,
];

export default function CubeF2LDiagram({ facelets }: { facelets: number[] }) {
  return (
    <div
      role="img"
      aria-label="F2L case"
      className="grid w-max grid-cols-5 gap-0.5 rounded bg-slate-800 p-1"
    >
      {CELLS.map((idx, i) =>
        idx < 0 ? (
          <div key={i} className="h-6 w-6" />
        ) : (
          <div
            key={i}
            data-testid="sticker"
            className="h-6 w-6 rounded-sm border border-slate-700"
            style={{ backgroundColor: COLORS[facelets[idx]] }}
          />
        ),
      )}
    </div>
  );
}
