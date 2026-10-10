// Clicking on things that stand up off the ground.
//
// pickTile finds the ground tile under a point, but a tree's leaves or a
// barn's roof are drawn above the tiles *behind* them. Clicking a tree's
// canopy should pick the tree, not plow the grass behind it. So objects get
// tested first, nearest to the viewer first, in two steps:
//
//   1. A quick box: the footprint's diamond swept upward by the object's
//      height. Cheap, but much wider than a thin thing like a scarecrow.
//   2. An exact check, `confirm`, which asks whether the pixel under the
//      pointer is really part of the object's drawing (see pick.ts). A
//      click in the empty space beside the scarecrow's post fails it and
//      falls through to whatever is behind.
//
// Tests leave `confirm` out, since there's no canvas to draw on there, and
// get the box alone.

import { footprint, type FarmObject, type FarmState } from '../core/state';
import { animalSlots } from './animalSlots';
import { hasArt } from './art';
import { footprintCorners, lift } from './draw/shapes';
import type { WorldPoint } from './iso';

// Roughly how tall each thing is drawn, in world pixels. This belongs with
// the art: when real images arrive, it comes from the image sizes instead.
function height(obj: FarmObject): number {
  switch (obj.kind) {
    case 'plot':
      // Crops are drawn oversized, up to the height of a 192-pixel art cell.
      // A trellis stands up off its plot even with nothing growing.
      return obj.state === 'planted' ? 64 : obj.support !== null ? 36 : 0;
    case 'building':
      return 80;
    case 'tree':
      // Real tree art is drawn up to 256 art pixels tall (ART_BRIEF.md).
      return hasArt(`tree-${obj.typeId}`) ? 120 : 46;
    case 'animal':
      return 34;
    case 'decoration':
      switch (obj.typeId) {
        case 'dirtPath':
          return 0;
        case 'shed':
          return 54;
        case 'redBarn':
          return 94;
        case 'scarecrow':
          return 40;
        case 'waterPump':
          return 28;
        default:
          return 18;
      }
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

// How far a thing's box is pulled in from its square's edges; negative
// pushes it out. Crops spill past their plot's corners and a big tree's
// canopy past its square; everything else stays inside.
function inset(obj: FarmObject): number {
  if (obj.kind === 'plot') return -0.25;
  if (obj.kind === 'tree' && hasArt(`tree-${obj.typeId}`)) return -0.4;
  return 0.1;
}

function inside(p: WorldPoint, polygon: readonly WorldPoint[]): boolean {
  // Ray casting: count how many edges a ray going right from p crosses.
  let crossings = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) crossings++;
  }
  return crossings % 2 === 1;
}

export function objectAtPoint(
  farm: FarmState,
  p: WorldPoint,
  confirm?: (obj: FarmObject) => boolean,
): FarmObject | null {
  const slots = animalSlots(farm.objects);
  const tall = farm.objects
    .filter((o) => height(o) > 0)
    .map((o) => {
      // An animal sharing a square is tested around its own spot, a
      // quarter-size box, so each one in a crowded pen can be picked.
      const slot = slots.get(o.id);
      const shared = slot && (slot.u !== 0.5 || slot.v !== 0.5);
      const box = shared
        ? { x: o.x + slot.u - 0.25, y: o.y + slot.v - 0.25, width: 0.5, depth: 0.5, inset: 0 }
        : { x: o.x, y: o.y, ...footprint(o), inset: inset(o) };
      return { o, box };
    })
    // Nearest first, the reverse of drawing order.
    .sort((a, b) => b.box.x + b.box.width / 2 + b.box.y + b.box.depth / 2 - (a.box.x + a.box.width / 2 + a.box.y + a.box.depth / 2));
  for (const { o, box } of tall) {
    const [top, right, bottom, left] = footprintCorners(box, box.inset);
    const h = height(o);
    if (inside(p, [left, lift(left, h), lift(top, h), lift(right, h), right, bottom]) && (!confirm || confirm(o))) return o;
  }
  return null;
}
