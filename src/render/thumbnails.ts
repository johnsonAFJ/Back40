// Small pictures of market products for the market, the level-up banner and
// the planting button, drawn with the same code as the farm so they always
// match it. Each is drawn once and cached as an image URL.

import { productInfo, type Product } from '../core/catalog';
import type { ProduceId } from '../core/data/produce';
import { TILE_HEIGHT, TILE_WIDTH } from './iso';
import { drawCrop, drawSoil } from './draw/crops';
import { drawFlatDecoration, isFlat } from './draw/items';
import { drawProduct } from './draw/objects';
import { drawProduceIcon } from './draw/produce';

const SIZE = 96;
const cache = new Map<string, string>();

export function productThumbnail(p: Product): string {
  const key = `${p.kind}:${p.id}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const pixelRatio = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * pixelRatio;
  canvas.height = SIZE * pixelRatio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // A footprint w tiles wide and d deep spans (w + d) half-tiles across.
  // Scale it to fill the thumbnail's width, sit it near the bottom, and
  // leave headroom above for whatever stands on it.
  const { width, depth } = productInfo(p);
  const spanX = ((width + depth) * TILE_WIDTH) / 2;
  const spanY = ((width + depth) * TILE_HEIGHT) / 2;
  const scale = Math.min((SIZE * 0.86) / spanX, 1.6);
  // Center the footprint horizontally: its middle sits at world x of
  // (width - depth) * TILE_WIDTH / 4.
  const midX = ((width - depth) * TILE_WIDTH) / 4;
  ctx.setTransform(
    scale * pixelRatio,
    0,
    0,
    scale * pixelRatio,
    (SIZE / 2 - midX * scale) * pixelRatio,
    (SIZE - spanY * scale - 6) * pixelRatio,
  );

  if (p.kind === 'crop') {
    drawSoil(ctx, 0, 0, 'plowed');
    drawCrop(ctx, 0, 0, p.id, 'ready');
  } else if (p.kind === 'decoration' && isFlat(p.id)) {
    drawFlatDecoration(ctx, p.id, 0, 0);
  } else {
    drawProduct(ctx, p, 0, 0, width, depth);
  }

  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

const produceCache = new Map<ProduceId, string>();

// An icon for basket produce, 48 pixels square.
export function produceThumbnail(id: ProduceId): string {
  const cached = produceCache.get(id);
  if (cached) return cached;
  const size = 48;
  const pixelRatio = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, (size / 2) * pixelRatio, (size / 2) * pixelRatio);
  drawProduceIcon(ctx, id);
  const url = canvas.toDataURL('image/png');
  produceCache.set(id, url);
  return url;
}
