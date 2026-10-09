// What the neighbors do, worked out from the clock and seeded randomness.
//
// Every visit, gift and bit of news happens at a time decided by
// random01(seed, neighbor, day), so each day's events are fixed in advance.
// syncNeighbors replays whatever happened between the last check and now,
// which works the same whether the game was open the whole time, closed for
// a night, or pushed ahead by test mode. Reloading can't produce extra
// gifts: the same day always gives the same answer, and the farm remembers
// how far it has checked (`neighborsCheckedAt`).

import { productInfo, productsOf, type Placeable } from './catalog';
import { DAY, HOUR, MINUTE } from './clock';
import { NEIGHBORS, NEIGHBOR_IDS, type NeighborId } from './data/neighbors';
import { stage } from './growth';
import { neighborsAt } from './land';
import { levelForXp } from './levels';
import { neighborFarm } from './neighborFarms';
import { random01 } from './rng';
import { FEED_LENGTH, type FarmObject, type FarmState, type FeedEvent, type PlantedPlot } from './state';

// How many helping actions you get on each neighbor's farm per day, and
// what each one pays.
export const HELPS_PER_DAY = 5;
export const HELP_COINS = 10;
export const HELP_XP = 1;
// How many of your growing crops each neighbor fertilizes on their daily
// visit.
export const FERTILIZE_PER_VISIT = 6;
// A farm left alone longer than this only catches up on the most recent
// days, so coming back after a month brings a few gifts, not thirty.
export const CATCH_UP_DAYS = 3;
// The most a gift can cost, so nobody gets a red barn for free.
export const GIFT_PRICE_LIMIT = 1_000;

const INDEX: Record<NeighborId, number> = { martha: 1, gus: 2, june: 3, earl: 4, pearl: 5 };

// ---- Days ----

// Days run from local midnight to local midnight. `tz` is the device's
// offset from UTC in minutes, as Date.getTimezoneOffset() reports it, passed
// in so the rules never read the device's settings themselves.
export function dayIndex(t: number, tz: number): number {
  return Math.floor((t - tz * MINUTE) / DAY);
}

export function dayStart(day: number, tz: number): number {
  return day * DAY + tz * MINUTE;
}

// ---- Everything neighbors do while you're away ----

// What a gift can be: anything placeable that's unlocked and not too dear.
export function giftChoices(level: number): Placeable[] {
  return (['tree', 'animal', 'decoration'] as const)
    .flatMap((kind) => productsOf(kind))
    .flatMap((p) => (p.kind !== 'crop' && productInfo(p).level <= level && productInfo(p).price <= GIFT_PRICE_LIMIT ? [p] : []));
}

function isGrowingAt(o: FarmObject, t: number): o is PlantedPlot {
  if (o.kind !== 'plot' || o.state !== 'planted' || o.fertilized || o.plantedAt >= t) return false;
  const s = stage(o, t);
  return s === 'seeded' || s === 'sprouting' || s === 'growing';
}

// Each neighbor's events on one day: when they visit your farm (and
// fertilize), and when their own news happens.
function visitTime(seed: number, id: NeighborId, day: number, tz: number): number {
  return dayStart(day, tz) + (8 + 12 * random01(seed, INDEX[id], day, 1)) * HOUR;
}

function newsTime(seed: number, id: NeighborId, day: number, tz: number): number {
  return dayStart(day, tz) + (7 + 14 * random01(seed, INDEX[id], day, 2)) * HOUR;
}

function giftTime(seed: number, day: number, tz: number): number {
  return dayStart(day, tz) + (9 + 10 * random01(seed, 0, day, 3)) * HOUR;
}

export type Sync = { readonly state: FarmState; readonly events: readonly FeedEvent[] };

export function syncNeighbors(state: FarmState, now: number, tz: number): Sync {
  const level = levelForXp(state.xp);
  const here = neighborsAt(level);
  const events: FeedEvent[] = [];
  let objects = state.objects;
  let gifts = state.gifts;
  const records = { ...state.neighbors };

  // New arrivals, the moment their level is reached.
  for (const id of here) {
    if (records[id]) continue;
    records[id] = { day: -1, helped: [] };
    events.push({ kind: 'movedIn', at: now, neighbor: id });
  }

  const from = Math.max(state.neighborsCheckedAt, now - CATCH_UP_DAYS * DAY);
  const inWindow = (t: number): boolean => t > from && t <= now;

  for (let day = dayIndex(from, tz); day <= dayIndex(now, tz); day++) {
    // Only neighbors who had already moved in by the last check visit; a
    // brand new neighbor starts tomorrow, not yesterday.
    for (const id of NEIGHBOR_IDS) {
      if (!state.neighbors[id]) continue;

      const visitAt = visitTime(state.seed, id, day, tz);
      if (inWindow(visitAt)) {
        const chosen = objects
          .filter((o) => isGrowingAt(o, visitAt))
          .sort((a, b) => random01(state.seed, INDEX[id], day, a.x, a.y) - random01(state.seed, INDEX[id], day, b.x, b.y))
          .slice(0, FERTILIZE_PER_VISIT)
          .map((o) => o.id);
        if (chosen.length > 0) {
          const ids = new Set(chosen);
          objects = objects.map((o) => (ids.has(o.id) && o.kind === 'plot' && o.state === 'planted' ? { ...o, fertilized: true } : o));
          events.push({ kind: 'fertilized', at: visitAt, neighbor: id, count: chosen.length });
        }
      }

      const newsAt = newsTime(state.seed, id, day, tz);
      if (inWindow(newsAt)) {
        const crops = NEIGHBORS[id].crops;
        const crop = crops[Math.floor(random01(state.seed, INDEX[id], day, 4) * crops.length)] ?? crops[0];
        const count = 10 + Math.floor(random01(state.seed, INDEX[id], day, 5) * 50);
        events.push({ kind: 'harvested', at: newsAt, neighbor: id, crop, count });
      }
    }

    // One gift a day, from one of the neighbors who live here.
    const giftAt = giftTime(state.seed, day, tz);
    const givers = NEIGHBOR_IDS.filter((id) => state.neighbors[id]);
    const choices = giftChoices(level);
    if (inWindow(giftAt) && givers.length > 0 && choices.length > 0) {
      const giver = givers[Math.floor(random01(state.seed, 0, day, 6) * givers.length)] ?? givers[0];
      const gift = choices[Math.floor(random01(state.seed, 0, day, 7) * choices.length)] ?? choices[0];
      if (giver && gift) {
        gifts = [...gifts, gift];
        events.push({ kind: 'gift', at: giftAt, neighbor: giver, gift });
      }
    }
  }

  events.sort((a, b) => a.at - b.at);
  return {
    state: {
      ...state,
      objects,
      gifts,
      neighbors: records,
      feed: [...state.feed, ...events].slice(-FEED_LENGTH),
      neighborsCheckedAt: now,
    },
    events,
  };
}

// ---- Visiting and helping ----

export type HelpKind = 'crows' | 'feed' | 'fertilize';

export type Visit = {
  readonly farm: FarmState;
  // Crops with crows on them and animals waiting to be fed, still undone.
  readonly crows: ReadonlySet<string>;
  readonly hungry: ReadonlySet<string>;
  readonly helpsLeft: number;
};

function helpedToday(state: FarmState, id: NeighborId, day: number): readonly string[] {
  const rec = state.neighbors[id];
  return rec && rec.day === day ? rec.helped : [];
}

export function helpsLeft(state: FarmState, id: NeighborId, now: number, tz: number): number {
  return HELPS_PER_DAY - helpedToday(state, id, dayIndex(now, tz)).length;
}

// A neighbor's farm as it is right now, with today's chores and your help so
// far applied.
export function visit(state: FarmState, id: NeighborId, now: number, tz: number): Visit {
  const day = dayIndex(now, tz);
  const base = neighborFarm(state.seed, id, day, now);
  const helped = new Set(helpedToday(state, id, day));
  const order = (o: FarmObject): number => random01(state.seed, INDEX[id], day, o.x, o.y, 9);

  // Three crops with crows and two hungry animals each day.
  const crowTargets = base.objects.filter((o) => isGrowingAt(o, now)).sort((a, b) => order(a) - order(b)).slice(0, 3);
  const hungryTargets = base.objects.filter((o) => o.kind === 'animal').sort((a, b) => order(a) - order(b)).slice(0, 2);
  const crowIds = new Set(crowTargets.map((o) => o.id));

  // Crops you fertilized show it; a crop you chased crows from just loses
  // the crows.
  const objects = base.objects.map((o) =>
    helped.has(o.id) && !crowIds.has(o.id) && o.kind === 'plot' && o.state === 'planted' ? { ...o, fertilized: true } : o,
  );
  return {
    farm: { ...base, objects },
    crows: new Set([...crowIds].filter((i) => !helped.has(i))),
    hungry: new Set(hungryTargets.map((o) => o.id).filter((i) => !helped.has(i))),
    helpsLeft: HELPS_PER_DAY - helped.size,
  };
}

export type HelpFailure =
  | { readonly code: 'notHere' }
  | { readonly code: 'noHelpsLeft' }
  | { readonly code: 'alreadyHelped' }
  | { readonly code: 'nothingToDo' };

export type HelpOutcome =
  | { readonly ok: true; readonly state: FarmState; readonly kind: HelpKind; readonly at: { readonly x: number; readonly y: number } }
  | { readonly ok: false; readonly failure: HelpFailure };

// One helping action on a neighbor's farm: chase crows off a crop, feed a
// hungry animal, or fertilize a growing crop.
export function help(state: FarmState, id: NeighborId, objectId: string, now: number, tz: number): HelpOutcome {
  if (!state.neighbors[id]) return { ok: false, failure: { code: 'notHere' } };
  const day = dayIndex(now, tz);
  const done = helpedToday(state, id, day);
  if (done.length >= HELPS_PER_DAY) return { ok: false, failure: { code: 'noHelpsLeft' } };
  if (done.includes(objectId)) return { ok: false, failure: { code: 'alreadyHelped' } };

  const v = visit(state, id, now, tz);
  const obj = v.farm.objects.find((o) => o.id === objectId);
  if (!obj) return { ok: false, failure: { code: 'nothingToDo' } };
  const kind: HelpKind | null = v.crows.has(obj.id)
    ? 'crows'
    : v.hungry.has(obj.id)
      ? 'feed'
      : isGrowingAt(obj, now)
        ? 'fertilize'
        : null;
  if (!kind) return { ok: false, failure: { code: 'nothingToDo' } };

  return {
    ok: true,
    kind,
    at: { x: obj.x, y: obj.y },
    state: {
      ...state,
      coins: state.coins + HELP_COINS,
      xp: state.xp + HELP_XP,
      neighbors: { ...state.neighbors, [id]: { day, helped: [...done, objectId] } },
    },
  };
}
