// The camera decides which part of the world is on screen and how big.
// It stores the world point at the center of the screen, and a zoom factor.
//
//   screen = (world - center) * zoom + viewport / 2
//
// Everything else here is that one line, rearranged.

import { screen, world, type ScreenPoint, type WorldPoint } from './iso';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;

export type Viewport = { readonly width: number; readonly height: number };

// The world rectangle the camera's center may move within, so the farm can't
// be dragged off screen and lost.
export type Bounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

export type Camera = {
  readonly center: WorldPoint;
  readonly zoom: number;
};

export function worldToScreen(cam: Camera, view: Viewport, w: WorldPoint): ScreenPoint {
  return screen(
    (w.x - cam.center.x) * cam.zoom + view.width / 2,
    (w.y - cam.center.y) * cam.zoom + view.height / 2,
  );
}

export function screenToWorld(cam: Camera, view: Viewport, s: ScreenPoint): WorldPoint {
  return world(
    (s.x - view.width / 2) / cam.zoom + cam.center.x,
    (s.y - view.height / 2) / cam.zoom + cam.center.y,
  );
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export function clampToBounds(cam: Camera, bounds: Bounds): Camera {
  return {
    zoom: cam.zoom,
    center: world(clamp(cam.center.x, bounds.minX, bounds.maxX), clamp(cam.center.y, bounds.minY, bounds.maxY)),
  };
}

// Moves the camera by a drag of (dx, dy) screen pixels. Dragging right moves
// the world right, so the center moves left. Dividing by zoom keeps the
// ground glued under the finger at any zoom level.
export function pan(cam: Camera, dx: number, dy: number): Camera {
  return {
    zoom: cam.zoom,
    center: world(cam.center.x - dx / cam.zoom, cam.center.y - dy / cam.zoom),
  };
}

// Zooms by `factor` while keeping the world point under `anchor` fixed on
// screen. This is what makes wheel and pinch zoom feel right: the spot under
// the cursor stays under the cursor instead of everything sliding toward the
// middle.
export function zoomAt(cam: Camera, view: Viewport, anchor: ScreenPoint, factor: number): Camera {
  const zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const before = screenToWorld(cam, view, anchor);
  // Solve screen = (before - center) * zoom + view / 2 for the new center.
  return {
    zoom,
    center: world(
      before.x - (anchor.x - view.width / 2) / zoom,
      before.y - (anchor.y - view.height / 2) / zoom,
    ),
  };
}
