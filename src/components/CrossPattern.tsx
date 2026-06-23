// A tiny top-face diagram for the 2-look OLL "make the cross" step. Only the
// edge orientation matters here, so it draws the yellow edge pattern (corners
// are always shown dark — they don't matter for this step).
const LIT: Record<string, number[]> = {
  dot: [4], // centre only
  line: [3, 4, 5], // 2 opposite edges + centre
  L: [1, 4, 5], // 2 adjacent edges + centre
};

export default function CrossPattern({
  shape,
  size = 22,
}: {
  shape: "dot" | "line" | "L";
  size?: number;
}) {
  const lit = new Set(LIT[shape]);
  return (
    <div
      role="img"
      aria-label={`${shape} edge pattern`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(3, ${size}px)`,
        gridTemplateRows: `repeat(3, ${size}px)`,
        gap: 2,
        background: "#0f172a",
        padding: 3,
        borderRadius: 4,
        width: "fit-content",
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} style={{ background: lit.has(i) ? "#fde047" : "#334155", borderRadius: 2 }} />
      ))}
    </div>
  );
}
