// Isometric math: converting between the three coordinate spaces.
//
//   Tile   - grid coordinates. Tile (0, 0) is the farm's top corner; x runs
//            down-right on screen and y runs down-left. Whole numbers name a
//            tile; fractions are positions inside one.
//   World  - flat pixels at 100% zoom, before the camera. Tile (0, 0)'s top
//            corner sits at world (0, 0).
//   Screen - CSS pixels on the canvas, after the camera's pan and zoom.
//
// Each space is a separate type so the compiler stops a screen point from
// being passed where a tile is expected. Mixing them up is the classic
// isometric bug: everything draws, just in the wrong place.

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export type TilePoint = { readonly x: number; readonly y: number; readonly __space: 'tile' };
export type WorldPoint = { readonly x: number; readonly y: number; readonly __space: 'world' };
export type ScreenPoint = { readonly x: number; readonly y: number; readonly __space: 'screen' };

export const tile = (x: number, y: number): TilePoint => ({ x, y }) as TilePoint;
export const world = (x: number, y: number): WorldPoint => ({ x, y }) as WorldPoint;
export const screen = (x: number, y: number): ScreenPoint => ({ x, y }) as ScreenPoint;

// Stepping one tile in x moves half a tile right and half a tile down on
// screen; stepping in y moves half left and half down. That's the whole trick.
export function tileToWorld(t: TilePoint): WorldPoint {
  return world((t.x - t.y) * (TILE_WIDTH / 2), (t.x + t.y) * (TILE_HEIGHT / 2));
}

// The exact inverse of tileToWorld, found by solving its two equations for
// t.x and t.y.
export function worldToTile(w: WorldPoint): TilePoint {
  const a = w.x / (TILE_WIDTH / 2);
  const b = w.y / (TILE_HEIGHT / 2);
  return tile((a + b) / 2, (b - a) / 2);
}

// Which tile contains this world point. The inverse transform turns every
// diamond back into a 1 x 1 square, so rounding down is an exact hit test.
// Clicks near a diamond's corner land in the right tile with no edge checks.
export function pickTile(w: WorldPoint): TilePoint {
  const t = worldToTile(w);
  return tile(Math.floor(t.x), Math.floor(t.y));
}

// The diamond's four corners in world space, clockwise from the top.
export function tileCorners(t: TilePoint): [WorldPoint, WorldPoint, WorldPoint, WorldPoint] {
  return [
    tileToWorld(t),
    tileToWorld(tile(t.x + 1, t.y)),
    tileToWorld(tile(t.x + 1, t.y + 1)),
    tileToWorld(tile(t.x, t.y + 1)),
  ];
}

export function tileCenter(t: TilePoint): WorldPoint {
  return tileToWorld(tile(t.x + 0.5, t.y + 0.5));
}
