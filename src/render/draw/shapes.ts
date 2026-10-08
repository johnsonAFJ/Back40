// Small drawing helpers shared by the code-drawn art.

import { tile, tileToWorld, type WorldPoint } from '../iso';

export type Footprint = { readonly x: number; readonly y: number; readonly width: number; readonly depth: number };

// The four ground corners of a footprint, shrunk toward its center by `inset`
// tiles on every side: top, right, bottom, left.
export function footprintCorners(f: Footprint, inset = 0): [WorldPoint, WorldPoint, WorldPoint, WorldPoint] {
  const x0 = f.x + inset;
  const y0 = f.y + inset;
  const x1 = f.x + f.width - inset;
  const y1 = f.y + f.depth - inset;
  return [tileToWorld(tile(x0, y0)), tileToWorld(tile(x1, y0)), tileToWorld(tile(x1, y1)), tileToWorld(tile(x0, y1))];
}

export function polygon(ctx: CanvasRenderingContext2D, points: readonly WorldPoint[], fill: string): void {
  const [first, ...rest] = points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const p of rest) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export const lift = (p: WorldPoint, height: number): WorldPoint => ({ ...p, y: p.y - height });

// Linear blend between two world points.
export const mix = (a: WorldPoint, b: WorldPoint, t: number): WorldPoint => ({
  ...a,
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
