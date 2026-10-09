// Small markings drawn over objects: a fertilized crop's sparkle, crows on a
// neighbor's crop, and a hungry animal's hay bubble.

import { tile, tileCenter, world } from '../iso';
import { ellipse, line, polygon } from './shapes';

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const len = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.closePath();
  ctx.fill();
}

// Three little stars over a fertilized crop, as in the original.
export function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const c = tileCenter(tile(x, y));
  ctx.fillStyle = '#fff6b0';
  star(ctx, c.x - 9, c.y - 14, 3.5);
  star(ctx, c.x + 8, c.y - 18, 2.6);
  star(ctx, c.x + 2, c.y - 8, 2);
}

function crow(ctx: CanvasRenderingContext2D, x: number, y: number, flip: number): void {
  ellipse(ctx, x, y, 4.5, 3, '#26262e');
  ellipse(ctx, x - 3.5 * flip, y - 2.5, 2.4, 2.2, '#26262e');
  polygon(
    ctx,
    [
      world(x - 5.5 * flip, y - 3),
      world(x - 8 * flip, y - 2),
      world(x - 5.5 * flip, y - 1.5),
    ],
    '#e0a52a',
  );
  line(ctx, world(x + 3 * flip, y - 1), world(x + 6.5 * flip, y - 4), '#26262e', 2);
}

export function drawCrows(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const c = tileCenter(tile(x, y));
  crow(ctx, c.x - 7, c.y - 9, 1);
  crow(ctx, c.x + 8, c.y - 4, -1);
}

// A speech bubble with hay in it.
export function drawHungry(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const c = tileCenter(tile(x, y));
  const bx = c.x - 8;
  const by = c.y - 36;
  ellipse(ctx, bx, by, 8, 7, '#fffaf0');
  polygon(
    ctx,
    [
      world(bx + 2, by + 5),
      world(bx + 7, by + 12),
      world(bx + 6, by + 4),
    ],
    '#fffaf0',
  );
  for (const dx of [-4, -1, 2, 4]) line(ctx, world(bx + dx, by + 4), world(bx + dx * 0.6, by - 4), '#d9b44a', 1.6);
}
