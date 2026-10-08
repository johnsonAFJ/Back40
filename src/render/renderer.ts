// Draws one frame: the visible ground, the farm and everything on it,
// scenery, the highlight and floating rewards.
//
// The canvas transform is set once per frame so that all drawing code works
// in world coordinates. The camera's pan and zoom, and the screen's pixel
// density, live entirely in that one setTransform call.

import { stage } from '../core/growth';
import { farmSize, footprint, type FarmState } from '../core/state';
import { screenToWorld, type Camera, type Viewport } from './camera';
import { screen, worldToTile, type TilePoint } from './iso';
import { drawBuilding } from './draw/buildings';
import { drawCrop, drawSoil } from './draw/crops';
import {
  drawFarmEdge,
  drawFarmTile,
  drawHighlight,
  drawSceneryTree,
  drawWildTile,
  farmPath,
  hasSceneryTree,
  isOnFarm,
} from './draw/ground';
import { PALETTE } from './draw/palette';
import { drawEffects, type FloatingText } from './effects';

export type Scene = {
  readonly camera: Camera;
  readonly view: Viewport;
  readonly pixelRatio: number;
  readonly farm: FarmState;
  readonly now: number;
  readonly highlight: TilePoint | null;
  readonly effects: readonly FloatingText[];
  readonly frameTime: number;
};

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

export function render(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { camera, view, pixelRatio, farm, now, highlight } = scene;
  const size = farmSize(farm);

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

  // Ground pass: grass, then soil. Flat things never overlap, so their order
  // doesn't matter.
  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      if (isOnFarm(x, y, size)) drawFarmTile(ctx, x, y);
      else drawWildTile(ctx, x, y);
    }
  }
  for (const obj of farm.objects) {
    if (obj.kind === 'plot') drawSoil(ctx, obj.x, obj.y, obj.state === 'harvested' ? 'harvested' : 'plowed');
  }

  drawFarmEdge(ctx, size, camera.zoom);
  if (highlight) drawHighlight(ctx, highlight, camera.zoom);

  // Object pass, back to front. Depth is the sum of an object's center
  // coordinates: a larger x + y is nearer the viewer. Using the center
  // rather than a corner keeps a 3 x 3 farmhouse behind a plot sitting just
  // in front of it.
  const drawables: Drawable[] = [];
  for (const obj of farm.objects) {
    const { width, depth } = footprint(obj);
    const d = obj.x + width / 2 + obj.y + depth / 2;
    if (obj.kind === 'building') {
      drawables.push({ depth: d, x: obj.x, draw: () => drawBuilding(ctx, obj.typeId, { x: obj.x, y: obj.y, width, depth }) });
    } else if (obj.state === 'planted') {
      drawables.push({ depth: d, x: obj.x, draw: () => drawCrop(ctx, obj.x, obj.y, obj.cropId, stage(obj, now)) });
    }
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
