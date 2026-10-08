import { describe, expect, it } from 'vitest';
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  pickTile,
  tile,
  tileCenter,
  tileCorners,
  tileToWorld,
  world,
  worldToTile,
} from '../src/render/iso';

describe('tileToWorld', () => {
  it('puts tile (0, 0) at the world origin', () => {
    expect(tileToWorld(tile(0, 0))).toMatchObject({ x: 0, y: 0 });
  });

  it('moves half a tile right and down for each step in x', () => {
    expect(tileToWorld(tile(1, 0))).toMatchObject({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  });

  it('moves half a tile left and down for each step in y', () => {
    expect(tileToWorld(tile(0, 1))).toMatchObject({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  });
});

describe('worldToTile', () => {
  it('undoes tileToWorld, fractions included', () => {
    for (const [x, y] of [[0, 0], [3, 7], [11.25, 0.5], [-4, 9]] as const) {
      const back = worldToTile(tileToWorld(tile(x, y)));
      expect(back.x).toBeCloseTo(x);
      expect(back.y).toBeCloseTo(y);
    }
  });
});

describe('pickTile', () => {
  it('picks the tile whose center was clicked', () => {
    expect(pickTile(tileCenter(tile(4, 9)))).toMatchObject({ x: 4, y: 9 });
  });

  // Just inside each corner of tile (5, 2), nudged toward its center. These
  // are the spots a rectangle-based hit test gets wrong.
  it('picks the right tile right next to every corner', () => {
    const t = tile(5, 2);
    const center = tileCenter(t);
    for (const corner of tileCorners(t)) {
      const nearCorner = world(corner.x + (center.x - corner.x) * 0.05, corner.y + (center.y - corner.y) * 0.05);
      expect(pickTile(nearCorner)).toMatchObject({ x: 5, y: 2 });
    }
  });

  it('picks the neighbor just across an edge', () => {
    // Midpoint of tile (5, 2)'s lower-right edge, pushed slightly outward.
    const [, right, bottom] = tileCorners(tile(5, 2));
    const outside = world((right.x + bottom.x) / 2 + 1, (right.y + bottom.y) / 2 + 1);
    expect(pickTile(outside)).toMatchObject({ x: 6, y: 2 });
  });

  it('works for negative tiles outside the farm', () => {
    expect(pickTile(tileCenter(tile(-3, -1)))).toMatchObject({ x: -3, y: -1 });
  });
});
