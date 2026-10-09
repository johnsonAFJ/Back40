import { describe, expect, it } from 'vitest';
import { animalPose } from '../src/render/animalMotion';

const ALONE = { u: 0.5, v: 0.5 };
const CORNER = { u: 0.3, v: 0.3 };

describe('animal motion', () => {
  it('keeps an animal near its spot: the run of its square alone, its corner when sharing', () => {
    for (let s = 0; s < 600; s += 0.37) {
      const alone = animalPose('o12', ALONE, s);
      expect(Math.hypot(alone.du, alone.dv)).toBeLessThanOrEqual(0.22 + 1e-9);
      const shared = animalPose('o13', CORNER, s);
      expect(Math.hypot(shared.du, shared.dv)).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });

  it('is the same every time for the same animal and moment', () => {
    expect(animalPose('o7', ALONE, 1234.5)).toEqual(animalPose('o7', ALONE, 1234.5));
  });

  it('moves differently for different animals', () => {
    const a = animalPose('o7', ALONE, 1000);
    const b = animalPose('o8', ALONE, 1000);
    expect(a.du === b.du && a.dv === b.dv).toBe(false);
  });

  it('actually goes somewhere over a minute, and sometimes pecks', () => {
    const poses = Array.from({ length: 600 }, (_, i) => animalPose('o9', ALONE, i / 10));
    const spread = Math.max(...poses.map((p) => p.du)) - Math.min(...poses.map((p) => p.du));
    expect(spread).toBeGreaterThan(0.1);
    expect(poses.some((p) => p.acting)).toBe(true);
    expect(poses.some((p) => p.facing === -1) && poses.some((p) => p.facing === 1)).toBe(true);
  });
});
