// The fixed prices and rewards outside any one item. See SPEC.md "Farming".

export const STARTING_COINS = 200;
export const PLOW_COST = 15;
export const PLOW_XP = 1;
export const HARVEST_XP = 1;
export const FERTILIZED_BONUS_XP = 1;

// A crop withers this many grow times after it was planted: a 4 hour crop
// ripens at 4 hours and withers at 10, as the 2009 chart had it.
export const WITHER_GROW_TIMES = 2.5;

// New farms start with strawberries this close to ready. See DESIGN.md
// "Starting crops".
export const STARTER_CROP_MINUTES_LEFT = 5;

// The bailout (core/bailout.ts): a farm under BAILOUT_UNDER coins can claim
// BAILOUT_COINS, once every BAILOUT_EVERY_DAYS days.
export const BAILOUT_COINS = 100;
export const BAILOUT_UNDER = 20;
export const BAILOUT_EVERY_DAYS = 3;
