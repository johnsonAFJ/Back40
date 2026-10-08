// What becomes available at each level. Crops for now; trees, animals,
// decorations, expansions and neighbors join this list in later milestones,
// and the level-up banner picks them up with no changes of its own.

import { CROPS, CROP_IDS, type CropId } from './data/crops';

export type Unlock = { readonly kind: 'crop'; readonly id: CropId };

export function unlocksAt(level: number): Unlock[] {
  return CROP_IDS.filter((id) => CROPS[id].level === level).map((id) => ({ kind: 'crop', id }));
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
  const later = CROP_IDS.map((id) => CROPS[id].level).filter((l) => l > level);
  return later.length > 0 ? Math.min(...later) : null;
}

export function isUnlocked(cropId: CropId, level: number): boolean {
  return CROPS[cropId].level <= level;
}
