import { useEffect, useRef, useState } from "react";
import type { SmartCube, CubeMove, Face } from "../lib/smartcube/smartcube";
import { moveToken } from "../lib/smartcube/smartcube";
import { detectSplits } from "../lib/smartcube/splits";
import type { SplitResult } from "../lib/smartcube/splits";
import { initQueue, applyMove, simplifyForDisplay } from "../lib/smartcube/scramble-queue";
import { solved, applyAlg } from "../lib/facecube";
import type { Facelets } from "../lib/facecube";
import { generateScramble } from "../lib/scramble";
import { conjugate, mul } from "../lib/quaternion";
import type { Quaternion } from "../lib/quaternion";
import CubeView3D from "./CubeView3D";
import { useProfile } from "../state/ProfileProvider";
import type { Stage } from "../types/profile";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));
const STAGES: Stage[] = ["cross", "f2l", "oll", "pll"];

export default function SmartCubeSession({ cube }: { cube: SmartCube }) {
  const { recordSmartSolve, addTime } = useProfile();
  const [scramble, setScramble] = useState(() => generateScramble(20));
  const [ready, setReady] = useState(false);
  const [last, setLast] = useState<SplitResult | null>(null);
  const [remaining, setRemaining] = useState<string[]>(() => initQueue(scramble));
  const [deviated, setDeviated] = useState(false);
  const [turn, setTurn] = useState<{ face: Face; dir: 1 | -1; nonce: number } | null>(null);
  const [orientation, setOrientation] = useState<Quaternion | null>(null);
  const [displayFacelets, setDisplayFacelets] = useState<Facelets>(() => solved());

  // Mutable per-solve state kept in refs so the move handler always sees fresh
  // values. Initialised for the first scramble; reset inline on each new scramble.
  const runningRef = useRef<Facelets>(solved());
  const queueRef = useRef<string[]>(initQueue(scramble));
  const readyRef = useRef(false);
  const startStateRef = useRef<Facelets | null>(null);
  const t0Ref = useRef(0);
  const bufRef = useRef<{ token: string; t: number }[]>([]);
  const nonceRef = useRef(0);
  const neutralRef = useRef<Quaternion | null>(null);
  const rawOriRef = useRef<Quaternion | null>(null);

  // Cube spatial orientation (gyro), if the driver provides it. Recenter subtracts
  // a captured neutral so "facing you" aligns regardless of the gyro's raw zero.
  useEffect(() => {
    if (!cube.onOrientation) return;
    return cube.onOrientation((q) => {
      rawOriRef.current = q;
      const n = neutralRef.current;
      setOrientation(n ? mul(conjugate(n), q) : q);
    });
  }, [cube]);

  useEffect(() => {
    const startNextScramble = () => {
      const next = generateScramble(20);
      runningRef.current = solved();
      setDisplayFacelets(runningRef.current);
      setTurn(null);
      queueRef.current = initQueue(next);
      setRemaining(queueRef.current);
      setDeviated(false);
      readyRef.current = false;
      startStateRef.current = null;
      bufRef.current = [];
      setReady(false);
      setScramble(next);
    };

    const onMove = (m: CubeMove) => {
      const token = moveToken(m);
      runningRef.current = applyAlg(runningRef.current, token);
      setDisplayFacelets(runningRef.current);
      nonceRef.current += 1;
      setTurn({ face: m.face, dir: m.dir, nonce: nonceRef.current });

      if (!readyRef.current) {
        // Applying the scramble: self-correcting queue keeps the target invariant.
        const res = applyMove(queueRef.current, token);
        queueRef.current = res.queue;
        setRemaining(res.queue);
        setDeviated(res.deviated);
        if (res.queue.length === 0) {
          readyRef.current = true;
          startStateRef.current = runningRef.current;
          setReady(true);
        }
        return;
      }

      // Solving: buffer solve moves relative to the first move's timestamp.
      if (bufRef.current.length === 0) t0Ref.current = m.t;
      bufRef.current.push({ token, t: m.t - t0Ref.current });
      const res = detectSplits(startStateRef.current!, bufRef.current);
      if (res) {
        recordSmartSolve({ date: today(), ...res });
        STAGES.forEach((st) => {
          if (res.splits[st] > 0) addTime(st, res.splits[st]);
        });
        setLast(res);
        startNextScramble(); // arm the next solve
      }
    };
    return cube.onMove(onMove);
  }, [cube, recordSmartSolve, addTime]);

  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-4">
      <div className="mb-4">
        <CubeView3D facelets={displayFacelets} turn={turn} orientation={orientation} />
        {cube.onOrientation ? (
          <div className="text-center mt-1">
            <button
              type="button"
              onClick={() => {
                neutralRef.current = rawOriRef.current;
                if (rawOriRef.current) setOrientation({ x: 0, y: 0, z: 0, w: 1 });
              }}
              className="text-xs text-slate-500 dark:text-slate-400 underline"
            >
              Recenter cube
            </button>
          </div>
        ) : null}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
        {ready ? "Solving… go!" : "Apply this scramble to your cube"}
      </div>
      <div data-testid="scramble" className="font-mono text-lg mb-1">
        {scramble}
      </div>
      {!ready ? (
        <div data-testid="scramble-status" className="mb-4 text-sm">
          {deviated ? (
            <span className="text-red-600 dark:text-red-400">
              Off-scramble — remaining moves adjusted:{" "}
              <span className="font-mono">{simplifyForDisplay(remaining).join(" ") || "done"}</span>
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Remaining:{" "}
              <span className="font-mono">{simplifyForDisplay(remaining).join(" ") || "done"}</span>
            </span>
          )}
        </div>
      ) : null}
      <div className="grid grid-cols-5 gap-3 text-center">
        <Split label="Cross" testId="live-cross" value={last ? last.splits.cross : null} />
        <Split label="F2L" testId="live-f2l" value={last ? last.splits.f2l : null} />
        <Split label="OLL" testId="live-oll" value={last ? last.splits.oll : null} />
        <Split label="PLL" testId="live-pll" value={last ? last.splits.pll : null} />
        <Split label="Total" testId="live-total" value={last ? last.total : null} bold />
      </div>
    </div>
  );
}

function Split({
  label,
  value,
  testId,
  bold,
}: {
  label: string;
  value: number | null;
  testId: string;
  bold?: boolean;
}) {
  return (
    <div>
      <div
        data-testid={testId}
        className={`text-xl tabular-nums ${bold ? "font-bold" : "font-semibold"}`}
      >
        {fmt(value)}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
