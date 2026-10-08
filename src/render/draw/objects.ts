// Draws any farm object, or a market product standing on a tile. The
// renderer, the placement preview and the market thumbnails all draw through
// here, so they always agree.

import type { Placeable } from '../../core/catalog';
import { stage } from '../../core/growth';
import { isProducerReady } from '../../core/producers';
import { footprint, type FarmObject } from '../../core/state';
import { drawBuilding } from './buildings';
import { drawCrop } from './crops';
import { drawAnimal, drawDecoration, drawFruitTree, NO_LINKS, type Links } from './items';

export function drawFarmObject(ctx: CanvasRenderingContext2D, obj: FarmObject, now: number, links: Links): void {
  switch (obj.kind) {
    case 'plot':
      if (obj.state === 'planted') drawCrop(ctx, obj.x, obj.y, obj.cropId, stage(obj, now));
      return;
    case 'building':
      drawBuilding(ctx, obj.typeId, { x: obj.x, y: obj.y, ...footprint(obj) });
      return;
    case 'tree':
      drawFruitTree(ctx, obj.x, obj.y, obj.typeId, isProducerReady(obj, now));
      return;
    case 'animal':
      drawAnimal(ctx, obj.x, obj.y, obj.typeId, isProducerReady(obj, now));
      return;
    case 'decoration':
      drawDecoration(ctx, obj.typeId, { x: obj.x, y: obj.y, ...footprint(obj) }, links);
      return;
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

// A product as it looks when bought: trees show fruit and animals show
// what they give, so the market picture shows what you're paying for.
export function drawProduct(ctx: CanvasRenderingContext2D, p: Placeable, x: number, y: number, width: number, depth: number): void {
  switch (p.kind) {
    case 'tree':
      drawFruitTree(ctx, x, y, p.id, true);
      return;
    case 'animal':
      drawAnimal(ctx, x, y, p.id, true);
      return;
    case 'decoration':
      drawDecoration(ctx, p.id, { x, y, width, depth }, NO_LINKS);
      return;
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
}
