// A small, static isometric F2L cube (U + F + R faces) for the case picker.
// Valid real-cube scheme (U R F D L B): yellow, orange, green, white, red, blue.
const COLORS = ["#fde047", "#f97316", "#22c55e", "#f8fafc", "#ef4444", "#3b82f6"];
const MUTED = "#cbd5e1";

const U_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const F_CELLS = [18, 19, 20, 21, 22, 23, 24, 25, 26];
const R_CELLS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const FACE = 36;
const HALF = FACE / 2;

type Props = { facelets: number[]; highlight?: number[] };

export default function MiniF2LCube({ facelets, highlight = [] }: Props) {
  const hl = new Set(highlight);
  const face = (cells: number[], transform: string) => (
    <div
      className="absolute grid grid-cols-3 grid-rows-3"
      style={{ width: FACE, height: FACE, transform, gap: "1px" }}
    >
      {cells.map((idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: hl.has(idx) ? COLORS[facelets[idx]] : MUTED,
            border: "0.5px solid rgba(100,116,139,0.5)",
          }}
        />
      ))}
    </div>
  );
  return (
    <div style={{ width: 60, height: 60, perspective: "240px" }}>
      <div
        style={{
          position: "relative",
          width: FACE,
          height: FACE,
          margin: "12px auto",
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
