// What becomes available at each level: anything in the market whose unlock
// level matches, and any land expansion. Neighbors join this list in
// milestone 6, and the level-up banner picks them up with no changes of its
// own.

import { PRODUCT_KINDS, productInfo, productsOf, type Product } from './catalog';
import { EXPANSIONS } from './data/expansions';

export type Unlock = Product | { readonly kind: 'expansion'; readonly size: number };

const PRODUCTS: readonly Product[] = PRODUCT_KINDS.flatMap(productsOf);

// The starting farm isn't an unlock; every expansion after it is.
const LAND = EXPANSIONS.slice(1);

function levelOf(u: Unlock): number {
  return u.kind === 'expansion' ? (LAND.find((e) => e.size === u.size)?.level ?? Infinity) : productInfo(u).level;
}

const ALL: readonly Unlock[] = [...PRODUCTS, ...LAND.map((e): Unlock => ({ kind: 'expansion', size: e.size }))];

export function unlocksAt(level: number): Unlock[] {
  return ALL.filter((u) => levelOf(u) === level);
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
  const later = ALL.map(levelOf).filter((l) => l > level);
  return later.length > 0 ? Math.min(...later) : null;
}

export function isUnlocked(p: Product, level: number): boolean {
  return productInfo(p).level <= level;
}
