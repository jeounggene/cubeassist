import { useEffect, useRef, useState } from "react";

// A constant-pace metronome: a short WebAudio click plus a visual pulse on every
// beat, at `tps` turns per second, while `running` is true.
export default function Metronome({ tps, running }: { tps: number; running: boolean }) {
  const [beat, setBeat] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!running) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    void ctx.resume?.();

    const tick = () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1150;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
      setBeat(true);
      window.setTimeout(() => setBeat(false), Math.min(90, 400 / tps));
    };

    tick(); // fire immediately on start
    const id = window.setInterval(tick, 1000 / tps);
    return () => window.clearInterval(id);
  }, [running, tps]);

  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div
        style={{ transition: "transform 60ms ease, background-color 60ms ease" }}
        className={`h-12 w-12 rounded-full ${
          beat ? "scale-110 bg-amber-400" : "scale-100 bg-slate-300 dark:bg-slate-700"
        }`}
      />
    </div>
  );
}
