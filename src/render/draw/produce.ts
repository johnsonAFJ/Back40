// Code-drawn icons for basket produce, centered on (0, 0) and about 40
// pixels across. The art pass replaces these with images.

import type { ProduceId } from '../../core/data/produce';

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, angle: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function shine(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  oval(ctx, x, y, r, r * 0.6, -0.6, 'rgba(255, 255, 255, 0.45)');
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x + 1, y - 2);
  ctx.stroke();
  oval(ctx, x + 6, y - 2, 6, 3, -0.5, '#4f9a2f');
}

function fruit(ctx: CanvasRenderingContext2D, color: string, rx: number, ry: number): void {
  oval(ctx, 0, 2, rx, ry, 0, color);
  shine(ctx, -rx * 0.4, 2 - ry * 0.4, rx * 0.35);
  leaf(ctx, 0, 2 - ry);
}

export function drawProduceIcon(ctx: CanvasRenderingContext2D, id: ProduceId): void {
  switch (id) {
    case 'apples':
      fruit(ctx, '#d8352a', 15, 14);
      return;
    case 'cherries':
      ctx.strokeStyle = '#5a7a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.quadraticCurveTo(-4, -12, 4, -16);
      ctx.moveTo(8, 8);
      ctx.quadraticCurveTo(6, -8, 4, -16);
      ctx.stroke();
      circle(ctx, -8, 8, 9, '#a8102c');
      circle(ctx, 8, 10, 9, '#a8102c');
      shine(ctx, -11, 5, 3);
      shine(ctx, 5, 7, 3);
      return;
    case 'lemons':
      fruit(ctx, '#f3d93a', 17, 12);
      return;
    case 'oranges':
      fruit(ctx, '#f28a1c', 15, 15);
      return;
    case 'peaches':
      fruit(ctx, '#f6a77a', 15, 14);
      oval(ctx, 5, 6, 7, 6, 0, 'rgba(230, 90, 80, 0.35)');
      return;
    case 'plums':
      fruit(ctx, '#6e2a7a', 13, 15);
      return;
    case 'eggs':
      oval(ctx, -7, 4, 9, 12, -0.2, '#f6ead0');
      oval(ctx, 7, 6, 9, 12, 0.2, '#fbf3e2');
      shine(ctx, 4, 0, 3);
      return;
    case 'milk':
      ctx.fillStyle = '#fbfbf7';
      ctx.beginPath();
      ctx.roundRect(-10, -8, 20, 26, 5);
      ctx.fill();
      ctx.fillRect(-6, -16, 12, 10);
      ctx.fillStyle = '#3d7cc9';
      ctx.fillRect(-7, -19, 14, 5);
      ctx.fillStyle = '#d8e8f7';
      ctx.fillRect(-10, 2, 20, 8);
      return;
    case 'wool':
      for (const [x, y] of [[-9, 4], [0, -4], [9, 4], [-4, 10], [5, 10], [0, 3]] as const) circle(ctx, x, y, 8, '#f4f4ec');
      for (const [x, y] of [[-9, 4], [9, 4], [0, -4]] as const) circle(ctx, x - 2, y - 2, 2.5, '#ffffff');
      return;
    case 'truffles':
      for (const [x, y, r] of [[-7, 6, 9], [7, 4, 10], [0, -4, 7]] as const) circle(ctx, x, y, r, '#4b3324');
      for (const [x, y] of [[-9, 3], [5, 0], [1, -6]] as const) circle(ctx, x, y, 1.6, '#6e4c36');
      return;
    case 'hair':
      ctx.strokeStyle = '#8a5a32';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const dx of [-8, -3, 2, 7]) {
        ctx.moveTo(dx, 16);
        ctx.quadraticCurveTo(dx - 10, 0, dx + 2, -16);
      }
      ctx.stroke();
      ctx.fillStyle = '#c9643a';
      ctx.fillRect(-12, 8, 24, 5);
      return;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
