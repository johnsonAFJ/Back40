// Draws one frame: the visible ground, the farm, scenery, and the highlight.
//
// The canvas transform is set once per frame so that all drawing code works
// in world coordinates. The camera's pan and zoom, and the screen's pixel
// density, live entirely in that one setTransform call.

import { screenToWorld, type Camera, type Viewport } from './camera';
import { screen, worldToTile, type TilePoint } from './iso';
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

export type Scene = {
  readonly camera: Camera;
  readonly view: Viewport;
  readonly pixelRatio: number;
  readonly farmSize: number;
  readonly highlight: TilePoint | null;
};

type TileRange = { minX: number; maxX: number; minY: number; maxY: number };

// The tiles that overlap the screen. Converting the four screen corners to tile
// space gives a rotated rectangle; its bounding box, plus one tile of margin
// (two below, for trees that stick up into view), covers everything visible.
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
    maxX: Math.ceil(Math.max(...xs)) + 2,
    minY: Math.floor(Math.min(...ys)) - 1,
    maxY: Math.ceil(Math.max(...ys)) + 2,
  };
}

export function render(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { camera, view, pixelRatio, farmSize, highlight } = scene;

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
  farmPath(ctx, farmSize);
  ctx.fill();

  // Ground pass. Flat tiles never overlap, so their order doesn't matter.
  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      if (isOnFarm(x, y, farmSize)) drawFarmTile(ctx, x, y);
      else drawWildTile(ctx, x, y);
    }
  }

  drawFarmEdge(ctx, farmSize, camera.zoom);
  if (highlight) drawHighlight(ctx, highlight, camera.zoom);

  // Object pass, back to front. A tile with a larger x + y is nearer the
  // viewer, so walking diagonals in increasing x + y lets near trees overlap
  // far ones. Ties (same diagonal) sit side by side and never overlap.
  for (let d = range.minX + range.minY; d <= range.maxX + range.maxY; d++) {
    const xFrom = Math.max(range.minX, d - range.maxY);
    const xTo = Math.min(range.maxX, d - range.minY);
    for (let x = xFrom; x <= xTo; x++) {
      const y = d - x;
      if (hasSceneryTree(x, y, farmSize)) drawSceneryTree(ctx, x, y);
    }
  }
}
