// Clicking on things that stand up off the ground.
//
// pickTile finds the ground tile under a point, but a tree's leaves or a
// barn's roof are drawn above the tiles *behind* them. Clicking a tree's
// canopy should pick the tree, not plow the grass behind it. So objects get
// tested first, nearest to the viewer first, against their outline on
// screen: the footprint's diamond swept upward by the object's height.

import { footprint, type FarmObject, type FarmState } from '../core/state';
import { footprintCorners, lift } from './draw/shapes';
import type { WorldPoint } from './iso';

// Roughly how tall each thing is drawn, in world pixels. This belongs with
// the art: when real images arrive, it comes from the image sizes instead.
function height(obj: FarmObject): number {
  switch (obj.kind) {
    case 'plot':
      return obj.state === 'planted' ? 14 : 0;
    case 'building':
      return 80;
    case 'tree':
      return 46;
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

export function objectAtPoint(farm: FarmState, p: WorldPoint): FarmObject | null {
  const tall = farm.objects
    .filter((o) => height(o) > 0)
    .map((o) => ({ o, ...footprint(o) }))
    // Nearest first, the reverse of drawing order.
    .sort((a, b) => b.o.x + b.width / 2 + b.o.y + b.depth / 2 - (a.o.x + a.width / 2 + a.o.y + a.depth / 2));
  for (const { o, width, depth } of tall) {
    const [top, right, bottom, left] = footprintCorners({ x: o.x, y: o.y, width, depth }, 0.1);
    const h = height(o);
    if (inside(p, [left, lift(left, h), lift(top, h), lift(right, h), right, bottom])) return o;
  }
  return null;
}
