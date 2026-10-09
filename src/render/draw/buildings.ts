// Code-drawn buildings: the farmhouse, the shed and the red barn all share
// one shape, an isometric box (two visible walls) with a gable roof whose
// ridge runs parallel to the left wall. Only the colors and doors differ.

import type { BuildingId } from '../../core/data/buildings';
import { footprintCorners, lift, mix, polygon, SHADOW, type Footprint } from './shapes';
import { tile, tileToWorld, type WorldPoint } from '../iso';
import { drawArt } from '../art';

type Look = {
  readonly wallLeft: string;
  readonly wallRight: string;
  readonly roof: string;
  readonly roofEdge: string;
  readonly trim: string;
  readonly wall: number;
  readonly ridge: number;
  readonly door: (ctx: CanvasRenderingContext2D, bottom: WorldPoint, right: WorldPoint) => void;
  readonly windows: number;
};

// A door standing on the right wall, centered at fraction `at` along it.
function door(color: string, height: number, halfWidth: number, at = 0.5) {
  return (ctx: CanvasRenderingContext2D, bottom: WorldPoint, right: WorldPoint): void => {
    const base = mix(bottom, right, at);
    const half = mix(bottom, right, halfWidth);
    const dx = half.x - bottom.x;
    const dy = half.y - bottom.y;
    const a = { ...base, x: base.x - dx, y: base.y - dy };
    const b = { ...base, x: base.x + dx, y: base.y + dy };
    polygon(ctx, [a, b, lift(b, height), lift(a, height)], color);
  };
}

function barnDoor(ctx: CanvasRenderingContext2D, bottom: WorldPoint, right: WorldPoint): void {
  const a = mix(bottom, right, 0.28);
  const b = mix(bottom, right, 0.72);
  const h = 34;
  polygon(ctx, [a, b, lift(b, h), lift(a, h)], '#6e1f17');
  ctx.strokeStyle = '#f6efe2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [p, q] of [[a, lift(b, h)], [b, lift(a, h)]] as const) {
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.moveTo(a.x, a.y);
  const ta = lift(a, h);
  const tb = lift(b, h);
  ctx.lineTo(ta.x, ta.y);
  ctx.lineTo(tb.x, tb.y);
  ctx.lineTo(b.x, b.y);
  ctx.closePath();
  ctx.stroke();
}

const LOOKS = {
  farmhouse: {
    wallLeft: '#f2e3c4',
    wallRight: '#dcc8a2',
    roof: '#b5432f',
    roofEdge: '#933424',
    trim: '#7a4a2a',
    wall: 44,
    ridge: 34,
    door: door('#6b3f22', 26, 0.12),
    windows: 2,
  },
  shed: {
    wallLeft: '#b07a4a',
    wallRight: '#946238',
    roof: '#7d8a8f',
    roofEdge: '#5f6b70',
    trim: '#5a3a1e',
    wall: 30,
    ridge: 22,
    door: door('#5a3a1e', 22, 0.16),
    windows: 0,
  },
  redBarn: {
    wallLeft: '#c0392b',
    wallRight: '#a02f23',
    roof: '#5b4a42',
    roofEdge: '#43362f',
    trim: '#f6efe2',
    wall: 52,
    ridge: 40,
    door: barnDoor,
    windows: 1,
  },
} as const satisfies Record<string, Look>;

export type BuildingLook = keyof typeof LOOKS;

export function drawBuilding(ctx: CanvasRenderingContext2D, typeId: BuildingId, f: Footprint): void {
  // Real art stands on the front corner of the footprint and spans its width.
  const front = tileToWorld(tile(f.x + f.width, f.y + f.depth));
  if (drawArt(ctx, `building-${typeId}`, 0, front.x, front.y, ((f.width + f.depth) * 64) / 2)) return;
  drawHouse(ctx, LOOKS[typeId], f);
}

export function drawBarnLike(ctx: CanvasRenderingContext2D, look: 'shed' | 'redBarn', f: Footprint): void {
  drawHouse(ctx, LOOKS[look], f);
}

function drawHouse(ctx: CanvasRenderingContext2D, look: Look, f: Footprint): void {
  const inset = f.width > 1 ? 0.35 : 0.15;
  const [top, right, bottom, left] = footprintCorners(f, inset);
  const { wall, ridge } = look;

  // A soft shadow down and to the right of the building.
  const [, sRight, sBottom, sLeft] = footprintCorners(f, inset * 0.45);
  polygon(ctx, [sLeft, sBottom, sRight, mix(sRight, sBottom, -0.2)], SHADOW);

  // Front walls: left face runs left -> bottom, right face runs bottom -> right.
  polygon(ctx, [left, bottom, lift(bottom, wall), lift(left, wall)], look.wallLeft);
  polygon(ctx, [bottom, right, lift(right, wall), lift(bottom, wall)], look.wallRight);

  look.door(ctx, bottom, right);
  const windowSpots = look.windows === 2 ? [0.25, 0.7] : look.windows === 1 ? [0.5] : [];
  for (const t of windowSpots) {
    const a = lift(mix(left, bottom, t - 0.1), wall * 0.4);
    const b = lift(mix(left, bottom, t + 0.1), wall * 0.4);
    polygon(ctx, [a, b, lift(b, wall * 0.32), lift(a, wall * 0.32)], '#7fb6d9');
  }

  // The gable roof. Its front slope sits over the left wall and the right
  // wall ends in a triangular gable. The back slope faces away and is never
  // seen.
  const ridgeBack = lift(mix(left, top, 0.5), wall + ridge);
  const ridgeFront = lift(mix(bottom, right, 0.5), wall + ridge);
  polygon(ctx, [lift(bottom, wall), lift(right, wall), ridgeFront], look.wallRight);

  const eave = 6;
  const leftEave = { ...left, x: left.x - eave, y: left.y + eave * 0.5 - wall };
  const bottomEave = { ...bottom, y: bottom.y + eave - wall };
  const rightEave = { ...right, x: right.x + eave, y: right.y + eave * 0.5 - wall };
  polygon(ctx, [leftEave, bottomEave, ridgeFront, ridgeBack], look.roof);

  // The gable's roof edge, then the ridge.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = look.roofEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bottomEave.x, bottomEave.y);
  ctx.lineTo(ridgeFront.x, ridgeFront.y);
  ctx.lineTo(rightEave.x, rightEave.y);
  ctx.stroke();
  ctx.strokeStyle = look.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ridgeBack.x, ridgeBack.y);
  ctx.lineTo(ridgeFront.x, ridgeFront.y);
  ctx.stroke();
}
