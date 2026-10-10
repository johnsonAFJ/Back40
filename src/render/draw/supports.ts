// Code-drawn supports: the trellis that climbing crops grow on.
//
// A trellis joins up with the trellises beside it, the way a fence does, and
// runs along its row: a block of them becomes parallel rows, like a
// vineyard (renderer.ts `linker` decides which sides join). It runs along x
// unless it only joins along y. Its posts stand on the middle of the plot's
// edges, so two trellises in a row share a post and their rails meet. At the
// corner of an L, an arm reaches from the middle to the side that turns.

import type { SupportId } from '../../core/data/supports';
import { tile, tileToWorld, type WorldPoint } from '../iso';
import type { Links } from './items';
import { lift, line } from './shapes';

const WOOD = '#9a6b3c';
const WOOD_DARK = '#6e4a28';
const HEIGHT = 34;

export type Run = 'x' | 'y';

export function trellisRun(links: Links): Run {
  return !links.east && !links.west && (links.north || links.south) ? 'y' : 'x';
}

function post(ctx: CanvasRenderingContext2D, at: WorldPoint): void {
  line(ctx, at, lift(at, HEIGHT), WOOD_DARK, 4);
  line(ctx, at, lift(at, HEIGHT), WOOD, 2.5);
}

function rails(ctx: CanvasRenderingContext2D, a: WorldPoint, b: WorldPoint): void {
  for (const h of [HEIGHT * 0.45, HEIGHT * 0.85]) {
    line(ctx, lift(a, h), lift(b, h), WOOD_DARK, 2.5);
    line(ctx, lift(a, h), lift(b, h), WOOD, 1.5);
  }
}

export function drawSupport(ctx: CanvasRenderingContext2D, id: SupportId, x: number, y: number, links: Links): void {
  switch (id) {
    case 'trellis': {
      const run = trellisRun(links);
      const [a, b] =
        run === 'x'
          ? [tileToWorld(tile(x, y + 0.5)), tileToWorld(tile(x + 1, y + 0.5))]
          : [tileToWorld(tile(x + 0.5, y)), tileToWorld(tile(x + 0.5, y + 1))];
      // Arms toward neighbors joined across the run, at the corner of an L.
      const middle = tileToWorld(tile(x + 0.5, y + 0.5));
      const arms: WorldPoint[] = [];
      if (run === 'x' && links.north) arms.push(tileToWorld(tile(x + 0.5, y)));
      if (run === 'x' && links.south) arms.push(tileToWorld(tile(x + 0.5, y + 1)));
      rails(ctx, a, b);
      for (const arm of arms) rails(ctx, middle, arm);
      for (const p of [a, b, ...arms]) post(ctx, p);
      if (arms.length > 0) post(ctx, middle);
      return;
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
