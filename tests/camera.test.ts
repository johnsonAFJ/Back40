import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampToBounds,
  pan,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Camera,
} from '../src/render/camera';
import { screen, world } from '../src/render/iso';

const view = { width: 800, height: 600 };
const cam: Camera = { center: world(100, 50), zoom: 1.5 };

describe('worldToScreen and screenToWorld', () => {
  it('put the camera center in the middle of the screen', () => {
    expect(worldToScreen(cam, view, cam.center)).toMatchObject({ x: 400, y: 300 });
  });

  it('are inverses', () => {
    const s = screen(123, 456);
    const back = worldToScreen(cam, view, screenToWorld(cam, view, s));
    expect(back.x).toBeCloseTo(s.x);
    expect(back.y).toBeCloseTo(s.y);
  });
});

describe('pan', () => {
  it('keeps the ground under the pointer at any zoom', () => {
    const grabbed = screenToWorld(cam, view, screen(200, 200));
    const moved = pan(cam, 30, -40);
    const after = worldToScreen(moved, view, grabbed);
    expect(after.x).toBeCloseTo(230);
    expect(after.y).toBeCloseTo(160);
  });
});

describe('zoomAt', () => {
  it('keeps the world point under the anchor in place', () => {
    const anchor = screen(650, 120);
    const under = screenToWorld(cam, view, anchor);
    const zoomed = zoomAt(cam, view, anchor, 1.3);
    const after = worldToScreen(zoomed, view, under);
    expect(zoomed.zoom).toBeCloseTo(1.95);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
  });

  it('stays within the zoom limits', () => {
    expect(zoomAt(cam, view, screen(0, 0), 100).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(cam, view, screen(0, 0), 0.001).zoom).toBe(MIN_ZOOM);
  });

  it('still keeps the anchor fixed when the limit cuts the zoom short', () => {
    const anchor = screen(10, 590);
    const under = screenToWorld(cam, view, anchor);
    const after = worldToScreen(zoomAt(cam, view, anchor, 100), view, under);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
  });
});

describe('clampToBounds', () => {
  it('pulls the center back inside the bounds', () => {
    const bounds = { minX: -10, maxX: 10, minY: 0, maxY: 20 };
    const clamped = clampToBounds({ center: world(50, -5), zoom: 1 }, bounds);
    expect(clamped.center).toMatchObject({ x: 10, y: 0 });
  });
});
