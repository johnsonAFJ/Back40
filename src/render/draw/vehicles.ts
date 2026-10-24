// Code-drawn vehicles, parked on their tile off the farm. Real art
// (`vehicle-<id>.png`, see ART_BRIEF.md) replaces the drawing when it exists.

import { VEHICLES, type VehicleId } from '../../core/data/vehicles';
import { drawArtScaled, GROUND_SCALE, hasArt } from '../art';
import { tile, tileCenter, tileToWorld, type WorldPoint } from '../iso';
import { drawBox, ellipse, line, lift, SHADOW } from './shapes';

const RED = { top: '#e0483a', left: '#b8342a', right: '#9a2a22' };
const TYRE = '#2e2a26';
const HUB = '#f2c230';

function wheel(ctx: CanvasRenderingContext2D, at: WorldPoint, r: number): void {
  ellipse(ctx, at.x, at.y - r, r * 0.8, r, TYRE);
  ellipse(ctx, at.x, at.y - r, r * 0.35, r * 0.45, HUB);
}

// The tractor faces down and to the right, along x, with big wheels at the
// back and small ones at the front.
function drawTractor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const at = (u: number, v: number): WorldPoint => tileToWorld(tile(x + u, y + v));
  // Far side first, then the body, then the near side over it.
  wheel(ctx, at(0.3, 0.2), 11);
  wheel(ctx, at(0.82, 0.25), 6);
  // The hood, low and long, then the cab behind it, taller.
  drawBox(ctx, { x: x + 0.45, y: y + 0.3, width: 0.45, depth: 0.4 }, 0, 12, RED);
  drawBox(ctx, { x: x + 0.12, y: y + 0.28, width: 0.36, depth: 0.44 }, 0, 18, RED);
  // The seat, and the exhaust pipe on the hood.
  const seat = lift(at(0.3, 0.5), 18);
  ellipse(ctx, seat.x, seat.y - 2, 5, 3, '#3a2e26');
  const pipe = lift(at(0.72, 0.42), 12);
  line(ctx, pipe, lift(pipe, 11), '#5a5550', 2.5);
  wheel(ctx, at(0.3, 0.8), 11);
  wheel(ctx, at(0.82, 0.75), 6);
}

export function drawVehicle(ctx: CanvasRenderingContext2D, id: VehicleId, x: number, y: number): void {
  const c = tileCenter(tile(x, y));
  const art = `vehicle-${id}`;
  if (hasArt(art)) {
    // The art stands on its lowest point, the front wheel; the shadow goes
    // under the middle of the whole tractor, a little further back.
    ellipse(ctx, c.x - 2, c.y - 7, 36, 14, SHADOW);
    drawArtScaled(ctx, art, 0, c.x, c.y, GROUND_SCALE);
    return;
  }
  ellipse(ctx, c.x + 3, c.y + 2, 24, 10, SHADOW);
  switch (id) {
    case 'tractor':
      drawTractor(ctx, x, y);
      return;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

// Whether world point `p` is on a parked vehicle, for tapping it: a box
// around the drawing, never smaller than a fingertip (48 screen pixels) at
// the camera's `zoom`, so it's easy to hit zoomed out on a phone.
export function vehicleAt(ids: readonly VehicleId[], p: WorldPoint, zoom: number): VehicleId | null {
  const finger = 24 / zoom;
  for (const id of ids) {
    const { x, y } = VEHICLES[id].parking;
    const c = tileCenter(tile(x, y));
    // From the wheels up to the top of the art, about 64 world pixels.
    const middle = c.y - 28;
    if (Math.abs(p.x - c.x) <= Math.max(40, finger) && Math.abs(p.y - middle) <= Math.max(36, finger)) return id;
  }
  return null;
}
