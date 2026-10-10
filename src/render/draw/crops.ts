// Code-drawn plots and crops. Every crop is one of a handful of plant styles
// in its own colors; the art pass in milestone 7 replaces these with images.

import type { CropId } from '../../core/data/crops';
import type { Stage } from '../../core/growth';
import { random01 } from '../../core/rng';
import { tile, tileToWorld, type WorldPoint } from '../iso';
import { tileNoise } from './ground';
import { drawArtScaled, GROUND_SCALE } from '../art';
import { footprintCorners, polygon } from './shapes';

type Style = 'berry' | 'grain' | 'leafy' | 'vine' | 'flower' | 'stalk';
type CropArt = { readonly style: Style; readonly leaf: string; readonly fruit: string };

const GREEN = '#4f9a2f';
const DARK_GREEN = '#3c7d24';

// A Record over every CropId, so adding a crop to the data without art here
// is a compile error.
const ART: Record<CropId, CropArt> = {
  strawberries: { style: 'berry', leaf: GREEN, fruit: '#e0352b' },
  wheat: { style: 'grain', leaf: '#9cbf3c', fruit: '#e8c25a' },
  soybeans: { style: 'leafy', leaf: '#6aa632', fruit: '#c9d77a' },
  peanuts: { style: 'leafy', leaf: GREEN, fruit: '#c79a5b' },
  eggplant: { style: 'leafy', leaf: DARK_GREEN, fruit: '#5b2a6e' },
  lilac: { style: 'flower', leaf: GREEN, fruit: '#b48ad8' },
  squash: { style: 'vine', leaf: GREEN, fruit: '#f2b632' },
  pumpkin: { style: 'vine', leaf: GREEN, fruit: '#f07f1d' },
  spinach: { style: 'leafy', leaf: '#2f8a2a', fruit: '#2f8a2a' },
  artichokes: { style: 'leafy', leaf: '#6f9a6a', fruit: '#7aa36f' },
  rice: { style: 'grain', leaf: '#7fbf4a', fruit: '#e9dda0' },
  raspberries: { style: 'berry', leaf: GREEN, fruit: '#c8204f' },
  daffodils: { style: 'flower', leaf: GREEN, fruit: '#f7d82b' },
  cotton: { style: 'stalk', leaf: '#5d8f36', fruit: '#fbfbf5' },
  cranberries: { style: 'berry', leaf: DARK_GREEN, fruit: '#a3122d' },
  chickpeas: { style: 'leafy', leaf: '#7aa642', fruit: '#e3c98f' },
  bellPeppers: { style: 'leafy', leaf: DARK_GREEN, fruit: '#3fa33a' },
  rhubarb: { style: 'stalk', leaf: '#4d9a3a', fruit: '#d6365a' },
  peppers: { style: 'leafy', leaf: DARK_GREEN, fruit: '#e2321f' },
  morningGlory: { style: 'flower', leaf: GREEN, fruit: '#4f6fd8' },
  aloeVera: { style: 'stalk', leaf: '#6aa58a', fruit: '#8cc7a5' },
  pineapples: { style: 'stalk', leaf: '#4d8c3a', fruit: '#e7b628' },
  redTulips: { style: 'flower', leaf: GREEN, fruit: '#e02634' },
  pattypanSquash: { style: 'vine', leaf: GREEN, fruit: '#f3e27a' },
  blueberries: { style: 'berry', leaf: DARK_GREEN, fruit: '#3a4fbf' },
  watermelon: { style: 'vine', leaf: GREEN, fruit: '#2f7a2f' },
  grapes: { style: 'berry', leaf: GREEN, fruit: '#6b2d7d' },
  tomatoes: { style: 'leafy', leaf: GREEN, fruit: '#e8392a' },
  pinkRoses: { style: 'flower', leaf: DARK_GREEN, fruit: '#f27aa6' },
  sugarCane: { style: 'grain', leaf: '#6fae3c', fruit: '#c9d98a' },
  carrots: { style: 'leafy', leaf: '#5fae38', fruit: '#f08a24' },
  coffee: { style: 'berry', leaf: DARK_GREEN, fruit: '#b8302a' },
  sunflowers: { style: 'flower', leaf: GREEN, fruit: '#f5c518' },
  broccoli: { style: 'leafy', leaf: '#3f7f3a', fruit: '#4f9a3f' },
  corn: { style: 'stalk', leaf: '#5a9a34', fruit: '#f2d14a' },
};

const SOIL = '#8a5a32';
const SOIL_DARK = '#6e4424';
const SOIL_LIGHT = '#a06c3e';
const STUBBLE = '#c9b16a';
const WITHERED = '#8b7a4e';

// Plant spots inside a plot, in tile fractions, ordered back to front so
// nearer plants overlap farther ones.
const SPOTS: ReadonlyArray<readonly [number, number]> = [
  [0.27, 0.27],
  [0.73, 0.27],
  [0.27, 0.73],
  [0.5, 0.5],
  [0.73, 0.73],
];

export function drawSoil(ctx: CanvasRenderingContext2D, x: number, y: number, kind: 'plowed' | 'harvested'): void {
  const f = { x, y, width: 1, depth: 1 };
  polygon(ctx, footprintCorners(f, 0.04), SOIL_DARK);
  polygon(ctx, footprintCorners(f, 0.08), SOIL);

  // Furrows run along the tile's x axis.
  ctx.strokeStyle = SOIL_LIGHT;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const v of [0.3, 0.5, 0.7]) {
    const a = tileToWorld(tile(x + 0.16, y + v));
    const b = tileToWorld(tile(x + 0.84, y + v));
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  if (kind === 'harvested') {
    ctx.strokeStyle = STUBBLE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const p = tileToWorld(tile(x + 0.2 + tileNoise(x, y, 10 + i) * 0.6, y + 0.2 + tileNoise(x, y, 30 + i) * 0.6));
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 1, p.y - 4);
    }
    ctx.stroke();
  }
}

// Seeds the choice of which plots show their crop art mirrored.
const MIRROR_SEED = 7;

const STAGE_INDEX: Record<Stage, number> = { seeded: 0, sprouting: 1, growing: 2, ready: 3, withered: 4 };

// `mirror` overrides the usual mirroring of crop art, for a crop that has to
// line up with the trellis under it.
export function drawCrop(ctx: CanvasRenderingContext2D, x: number, y: number, cropId: CropId, stage: Stage, mirror?: boolean): void {
  // Real art stands on the plot's front corner. The plot is always 128 art
  // pixels wide, so the art is drawn at a fixed scale; a bigger cell just
  // means bigger plants, spilling over the plot's edges (see ART_BRIEF.md).
  // About half the plots show it mirrored, picked by position so it never
  // changes, so a field of one crop doesn't look stamped out.
  const front = tileToWorld(tile(x + 1, y + 1));
  const flip = mirror ?? random01(x, y, MIRROR_SEED) < 0.5;
  if (drawArtScaled(ctx, `crop-${cropId}`, STAGE_INDEX[stage], front.x, front.y, GROUND_SCALE, flip)) return;
  const art = ART[cropId];
  for (const [u, v] of SPOTS) {
    const base = tileToWorld(tile(x + u, y + v));
    switch (stage) {
      case 'seeded':
        drawSeedMound(ctx, base);
        break;
      case 'sprouting':
        drawSprout(ctx, base);
        break;
      case 'growing':
        drawPlant(ctx, base, art, 0.75, false);
        break;
      case 'ready':
        drawPlant(ctx, base, art, 1, true);
        break;
      case 'withered':
        drawWilted(ctx, base);
        break;
      default: {
        const _exhaustive: never = stage;
        return _exhaustive;
      }
    }
  }
}

function drawSeedMound(ctx: CanvasRenderingContext2D, p: WorldPoint): void {
  ctx.fillStyle = SOIL_DARK;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSprout(ctx: CanvasRenderingContext2D, p: WorldPoint): void {
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - 4);
  ctx.stroke();
  ctx.fillStyle = '#6cbf3c';
  leaf(ctx, p.x - 2.5, p.y - 5, 3, 1.6, -0.5);
  leaf(ctx, p.x + 2.5, p.y - 5, 3, 1.6, 0.5);
}

function drawWilted(ctx: CanvasRenderingContext2D, p: WorldPoint): void {
  ctx.strokeStyle = WITHERED;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo(p.x, p.y - 8, p.x + 5, p.y - 5);
  ctx.moveTo(p.x, p.y);
  ctx.quadraticCurveTo(p.x - 1, p.y - 7, p.x - 5, p.y - 3);
  ctx.stroke();
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, angle: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlant(ctx: CanvasRenderingContext2D, p: WorldPoint, art: CropArt, size: number, ripe: boolean): void {
  const s = size;
  switch (art.style) {
    case 'berry': {
      ctx.fillStyle = art.leaf;
      dot(ctx, p.x - 3 * s, p.y - 4 * s, 4 * s);
      dot(ctx, p.x + 3 * s, p.y - 4 * s, 4 * s);
      dot(ctx, p.x, p.y - 7 * s, 4.5 * s);
      if (ripe) {
        ctx.fillStyle = art.fruit;
        dot(ctx, p.x - 3, p.y - 3, 1.8);
        dot(ctx, p.x + 2.5, p.y - 5, 1.8);
        dot(ctx, p.x, p.y - 8, 1.8);
      }
      break;
    }
    case 'grain': {
      ctx.strokeStyle = ripe ? art.fruit : art.leaf;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const dx of [-3, -1, 1, 3]) {
        ctx.moveTo(p.x + dx * 0.6, p.y);
        ctx.lineTo(p.x + dx, p.y - 14 * s);
      }
      ctx.stroke();
      if (ripe) {
        ctx.fillStyle = art.fruit;
        for (const dx of [-3, -1, 1, 3]) leaf(ctx, p.x + dx, p.y - 15, 1.3, 3, 0);
      }
      break;
    }
    case 'leafy': {
      ctx.fillStyle = art.leaf;
      leaf(ctx, p.x - 4 * s, p.y - 4 * s, 5 * s, 2.6 * s, -0.5);
      leaf(ctx, p.x + 4 * s, p.y - 4 * s, 5 * s, 2.6 * s, 0.5);
      leaf(ctx, p.x, p.y - 8 * s, 3 * s, 5 * s, 0);
      if (ripe) {
        ctx.fillStyle = art.fruit;
        leaf(ctx, p.x - 3, p.y - 3, 2.2, 3.2, 0.3);
        leaf(ctx, p.x + 3, p.y - 4, 2.2, 3.2, -0.3);
      }
      break;
    }
    case 'vine': {
      ctx.fillStyle = art.leaf;
      leaf(ctx, p.x - 5 * s, p.y - 2 * s, 4 * s, 2.4 * s, 0.2);
      leaf(ctx, p.x + 5 * s, p.y - 3 * s, 4 * s, 2.4 * s, -0.2);
      if (ripe) {
        ctx.fillStyle = art.fruit;
        leaf(ctx, p.x, p.y - 3, 5, 4, 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        leaf(ctx, p.x - 1.5, p.y - 4.5, 1.6, 1.2, 0);
      }
      break;
    }
    case 'flower': {
      ctx.strokeStyle = art.leaf;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const dx of [-2.5, 0, 2.5]) {
        ctx.moveTo(p.x + dx * 0.4, p.y);
        ctx.lineTo(p.x + dx, p.y - 11 * s);
      }
      ctx.stroke();
      ctx.fillStyle = art.leaf;
      leaf(ctx, p.x - 3, p.y - 3, 3, 1.4, -0.6);
      if (ripe) {
        ctx.fillStyle = art.fruit;
        for (const dx of [-2.5, 0, 2.5]) dot(ctx, p.x + dx, p.y - 12, 2.4);
        ctx.fillStyle = '#fff6b0';
        for (const dx of [-2.5, 0, 2.5]) dot(ctx, p.x + dx, p.y - 12, 0.8);
      }
      break;
    }
    case 'stalk': {
      ctx.fillStyle = art.leaf;
      for (const [dx, a] of [[-3, -0.35], [0, 0], [3, 0.35]] as const) {
        leaf(ctx, p.x + dx * s, p.y - 7 * s, 1.8 * s, 7 * s, a);
      }
      if (ripe) {
        ctx.fillStyle = art.fruit;
        dot(ctx, p.x - 3, p.y - 12, 2.2);
        dot(ctx, p.x + 3, p.y - 11, 2.2);
        dot(ctx, p.x, p.y - 14, 2.4);
      }
      break;
    }
    default: {
      const _exhaustive: never = art.style;
      return _exhaustive;
    }
  }
}

// The crop's signature color, for seed swatches in the UI.
export function cropColor(cropId: CropId): string {
  return ART[cropId].fruit;
}
