import { describe, expect, it } from 'vitest';
import { place } from '../src/core/actions';
import { newFarm, type FarmState } from '../src/core/state';
import { objectAtPoint } from '../src/render/hit';
import { tile, tileCenter, world } from '../src/render/iso';

const START = Date.UTC(2026, 9, 8, 9, 0);

function farmWithTree(): FarmState {
  const outcome = place(newFarm(START, 7), { kind: 'tree', id: 'appleTree' }, 9, 9, START);
  if (!outcome.ok) throw new Error('place failed');
  return outcome.state;
}

describe('objectAtPoint', () => {
  it("picks a tree by its leaves, which are drawn over the tiles behind it", () => {
    const c = tileCenter(tile(9, 9));
    const canopy = world(c.x, c.y - 30);
    expect(objectAtPoint(farmWithTree(), canopy)).toMatchObject({ kind: 'tree' });
  });

  it('misses above the top of the tree', () => {
    const c = tileCenter(tile(9, 9));
    expect(objectAtPoint(farmWithTree(), world(c.x, c.y - 80))).toBeNull();
  });

  it('ignores flat ground with nothing standing on it', () => {
    expect(objectAtPoint(farmWithTree(), tileCenter(tile(10, 2)))).toBeNull();
  });

  it('prefers the nearer of two overlapping things', () => {
    // The farmhouse's roof rises over the tiles in front of it; a tree on
    // one of those tiles is nearer, so it wins where they overlap.
    const outcome = place(farmWithTree(), { kind: 'tree', id: 'appleTree' }, 3, 3, START);
    if (!outcome.ok) throw new Error('place failed');
    const c = tileCenter(tile(3, 3));
    expect(objectAtPoint(outcome.state, world(c.x, c.y - 20))).toMatchObject({ kind: 'tree', x: 3, y: 3 });
  });
});
