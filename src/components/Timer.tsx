import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "inspect" | "hold" | "ready" | "running";

type Props = {
  inspection: boolean;
  useMs: boolean;
  onComplete: (seconds: number) => void;
  readyHoldMs?: number;
};

function format(seconds: number, useMs: boolean): string {
  return seconds.toFixed(useMs ? 3 : 2);
}

export default function Timer({
  inspection,
  useMs,
  onComplete,
  readyHoldMs = 550,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [display, setDisplay] = useState(0);
  const [inspectLeft, setInspectLeft] = useState(15);
  const startRef = useRef(0);
  const readyTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");

  // Keep a ref of the current phase so the window listeners read fresh state.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const clearReady = () => {
      if (readyTimer.current !== null) {
        clearTimeout(readyTimer.current);
        readyTimer.current = null;
      }
    };

    const tick = () => {
      setDisplay((performance.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };

    const beginHold = () => {
      setPhase("hold");
      if (readyHoldMs <= 0) {
        setPhase("ready");
      } else {
        readyTimer.current = window.setTimeout(() => setPhase("ready"), readyHoldMs);
      }
    };

    const stopRun = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const seconds = (performance.now() - startRef.current) / 1000;
      setDisplay(seconds);
      setPhase("idle");
      onComplete(seconds);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") {
        if (phaseRef.current === "running") stopRun();
        return;
      }
      e.preventDefault();
      const p = phaseRef.current;
      if (p === "running") {
        stopRun();
      } else if (p === "idle") {
        if (inspection) {
          setPhase("inspect");
          setInspectLeft(15);
        } else {
          beginHold();
        }
      } else if (p === "inspect") {
        beginHold();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      const p = phaseRef.current;
      if (p === "ready") {
        startRef.current = performance.now();
        setDisplay(0);
        setPhase("running");
        rafRef.current = requestAnimationFrame(tick);
      } else if (p === "hold") {
        clearReady();
        setPhase(inspection ? "inspect" : "idle"); // false start
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearReady();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [inspection, readyHoldMs, onComplete]);

  // Inspection countdown.
  useEffect(() => {
    if (phase !== "inspect") return;
    const id = window.setInterval(() => {
      setInspectLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const color =
    phase === "ready"
      ? "text-green-600 dark:text-green-400"
      : phase === "running"
        ? "text-slate-900 dark:text-slate-100"
        : "text-slate-500 dark:text-slate-400";

  return (
    <div className="text-center select-none">
      {phase === "inspect" ? (
        <div data-testid="inspection" className="text-2xl text-amber-600 dark:text-amber-400">
          Inspection: {inspectLeft}s
        </div>
      ) : null}
      <div data-testid="timer-display" className={`text-6xl font-mono tabular-nums ${color}`}>
        {format(display, useMs)}
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Hold <kbd className="rounded border px-1">Space</kbd>, release to start, any key to stop.
      </p>
    </div>
  );
}
