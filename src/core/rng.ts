// Seeded randomness. The same inputs always give the same number, which is
// what makes a random roll a fact: reloading the game asks the same question
// and gets the same answer, so there is nothing to re-roll.

// A stable number in [0, 1) from any list of integers.
export function random01(...parts: readonly number[]): number {
  let h = 0x9e3779b9;
  for (const part of parts) {
    // Split each part into two 32-bit halves so large values like
    // timestamps contribute all their bits.
    const lo = part | 0;
    const hi = Math.floor(part / 4294967296) | 0;
    h = Math.imul(h ^ lo, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h = Math.imul(h ^ hi, 0x27d4eb2f);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
