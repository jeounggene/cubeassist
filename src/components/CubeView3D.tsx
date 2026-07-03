import { faceletGeometry } from "../lib/facecube";
import { toMatrix3d } from "../lib/quaternion";
import type { Quaternion } from "../lib/quaternion";
import type { Face } from "../lib/smartcube/smartcube";

// Real-cube scheme by color id (U R F D L B) — matches MiniF2LCube.
const COLORS = ["#fde047", "#f97316", "#22c55e", "#f8fafc", "#ef4444", "#3b82f6"];
const GEO = faceletGeometry();
const CELL = 40; // px per sticker
const GAP = 3;
const STEP = CELL + GAP;
const HALF = CELL / 2;

type Axis = 0 | 1 | 2;
type Sticker = { index: number; pos: [number, number, number]; axis: Axis; sign: 1 | -1 };

// Precompute, per facelet, which cubelet face it sits on (from its outward normal).
const STICKERS: Sticker[] = GEO.map((g, index) => {
  const axis = g.normal.findIndex((c) => c !== 0) as Axis;
  const sign = (g.normal[axis] > 0 ? 1 : -1) as 1 | -1;
  return { index, pos: [g.pos[0], g.pos[1], g.pos[2]], axis, sign };
});

// CSS transform placing a flat sticker on its cubelet face (CSS Y is down → negate y).
function stickerTransform(s: Sticker): string {
  const [x, y, z] = s.pos;
  const move = `translate3d(${x * STEP}px, ${-y * STEP}px, ${z * STEP}px)`;
  const rot =
    s.axis === 2
      ? s.sign === 1
        ? "rotateY(0deg)"
        : "rotateY(180deg)"
      : s.axis === 0
        ? s.sign === 1
          ? "rotateY(90deg)"
          : "rotateY(-90deg)"
        : s.sign === 1
          ? "rotateX(90deg)"
          : "rotateX(-90deg)";
  return `${move} ${rot} translateZ(${HALF}px)`;
}

type Props = {
  facelets: number[];
  turn?: { face: Face; dir: 1 | -1; nonce: number } | null;
  orientation?: Quaternion | null;
  onTurnDone?: () => void;
};

export default function CubeView3D({ facelets, orientation }: Props) {
  const base = "rotateX(-25deg) rotateY(-35deg)";
  const tilt = orientation ? ` ${toMatrix3d(orientation)}` : "";
  return (
    <div style={{ width: 3 * STEP, height: 3 * STEP, perspective: "700px", margin: "0 auto" }}>
      <div
        style={{
          position: "relative",
          width: CELL,
          height: CELL,
          margin: `${STEP}px auto`,
          transformStyle: "preserve-3d",
          transform: `${base}${tilt}`,
        }}
      >
        {STICKERS.map((s) => (
          <div
            key={s.index}
            data-sticker={s.index}
            data-color={facelets[s.index]}
            style={{
              position: "absolute",
              width: CELL,
              height: CELL,
              backgroundColor: COLORS[facelets[s.index]],
              border: "1px solid rgba(15,23,42,0.6)",
              borderRadius: 4,
              transform: stickerTransform(s),
              backfaceVisibility: "hidden",
            }}
          />
        ))}
      </div>
    </div>
  );
}
