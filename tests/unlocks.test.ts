import { describe, expect, it } from 'vitest';
import { isUnlocked, nextUnlockLevel, unlocksAt, unlocksBetween, type Unlock } from '../src/core/unlocks';

const names = (list: readonly Unlock[]): string[] =>
  list.map((u) => (u.kind === 'expansion' ? `expansion:${u.size}` : `${u.kind}:${u.id}`));

describe('unlocks', () => {
  it('lists everything that unlocks at a level, across the whole market', () => {
    expect(names(unlocksAt(4))).toEqual(['crop:lilac', 'crop:squash', 'decoration:flowerPot']);
    expect(names(unlocksAt(2))).toEqual(['crop:raspberries', 'animal:chicken']);
    expect(names(unlocksAt(7))).toEqual(['crop:blueberries']);
  });

  it('collects every unlock across a multi-level jump', () => {
    expect(names(unlocksBetween(3, 5))).toEqual([
      'crop:lilac',
      'crop:squash',
      'decoration:flowerPot',
      'animal:cow',
      'expansion:14',
    ]);
  });

  it('finds the next level with something new', () => {
    expect(nextUnlockLevel(1)).toBe(2);
    // Nothing new at 19; level 20 brings sugar cane, pink roses and more.
    expect(nextUnlockLevel(18)).toBe(20);
    // Sunflowers at 23 and corn at 24, then the last expansion at 25.
    expect(nextUnlockLevel(20)).toBe(23);
    expect(nextUnlockLevel(24)).toBe(25);
    expect(nextUnlockLevel(25)).toBeNull();
  });

  it('knows what a level can buy', () => {
    expect(isUnlocked({ kind: 'crop', id: 'strawberries' }, 1)).toBe(true);
    expect(isUnlocked({ kind: 'crop', id: 'tomatoes' }, 9)).toBe(false);
    expect(isUnlocked({ kind: 'crop', id: 'tomatoes' }, 10)).toBe(true);
    expect(isUnlocked({ kind: 'animal', id: 'horse' }, 15)).toBe(true);
  });
});
