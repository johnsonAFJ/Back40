// The exact half of clicking on things (see hit.ts): is the pixel under the
// pointer really part of this object's drawing?
//
// It draws the one object onto a one-pixel canvas, positioned so the point
// being tested lands on that pixel, then reads how opaque the pixel came out.
// That works for any shape: a thin scarecrow, a tree's gappy canopy, a
// walking chicken, and real art when it arrives. Shadows are drawn faint, so
// they fall under the threshold and don't count.

import { animalPose, STILL } from './animalMotion';
import { animalSlots } from './animalSlots';
import { drawFarmObject } from './draw/objects';
import type { WorldPoint } from './iso';
import { linker } from './renderer';
import type { FarmObject, FarmState } from '../core/state';

// Out of 255. Shadows are about 70, drawing edges well above this.
const SOLID = 120;

const canvas = document.createElement('canvas');
canvas.width = 1;
canvas.height = 1;
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// A test for objects on `farm` at point `p`, drawn exactly as the renderer
// draws them at farm time `now` and with animals at motion time `motion`.
export function pixelTest(farm: FarmState, p: WorldPoint, now: number, motion: number | null): (obj: FarmObject) => boolean {
  const slots = animalSlots(farm.objects);
  const linksAt = linker(farm.objects);
  return (obj) => {
    if (!ctx) return true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 1, 1);
    // World point p lands in the middle of the single pixel.
    ctx.setTransform(1, 0, 0, 1, 0.5 - p.x, 0.5 - p.y);
    const slot = slots.get(obj.id);
    const pose = slot && motion !== null ? animalPose(obj.id, slot, motion) : STILL;
    const links = linksAt(obj);
    drawFarmObject(ctx, obj, now, links, slot, pose);
    return (ctx.getImageData(0, 0, 1, 1).data[3] ?? 0) >= SOLID;
  };
}
