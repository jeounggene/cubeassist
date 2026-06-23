import { useEffect, useRef, useState } from "react";
import { applyAlg, faceletGeometry } from "../lib/facecube";

// Full-colour 3D cube that animates an algorithm. Shares the turn engine with
// CubeF2LDiagram but drops the F2L-specific pair/slot/grey logic — used to play
// OLL/PLL algorithms on the last layer.

// Color id -> CSS, in face order U R F D L B (yellow top, white bottom, green
// front, blue back, orange right, red left).
const COLORS = ["#fde047", "#f97316", "#22c55e", "#f8fafc", "#ef4444", "#3b82f6"];

const S = 30; // cubie size px
const HC = S / 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const GEO = faceletGeometry();

function faceRotation(n: number[]): string {
  if (n[1] === 1) return "rotateX(90deg)";
  if (n[1] === -1) return "rotateX(-90deg)";
  if (n[0] === 1) return "rotateY(90deg)";
  if (n[0] === -1) return "rotateY(-90deg)";
  if (n[2] === -1) return "rotateY(180deg)";
  return "";
}
const STICKER_TRANSFORM = GEO.map(
  (g) =>
    `translate3d(${g.pos[0] * S}px, ${-g.pos[1] * S}px, ${g.pos[2] * S}px) ${faceRotation(g.normal)} translateZ(${HC}px)`,
);

type Spec = { axis: 0 | 1 | 2; sel: number[]; rot: "X" | "Y" | "Z"; deg: number };
const SPECS: Record<string, Spec> = {
  R: { axis: 0, sel: [1], rot: "X", deg: 90 },
  L: { axis: 0, sel: [-1], rot: "X", deg: -90 },
  U: { axis: 1, sel: [1], rot: "Y", deg: -90 },
  D: { axis: 1, sel: [-1], rot: "Y", deg: 90 },
  F: { axis: 2, sel: [1], rot: "Z", deg: 90 },
  B: { axis: 2, sel: [-1], rot: "Z", deg: -90 },
  r: { axis: 0, sel: [0, 1], rot: "X", deg: 90 },
  l: { axis: 0, sel: [-1, 0], rot: "X", deg: -90 },
  u: { axis: 1, sel: [0, 1], rot: "Y", deg: -90 },
  d: { axis: 1, sel: [-1, 0], rot: "Y", deg: 90 },
  f: { axis: 2, sel: [0, 1], rot: "Z", deg: 90 },
  b: { axis: 2, sel: [-1, 0], rot: "Z", deg: -90 },
  M: { axis: 0, sel: [0], rot: "X", deg: -90 },
  E: { axis: 1, sel: [0], rot: "Y", deg: 90 },
  S: { axis: 2, sel: [0], rot: "Z", deg: 90 },
  x: { axis: 0, sel: [-1, 0, 1], rot: "X", deg: 90 },
  y: { axis: 1, sel: [-1, 0, 1], rot: "Y", deg: -90 },
  z: { axis: 2, sel: [-1, 0, 1], rot: "Z", deg: 90 },
};

function moveAnim(token: string): { spec: Spec; deg: number; token: string } | null {
  const name = token.length >= 2 && token[1] === "w" ? token[0].toLowerCase() : token[0];
  const spec = SPECS[name];
  if (!spec) return null;
  const times = token.endsWith("2") ? 2 : token.endsWith("'") ? 3 : 1;
  const deg = times === 2 ? spec.deg * 2 : times === 3 ? -spec.deg : spec.deg;
  return { spec, deg, token };
}

const TURN_MS = 300;

type Props = {
  facelets: number[];
  play?: { alg: string; nonce: number };
  homeX?: number;
  homeY?: number;
};

export default function LastLayerCube({ facelets, play, homeX = -52, homeY = -34 }: Props) {
  const [rot, setRot] = useState({ x: homeX, y: homeY });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0 });

  const [display, setDisplay] = useState<number[] | null>(null);
  const [turn, setTurn] = useState<{ spec: Spec; angle: number } | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => setRot({ x: homeX, y: homeY }), [homeX, homeY]);
  useEffect(() => {
    setDisplay(null);
    setTurn(null);
  }, [facelets]);

  // Drag to spin.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const s = start.current;
      setRot({ x: clamp(s.x - (e.clientY - s.py) * 0.6, -88, 20), y: s.y + (e.clientX - s.px) * 0.6 });
    };
    const up = () => {
      setDragging(false);
      setRot({ x: homeX, y: homeY });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, homeX, homeY]);

  // Play: animate each move as a smooth layer turn.
  useEffect(() => {
    if (!play || play.nonce === 0 || !play.alg) return;
    const tokens = play.alg.split(/\s+/).filter(Boolean);
    let state = facelets;
    let cancelled = false;
    const timers: number[] = [];
    setResetting(false);
    setDisplay(state);
    const GAP = 80;

    const step = (i: number) => {
      if (cancelled) return;
      if (i >= tokens.length) {
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return;
            setResetting(true);
            setDisplay(null);
            timers.push(window.setTimeout(() => !cancelled && setResetting(false), 450));
          }, 700),
        );
        return;
      }
      const a = moveAnim(tokens[i]);
      if (!a) {
        state = applyAlg(state, tokens[i]);
        setDisplay(state);
        step(i + 1);
        return;
      }
      setTurn({ spec: a.spec, angle: 0 });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => !cancelled && setTurn({ spec: a.spec, angle: a.deg }));
      });
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          state = applyAlg(state, a.token);
          setDisplay(state);
          setTurn(null);
          timers.push(window.setTimeout(() => !cancelled && step(i + 1), GAP));
        }, TURN_MS + 70),
      );
    };
    step(0);
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.nonce]);

  const shown = display ?? facelets;

  const sticker = (idx: number) => (
    <div
      key={idx}
      data-testid="sticker"
      className="absolute"
      style={{
        width: S,
        height: S,
        left: "50%",
        top: "50%",
        marginLeft: -S / 2,
        marginTop: -S / 2,
        boxSizing: "border-box",
        border: "1.5px solid #0f172a",
        borderRadius: 4,
        transform: STICKER_TRANSFORM[idx],
        transition: resetting ? "background-color 0.4s ease" : undefined,
        backgroundColor: COLORS[shown[idx]],
      }}
    />
  );

  const inTurn = (idx: number) =>
    turn !== null && turn.spec.sel.includes(GEO[idx].pos[turn.spec.axis]);
  const all = GEO.map((_, i) => i);

  return (
    <div
      role="img"
      aria-label="cube"
      title="Drag to rotate"
      onPointerDown={(e) => {
        start.current = { px: e.clientX, py: e.clientY, x: rot.x, y: rot.y };
        setDragging(true);
      }}
      style={{
        width: 170,
        height: 180,
        perspective: "2200px",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        data-testid="cube"
        style={{
          position: "relative",
          width: S,
          height: S,
          margin: "78px auto",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging ? "none" : "transform 0.45s ease",
        }}
      >
        {all.filter((i) => !inTurn(i)).map(sticker)}
        {turn && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: S,
              height: S,
              transformStyle: "preserve-3d",
              transformOrigin: "50% 50% 0",
              transform: `rotate${turn.spec.rot}(${turn.angle}deg)`,
              transition: `transform ${TURN_MS}ms ease-in-out`,
            }}
          >
            {all.filter(inTurn).map(sticker)}
          </div>
        )}
      </div>
    </div>
  );
}
