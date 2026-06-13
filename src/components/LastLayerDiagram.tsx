import { useMemo } from "react";
import { solved, applyAlg, invertAlg, faceletGeometry } from "../lib/facecube";

// Face colors in order U R F D L B (valid real-cube scheme: orange R, red L).
const COLORS = ["#fde047", "#f97316", "#22c55e", "#f8fafc", "#ef4444", "#3b82f6"];
const GRAY = "#334155";
const GEO = faceletGeometry();

// Map each last-layer facelet to a cell in a 5x5 grid: the U face fills the
// centre 3x3, the top row of each side face becomes a flap around it.
type Cell = { idx: number; r: number; c: number; flap: boolean };
const CELLS: Cell[] = [];
GEO.forEach((g, idx) => {
  const [x, y, z] = g.pos;
  const [nx, ny, nz] = g.normal;
  if (ny === 1) CELLS.push({ idx, r: z + 2, c: x + 2, flap: false }); // U face
  else if (y === 1 && nz === 1) CELLS.push({ idx, r: 4, c: x + 2, flap: true }); // front
  else if (y === 1 && nz === -1) CELLS.push({ idx, r: 0, c: x + 2, flap: true }); // back
  else if (y === 1 && nx === 1) CELLS.push({ idx, r: z + 2, c: 4, flap: true }); // right
  else if (y === 1 && nx === -1) CELLS.push({ idx, r: z + 2, c: 0, flap: true }); // left
});

type Props = { alg: string; kind: "oll" | "pll"; size?: number };

export default function LastLayerDiagram({ alg, kind, size = 18 }: Props) {
  // The case state is what the algorithm solves: invert it onto a solved cube.
  const facelets = useMemo(() => applyAlg(solved(), invertAlg(alg)), [alg]);
  const flap = Math.round(size * 0.4);
  const track = (n: number) => (n === 0 || n === 4 ? flap : size);
  const cols = [0, 1, 2, 3, 4].map(track).map((v) => `${v}px`).join(" ");

  return (
    <div
      role="img"
      aria-label={`${kind.toUpperCase()} case`}
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gridTemplateRows: cols,
        gap: 2,
        background: "#0f172a",
        padding: 3,
        borderRadius: 4,
        width: "fit-content",
      }}
    >
      {CELLS.map(({ idx, r, c, flap: isFlap }) => {
        const col = facelets[idx];
        const bg = kind === "oll" ? (col === 0 ? COLORS[0] : GRAY) : COLORS[col];
        return (
          <div
            key={idx}
            style={{
              gridRow: r + 1,
              gridColumn: c + 1,
              background: bg,
              borderRadius: isFlap ? 1 : 2,
            }}
          />
        );
      })}
    </div>
  );
}
