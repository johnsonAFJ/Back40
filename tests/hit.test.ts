import { describe, expect, it } from 'vitest';
import { place } from '../src/core/actions';
import { newFarm, type FarmState } from '../src/core/state';
import { objectAtPoint } from '../src/render/hit';
import { tile, tileCenter, tileToWorld, world } from '../src/render/iso';

const START = Date.UTC(2026, 9, 8, 9, 0);

// A new farm keeping only the starter plots for which `keep` is true.
function farmWithPlots(keep: (x: number, y: number) => boolean): FarmState {
  const farm = newFarm(START, 7);
  return { ...farm, objects: farm.objects.filter((o) => o.kind !== 'plot' || keep(o.x, o.y)) };
}

function farmWithTree(): FarmState {
  // No crops, whose tall boxes would cover the points being tested.
  const outcome = place(farmWithPlots(() => false), { kind: 'tree', id: 'appleTree' }, 9, 9, START);
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

  it("picks a crop by leaves spilling past its plot's corner", () => {
    const farm = farmWithPlots((x, y) => x === 5 && y === 5);
    const left = tileToWorld(tile(5, 6));
    expect(objectAtPoint(farm, world(left.x - 8, left.y - 10))).toMatchObject({ kind: 'plot', x: 5, y: 5 });
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
