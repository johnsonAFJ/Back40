// Code-drawn ground: farm grass, wild grass around the farm, and scenery
// trees. All drawing happens in world coordinates; the renderer has already
// set the canvas transform for the camera.

import { TILE_HEIGHT, TILE_WIDTH, tile, tileCenter, tileCorners, type TilePoint } from '../iso';
import { PALETTE } from './palette';

// A stable pseudo-random number in [0, 1) for a tile. The same tile always
// gets the same value, so the scenery doesn't reshuffle every frame.
export function tileNoise(x: number, y: number, salt = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function diamondPath(ctx: CanvasRenderingContext2D, t: TilePoint): void {
  const [top, right, bottom, left] = tileCorners(t);
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
}

// The whole farm as one diamond. Filling it in one go first means the hairline
// gaps that antialiasing leaves between neighboring tiles show farm green
// rather than the wild grass underneath.
export function farmPath(ctx: CanvasRenderingContext2D, size: number): void {
  const [top] = tileCorners(tile(0, 0));
  const [, right] = tileCorners(tile(size - 1, 0));
  const [, , bottom] = tileCorners(tile(size - 1, size - 1));
  const [, , , left] = tileCorners(tile(0, size - 1));
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
}

export function isOnFarm(x: number, y: number, size: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size;
}

export function drawFarmTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // A faint checkerboard, so individual plots can be told apart without grid
  // lines, the way the original read.
  ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.farmGrass : PALETTE.farmGrassAlt;
  diamondPath(ctx, tile(x, y));
  ctx.fill();
}

export function drawWildTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const n = tileNoise(x, y);
  if (n < 0.25) {
    ctx.fillStyle = n < 0.12 ? PALETTE.wildGrassDark : PALETTE.wildGrassLight;
    diamondPath(ctx, tile(x, y));
    ctx.fill();
  }
  if (tileNoise(x, y, 1) < 0.3) drawTuft(ctx, x, y);
}

function drawTuft(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const c = tileCenter(tile(x, y));
  const ox = (tileNoise(x, y, 2) - 0.5) * TILE_WIDTH * 0.4;
  const oy = (tileNoise(x, y, 3) - 0.5) * TILE_HEIGHT * 0.4;
  ctx.strokeStyle = PALETTE.tuft;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const lean of [-3, 0, 3]) {
    ctx.moveTo(c.x + ox + lean * 0.4, c.y + oy);
    ctx.lineTo(c.x + ox + lean, c.y + oy - 6);
  }
  ctx.stroke();
}

// Scenery trees grow on wild land, never within two tiles of the farm, so
// they never hide a plot.
export function hasSceneryTree(x: number, y: number, size: number): boolean {
  const gap = 2;
  const nearFarm = x >= -gap && y >= -gap && x < size + gap && y < size + gap;
  return !nearFarm && tileNoise(x, y, 4) < 0.07;
}

export function drawSceneryTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const c = tileCenter(tile(x, y));
  const scale = 0.85 + tileNoise(x, y, 5) * 0.4;

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(c.x + 6, c.y + 2, 20 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.trunk;
  ctx.fillRect(c.x - 3 * scale, c.y - 18 * scale, 6 * scale, 18 * scale);

  const blobs: ReadonlyArray<readonly [number, number, number, string]> = [
    [-9, -26, 13, PALETTE.leaves],
    [9, -26, 13, PALETTE.leaves],
    [0, -38, 15, PALETTE.leaves],
    [-4, -40, 8, PALETTE.leavesLight],
  ];
  for (const [bx, by, r, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x + bx * scale, c.y + by * scale, r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHighlight(ctx: CanvasRenderingContext2D, t: TilePoint, zoom: number): void {
  diamondPath(ctx, t);
  ctx.fillStyle = PALETTE.highlightFill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.highlightStroke;
  // Divide by zoom so the outline is 2 screen pixels at every zoom level.
  ctx.lineWidth = 2 / zoom;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function drawFarmEdge(ctx: CanvasRenderingContext2D, size: number, zoom: number): void {
  farmPath(ctx, size);
  ctx.strokeStyle = PALETTE.farmEdge;
  ctx.lineWidth = 3 / zoom;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
