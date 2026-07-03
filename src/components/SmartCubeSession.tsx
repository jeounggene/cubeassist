import { useEffect, useRef, useState } from "react";
import type { SmartCube, CubeMove } from "../lib/smartcube/smartcube";
import { moveToken } from "../lib/smartcube/smartcube";
import { detectSplits } from "../lib/smartcube/splits";
import type { SplitResult } from "../lib/smartcube/splits";
import { solved, applyAlg } from "../lib/facecube";
import type { Facelets } from "../lib/facecube";
import { generateScramble } from "../lib/scramble";
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

  // Mutable per-solve state kept in refs so the move handler always sees fresh
  // values. Initialised for the first scramble; reset inline on each new scramble.
  const runningRef = useRef<Facelets>(solved());
  const targetRef = useRef<Facelets>(applyAlg(solved(), scramble));
  const readyRef = useRef(false);
  const startStateRef = useRef<Facelets | null>(null);
  const t0Ref = useRef(0);
  const bufRef = useRef<{ token: string; t: number }[]>([]);

  useEffect(() => {
    const startNextScramble = () => {
      const next = generateScramble(20);
      runningRef.current = solved();
      targetRef.current = applyAlg(solved(), next);
      readyRef.current = false;
      startStateRef.current = null;
      bufRef.current = [];
      setReady(false);
      setScramble(next);
    };

    const onMove = (m: CubeMove) => {
      const token = moveToken(m);
      runningRef.current = applyAlg(runningRef.current, token);

      if (!readyRef.current) {
        // Waiting for the scramble to be applied to the cube.
        if (runningRef.current.every((v, i) => v === targetRef.current[i])) {
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
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
        {ready ? "Solving… go!" : "Apply this scramble to your cube"}
      </div>
      <div data-testid="scramble" className="font-mono text-lg mb-4">
        {scramble}
      </div>
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
