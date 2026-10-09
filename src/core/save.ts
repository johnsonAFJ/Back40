// Turns untrusted JSON (from localStorage or a backup file) into a FarmState,
// or explains what's wrong with it. This is the only place a save is checked;
// everything past it trusts the types.
//
// When the save shape changes, SAVE_VERSION goes up and a migration step goes
// in `migrate` below, so old saves keep loading.

import { isBuildingId } from './data/buildings';
import { isCropId } from './data/crops';
import { SQUARE_SPACE, isAnimalId, isDecorationId, isTreeId } from './data/items';
import { isProduceId } from './data/produce';
import { NEIGHBORS, type NeighborId } from './data/neighbors';
import type { Placeable } from './catalog';
import { EXPANSIONS } from './data/expansions';
import { FEED_LENGTH, SAVE_VERSION, footprint, spaceUsed, type Basket, type FarmObject, type FarmState, type FeedEvent, type NeighborRecord } from './state';

// `newer` means the save came from a later version of the game than this
// one. It isn't broken, so it must never be replaced; see platform/storage.ts.
export class SaveError extends Error {
  override name = 'SaveError';
  constructor(
    message: string,
    readonly reason: 'invalid' | 'newer' = 'invalid',
  ) {
    super(message);
  }
}

type Json = { readonly [key: string]: unknown };

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(obj: Json, key: string, where: string): number {
  const value = obj[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new SaveError(`${where}.${key} should be a number`);
  return value;
}

function int(obj: Json, key: string, where: string): number {
  const value = num(obj, key, where);
  if (!Number.isInteger(value)) throw new SaveError(`${where}.${key} should be a whole number`);
  return value;
}

function list(obj: Json, key: string, where: string): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) throw new SaveError(`${where}.${key} should be a list`);
  return value;
}

function str(obj: Json, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== 'string') throw new SaveError(`${where}.${key} should be text`);
  return value;
}

function parseObject(raw: unknown, index: number): FarmObject {
  const where = `objects[${index}]`;
  if (!isRecord(raw)) throw new SaveError(`${where} should be an object`);
  const base = { id: str(raw, 'id', where), x: int(raw, 'x', where), y: int(raw, 'y', where) };
  const kind = raw['kind'];

  if (kind === 'building') {
    const typeId = raw['typeId'];
    if (!isBuildingId(typeId)) throw new SaveError(`${where}.typeId is not a known building`);
    return { ...base, kind, typeId };
  }

  if (kind === 'tree') {
    const typeId = raw['typeId'];
    if (!isTreeId(typeId)) throw new SaveError(`${where}.typeId is not a known tree`);
    return { ...base, kind, typeId, lastHarvestAt: num(raw, 'lastHarvestAt', where) };
  }

  if (kind === 'animal') {
    const typeId = raw['typeId'];
    if (!isAnimalId(typeId)) throw new SaveError(`${where}.typeId is not a known animal`);
    return { ...base, kind, typeId, lastHarvestAt: num(raw, 'lastHarvestAt', where) };
  }

  if (kind === 'decoration') {
    const typeId = raw['typeId'];
    if (!isDecorationId(typeId)) throw new SaveError(`${where}.typeId is not a known decoration`);
    return { ...base, kind, typeId };
  }

  if (kind === 'plot') {
    const state = raw['state'];
    if (state === 'plowed' || state === 'harvested') return { ...base, kind, state };
    if (state === 'planted') {
      const cropId = raw['cropId'];
      if (!isCropId(cropId)) throw new SaveError(`${where}.cropId is not a known crop`);
      const fertilized = raw['fertilized'];
      if (typeof fertilized !== 'boolean') throw new SaveError(`${where}.fertilized should be true or false`);
      return {
        ...base,
        kind,
        state,
        cropId,
        plantedAt: num(raw, 'plantedAt', where),
        witherAt: num(raw, 'witherAt', where),
        fertilized,
      };
    }
    throw new SaveError(`${where}.state is not a known plot state`);
  }

  throw new SaveError(`${where}.kind is not a known kind of object`);
}

// Upgrades an older save one version at a time until it's current. Each step
// only knows how to go from one version to the next, so a version 1 save
// walks through every step in order.
const MIGRATIONS: Readonly<Record<number, (raw: Json) => Json>> = {
  // Version 2 added trees, animals and decorations. A version 1 farm has
  // none, so it's already a valid version 2 farm.
  1: (raw) => ({ ...raw, version: 2 }),
  // Version 3 added test mode's clock offset. Older farms have never been
  // in test mode, so they're on real time.
  2: (raw) => ({ ...raw, version: 3, timeOffset: 0 }),
  // Version 4 added the harvest basket. Older farms sold everything on the
  // spot, so their basket starts empty.
  3: (raw) => ({ ...raw, version: 4, basket: {} }),
  // Version 5 added neighbors, gifts and the news feed. Neighbor activity
  // starts from the last time the farm was played, so an old farm isn't
  // flooded with visits it never had.
  4: (raw) => ({ ...raw, version: 5, neighbors: {}, gifts: [], feed: [], neighborsCheckedAt: raw['lastSeenAt'] }),
  // Version 6 lets small animals share a square. Nothing in an older save
  // changes; the new number just stops older versions of the game from
  // reading a shared square as two objects overlapping by mistake.
  5: (raw) => ({ ...raw, version: 6 }),
};

const isNeighborId = (v: unknown): v is NeighborId => typeof v === 'string' && Object.hasOwn(NEIGHBORS, v);

function parsePlaceable(raw: unknown, where: string): Placeable {
  if (!isRecord(raw)) throw new SaveError(`${where} should be an object`);
  const { kind, id } = raw;
  if (kind === 'tree' && isTreeId(id)) return { kind, id };
  if (kind === 'animal' && isAnimalId(id)) return { kind, id };
  if (kind === 'decoration' && isDecorationId(id)) return { kind, id };
  throw new SaveError(`${where} is not something that can be placed`);
}

function parseNeighbors(raw: unknown): FarmState['neighbors'] {
  if (!isRecord(raw)) throw new SaveError('save.neighbors should be an object');
  const out: { [id: string]: NeighborRecord } = {};
  for (const [id, rec] of Object.entries(raw)) {
    const where = `save.neighbors.${id}`;
    if (!isNeighborId(id)) throw new SaveError(`${where} is not a known neighbor`);
    if (!isRecord(rec)) throw new SaveError(`${where} should be an object`);
    const helped = rec['helped'];
    if (!Array.isArray(helped) || !helped.every((h) => typeof h === 'string')) {
      throw new SaveError(`${where}.helped should be a list of ids`);
    }
    out[id] = { day: int(rec, 'day', where), helped };
  }
  return out;
}

function parseFeedEvent(raw: unknown, index: number): FeedEvent {
  const where = `save.feed[${index}]`;
  if (!isRecord(raw)) throw new SaveError(`${where} should be an object`);
  const neighbor = raw['neighbor'];
  if (!isNeighborId(neighbor)) throw new SaveError(`${where}.neighbor is not a known neighbor`);
  const at = num(raw, 'at', where);
  switch (raw['kind']) {
    case 'movedIn':
      return { kind: 'movedIn', at, neighbor };
    case 'fertilized':
      return { kind: 'fertilized', at, neighbor, count: int(raw, 'count', where) };
    case 'gift':
      return { kind: 'gift', at, neighbor, gift: parsePlaceable(raw['gift'], `${where}.gift`) };
    case 'harvested': {
      const crop = raw['crop'];
      if (!isCropId(crop)) throw new SaveError(`${where}.crop is not a known crop`);
      return { kind: 'harvested', at, neighbor, crop, count: int(raw, 'count', where) };
    }
    default:
      throw new SaveError(`${where}.kind is not a known kind of news`);
  }
}

function parseBasket(raw: unknown): Basket {
  if (!isRecord(raw)) throw new SaveError('save.basket should be an object');
  const basket: { [id: string]: number } = {};
  for (const [id, count] of Object.entries(raw)) {
    if (!isProduceId(id)) throw new SaveError(`save.basket.${id} is not a known kind of produce`);
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      throw new SaveError(`save.basket.${id} should be a whole number, zero or more`);
    }
    if (count > 0) basket[id] = count;
  }
  return basket;
}

function migrate(input: Json): Json {
  let raw = input;
  for (;;) {
    const version = raw['version'];
    if (version === SAVE_VERSION) return raw;
    if (typeof version === 'number' && version > SAVE_VERSION) {
      throw new SaveError(`This farm was saved by a newer version of Back40 (save version ${version})`, 'newer');
    }
    const step = typeof version === 'number' ? MIGRATIONS[version] : undefined;
    if (!step) throw new SaveError(`This save is from version ${String(version)}, which this game doesn't know how to load`);
    raw = step(raw);
  }
}

export function parseSave(input: unknown): FarmState {
  if (!isRecord(input)) throw new SaveError('The save should be an object');
  const raw = migrate(input);
  const objectsRaw = raw['objects'];
  if (!Array.isArray(objectsRaw)) throw new SaveError('save.objects should be a list');

  const expansion = int(raw, 'expansion', 'save');
  if (expansion < 0 || expansion >= EXPANSIONS.length) throw new SaveError('save.expansion is out of range');
  const size = EXPANSIONS[expansion]?.size ?? 0;

  const objects = objectsRaw.map(parseObject);
  const ids = new Set<string>();
  const onTile = new Map<string, FarmObject[]>();
  for (const obj of objects) {
    if (ids.has(obj.id)) throw new SaveError(`Two objects share the id ${obj.id}`);
    ids.add(obj.id);
    const { width, depth } = footprint(obj);
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < depth; dy++) {
        const x = obj.x + dx;
        const y = obj.y + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) throw new SaveError(`${obj.id} sits off the farm`);
        const key = `${x},${y}`;
        const there = [...(onTile.get(key) ?? []), obj];
        // Animals may share a square if they fit; nothing else may overlap.
        if (there.length > 1) {
          const used = spaceUsed(there);
          if (used === null) throw new SaveError(`Two objects overlap at ${key}`);
          if (used > SQUARE_SPACE) throw new SaveError(`Too many animals share the square at ${key}`);
        }
        onTile.set(key, there);
      }
    }
  }

  const timeOffset = num(raw, 'timeOffset', 'save');
  if (timeOffset < 0) throw new SaveError('save.timeOffset can only move the clock forward');

  return {
    version: SAVE_VERSION,
    seed: int(raw, 'seed', 'save'),
    createdAt: num(raw, 'createdAt', 'save'),
    lastSeenAt: num(raw, 'lastSeenAt', 'save'),
    coins: int(raw, 'coins', 'save'),
    xp: int(raw, 'xp', 'save'),
    expansion,
    nextId: int(raw, 'nextId', 'save'),
    objects,
    timeOffset,
    basket: parseBasket(raw['basket']),
    neighbors: parseNeighbors(raw['neighbors']),
    gifts: list(raw, 'gifts', 'save').map((g, i) => parsePlaceable(g, `save.gifts[${i}]`)),
    feed: list(raw, 'feed', 'save').map(parseFeedEvent).slice(-FEED_LENGTH),
    neighborsCheckedAt: num(raw, 'neighborsCheckedAt', 'save'),
  };
}
