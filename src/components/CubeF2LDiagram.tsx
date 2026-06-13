import { useEffect, useRef, useState } from "react";
import { applyAlg, faceletGeometry } from "../lib/facecube";

// Color id -> CSS, in face order U R F D L B.
const COLORS = ["#fde047", "#ef4444", "#22c55e", "#f8fafc", "#f97316", "#3b82f6"];
const MUTED = "#e2e8f0"; // solved bottom-two-layer noise
const TOP = "#0b1220"; // the last (top) layer is drawn black

const S = 30; // cubie size px
const HC = S / 2; // half cubie (sticker sits this far out from the cubie center)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const GEO = faceletGeometry();

// Orient a sticker (default faces +z) to its outward normal (world y is up; CSS y is down).
function faceRotation(n: number[]): string {
  if (n[1] === 1) return "rotateX(90deg)"; // U
  if (n[1] === -1) return "rotateX(-90deg)"; // D
  if (n[0] === 1) return "rotateY(90deg)"; // R
  if (n[0] === -1) return "rotateY(-90deg)"; // L
  if (n[2] === -1) return "rotateY(180deg)"; // B
  return ""; // F
}
// Each sticker fills its whole cubie face (so faces are opaque — no see-through);
// a dark border draws the grid lines.
const STICKER_TRANSFORM = GEO.map(
  (g) =>
    `translate3d(${g.pos[0] * S}px, ${-g.pos[1] * S}px, ${g.pos[2] * S}px) ${faceRotation(g.normal)} translateZ(${HC}px)`,
);

// Per move base: which axis selects the layer, which coords rotate, the CSS rotation.
// Signs match applyAlg under the world->CSS y-flip (X/Z turns are negated vs world).
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

// Track which facelet positions hold the highlighted pair as moves permute the
// cube: label each position by its index, apply the move, and the label landing
// at position i tells us which old position moved there.
const IDENTITY = Array.from({ length: 54 }, (_, i) => i);
function moveHighlight(set: Set<number>, token: string): Set<number> {
  const perm = applyAlg(IDENTITY, token); // perm[i] = source position now at i
  const out = new Set<number>();
  for (let i = 0; i < 54; i++) if (set.has(perm[i])) out.add(i);
  return out;
}

type Props = {
  facelets: number[];
  highlight?: number[];
  slotCells?: number[];
  homeX?: number;
  homeY?: number;
  play?: { alg: string; nonce: number };
  // When true, non-pair stickers are drawn faint so back slots read through.
  seeThrough?: boolean;
};

const SLOT_RING = "#f59e0b"; // amber outline marking the destination slot
const SLOT_TINT = "rgba(245, 158, 11, 0.28)";

export default function CubeF2LDiagram({
  facelets,
  highlight = [],
  slotCells = [],
  homeX = -30,
  homeY = -45,
  play,
  seeThrough = false,
}: Props) {
  const hl = new Set(highlight);
  const slot = new Set(slotCells);
  const [rot, setRot] = useState({ x: homeX, y: homeY });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0 });

  // Animation state.
  const [display, setDisplay] = useState<number[] | null>(null); // colors shown while playing
  const [displayHl, setDisplayHl] = useState<Set<number> | null>(null); // pair positions while playing
  const [turn, setTurn] = useState<{ spec: Spec; angle: number } | null>(null);

  useEffect(() => setRot({ x: homeX, y: homeY }), [homeX, homeY]);
  useEffect(() => {
    setDisplay(null);
    setDisplayHl(null);
    setTurn(null);
  }, [facelets]);

  // Drag to spin.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const s = start.current;
      setRot({ x: clamp(s.x - (e.clientY - s.py) * 0.6, -85, 85), y: s.y + (e.clientX - s.px) * 0.6 });
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
    let hlSet = new Set(highlight);
    let cancelled = false;
    const timers: number[] = [];
    setDisplay(state);
    setDisplayHl(hlSet);

    const GAP = 80; // flat beat between consecutive turns so they never overlap

    const step = (i: number) => {
      if (cancelled) return;
      if (i >= tokens.length) {
        timers.push(window.setTimeout(() => !cancelled && setDisplay(null), 700));
        return;
      }
      const a = moveAnim(tokens[i]);
      if (!a) {
        hlSet = moveHighlight(hlSet, tokens[i]);
        state = applyAlg(state, tokens[i]);
        setDisplay(state);
        setDisplayHl(hlSet);
        step(i + 1);
        return;
      }
      // 1. place the layer at its start angle (no visible motion yet)
      setTurn({ spec: a.spec, angle: 0 });
      // 2. once that frame is painted, animate to the target angle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => !cancelled && setTurn({ spec: a.spec, angle: a.deg }));
      });
      // 3. only after the transition has fully finished (it starts ~2 frames
      //    after step 1, so wait past TURN_MS): commit the move + flatten,
      //    pause for a beat, then start the next turn.
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          hlSet = moveHighlight(hlSet, a.token);
          state = applyAlg(state, a.token);
          setDisplay(state);
          setDisplayHl(hlSet);
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
  const playing = display !== null;
  // Only the F2L pair is ever colored; during play it follows the pieces.
  const litHl = playing && displayHl ? displayHl : hl;

  const sticker = (idx: number) => {
    const on = litHl.has(idx);
    // Mark the destination slot (static reference; hidden during playback so the
    // turning layers stay clean).
    const isSlot = !playing && slot.has(idx);
    // The last (top) layer is drawn black so the pair + slot stand out from it.
    const isTop = !on && !isSlot && GEO[idx].pos[1] === 1;
    // In see-through mode, plain (non-pair, non-slot) stickers are drawn faint
    // so that whichever slot is at the back of the cube reads through it.
    const dim = seeThrough && !on && !isSlot;
    return (
      <div
        key={idx}
        data-testid="sticker"
        data-hl={hl.has(idx) ? "1" : undefined}
        data-slot={isSlot ? "1" : undefined}
        className="absolute"
        style={{
          width: S,
          height: S,
          left: "50%",
          top: "50%",
          marginLeft: -S / 2,
          marginTop: -S / 2,
          boxSizing: "border-box",
          border: isSlot ? `2px solid ${SLOT_RING}` : `1.5px solid ${isTop ? "#475569" : "#0f172a"}`,
          borderRadius: 4,
          boxShadow: isSlot ? `0 0 6px ${SLOT_RING}` : undefined,
          opacity: dim ? 0.3 : 1,
          transform: STICKER_TRANSFORM[idx],
          backgroundColor: on ? COLORS[shown[idx]] : isSlot ? SLOT_TINT : isTop ? TOP : MUTED,
        }}
      />
    );
  };

  // A sticker turns iff its layer coordinate is selected by the current move.
  const inTurn = (idx: number) => turn !== null && turn.spec.sel.includes(GEO[idx].pos[turn.spec.axis]);
  const all = GEO.map((_, i) => i);

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
        width: 170,
        height: 180,
        // Far perspective -> nearly orthographic, so layers keep a constant
        // size through a turn instead of foreshortening (the "shrink").
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
          margin: "72px auto",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging ? "none" : "transform 0.45s ease",
        }}
      >
        {/* stickers not in the turning layer */}
        {all.filter((i) => !inTurn(i)).map(sticker)}
        {/* the turning layer: one element, one rotate primitive -> a true
            rotation arc (constant size). Origin pinned to the cube core
            (centre of the S x S cube box) so it pivots correctly. */}
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
