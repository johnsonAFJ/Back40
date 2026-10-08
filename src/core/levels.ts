// Level is derived from total XP and never stored. Going from level L to
// L + 1 costs 20L - 5 XP: 15, 35, 55, ... See SPEC.md "Levels".

const STEP = 20;
const OFFSET = 5;

export function xpToNextLevel(level: number): number {
  return STEP * level - OFFSET;
}

// Total XP needed to reach `level`: the sum of every step before it, which
// works out to (level - 1)(10 level - 5).
export function totalXpForLevel(level: number): number {
  return (level - 1) * ((STEP / 2) * level - OFFSET);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level++;
  return level;
}

export type LevelProgress = {
  readonly level: number;
  readonly intoLevel: number;
  readonly levelSize: number;
};

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  return { level, intoLevel: xp - totalXpForLevel(level), levelSize: xpToNextLevel(level) };
}
