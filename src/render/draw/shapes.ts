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

export type BoxColors = { readonly top: string; readonly left: string; readonly right: string };

// A solid isometric box standing on a footprint: the two front walls and the
// lid. The back walls are always hidden behind them, so they're never drawn.
export function drawBox(ctx: CanvasRenderingContext2D, f: Footprint, inset: number, height: number, colors: BoxColors): void {
  const [top, right, bottom, left] = footprintCorners(f, inset);
  polygon(ctx, [left, bottom, lift(bottom, height), lift(left, height)], colors.left);
  polygon(ctx, [bottom, right, lift(right, height), lift(bottom, height)], colors.right);
  polygon(ctx, [lift(top, height), lift(right, height), lift(bottom, height), lift(left, height)], colors.top);
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function line(ctx: CanvasRenderingContext2D, a: WorldPoint, b: WorldPoint, color: string, width: number): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export const SHADOW = 'rgba(30, 50, 15, 0.28)';
