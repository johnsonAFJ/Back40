import { describe, expect, it } from 'vitest';
import { isUnlocked, nextUnlockLevel, unlocksAt, unlocksBetween } from '../src/core/unlocks';

describe('unlocks', () => {
  it('lists the crops that unlock at a level', () => {
    expect(unlocksAt(4).map((u) => u.id)).toEqual(['lilac', 'squash']);
    expect(unlocksAt(2)).toEqual([]);
  });

  it('collects every unlock across a multi-level jump', () => {
    expect(unlocksBetween(3, 5).map((u) => u.id)).toEqual(['lilac', 'squash', 'pumpkin']);
  });

  it('finds the next level with something new', () => {
    expect(nextUnlockLevel(1)).toBe(4);
    expect(nextUnlockLevel(4)).toBe(5);
    expect(nextUnlockLevel(20)).toBeNull();
  });

  it('knows which crops a level can plant', () => {
    expect(isUnlocked('strawberries', 1)).toBe(true);
    expect(isUnlocked('pumpkin', 4)).toBe(false);
    expect(isUnlocked('pumpkin', 5)).toBe(true);
  });
});
