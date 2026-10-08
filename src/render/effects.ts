// Short-lived animations that aren't part of the farm: "+35" coins and
// "+1 XP" floating up from a harvested plot. They live only in memory and
// are never saved.

import type { WorldPoint } from './iso';

export const EFFECT_DURATION = 1200;
const RISE = 34;

export type FloatingText = {
  readonly at: WorldPoint;
  readonly text: string;
  readonly color: string;
  readonly startedAt: number;
};

export function liveEffects(effects: readonly FloatingText[], time: number): FloatingText[] {
  return effects.filter((e) => time - e.startedAt < EFFECT_DURATION);
}

export function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: readonly FloatingText[],
  time: number,
  zoom: number,
): void {
  // Text stays the same size on screen at every zoom level.
  ctx.font = `800 ${15 / zoom}px ui-rounded, 'SF Pro Rounded', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const e of effects) {
    // Staggered lines start slightly in the future; skip them until then.
    if (time < e.startedAt) continue;
    const t = Math.min(1, (time - e.startedAt) / EFFECT_DURATION);
    const eased = 1 - (1 - t) ** 3;
    const y = e.at.y - (RISE * eased) / zoom;
    ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    ctx.lineWidth = 4 / zoom;
    ctx.strokeStyle = 'rgba(40, 25, 10, 0.85)';
    ctx.strokeText(e.text, e.at.x, y);
    ctx.fillStyle = e.color;
    ctx.fillText(e.text, e.at.x, y);
  }
  ctx.globalAlpha = 1;
}
