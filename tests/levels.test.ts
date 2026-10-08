import { describe, expect, it } from 'vitest';
import { levelForXp, levelProgress, totalXpForLevel, xpToNextLevel } from '../src/core/levels';

describe('levels', () => {
  it('matches the table in SPEC.md', () => {
    const table: ReadonlyArray<readonly [number, number]> = [
      [2, 15], [3, 50], [4, 105], [5, 180], [10, 855], [15, 2030], [20, 3705], [25, 5880],
    ];
    for (const [level, xp] of table) expect(totalXpForLevel(level)).toBe(xp);
  });

  it('costs 20 more XP for each level', () => {
    expect([1, 2, 3, 4].map(xpToNextLevel)).toEqual([15, 35, 55, 75]);
  });

  it('starts at level 1 and changes exactly on the threshold', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(14)).toBe(1);
    expect(levelForXp(15)).toBe(2);
    expect(levelForXp(49)).toBe(2);
    expect(levelForXp(50)).toBe(3);
  });

  it('reports progress through the current level', () => {
    expect(levelProgress(60)).toEqual({ level: 3, intoLevel: 10, levelSize: 55 });
  });
});
