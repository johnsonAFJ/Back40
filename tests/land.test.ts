import { describe, expect, it } from 'vitest';
import { place } from '../src/core/actions';
import { expand, neighborsAt, nextExpansion } from '../src/core/land';
import { totalXpForLevel } from '../src/core/levels';
import { farmSize, isOnFarm, newFarm, objectAt, type FarmState } from '../src/core/state';
import { unlocksAt } from '../src/core/unlocks';

const START = Date.UTC(2026, 9, 8, 9, 0);

function atLevel(level: number, coins: number): FarmState {
  return { ...newFarm(START, 3), xp: totalXpForLevel(level), coins };
}

describe('neighbors', () => {
  it('move in as you level up', () => {
    expect(neighborsAt(2)).toEqual([]);
    expect(neighborsAt(3)).toEqual(['martha']);
    expect(neighborsAt(10)).toEqual(['martha', 'gus', 'june']);
    expect(neighborsAt(20)).toHaveLength(5);
  });
});

describe('expanding', () => {
  it('grows the farm to 14 x 14 at level 5 for 2,000 coins', () => {
    const outcome = expand(atLevel(5, 2_500), START);
    if (!outcome.ok) throw new Error(outcome.failure.code);
    expect(farmSize(outcome.state)).toBe(14);
    expect(outcome.state.coins).toBe(500);
    expect(isOnFarm(outcome.state, 13, 13)).toBe(true);
  });

  it('keeps everything on the farm where it was', () => {
    const before = atLevel(5, 2_500);
    const outcome = expand(before, START);
    if (!outcome.ok) throw new Error(outcome.failure.code);
    expect(outcome.state.objects).toEqual(before.objects);
    expect(objectAt(outcome.state, 1, 1)).toMatchObject({ typeId: 'farmhouse' });
  });

  it('opens the new land for placing', () => {
    const outcome = expand(atLevel(5, 2_500), START);
    if (!outcome.ok) throw new Error(outcome.failure.code);
    expect(place(outcome.state, { kind: 'tree', id: 'appleTree' }, 13, 13, START).ok).toBe(true);
  });

  it('explains what is missing', () => {
    expect(expand(atLevel(4, 99_999), START)).toMatchObject({ failure: { code: 'levelTooLow', level: 5 } });
    expect(expand(atLevel(5, 1_999), START)).toMatchObject({ failure: { code: 'notEnoughCoins', needed: 2_000 } });
  });

  it('goes one size at a time, up to 22 x 22', () => {
    let farm = atLevel(25, 1_000_000);
    const sizes: number[] = [];
    for (;;) {
      const outcome = expand(farm, START);
      if (!outcome.ok) {
        expect(outcome.failure.code).toBe('fullSize');
        break;
      }
      farm = outcome.state;
      sizes.push(outcome.size);
    }
    expect(sizes).toEqual([14, 16, 18, 20, 22]);
    expect(nextExpansion(farm)).toBeNull();
  });

  it('shows up in the level-up banner when it becomes available', () => {
    expect(unlocksAt(5)).toContainEqual({ kind: 'expansion', size: 14 });
  });
});
