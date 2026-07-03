import { useEffect, useRef } from "react";
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

const FACE_AXIS: Record<Face, { axis: Axis; val: 1 | -1 }> = {
  U: { axis: 1, val: 1 },
  D: { axis: 1, val: -1 },
  R: { axis: 0, val: 1 },
  L: { axis: 0, val: -1 },
  F: { axis: 2, val: 1 },
  B: { axis: 2, val: -1 },
};

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

// Rotate the whole layer around the cube axis of the face being turned.
function layerTransform(axis: Axis, angle: number): string {
  return axis === 0
    ? `rotateX(${angle}deg)`
    : axis === 1
      ? `rotateY(${angle}deg)`
      : `rotateZ(${angle}deg)`;
}

function StickerDiv({ s, facelets }: { s: Sticker; facelets: number[] }) {
  return (
    <div
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
  );
}

type Turn = { face: Face; dir: 1 | -1; nonce: number };

type Props = {
  facelets: number[];
  turn?: Turn | null;
  orientation?: Quaternion | null;
  onTurnDone?: () => void;
};

export default function CubeView3D({ facelets, turn, orientation, onTurnDone }: Props) {
  const groupRef = useRef<HTMLDivElement>(null);

  // The turning layer is derived from the current turn; at rest the group renders at 0°,
  // identical to the ungrouped cube. Displaying the authoritative (post-move) state means
  // fast moves can never desync — the layer just re-sweeps into place.
  const active = turn ? FACE_AXIS[turn.face] : null;

  // One-shot layer sweep via the Web Animations API (imperative: no render state).
  useEffect(() => {
    const el = groupRef.current;
    if (!turn || !el || typeof el.animate !== "function") return;
    const fa = FACE_AXIS[turn.face];
    const anim = el.animate(
      [
        { transform: layerTransform(fa.axis, -90 * turn.dir * fa.val) },
        { transform: layerTransform(fa.axis, 0) },
      ],
      { duration: 180, easing: "ease-out" },
    );
    anim.onfinish = () => onTurnDone?.();
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn?.nonce]);

  const inLayer = (s: Sticker) => (active ? s.pos[active.axis] === active.val : false);

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
        {active ? (
          <div
            ref={groupRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: CELL,
              height: CELL,
              transformStyle: "preserve-3d",
              transformOrigin: "center",
            }}
          >
            {STICKERS.filter(inLayer).map((s) => (
              <StickerDiv key={s.index} s={s} facelets={facelets} />
            ))}
          </div>
        ) : null}
        {STICKERS.filter((s) => !inLayer(s)).map((s) => (
          <StickerDiv key={s.index} s={s} facelets={facelets} />
        ))}
      </div>
    </div>
  );
}
