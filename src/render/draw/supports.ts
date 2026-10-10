// Code-drawn supports: the trellis that climbing crops grow on. It stands
// across the middle of its plot from the left corner to the right, so it
// looks the same when crop art is mirrored and a row of trellises lines up.

import type { SupportId } from '../../core/data/supports';
import { tile, tileToWorld } from '../iso';
import { lift, line } from './shapes';

const WOOD = '#9a6b3c';
const WOOD_DARK = '#6e4a28';
const HEIGHT = 34;

export function drawSupport(ctx: CanvasRenderingContext2D, id: SupportId, x: number, y: number): void {
  switch (id) {
    case 'trellis': {
      // Posts a little in from the plot's left and right corners.
      const left = tileToWorld(tile(x + 0.16, y + 0.84));
      const right = tileToWorld(tile(x + 0.84, y + 0.16));
      for (const h of [HEIGHT * 0.45, HEIGHT * 0.85]) {
        line(ctx, lift(left, h), lift(right, h), WOOD_DARK, 2.5);
        line(ctx, lift(left, h), lift(right, h), WOOD, 1.5);
      }
      for (const post of [left, right]) {
        line(ctx, post, lift(post, HEIGHT), WOOD_DARK, 4);
        line(ctx, post, lift(post, HEIGHT), WOOD, 2.5);
      }
      return;
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
