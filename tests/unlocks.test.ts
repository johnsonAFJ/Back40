import { describe, expect, it } from 'vitest';
import { isUnlocked, nextUnlockLevel, unlocksAt, unlocksBetween } from '../src/core/unlocks';

const names = (list: ReadonlyArray<{ kind: string; id: string }>): string[] => list.map((u) => `${u.kind}:${u.id}`);

describe('unlocks', () => {
  it('lists everything that unlocks at a level, across the whole market', () => {
    expect(names(unlocksAt(4))).toEqual(['crop:lilac', 'crop:squash', 'decoration:flowerPot']);
    expect(names(unlocksAt(2))).toEqual(['animal:chicken']);
    expect(unlocksAt(7).length).toBe(1);
  });

  it('collects every unlock across a multi-level jump', () => {
    expect(names(unlocksBetween(3, 5))).toEqual([
      'crop:lilac',
      'crop:squash',
      'decoration:flowerPot',
      'crop:pumpkin',
      'animal:cow',
    ]);
  });

  it('finds the next level with something new', () => {
    expect(nextUnlockLevel(1)).toBe(2);
    expect(nextUnlockLevel(18)).toBe(19);
    expect(nextUnlockLevel(20)).toBeNull();
  });

  it('knows what a level can buy', () => {
    expect(isUnlocked({ kind: 'crop', id: 'strawberries' }, 1)).toBe(true);
    expect(isUnlocked({ kind: 'crop', id: 'pumpkin' }, 4)).toBe(false);
    expect(isUnlocked({ kind: 'animal', id: 'horse' }, 15)).toBe(true);
  });
});
