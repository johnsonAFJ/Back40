// Code-drawn trees, animals and decorations. Each is drawn in world space on
// its tile; the renderer has already set the camera transform.

import type { AnimalId, DecorationId, TreeId } from '../../core/data/items';
import { STILL, type Pose } from '../animalMotion';
import { decorationHasArt, drawArt, drawArtScaled, GRIDS, GROUND_SCALE, hasArt, UPRIGHT_DECORATIONS } from '../art';
import { tile, tileCenter, tileToWorld, type WorldPoint } from '../iso';
import { drawBarnLike } from './buildings';
import { drawBox, ellipse, footprintCorners, lift, line, mix, polygon, SHADOW, type Footprint } from './shapes';

// ---- Trees ----

const TREE_LOOKS: Record<TreeId, { readonly leaves: string; readonly light: string; readonly fruit: string }> = {
  appleTree: { leaves: '#3f8a2c', light: '#55a33a', fruit: '#d8352a' },
  cherryTree: { leaves: '#3b7f2e', light: '#4f9a3c', fruit: '#a8102c' },
  lemonTree: { leaves: '#4b8f2a', light: '#62a83a', fruit: '#f3d93a' },
  orangeTree: { leaves: '#3a7f2a', light: '#4f9935', fruit: '#f28a1c' },
  peachTree: { leaves: '#4c8a33', light: '#64a343', fruit: '#f6a77a' },
  plumTree: { leaves: '#386f2c', light: '#4b8a3a', fruit: '#6e2a7a' },
};

export function drawFruitTree(ctx: CanvasRenderingContext2D, x: number, y: number, id: TreeId, ready: boolean): void {
  const c = tileCenter(tile(x, y));
  const look = TREE_LOOKS[id];
  // Real art stands its trunk on the middle of the square, drawn to the
  // ground's scale: big trees spread over the squares around them.
  const art = `tree-${id}`;
  if (hasArt(art)) {
    ellipse(ctx, c.x + 6, c.y + 3, 32, 13, SHADOW);
    drawArtScaled(ctx, art, ready ? 1 : 0, c.x, c.y, GROUND_SCALE);
    return;
  }
  ellipse(ctx, c.x + 4, c.y + 2, 18, 8, SHADOW);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(c.x - 2.5, c.y - 16, 5, 16);
  const blobs: ReadonlyArray<readonly [number, number, number, string]> = [
    [-8, -22, 11, look.leaves],
    [8, -22, 11, look.leaves],
    [0, -32, 13, look.leaves],
    [-3, -34, 7, look.light],
  ];
  for (const [bx, by, r, color] of blobs) ellipse(ctx, c.x + bx, c.y + by, r, r, color);
  if (ready) {
    const fruit: ReadonlyArray<readonly [number, number]> = [
      [-10, -20], [-3, -24], [6, -19], [10, -26], [-7, -31], [2, -36], [8, -33],
    ];
    for (const [fx, fy] of fruit) ellipse(ctx, c.x + fx, c.y + fy, 2.4, 2.4, look.fruit);
  }
}

// ---- Animals ----

// A small speech-bubble over a ready animal, showing what it has to give.
function productBubble(ctx: CanvasRenderingContext2D, at: WorldPoint, color: string): void {
  ellipse(ctx, at.x, at.y, 7, 6, '#fffaf0');
  polygon(ctx, [lift(at, -4), { ...at, x: at.x + 3, y: at.y + 9 }, { ...at, x: at.x - 1, y: at.y + 5 }], '#fffaf0');
  ellipse(ctx, at.x, at.y, 4, 3.5, color);
}

const PRODUCT_COLORS: Record<AnimalId, string> = {
  chicken: '#f4e6c4',
  cow: '#dfeefa',
  sheep: '#f2f2ea',
  pig: '#5a3a24',
  horse: '#8a5a32',
};

function legs(ctx: CanvasRenderingContext2D, c: WorldPoint, spread: number, height: number, color: string): void {
  for (const dx of [-spread, -spread / 3, spread / 3, spread]) line(ctx, { ...c, x: c.x + dx, y: c.y - height }, { ...c, x: c.x + dx, y: c.y }, color, 2);
}

export function drawAnimal(ctx: CanvasRenderingContext2D, x: number, y: number, id: AnimalId, ready: boolean, pose: Pose = STILL): void {
  const c = tileCenter(tile(x, y));
  ellipse(ctx, c.x + 2, c.y + 1, 13, 5, SHADOW);
  // Real art: the pose picks the frame and row, and mirrors it to face right.
  const index = (pose.away ? GRIDS.animal.cols : 0) + pose.frame;
  if (drawArt(ctx, `animal-${id}`, index, c.x, c.y, 64, pose.facing === -1)) {
    if (ready) productBubble(ctx, { ...c, x: c.x + 6, y: c.y - 34 }, PRODUCT_COLORS[id]);
    return;
  }
  // The body is drawn facing left; mirror it to face right, lift it for a
  // step, and tip it forward to peck or graze.
  ctx.save();
  ctx.translate(c.x, c.y - pose.bob);
  ctx.scale(pose.facing, 1);
  if (pose.acting) ctx.rotate(-0.22);
  ctx.translate(-c.x, -c.y);
  drawAnimalBody(ctx, c, id);
  ctx.restore();
  if (ready) productBubble(ctx, { ...c, x: c.x + 6, y: c.y - 34 }, PRODUCT_COLORS[id]);
}

function drawAnimalBody(ctx: CanvasRenderingContext2D, c: WorldPoint, id: AnimalId): void {
  switch (id) {
    case 'chicken':
      ellipse(ctx, c.x, c.y - 7, 6, 5, '#fbfbf7');
      ellipse(ctx, c.x - 5, c.y - 12, 3.5, 3.5, '#fbfbf7');
      ellipse(ctx, c.x - 5, c.y - 16, 1.8, 1.6, '#d8352a');
      polygon(ctx, [{ ...c, x: c.x - 8.5, y: c.y - 12 }, { ...c, x: c.x - 11, y: c.y - 11 }, { ...c, x: c.x - 8.5, y: c.y - 10.5 }], '#f2b632');
      ellipse(ctx, c.x + 5, c.y - 9, 2.5, 3.5, '#eeeee6');
      break;
    case 'cow':
      legs(ctx, c, 8, 7, '#3b3b3b');
      ellipse(ctx, c.x, c.y - 12, 12, 7, '#fbfbf5');
      ellipse(ctx, c.x + 3, c.y - 14, 4, 3, '#2e2e2e');
      ellipse(ctx, c.x - 5, c.y - 10, 3, 2.5, '#2e2e2e');
      ellipse(ctx, c.x - 13, c.y - 15, 5, 4.5, '#fbfbf5');
      ellipse(ctx, c.x - 16, c.y - 13, 3, 2.4, '#f2b5b0');
      line(ctx, { ...c, x: c.x - 15, y: c.y - 19 }, { ...c, x: c.x - 17, y: c.y - 22 }, '#d9c9a0', 1.5);
      break;
    case 'sheep':
      legs(ctx, c, 6, 6, '#2e2e2e');
      for (const [dx, dy] of [[-5, -11], [0, -14], [5, -11], [0, -9], [-3, -15], [4, -15]] as const) {
        ellipse(ctx, c.x + dx, c.y + dy, 5, 4.5, '#f4f4ec');
      }
      ellipse(ctx, c.x - 11, c.y - 13, 3.5, 4, '#2e2e2e');
      break;
    case 'pig':
      legs(ctx, c, 6, 5, '#e48f98');
      ellipse(ctx, c.x, c.y - 10, 10, 6.5, '#f5a9b2');
      ellipse(ctx, c.x - 10, c.y - 11, 3.5, 3, '#ef8e99');
      ellipse(ctx, c.x - 11, c.y - 11, 1, 1, '#9b4b55');
      polygon(ctx, [{ ...c, x: c.x - 6, y: c.y - 16 }, { ...c, x: c.x - 3, y: c.y - 20 }, { ...c, x: c.x - 2, y: c.y - 15 }], '#ef8e99');
      break;
    case 'horse':
      legs(ctx, c, 8, 10, '#5a3a20');
      ellipse(ctx, c.x, c.y - 15, 11, 6, '#8a5a32');
      polygon(
        ctx,
        [{ ...c, x: c.x - 8, y: c.y - 18 }, { ...c, x: c.x - 13, y: c.y - 28 }, { ...c, x: c.x - 9, y: c.y - 30 }, { ...c, x: c.x - 4, y: c.y - 19 }],
        '#8a5a32',
      );
      ellipse(ctx, c.x - 13, c.y - 28, 4.5, 3, '#8a5a32');
      line(ctx, { ...c, x: c.x - 9, y: c.y - 30 }, { ...c, x: c.x - 5, y: c.y - 20 }, '#3a2414', 2.5);
      line(ctx, { ...c, x: c.x + 11, y: c.y - 16 }, { ...c, x: c.x + 14, y: c.y - 7 }, '#3a2414', 2.5);
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

// ---- Decorations ----

// Which of a decoration's four neighbors hold the same decoration, for
// fences and paths that join up.
export type Links = { readonly east: boolean; readonly west: boolean; readonly north: boolean; readonly south: boolean };
export const NO_LINKS: Links = { east: false, west: false, north: false, south: false };

// Flat decorations sit on the ground and are drawn with the soil, under
// everything that stands up.
export function isFlat(id: DecorationId): boolean {
  return id === 'dirtPath';
}

export function drawFlatDecoration(ctx: CanvasRenderingContext2D, id: DecorationId, x: number, y: number): void {
  if (id !== 'dirtPath') return;
  const f = { x, y, width: 1, depth: 1 };
  polygon(ctx, footprintCorners(f, 0.02), '#c9a46a');
  for (const [u, v, r] of [[0.3, 0.4, 1.6], [0.62, 0.3, 1.2], [0.5, 0.7, 1.4], [0.75, 0.62, 1]] as const) {
    const p = tileToWorld(tile(x + u, y + v));
    ellipse(ctx, p.x, p.y, r * 1.6, r, '#b08a55');
  }
}

function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number, links: Links, picket: boolean): void {
  const rail = picket ? '#a5743f' : '#fbfbf7';
  const edge = picket ? '#7a5230' : '#cfcabe';
  const center = tileCenter(tile(x, y));
  // Each link runs from the tile's center to the middle of the shared edge.
  const ends: WorldPoint[] = [];
  if (links.east) ends.push(tileToWorld(tile(x + 1, y + 0.5)));
  if (links.west) ends.push(tileToWorld(tile(x, y + 0.5)));
  if (links.south) ends.push(tileToWorld(tile(x + 0.5, y + 1)));
  if (links.north) ends.push(tileToWorld(tile(x + 0.5, y)));
  // A lone fence piece runs along the tile's x axis.
  if (ends.length === 0) ends.push(tileToWorld(tile(x + 0.1, y + 0.5)), tileToWorld(tile(x + 0.9, y + 0.5)));

  for (const end of ends) {
    for (const h of [5, 11]) line(ctx, lift(center, h), lift(end, h), edge, 3.2);
    for (const h of [5, 11]) line(ctx, lift(center, h), lift(end, h), rail, 2);
    if (picket) {
      for (const t of [0.35, 0.7]) {
        const p = { ...center, x: center.x + (end.x - center.x) * t, y: center.y + (end.y - center.y) * t };
        line(ctx, p, lift(p, 14), edge, 3);
        line(ctx, p, lift(p, 14), rail, 1.8);
      }
    }
  }
  line(ctx, center, lift(center, 15), edge, 4);
  line(ctx, center, lift(center, 15), rail, 2.6);
}

export function drawDecoration(ctx: CanvasRenderingContext2D, id: DecorationId, f: Footprint, links: Links): void {
  const c = tileCenter(tile(f.x, f.y));
  if (decorationHasArt(id)) {
    const front = tileToWorld(tile(f.x + f.width, f.y + f.depth));
    // Upright things stand on the middle of their square; boxy things fill
    // their footprint from its front corner.
    const at = UPRIGHT_DECORATIONS.has(id) ? c : front;
    ellipse(ctx, c.x + 3, c.y + 1, 10 * f.width, 4 * f.depth, SHADOW);
    if (drawArt(ctx, `deco-${id}`, 0, at.x, at.y, ((f.width + f.depth) * 64) / 2)) return;
  }
  switch (id) {
    case 'dirtPath':
      return;
    case 'whiteFence':
    case 'picketFence':
      drawFence(ctx, f.x, f.y, links, id === 'picketFence');
      return;
    case 'hayBale': {
      ellipse(ctx, c.x + 4, c.y + 2, 18, 7, SHADOW);
      drawBox(ctx, f, 0.2, 14, { top: '#f3d36b', left: '#e0b947', right: '#c99f33' });
      // Binding twine around the bale.
      const [, right, bottom, left] = footprintCorners(f, 0.2);
      for (const t of [0.33, 0.66]) {
        const a = mix(left, bottom, t);
        const b = mix(bottom, right, t);
        line(ctx, a, lift(a, 14), '#a88327', 1);
        line(ctx, b, lift(b, 14), '#a88327', 1);
      }
      return;
    }
    case 'flowerPot':
      ellipse(ctx, c.x + 3, c.y + 1, 9, 4, SHADOW);
      polygon(ctx, [{ ...c, x: c.x - 7, y: c.y - 10 }, { ...c, x: c.x + 7, y: c.y - 10 }, { ...c, x: c.x + 5, y: c.y }, { ...c, x: c.x - 5, y: c.y }], '#c8643a');
      ellipse(ctx, c.x, c.y - 10, 7, 2.5, '#a64e2c');
      for (const [dx, dy, color] of [[-4, -15, '#f27aa6'], [3, -17, '#f7d82b'], [0, -20, '#b48ad8'], [5, -13, '#f27aa6']] as const) {
        line(ctx, { ...c, x: c.x + dx * 0.5, y: c.y - 10 }, { ...c, x: c.x + dx, y: c.y + dy }, '#4f9a2f', 1.2);
        ellipse(ctx, c.x + dx, c.y + dy, 2.6, 2.4, color);
      }
      return;
    case 'scarecrow':
      ellipse(ctx, c.x + 4, c.y + 1, 10, 4, SHADOW);
      line(ctx, c, lift(c, 30), '#7a5230', 2.5);
      line(ctx, { ...c, x: c.x - 11, y: c.y - 21 }, { ...c, x: c.x + 11, y: c.y - 21 }, '#7a5230', 2.5);
      polygon(ctx, [{ ...c, x: c.x - 6, y: c.y - 23 }, { ...c, x: c.x + 6, y: c.y - 23 }, { ...c, x: c.x + 5, y: c.y - 10 }, { ...c, x: c.x - 5, y: c.y - 10 }], '#4a78b5');
      ellipse(ctx, c.x, c.y - 28, 4.5, 4.5, '#f3d36b');
      polygon(ctx, [{ ...c, x: c.x - 8, y: c.y - 31 }, { ...c, x: c.x + 8, y: c.y - 31 }, { ...c, x: c.x + 3, y: c.y - 34 }, { ...c, x: c.x, y: c.y - 39 }, { ...c, x: c.x - 3, y: c.y - 34 }], '#6b4a2b');
      return;
    case 'wheelbarrow':
      ellipse(ctx, c.x + 3, c.y + 1, 13, 5, SHADOW);
      line(ctx, { ...c, x: c.x + 2, y: c.y - 6 }, { ...c, x: c.x + 14, y: c.y - 2 }, '#7a5230', 2);
      polygon(ctx, [{ ...c, x: c.x - 10, y: c.y - 12 }, { ...c, x: c.x + 6, y: c.y - 12 }, { ...c, x: c.x + 3, y: c.y - 5 }, { ...c, x: c.x - 7, y: c.y - 5 }], '#4f8f3a');
      ellipse(ctx, c.x - 2, c.y - 12, 8, 2.2, '#3c6e2c');
      ellipse(ctx, c.x - 7, c.y - 3, 3.5, 3.5, '#3b3b3b');
      return;
    case 'waterPump':
      ellipse(ctx, c.x + 3, c.y + 1, 9, 4, SHADOW);
      drawBox(ctx, f, 0.36, 18, { top: '#6f8790', left: '#58707a', right: '#4a5f68' });
      line(ctx, lift(c, 16), { ...c, x: c.x - 9, y: c.y - 12 }, '#4a5f68', 3);
      line(ctx, lift(c, 18), { ...c, x: c.x + 10, y: c.y - 26 }, '#3b4b52', 2);
      ellipse(ctx, c.x - 9, c.y - 10, 2, 1.4, '#7fb6d9');
      return;
    case 'shed':
      drawBarnLike(ctx, 'shed', f);
      return;
    case 'redBarn':
      drawBarnLike(ctx, 'redBarn', f);
      return;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
