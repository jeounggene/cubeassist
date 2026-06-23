import LastLayerDiagram from "./LastLayerDiagram";

// A small toggle chip showing a last-layer (OLL/PLL) case diagram + short label.
// Shared by the alg-set trainer and the training-plan "what you know" grids.
export default function CaseChip({
  alg,
  kind,
  label,
  ariaLabel,
  on,
  onToggle,
}: {
  alg: string;
  kind: "oll" | "pll";
  label: string;
  ariaLabel: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={on}
      onClick={onToggle}
      className={`flex flex-col items-center rounded border px-1 pt-1 pb-0.5 ${
        on
          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-600"
          : "border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100"
      }`}
    >
      <LastLayerDiagram alg={alg} kind={kind} size={12} />
      <span className="text-[10px] text-slate-600 dark:text-slate-300">{label}</span>
    </button>
  );
}
