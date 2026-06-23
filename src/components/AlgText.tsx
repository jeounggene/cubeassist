import { segmentAlg } from "../lib/triggers";
import type { TriggerCat } from "../lib/triggers";

// Each trigger category gets its own colour; hovering shows the trigger's name.
const COLOR: Record<TriggerCat, string> = {
  sexy: "text-emerald-600 dark:text-emerald-400",
  sledge: "text-sky-600 dark:text-sky-400",
  insert: "text-amber-600 dark:text-amber-400",
  fmove: "text-fuchsia-600 dark:text-fuchsia-400",
};

// Renders an algorithm with known triggers coloured by type and titled (hover)
// with what they are. Plain text content stays identical to the raw alg.
// Last-layer (OLL/PLL) callers pass inserts={false}: a "pair insert" is an F2L
// concept and shouldn't be highlighted there.
export default function AlgText({
  alg,
  className,
  inserts = true,
}: {
  alg: string;
  className?: string;
  inserts?: boolean;
}) {
  const segs = segmentAlg(alg, { inserts });
  return (
    <span className={className}>
      {segs.map((s, i) => (
        <span key={i}>
          {i > 0 ? " " : ""}
          {s.cat ? (
            <span className={`alg-trigger font-semibold ${COLOR[s.cat]}`} data-tip={s.name}>
              {s.text}
            </span>
          ) : (
            s.text
          )}
        </span>
      ))}
    </span>
  );
}
