// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];
const MUTED = "#e2e8f0"; // irrelevant stickers

// Standard isometric F2L cube: three visible faces (U on top, F front-left,
// R front-right), rendered with CSS 3D transforms. Only the pair is colored.
// Facelet indices: U 0-8, R 9-17, F 18-26 (row-major).
const U_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const F_CELLS = [18, 19, 20, 21, 22, 23, 24, 25, 26];
const R_CELLS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const FACE = 84; // px per face (3 x 28)
const HALF = FACE / 2;

type Props = { facelets: number[]; highlight?: number[] };

export default function CubeF2LDiagram({ facelets, highlight = [] }: Props) {
  const hl = new Set(highlight);

  const face = (cells: number[], transform: string) => (
    <div
      className="absolute grid grid-cols-3 grid-rows-3 gap-px"
      style={{ width: FACE, height: FACE, transform, transformOrigin: "center center" }}
    >
      {cells.map((idx) => (
        <div
          key={idx}
          data-testid="sticker"
          data-hl={hl.has(idx) ? "1" : undefined}
          className="border border-slate-400/60"
          style={{ backgroundColor: hl.has(idx) ? COLORS[facelets[idx]] : MUTED }}
        />
      ))}
    </div>
  );

  return (
    <div
      role="img"
      aria-label="F2L case"
      style={{ width: 150, height: 160, perspective: "700px" }}
    >
      <div
        style={{
          position: "relative",
          width: FACE,
          height: FACE,
          margin: "44px auto",
          transformStyle: "preserve-3d",
          transform: "rotateX(-30deg) rotateY(-45deg)",
        }}
      >
        {face(U_CELLS, `rotateX(90deg) translateZ(${HALF}px)`)}
        {face(F_CELLS, `translateZ(${HALF}px)`)}
        {face(R_CELLS, `rotateY(90deg) translateZ(${HALF}px)`)}
      </div>
    </div>
  );
}
