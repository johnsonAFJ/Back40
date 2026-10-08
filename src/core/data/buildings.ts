// Buildings that come with the farm. Bought buildings join this list in
// milestone 4.

export type Building = {
  readonly name: string;
  readonly width: number;
  readonly depth: number;
};

export const BUILDINGS = {
  farmhouse: { name: 'Farmhouse', width: 3, depth: 3 },
} as const satisfies Record<string, Building>;

export type BuildingId = keyof typeof BUILDINGS;

export function isBuildingId(value: unknown): value is BuildingId {
  return typeof value === 'string' && Object.hasOwn(BUILDINGS, value);
}
