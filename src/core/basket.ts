// Selling from the harvest basket. Trees and animals fill it (see harvest in
// actions.ts); these empty it for coins at each produce's price.

import { PRODUCE, PRODUCE_IDS, type ProduceId } from './data/produce';
import type { Basket, FarmState } from './state';

export function basketTotal(basket: Basket): number {
  return PRODUCE_IDS.reduce((sum, id) => sum + (basket[id] ?? 0), 0);
}

export function basketValue(basket: Basket): number {
  return PRODUCE_IDS.reduce((sum, id) => sum + (basket[id] ?? 0) * PRODUCE[id].sells, 0);
}

// What's in the basket, in a stable order, skipping anything there's none of.
export function basketContents(basket: Basket): Array<{ readonly id: ProduceId; readonly count: number }> {
  return PRODUCE_IDS.flatMap((id) => {
    const count = basket[id] ?? 0;
    return count > 0 ? [{ id, count }] : [];
  });
}

export type Sale = { readonly state: FarmState; readonly coins: number; readonly sold: number };

// Sells every piece of one kind of produce.
export function sellProduce(state: FarmState, id: ProduceId): Sale {
  const count = state.basket[id] ?? 0;
  const coins = count * PRODUCE[id].sells;
  const { [id]: _sold, ...rest } = state.basket;
  return { state: { ...state, basket: rest, coins: state.coins + coins }, coins, sold: count };
}

// Sells everything in the basket.
export function sellBasket(state: FarmState): Sale {
  const coins = basketValue(state.basket);
  const sold = basketTotal(state.basket);
  return { state: { ...state, basket: {}, coins: state.coins + coins }, coins, sold };
}
