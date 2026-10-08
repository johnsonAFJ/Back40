// Small pictures of ripe crops for the market and the level-up banner, drawn
// with the same code as the farm so they always match it. Each is drawn once
// and cached as an image URL.

import type { CropId } from '../core/data/crops';
import { TILE_HEIGHT, TILE_WIDTH } from './iso';
import { drawCrop, drawSoil } from './draw/crops';

const SIZE = 96;
const cache = new Map<CropId, string>();

export function cropThumbnail(cropId: CropId): string {
  const cached = cache.get(cropId);
  if (cached) return cached;

  const pixelRatio = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * pixelRatio;
  canvas.height = SIZE * pixelRatio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Tile (0, 0) spans x from -32 to 32 and y from 0 to 32 in world space.
  // Scale it to fill the thumbnail's width and leave headroom above for the
  // plants.
  const scale = (SIZE * 0.92) / TILE_WIDTH;
  ctx.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, (SIZE / 2) * pixelRatio, (SIZE - TILE_HEIGHT * scale - 6) * pixelRatio);
  drawSoil(ctx, 0, 0, 'plowed');
  drawCrop(ctx, 0, 0, cropId, 'ready');

  const url = canvas.toDataURL('image/png');
  cache.set(cropId, url);
  return url;
}
