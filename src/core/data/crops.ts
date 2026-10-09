// Every crop, from SPEC.md "Crops". Prices in coins, times in hours.
// Seed price excludes the 15 coin plow. plantXp is the XP for planting, as
// the market listed it; plowing and harvesting add 1 each on top. Tune
// freely; nothing else needs to change when these numbers do.

export type Crop = {
  readonly name: string;
  readonly level: number;
  readonly seed: number;
  readonly sells: number;
  readonly hours: number;
  readonly plantXp: number;
};

export const CROPS = {
  // From the 2009 crop chart.
  strawberries: { name: 'Strawberries', level: 1, seed: 10, sells: 35, hours: 4, plantXp: 1 },
  wheat: { name: 'Wheat', level: 1, seed: 15, sells: 52, hours: 72, plantXp: 3 },
  pumpkin: { name: 'Pumpkins', level: 1, seed: 30, sells: 68, hours: 8, plantXp: 1 },
  eggplant: { name: 'Eggplant', level: 1, seed: 25, sells: 72, hours: 48, plantXp: 3 },
  raspberries: { name: 'Raspberries', level: 2, seed: 20, sells: 46, hours: 2, plantXp: 1 },
  blueberries: { name: 'Blueberries', level: 7, seed: 50, sells: 91, hours: 4, plantXp: 2 },
  aloeVera: { name: 'Aloe Vera', level: 9, seed: 40, sells: 83, hours: 6, plantXp: 2 },
  tomatoes: { name: 'Tomatoes', level: 10, seed: 34, sells: 86, hours: 8, plantXp: 2 },
  watermelon: { name: 'Watermelon', level: 11, seed: 50, sells: 172, hours: 96, plantXp: 3 },
  coffee: { name: 'Coffee', level: 12, seed: 50, sells: 117, hours: 16, plantXp: 2 },
  broccoli: { name: 'Broccoli', level: 13, seed: 60, sells: 167, hours: 48, plantXp: 5 },
  rice: { name: 'Rice', level: 14, seed: 45, sells: 98, hours: 12, plantXp: 2 },
  grapes: { name: 'Grapes', level: 15, seed: 65, sells: 152, hours: 24, plantXp: 3 },
  carrots: { name: 'Carrots', level: 18, seed: 35, sells: 84, hours: 12, plantXp: 2 },
  sugarCane: { name: 'Sugar Cane', level: 20, seed: 45, sells: 103, hours: 8, plantXp: 2 },
  sunflowers: { name: 'Sunflowers', level: 23, seed: 80, sells: 182, hours: 24, plantXp: 3 },
  corn: { name: 'Corn', level: 24, seed: 40, sells: 128, hours: 72, plantXp: 3 },
  // Not on the 2009 chart; from later market listings (about 2011).
  soybeans: { name: 'Soybeans', level: 1, seed: 15, sells: 63, hours: 24, plantXp: 2 },
  peanuts: { name: 'Peanuts', level: 1, seed: 20, sells: 78, hours: 16, plantXp: 1 },
  lilac: { name: 'Lilac', level: 4, seed: 35, sells: 75, hours: 10, plantXp: 1 },
  squash: { name: 'Squash', level: 4, seed: 40, sells: 121, hours: 48, plantXp: 2 },
  spinach: { name: 'Spinach', level: 6, seed: 35, sells: 95, hours: 14, plantXp: 2 },
  artichokes: { name: 'Artichokes', level: 6, seed: 70, sells: 204, hours: 96, plantXp: 2 },
  daffodils: { name: 'Daffodils', level: 8, seed: 60, sells: 135, hours: 48, plantXp: 2 },
  cotton: { name: 'Cotton', level: 9, seed: 75, sells: 207, hours: 72, plantXp: 2 },
  cranberries: { name: 'Cranberries', level: 10, seed: 55, sells: 98, hours: 10, plantXp: 1 },
  chickpeas: { name: 'Chickpeas', level: 10, seed: 80, sells: 210, hours: 20, plantXp: 2 },
  bellPeppers: { name: 'Bell Peppers', level: 11, seed: 75, sells: 198, hours: 48, plantXp: 2 },
  rhubarb: { name: 'Rhubarb', level: 11, seed: 65, sells: 150, hours: 16, plantXp: 1 },
  peppers: { name: 'Peppers', level: 12, seed: 70, sells: 162, hours: 24, plantXp: 2 },
  morningGlory: { name: 'Morning Glory', level: 13, seed: 60, sells: 123, hours: 12, plantXp: 1 },
  pineapples: { name: 'Pineapples', level: 15, seed: 95, sells: 242, hours: 48, plantXp: 2 },
  redTulips: { name: 'Red Tulips', level: 15, seed: 75, sells: 159, hours: 24, plantXp: 2 },
  pattypanSquash: { name: 'Pattypan Squash', level: 16, seed: 65, sells: 160, hours: 16, plantXp: 1 },
  pinkRoses: { name: 'Pink Roses', level: 20, seed: 120, sells: 254, hours: 48, plantXp: 2 },
} as const satisfies Record<string, Crop>;

export type CropId = keyof typeof CROPS;

export const CROP_IDS = Object.keys(CROPS) as CropId[];

export function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && Object.hasOwn(CROPS, value);
}
