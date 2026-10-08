// When a tree or animal is ready, worked out from its last harvest and the
// time now. Like crops, nothing about readiness is stored.

import { HOUR } from './clock';
import { ANIMALS, TREES, type Producer as ProducerData } from './data/items';
import type { Producer } from './state';

export function producerData(obj: Producer): ProducerData {
  return obj.kind === 'tree' ? TREES[obj.typeId] : ANIMALS[obj.typeId];
}

export function producerReadyAt(obj: Producer): number {
  return obj.lastHarvestAt + producerData(obj).hours * HOUR;
}

export function isProducerReady(obj: Producer, now: number): boolean {
  return now >= producerReadyAt(obj);
}

export function timeUntilProduce(obj: Producer, now: number): number {
  return Math.max(0, producerReadyAt(obj) - now);
}
