// Turns raw pointer and wheel events into game gestures: pan, zoom, hover and
// tap. Mouse, touch and pen all arrive as pointer events, so one code path
// handles them.
//
// The rule that keeps tools from misfiring: a press only counts as a tap if
// the pointer moved less than DRAG_THRESHOLD pixels. Anything more is a pan.

import { screen, type ScreenPoint } from '../render/iso';

const DRAG_THRESHOLD = 6;

export type Gestures = {
  readonly pan: (dx: number, dy: number) => void;
  readonly zoom: (anchor: ScreenPoint, factor: number) => void;
  readonly hover: (at: ScreenPoint | null) => void;
  readonly tap: (at: ScreenPoint) => void;
};

type Press = { readonly start: ScreenPoint; last: ScreenPoint; dragging: boolean };

export function attachInput(canvas: HTMLCanvasElement, gestures: Gestures): () => void {
  const pointers = new Map<number, ScreenPoint>();
  let press: Press | null = null;
  let pinchDistance = 0;

  const local = (e: PointerEvent | WheelEvent): ScreenPoint => {
    const rect = canvas.getBoundingClientRect();
    return screen(e.clientX - rect.left, e.clientY - rect.top);
  };

  const pinchInfo = (): { mid: ScreenPoint; distance: number } | null => {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return null;
    return {
      mid: screen((a.x + b.x) / 2, (a.y + b.y) / 2),
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
  };

  const onDown = (e: PointerEvent): void => {
    canvas.setPointerCapture(e.pointerId);
    const at = local(e);
    pointers.set(e.pointerId, at);
    if (pointers.size === 1) {
      press = { start: at, last: at, dragging: false };
    } else {
      // A second finger turns the gesture into a pinch, never a tap.
      press = null;
      pinchDistance = pinchInfo()?.distance ?? 0;
    }
  };

  const onMove = (e: PointerEvent): void => {
    const at = local(e);
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse') gestures.hover(at);
      return;
    }
    const before = pinchInfo();
    pointers.set(e.pointerId, at);

    if (pointers.size >= 2) {
      const after = pinchInfo();
      if (!before || !after || pinchDistance === 0) return;
      gestures.pan(after.mid.x - before.mid.x, after.mid.y - before.mid.y);
      gestures.zoom(after.mid, after.distance / pinchDistance);
      pinchDistance = after.distance;
      return;
    }

    if (!press) return;
    if (!press.dragging && Math.hypot(at.x - press.start.x, at.y - press.start.y) > DRAG_THRESHOLD) {
      press.dragging = true;
    }
    if (press.dragging) gestures.pan(at.x - press.last.x, at.y - press.last.y);
    press.last = at;
    if (e.pointerType === 'mouse') gestures.hover(at);
  };

  const onUp = (e: PointerEvent): void => {
    if (!pointers.delete(e.pointerId)) return;
    if (press && !press.dragging && pointers.size === 0) gestures.tap(local(e));
    if (pointers.size === 0) press = null;
  };

  const onCancel = (e: PointerEvent): void => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) press = null;
  };

  const onLeave = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && pointers.size === 0) gestures.hover(null);
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    // Line-based wheels (some mice) report in lines, not pixels.
    const pixels = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY;
    // A trackpad pinch arrives as a wheel event with ctrlKey set and small
    // deltas, so it gets a stronger multiplier.
    const sensitivity = e.ctrlKey ? 0.01 : 0.0015;
    gestures.zoom(local(e), Math.exp(-pixels * sensitivity));
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('wheel', onWheel);
  };
}
