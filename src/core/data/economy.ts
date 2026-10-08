// The fixed prices and rewards outside any one item. See SPEC.md "Farming".

export const STARTING_COINS = 200;
export const PLOW_COST = 15;
export const PLOW_XP = 1;
export const HARVEST_XP = 1;
export const FERTILIZED_BONUS_XP = 1;

// A crop stays safe for one grow time after ripening, then withers at a
// random moment within the next half grow time.
export const SAFE_GROW_TIMES = 1;
export const CUSHION_GROW_TIMES = 0.5;

// New farms start with strawberries this close to ready. See DESIGN.md
// "Starting crops".
export const STARTER_CROP_MINUTES_LEFT = 5;
