// What becomes available at each level: anything in the market whose unlock
// level matches. Expansions and neighbors join this list in later
// milestones, and the level-up banner picks them up with no changes of its
// own.

import { PRODUCT_KINDS, productInfo, productsOf, type Product } from './catalog';

export type Unlock = Product;

const ALL: readonly Product[] = PRODUCT_KINDS.flatMap(productsOf);

export function unlocksAt(level: number): Unlock[] {
  return ALL.filter((p) => productInfo(p).level === level);
}

// Everything unlocked by going from `from` to `to`, for the rare harvest
// that jumps two levels at once.
export function unlocksBetween(from: number, to: number): Unlock[] {
  const all: Unlock[] = [];
  for (let level = from + 1; level <= to; level++) all.push(...unlocksAt(level));
  return all;
}

// The next level above `level` that unlocks anything, or null when there's
// nothing left to unlock.
export function nextUnlockLevel(level: number): number | null {
  const later = ALL.map((p) => productInfo(p).level).filter((l) => l > level);
  return later.length > 0 ? Math.min(...later) : null;
}

export function isUnlocked(p: Product, level: number): boolean {
  return productInfo(p).level <= level;
}
