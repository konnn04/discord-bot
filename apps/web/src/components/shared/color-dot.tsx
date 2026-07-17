/** A small colored dot for role options. Shared by the guild selects. */
export function ColorDot({ color }: { color?: number }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        backgroundColor: color
          ? `#${color.toString(16).padStart(6, "0")}`
          : "#99aab5",
      }}
    />
  );
}
