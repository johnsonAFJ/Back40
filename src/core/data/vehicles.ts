// Vehicles: bought once and parked just off the farm, on the grass by the
// farmhouse corner. The farm only ever grows away from that corner (see
// core/land.ts), so a parking spot never ends up inside it. Our version of
// the 2009 tractor and seeder, without their fuel; see DESIGN.md
// "Departures".

// What a vehicle does to each square it covers.
export type Job = 'plow' | 'plant';

export type Vehicle = {
  readonly name: string;
  readonly level: number;
  readonly price: number;
  readonly buyXp: number;
  readonly job: Job;
  // How many squares on a side it covers with one tap. Dragging covers a
  // whole field instead.
  readonly reach: number;
  // The tile it's parked on, outside the farm.
  readonly parking: { readonly x: number; readonly y: number };
};

export const VEHICLES = {
  tractor: { name: 'Tractor', level: 10, price: 5_000, buyXp: 50, job: 'plow', reach: 2, parking: { x: -2, y: 3 } },
  seeder: { name: 'Seeder', level: 15, price: 10_000, buyXp: 100, job: 'plant', reach: 2, parking: { x: -2, y: 5 } },
} as const satisfies Record<string, Vehicle>;

export type VehicleId = keyof typeof VEHICLES;

// Object.keys loses the literal key types; this restores them.
export const VEHICLE_IDS = Object.keys(VEHICLES) as VehicleId[];

export const isVehicleId = (v: unknown): v is VehicleId => typeof v === 'string' && Object.hasOwn(VEHICLES, v);
