type Props = {
  color?: string; // cross color name, e.g. "white", "green"
};

const COLOR_CSS: Record<string, string> = {
  white: "#f8fafc",
  yellow: "#fde047",
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
  orange: "#f97316",
};

const CROSS_CELLS = new Set([1, 3, 4, 5, 7]); // center + 4 edges of a 3x3

export default function CubeDiagram({ color = "white" }: Props) {
  const css = COLOR_CSS[color] ?? COLOR_CSS.white;
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className="grid grid-cols-3 gap-0.5 rounded bg-slate-800 p-1"
        role="img"
        aria-label={`Target: ${color} cross`}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-sm border border-slate-700"
            style={{ backgroundColor: CROSS_CELLS.has(i) ? css : "#334155" }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">{color} cross</span>
    </div>
  );
}
