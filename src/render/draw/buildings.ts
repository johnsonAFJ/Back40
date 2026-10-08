// Code-drawn buildings. A building is an isometric box (two visible walls)
// with a roof on top. Only the two front walls are ever visible, so the back
// walls are never drawn.

import type { BuildingId } from '../../core/data/buildings';
import { footprintCorners, lift, mix, polygon, type Footprint } from './shapes';

const WALL_LEFT = '#f2e3c4';
const WALL_RIGHT = '#dcc8a2';
const ROOF_LEFT = '#b5432f';
const ROOF_RIGHT = '#933424';
const TRIM = '#7a4a2a';
const DOOR = '#6b3f22';
const WINDOW = '#7fb6d9';
const SHADOW = 'rgba(30, 50, 15, 0.28)';

export function drawBuilding(ctx: CanvasRenderingContext2D, typeId: BuildingId, f: Footprint): void {
  switch (typeId) {
    case 'farmhouse':
      drawFarmhouse(ctx, f);
      break;
    default: {
      const _exhaustive: never = typeId;
      return _exhaustive;
    }
  }
}

function drawFarmhouse(ctx: CanvasRenderingContext2D, f: Footprint): void {
  const [top, right, bottom, left] = footprintCorners(f, 0.35);
  const wall = 44;
  const ridge = 34;

  // A soft shadow down and to the right of the house.
  const [, sRight, sBottom, sLeft] = footprintCorners(f, 0.15);
  polygon(ctx, [sLeft, sBottom, sRight, mix(sRight, sBottom, -0.2)], SHADOW);

  // Front walls: left face runs left -> bottom, right face runs bottom -> right.
  polygon(ctx, [left, bottom, lift(bottom, wall), lift(left, wall)], WALL_LEFT);
  polygon(ctx, [bottom, right, lift(right, wall), lift(bottom, wall)], WALL_RIGHT);

  // Door on the right face, two windows on the left.
  const doorBase = mix(bottom, right, 0.5);
  const doorHalf = mix(bottom, right, 0.12);
  const dx = doorHalf.x - bottom.x;
  const dy = doorHalf.y - bottom.y;
  polygon(
    ctx,
    [
      { ...doorBase, x: doorBase.x - dx, y: doorBase.y - dy },
      { ...doorBase, x: doorBase.x + dx, y: doorBase.y + dy },
      { ...doorBase, x: doorBase.x + dx, y: doorBase.y + dy - 26 },
      { ...doorBase, x: doorBase.x - dx, y: doorBase.y - dy - 26 },
    ],
    DOOR,
  );
  for (const t of [0.25, 0.7]) {
    const a = lift(mix(left, bottom, t - 0.1), 18);
    const b = lift(mix(left, bottom, t + 0.1), 18);
    polygon(ctx, [a, b, lift(b, 14), lift(a, 14)], WINDOW);
  }

  // A gable roof. The ridge runs parallel to the left wall, so the roof's
  // front slope sits over the left wall and the right wall ends in a
  // triangular gable. The back slope faces away from the viewer and is never
  // seen.
  const ridgeBack = lift(mix(left, top, 0.5), wall + ridge);
  const ridgeFront = lift(mix(bottom, right, 0.5), wall + ridge);
  polygon(ctx, [lift(bottom, wall), lift(right, wall), ridgeFront], WALL_RIGHT);

  const eave = 6;
  const leftEave = { ...left, x: left.x - eave, y: left.y + eave * 0.5 - wall };
  const bottomEave = { ...bottom, y: bottom.y + eave - wall };
  const rightEave = { ...right, x: right.x + eave, y: right.y + eave * 0.5 - wall };
  polygon(ctx, [leftEave, bottomEave, ridgeFront, ridgeBack], ROOF_LEFT);

  // The gable's roof edge, then the ridge.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ROOF_RIGHT;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bottomEave.x, bottomEave.y);
  ctx.lineTo(ridgeFront.x, ridgeFront.y);
  ctx.lineTo(rightEave.x, rightEave.y);
  ctx.stroke();
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ridgeBack.x, ridgeBack.y);
  ctx.lineTo(ridgeFront.x, ridgeFront.y);
  ctx.stroke();
}
