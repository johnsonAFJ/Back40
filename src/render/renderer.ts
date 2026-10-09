// Draws one frame: the visible ground, the farm and everything on it,
// scenery, the highlight, the placement preview and floating rewards.
//
// The canvas transform is set once per frame so that all drawing code works
// in world coordinates. The camera's pan and zoom, and the screen's pixel
// density, live entirely in that one setTransform call.

import { productInfo, type Placeable } from '../core/catalog';
import { DECORATIONS, type DecorationId } from '../core/data/items';
import { farmSize, footprint, type FarmObject, type FarmState } from '../core/state';
import { screenToWorld, type Camera, type Viewport } from './camera';
import { screen, tile, worldToTile, type TilePoint } from './iso';
import { drawSoil } from './draw/crops';
import {
  diamondPath,
  drawFarmEdge,
  drawFarmTile,
  drawHighlight,
  drawSceneryTree,
  drawWildTile,
  farmPath,
  hasSceneryTree,
  isOnFarm,
} from './draw/ground';
import { drawFlatDecoration, isFlat, NO_LINKS, type Links } from './draw/items';
import { drawCrows, drawHungry, drawSparkle } from './draw/marks';
import { drawFarmObject, drawProduct } from './draw/objects';
import { PALETTE } from './draw/palette';
import { drawEffects, type FloatingText } from './effects';

// What the player is holding while placing or moving something: a product
// from the market, or an object already on the farm. `fits` says whether it
// can go down where it is.
export type Ghost =
  | { readonly kind: 'product'; readonly product: Placeable; readonly x: number; readonly y: number; readonly fits: boolean }
  | { readonly kind: 'object'; readonly obj: FarmObject; readonly x: number; readonly y: number; readonly fits: boolean };

export type Scene = {
  readonly camera: Camera;
  readonly view: Viewport;
  readonly pixelRatio: number;
  readonly farm: FarmState;
  readonly now: number;
  readonly highlight: TilePoint | null;
  readonly ghost: Ghost | null;
  // An object being moved is drawn as the ghost, not in its old spot.
  readonly hiddenId: string | null;
  readonly effects: readonly FloatingText[];
  readonly frameTime: number;
  // Chores on a neighbor's farm: crops with crows and hungry animals.
  readonly marks: Marks;
};

export type Marks = { readonly crows: ReadonlySet<string>; readonly hungry: ReadonlySet<string> };
export const NO_MARKS: Marks = { crows: new Set(), hungry: new Set() };

type TileRange = { minX: number; maxX: number; minY: number; maxY: number };

// Something standing up off the ground, which has to be drawn in depth order.
type Drawable = { readonly depth: number; readonly x: number; readonly draw: () => void };

// The tiles that overlap the screen. Converting the four screen corners to tile
// space gives a rotated rectangle; its bounding box, plus margin (more below,
// for things that stick up into view), covers everything visible.
function visibleTiles(camera: Camera, view: Viewport): TileRange {
  const corners = [
    screen(0, 0),
    screen(view.width, 0),
    screen(0, view.height),
    screen(view.width, view.height),
  ].map((s) => worldToTile(screenToWorld(camera, view, s)));
  const xs = corners.map((t) => t.x);
  const ys = corners.map((t) => t.y);
  return {
    minX: Math.floor(Math.min(...xs)) - 1,
    maxX: Math.ceil(Math.max(...xs)) + 3,
    minY: Math.floor(Math.min(...ys)) - 1,
    maxY: Math.ceil(Math.max(...ys)) + 3,
  };
}

// Fences and paths join up with the same decoration on neighboring tiles.
function linker(objects: readonly FarmObject[]): (x: number, y: number, id: DecorationId) => Links {
  const at = new Map<string, DecorationId>();
  for (const o of objects) if (o.kind === 'decoration' && DECORATIONS[o.typeId].connects) at.set(`${o.x},${o.y}`, o.typeId);
  return (x, y, id) =>
    DECORATIONS[id].connects
      ? {
          east: at.get(`${x + 1},${y}`) === id,
          west: at.get(`${x - 1},${y}`) === id,
          south: at.get(`${x},${y + 1}`) === id,
          north: at.get(`${x},${y - 1}`) === id,
        }
      : NO_LINKS;
}

// Depth is the sum of an object's center coordinates: a larger x + y is
// nearer the viewer. Using the center rather than a corner keeps a 3 x 3
// farmhouse behind a plot sitting just in front of it.
function depthOf(x: number, y: number, width: number, depth: number): number {
  return x + width / 2 + y + depth / 2;
}

export function render(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { camera, view, pixelRatio, farm, now, highlight, ghost } = scene;
  const size = farmSize(farm);
  const objects = scene.hiddenId ? farm.objects.filter((o) => o.id !== scene.hiddenId) : farm.objects;
  const linksAt = linker(objects);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.wildGrass;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const scale = pixelRatio * camera.zoom;
  ctx.setTransform(
    scale,
    0,
    0,
    scale,
    pixelRatio * (view.width / 2 - camera.center.x * camera.zoom),
    pixelRatio * (view.height / 2 - camera.center.y * camera.zoom),
  );

  const range = visibleTiles(camera, view);

  ctx.fillStyle = PALETTE.farmGrass;
  farmPath(ctx, size);
  ctx.fill();

  // Ground pass: grass, soil and paths. Flat things never overlap, so their
  // order doesn't matter.
  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      if (isOnFarm(x, y, size)) drawFarmTile(ctx, x, y);
      else drawWildTile(ctx, x, y);
    }
  }
  for (const obj of objects) {
    if (obj.kind === 'plot') drawSoil(ctx, obj.x, obj.y, obj.state === 'harvested' ? 'harvested' : 'plowed');
    if (obj.kind === 'decoration' && isFlat(obj.typeId)) drawFlatDecoration(ctx, obj.typeId, obj.x, obj.y);
  }

  drawFarmEdge(ctx, size, camera.zoom);
  if (highlight && !ghost) drawHighlight(ctx, highlight, camera.zoom);
  if (ghost) drawGhostFootprint(ctx, ghost, farm);

  // Object pass, back to front.
  const drawables: Drawable[] = [];
  for (const obj of objects) {
    const { width, depth } = footprint(obj);
    drawables.push({
      depth: depthOf(obj.x, obj.y, width, depth),
      x: obj.x,
      draw: () => {
        drawFarmObject(ctx, obj, now, obj.kind === 'decoration' ? linksAt(obj.x, obj.y, obj.typeId) : NO_LINKS);
        if (obj.kind === 'plot' && obj.state === 'planted' && obj.fertilized) drawSparkle(ctx, obj.x, obj.y);
        if (scene.marks.crows.has(obj.id)) drawCrows(ctx, obj.x, obj.y);
        if (scene.marks.hungry.has(obj.id)) drawHungry(ctx, obj.x, obj.y);
      },
    });
  }
  if (ghost) {
    const { width, depth } = ghostSize(ghost);
    drawables.push({ depth: depthOf(ghost.x, ghost.y, width, depth), x: ghost.x, draw: () => drawGhost(ctx, ghost, now) });
  }
  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      if (hasSceneryTree(x, y, size)) drawables.push({ depth: x + y + 1, x, draw: () => drawSceneryTree(ctx, x, y) });
    }
  }
  drawables.sort((a, b) => a.depth - b.depth || a.x - b.x);
  for (const d of drawables) d.draw();

  drawEffects(ctx, scene.effects, scene.frameTime, camera.zoom);
}

function ghostSize(ghost: Ghost): { width: number; depth: number } {
  return ghost.kind === 'product' ? productInfo(ghost.product) : footprint(ghost.obj);
}

// Tints the tiles the held thing would cover: green where it fits, red
// where it doesn't.
function drawGhostFootprint(ctx: CanvasRenderingContext2D, ghost: Ghost, farm: FarmState): void {
  const { width, depth } = ghostSize(ghost);
  ctx.fillStyle = ghost.fits ? 'rgba(120, 230, 90, 0.45)' : 'rgba(235, 70, 50, 0.45)';
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < depth; dy++) {
      if (!isOnFarm(ghost.x + dx, ghost.y + dy, farmSize(farm))) continue;
      diamondPath(ctx, tile(ghost.x + dx, ghost.y + dy));
      ctx.fill();
    }
  }
}

function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, now: number): void {
  ctx.globalAlpha = ghost.fits ? 0.85 : 0.5;
  if (ghost.kind === 'product') {
    const { width, depth } = productInfo(ghost.product);
    if (ghost.product.kind === 'decoration' && isFlat(ghost.product.id)) {
      drawFlatDecoration(ctx, ghost.product.id, ghost.x, ghost.y);
    } else {
      drawProduct(ctx, ghost.product, ghost.x, ghost.y, width, depth);
    }
  } else {
    const moved = { ...ghost.obj, x: ghost.x, y: ghost.y };
    if (moved.kind === 'plot') drawSoil(ctx, moved.x, moved.y, moved.state === 'harvested' ? 'harvested' : 'plowed');
    if (moved.kind === 'decoration' && isFlat(moved.typeId)) drawFlatDecoration(ctx, moved.typeId, moved.x, moved.y);
    drawFarmObject(ctx, moved, now, NO_LINKS);
  }
  ctx.globalAlpha = 1;
}
