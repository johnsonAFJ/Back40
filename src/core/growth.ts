// How far along a crop is, worked out from when it was planted and the time
// now. Nothing about growth is ever stored.

import { HOUR } from './clock';
import { CROPS } from './data/crops';
import type { PlantedPlot } from './state';

export type Stage = 'seeded' | 'sprouting' | 'growing' | 'ready' | 'withered';

export function growTime(plot: PlantedPlot): number {
  return CROPS[plot.cropId].hours * HOUR;
}

export function readyAt(plot: PlantedPlot): number {
  return plot.plantedAt + growTime(plot);
}

export function growthFraction(plot: PlantedPlot, now: number): number {
  return Math.min(1, Math.max(0, (now - plot.plantedAt) / growTime(plot)));
}

export function stage(plot: PlantedPlot, now: number): Stage {
  if (now >= plot.witherAt) return 'withered';
  const f = growthFraction(plot, now);
  if (f >= 1) return 'ready';
  if (f >= 0.5) return 'growing';
  if (f >= 0.25) return 'sprouting';
  return 'seeded';
}

export function timeUntilReady(plot: PlantedPlot, now: number): number {
  return Math.max(0, readyAt(plot) - now);
}
