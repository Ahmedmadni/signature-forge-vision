import type { Quad, ScanFilter } from "./scan";

export function shouldPreserveNativeProcessedPage(
  nativeProcessed: boolean,
  filter: ScanFilter,
  quad: Quad,
  width: number,
  height: number,
): boolean {
  if (!nativeProcessed || filter !== "color") return false;

  const full: Quad = [
    { x: 0, y: 0 },
    { x: Math.max(1, width - 1), y: 0 },
    { x: Math.max(1, width - 1), y: Math.max(1, height - 1) },
    { x: 0, y: Math.max(1, height - 1) },
  ];

  return quad.every(
    (point, index) =>
      Math.abs(point.x - full[index].x) < 1 &&
      Math.abs(point.y - full[index].y) < 1,
  );
}
