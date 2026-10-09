// Draws Back40's app icons with the game's own code-drawn art: a little farm
// (farmhouse, a few crops) on a green background. Open
// http://localhost:8442/Back40/tools/icons.html, then save each canvas as
// public/icons/<name>.png. window.icons holds their data URLs.
//
// Redraw these whenever the art changes enough to matter.

import { drawBuilding } from '../src/render/draw/buildings';
import { drawCrop, drawSoil } from '../src/render/draw/crops';
import { farmPath } from '../src/render/draw/ground';

// [file, size, how much of the canvas the farm fills]. Maskable icons get
// cut to a circle by some launchers, so their farm sits further in.
const ICONS: ReadonlyArray<readonly [string, number, number]> = [
  ['icon-180', 180, 0.86],
  ['icon-192', 192, 0.86],
  ['icon-512', 512, 0.86],
  ['icon-maskable-512', 512, 0.62],
];

const out: Record<string, string> = {};

for (const [name, size, fill] of ICONS) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.title = name;
  const ctx = canvas.getContext('2d');
  if (!ctx) continue;

  // Sky fading into a meadow.
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#9fd3e8');
  bg.addColorStop(0.55, '#c8e6a0');
  bg.addColorStop(1, '#6fb04a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // A 4 x 4 farm, scaled so its diamond spans `fill` of the width. In world
  // space it runs from x -128 to 128 and y 0 to 128, plus the house above.
  const farm = 4;
  const scale = (size * fill) / (farm * 64);
  ctx.setTransform(scale, 0, 0, scale, size / 2, size * 0.5 - (farm * 32 * scale) / 2 + size * 0.08);

  ctx.fillStyle = '#8bc34a';
  farmPath(ctx, farm);
  ctx.fill();
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 3;
  ctx.stroke();

  for (const [x, y] of [[2, 3], [3, 3], [3, 2]] as const) {
    drawSoil(ctx, x, y, 'plowed');
  }
  drawBuilding(ctx, 'farmhouse', { x: 0, y: 0, width: 2, depth: 2 });
  for (const [x, y, crop] of [[2, 3, 'pumpkin'], [3, 2, 'wheat'], [3, 3, 'strawberries']] as const) {
    drawCrop(ctx, x, y, crop, 'ready');
  }

  document.body.append(canvas);
  out[name] = canvas.toDataURL('image/png');
}

Object.assign(window, { icons: out });
