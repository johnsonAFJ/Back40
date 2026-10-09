// How an animal moves around its spot. Nothing about it is stored: the
// position at any moment is worked out from the time and the animal's id,
// the same way withering and neighbor visits come from seeded randomness. A
// reload, or another device, shows the same chicken doing the same thing.
//
// Each animal lives in a loop of short beats. In each beat it walks to a new
// point near its spot, then stands for a while, and sometimes does its idle
// action (the chicken pecks, the cow grazes). This only moves the drawing;
// the save still says which square the animal is on.

import { random01 } from '../core/rng';
import type { Slot } from './animalSlots';

export type Pose = {
  // Offset from the animal's spot, in tile fractions.
  readonly du: number;
  readonly dv: number;
  // 1 faces left (the way the art is drawn), -1 faces right.
  readonly facing: 1 | -1;
  // How far the body lifts off the ground mid-step, in pixels.
  readonly bob: number;
  // True while pecking or grazing.
  readonly acting: boolean;
  // Which picture of a sprite sheet to show: 0 standing, 1 to 4 walking,
  // 5 and 6 the idle action. See ART_BRIEF.md.
  readonly frame: number;
  // True while walking away from the viewer (up the screen), for sheets
  // that have a back view.
  readonly away: boolean;
};

export const STILL: Pose = { du: 0, dv: 0, facing: 1, bob: 0, acting: false, frame: 0, away: false };

const BEAT = 4.5; // seconds per walk-and-pause
const WALK = 1.4; // seconds of each beat spent walking

// A stable number from an id like "o23", for seeding.
function idNumber(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

// How far from its spot an animal may wander: an animal alone has the run
// of its square; one sharing stays in its own corner.
function reach(slot: Slot): number {
  return slot.u === 0.5 && slot.v === 0.5 ? 0.22 : 0.1;
}

// Where the animal is headed in beat `k`: a point within its reach.
function target(seed: number, k: number, r: number): { du: number; dv: number } {
  const angle = random01(seed, k, 1) * Math.PI * 2;
  const dist = r * Math.sqrt(random01(seed, k, 2));
  return { du: Math.cos(angle) * dist, dv: Math.sin(angle) * dist };
}

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function animalPose(id: string, slot: Slot, seconds: number): Pose {
  const seed = idNumber(id);
  // Each animal starts its loop at a different point, so a pen of chickens
  // doesn't step in unison.
  const t = seconds + random01(seed, 0) * BEAT;
  const k = Math.floor(t / BEAT);
  const into = t - k * BEAT;
  const r = reach(slot);
  const from = target(seed, k - 1, r);
  const to = target(seed, k, r);

  // On screen, moving +u goes right and +v goes left, so screen x follows
  // du - dv. Face the way this beat's walk goes.
  const screenDx = to.du - to.dv - (from.du - from.dv);
  const facing: 1 | -1 = screenDx > 0 ? -1 : 1;
  // Screen y follows du + dv; walking up the screen is walking away.
  const away = to.du + to.dv < from.du + from.dv;

  if (into < WALK) {
    const p = ease(into / WALK);
    return {
      du: from.du + (to.du - from.du) * p,
      dv: from.dv + (to.dv - from.dv) * p,
      facing,
      bob: Math.abs(Math.sin((into / WALK) * Math.PI * 4)) * 1.5,
      acting: false,
      // Two full walk cycles per walk.
      frame: 1 + (Math.floor((into / WALK) * 8) % 4),
      away,
    };
  }
  // Standing. About half the beats include a peck or a nibble of grass.
  const acts = random01(seed, k, 3) < 0.55;
  const acting = acts && into > WALK + 0.8 && into < WALK + 2.2;
  const frame = acting ? 5 + (Math.floor(into / 0.35) % 2) : 0;
  return { du: to.du, dv: to.dv, facing, bob: 0, acting, frame, away };
}
