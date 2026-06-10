type Props = {
  color?: string; // CSS color for the cross stickers
  label?: string;
};

const CROSS_CELLS = new Set([1, 3, 4, 5, 7]); // center + 4 edges of a 3x3

export default function CubeDiagram({ color = "#f8fafc", label = "white" }: Props) {
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className="grid grid-cols-3 gap-0.5 rounded bg-slate-800 p-1"
        role="img"
        aria-label={`Target: ${label} cross`}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-sm border border-slate-700"
            style={{ backgroundColor: CROSS_CELLS.has(i) ? color : "#334155" }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">{label} cross</span>
    </div>
  );
}
