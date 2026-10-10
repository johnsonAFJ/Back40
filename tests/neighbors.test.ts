import { describe, expect, it } from 'vitest';
import { placeGift, plant, plow, type Outcome } from '../src/core/actions';
import { DAY, HOUR } from '../src/core/clock';
import { NEIGHBOR_IDS } from '../src/core/data/neighbors';
import { totalXpForLevel } from '../src/core/levels';
import {
  CATCH_UP_DAYS,
  FERTILIZE_PER_VISIT,
  HELPS_PER_DAY,
  dayIndex,
  dayStart,
  help,
  helpsLeft,
  syncNeighbors,
  visit,
} from '../src/core/neighbors';
import { parseSave } from '../src/core/save';
import { newFarm, objectAt, type FarmState } from '../src/core/state';
import { unlocksAt } from '../src/core/unlocks';

// UTC, so days start at midnight UTC in these tests.
const TZ = 0;
const MIDNIGHT = Date.UTC(2026, 9, 8);

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

// A level 3 farm (Martha's level) synced at midnight, so Martha has moved in.
function withMartha(): FarmState {
  const farm = { ...newFarm(MIDNIGHT, 11), xp: totalXpForLevel(3), coins: 10_000 };
  return syncNeighbors(farm, MIDNIGHT, TZ).state;
}

describe('days', () => {
  it('run midnight to midnight in the local time zone', () => {
    expect(dayIndex(MIDNIGHT + 23 * HOUR, 0)).toBe(dayIndex(MIDNIGHT, 0));
    expect(dayIndex(MIDNIGHT + 24 * HOUR, 0)).toBe(dayIndex(MIDNIGHT, 0) + 1);
    // Five hours behind UTC (getTimezoneOffset says 300): local midnight is
    // 05:00 UTC.
    expect(dayStart(dayIndex(MIDNIGHT + 12 * HOUR, 300), 300)).toBe(MIDNIGHT + 5 * HOUR);
  });
});

describe('moving in', () => {
  it('happens when the level is reached, with a line in the news', () => {
    const before = { ...newFarm(MIDNIGHT, 11), xp: totalXpForLevel(2) };
    expect(syncNeighbors(before, MIDNIGHT, TZ).events).toEqual([]);
    const sync = syncNeighbors({ ...before, xp: totalXpForLevel(3) }, MIDNIGHT, TZ);
    expect(sync.events).toEqual([{ kind: 'movedIn', at: MIDNIGHT, neighbor: 'martha' }]);
    expect(sync.state.neighbors.martha).toEqual({ day: -1, helped: [] });
  });

  it('shows in the level-up banner', () => {
    expect(unlocksAt(3)).toContainEqual({ kind: 'neighbor', id: 'martha' });
  });
});

describe('a day of neighbor activity', () => {
  it('fertilizes growing crops, brings one gift and some news', () => {
    let farm = withMartha();
    // Plant ten long-growing crops so plenty are still growing all day.
    for (let x = 0; x < 10; x++) {
      farm = ok(plow(farm, x, 11, MIDNIGHT));
      farm = ok(plant(farm, x, 11, 'eggplant', MIDNIGHT));
    }
    const sync = syncNeighbors(farm, MIDNIGHT + DAY - 1, TZ);
    const kinds = sync.events.map((e) => e.kind).sort();
    expect(kinds).toEqual(['fertilized', 'gift', 'harvested']);
    const fertilized = sync.state.objects.filter((o) => o.kind === 'plot' && o.state === 'planted' && o.fertilized);
    expect(fertilized).toHaveLength(FERTILIZE_PER_VISIT);
    expect(sync.state.gifts).toHaveLength(1);
  });

  it('gives nothing extra for checking again', () => {
    const once = syncNeighbors(withMartha(), MIDNIGHT + DAY - 1, TZ).state;
    const twice = syncNeighbors(once, MIDNIGHT + DAY - 1, TZ);
    expect(twice.events).toEqual([]);
    expect(twice.state.gifts).toEqual(once.gifts);
  });

  it('gives the same day the same events, however it is checked', () => {
    const all = syncNeighbors(withMartha(), MIDNIGHT + DAY - 1, TZ).state;
    let hourly = withMartha();
    for (let h = 1; h < 24; h++) hourly = syncNeighbors(hourly, MIDNIGHT + h * HOUR, TZ).state;
    hourly = syncNeighbors(hourly, MIDNIGHT + DAY - 1, TZ).state;
    expect(hourly.gifts).toEqual(all.gifts);
    expect(hourly.feed.map((e) => e.kind)).toEqual(all.feed.map((e) => e.kind));
  });

  it('only catches up on the last few days after a long time away', () => {
    const sync = syncNeighbors(withMartha(), MIDNIGHT + 30 * DAY, TZ);
    expect(sync.state.gifts.length).toBeLessThanOrEqual(CATCH_UP_DAYS + 1);
  });
});

describe('gifts', () => {
  it('are placed for free and leave the gift box', () => {
    const farm = { ...withMartha(), gifts: [{ kind: 'animal', id: 'cow' } as const] };
    const placed = ok(placeGift(farm, 0, 9, 9, MIDNIGHT));
    expect(placed.coins).toBe(farm.coins);
    expect(placed.gifts).toEqual([]);
    expect(objectAt(placed, 9, 9)).toMatchObject({ kind: 'animal', typeId: 'cow' });
  });
});

describe("neighbors' farms", () => {
  it('are all valid farms with something to help with', () => {
    for (const id of NEIGHBOR_IDS) {
      const farm = { ...newFarm(MIDNIGHT, 11), xp: totalXpForLevel(25) };
      const synced = syncNeighbors(farm, MIDNIGHT, TZ).state;
      const v = visit(synced, id, MIDNIGHT + 12 * HOUR, TZ);
      expect(() => parseSave(JSON.parse(JSON.stringify(v.farm)))).not.toThrow();
      expect(v.farm.objects.length).toBeGreaterThan(20);
      expect(v.helpsLeft).toBe(HELPS_PER_DAY);
    }
  });
});

describe('helping', () => {
  const noon = MIDNIGHT + 12 * HOUR;

  it('pays 10 coins and 1 XP, five times a day per neighbor', () => {
    let farm = withMartha();
    const v = visit(farm, 'martha', noon, TZ);
    const targets = [...v.crows, ...v.hungry, ...v.farm.objects.filter((o) => o.kind === 'plot').map((o) => o.id)];
    const start = { coins: farm.coins, xp: farm.xp };
    let done = 0;
    for (const id of targets) {
      const outcome = help(farm, 'martha', id, noon, TZ);
      if (!outcome.ok) continue;
      farm = outcome.state;
      done++;
      if (done === HELPS_PER_DAY) break;
    }
    expect(done).toBe(HELPS_PER_DAY);
    expect(farm.coins).toBe(start.coins + 50);
    expect(farm.xp).toBe(start.xp + 5);
    expect(helpsLeft(farm, 'martha', noon, TZ)).toBe(0);
    expect(help(farm, 'martha', targets[0] ?? '', noon, TZ)).toMatchObject({ failure: { code: 'noHelpsLeft' } });
    // A new day brings five more.
    expect(helpsLeft(farm, 'martha', noon + DAY, TZ)).toBe(HELPS_PER_DAY);
  });

  it('chases crows and feeds animals, and clears them once done', () => {
    const farm = withMartha();
    const v = visit(farm, 'martha', noon, TZ);
    const crow = [...v.crows][0];
    const hungry = [...v.hungry][0];
    if (!crow || !hungry) throw new Error('expected chores');
    const a = help(farm, 'martha', crow, noon, TZ);
    expect(a).toMatchObject({ ok: true, kind: 'crows' });
    if (!a.ok) return;
    const b = help(a.state, 'martha', hungry, noon, TZ);
    expect(b).toMatchObject({ ok: true, kind: 'feed' });
    if (!b.ok) return;
    const after = visit(b.state, 'martha', noon, TZ);
    expect(after.crows.has(crow)).toBe(false);
    expect(after.hungry.has(hungry)).toBe(false);
    expect(help(b.state, 'martha', crow, noon, TZ)).toMatchObject({ failure: { code: 'alreadyHelped' } });
  });

  it("isn't possible before a neighbor moves in", () => {
    const farm = withMartha();
    expect(help(farm, 'gus', 'gus-1', noon, TZ)).toMatchObject({ failure: { code: 'notHere' } });
  });
});

describe('saves from milestone 5.5', () => {
  it('start with no neighbors, gifts or news, and no backlog', () => {
    const { neighbors: _a, gifts: _b, feed: _c, neighborsCheckedAt: _d, ...v4 } = { ...newFarm(MIDNIGHT, 11), version: 4 };
    const loaded = parseSave(JSON.parse(JSON.stringify(v4)));
    expect(loaded).toMatchObject({ version: 7, neighbors: {}, gifts: [], feed: [], neighborsCheckedAt: v4.lastSeenAt });
  });
});
