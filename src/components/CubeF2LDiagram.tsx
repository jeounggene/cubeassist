import { useEffect, useRef, useState } from "react";

// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];
const MUTED = "#e2e8f0"; // irrelevant stickers

const FACE = 84; // px per face (3 x 28)
const HALF = FACE / 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// All six faces of the cube. Facelet indices: U 0-8, R 9-17, F 18-26, D 27-35,
// L 36-44, B 45-53 (row-major). Transforms place each face of a CSS 3D cube.
const FACES: { cells: number[]; transform: string }[] = [
  { cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], transform: `rotateX(90deg) translateZ(${HALF}px)` }, // U
  { cells: [27, 28, 29, 30, 31, 32, 33, 34, 35], transform: `rotateX(-90deg) translateZ(${HALF}px)` }, // D
  { cells: [18, 19, 20, 21, 22, 23, 24, 25, 26], transform: `translateZ(${HALF}px)` }, // F
  { cells: [45, 46, 47, 48, 49, 50, 51, 52, 53], transform: `rotateY(180deg) translateZ(${HALF}px)` }, // B
  { cells: [9, 10, 11, 12, 13, 14, 15, 16, 17], transform: `rotateY(90deg) translateZ(${HALF}px)` }, // R
  { cells: [36, 37, 38, 39, 40, 41, 42, 43, 44], transform: `rotateY(-90deg) translateZ(${HALF}px)` }, // L
];

type Props = { facelets: number[]; highlight?: number[]; homeX?: number; homeY?: number };

export default function CubeF2LDiagram({ facelets, highlight = [], homeX = -30, homeY = -45 }: Props) {
  const hl = new Set(highlight);
  const [rot, setRot] = useState({ x: homeX, y: homeY });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0 });

  // Reset to the direction's home orientation when it changes.
  useEffect(() => {
    setRot({ x: homeX, y: homeY });
  }, [homeX, homeY]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const s = start.current;
      setRot({
        x: clamp(s.x - (e.clientY - s.py) * 0.6, -85, 85),
        y: s.y + (e.clientX - s.px) * 0.6,
      });
    };
    const up = () => {
      setDragging(false);
      setRot({ x: homeX, y: homeY }); // snap back to the direction's home orientation
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, homeX, homeY]);

  return (
    <div
      role="img"
      aria-label="F2L case"
      title="Drag to rotate"
      onPointerDown={(e) => {
        start.current = { px: e.clientX, py: e.clientY, x: rot.x, y: rot.y };
        setDragging(true);
      }}
      style={{
        width: 160,
        height: 170,
        perspective: "760px",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        data-testid="cube"
        style={{
          position: "relative",
          width: FACE,
          height: FACE,
          margin: "48px auto",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging ? "none" : "transform 0.45s ease",
        }}
      >
        {FACES.map((f, fi) => (
          <div
            key={fi}
            className="absolute grid grid-cols-3 grid-rows-3 gap-px"
            style={{ width: FACE, height: FACE, transform: f.transform }}
          >
            {f.cells.map((idx) => (
              <div
                key={idx}
                data-testid="sticker"
                data-hl={hl.has(idx) ? "1" : undefined}
                className="border border-slate-400/60"
                style={{ backgroundColor: hl.has(idx) ? COLORS[facelets[idx]] : MUTED }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
