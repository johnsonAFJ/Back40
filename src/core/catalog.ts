// One way to talk about anything the market sells. A `Product` names a crop,
// tree, animal, decoration or support (a trellis); `productInfo` gives the facts every screen
// needs about it, whatever kind it is.

import { CROPS, CROP_IDS, type CropId } from './data/crops';
import {
  ANIMALS,
  ANIMAL_IDS,
  DECORATIONS,
  DECORATION_IDS,
  TREES,
  TREE_IDS,
  type AnimalId,
  type DecorationId,
  type TreeId,
} from './data/items';
import { SUPPORTS, SUPPORT_IDS, type SupportId } from './data/supports';

export type Product =
  | { readonly kind: 'crop'; readonly id: CropId }
  | { readonly kind: 'tree'; readonly id: TreeId }
  | { readonly kind: 'animal'; readonly id: AnimalId }
  | { readonly kind: 'decoration'; readonly id: DecorationId }
  | { readonly kind: 'support'; readonly id: SupportId };

export type ProductKind = Product['kind'];

// Things bought and then placed on the farm. Crops are planted, not placed.
export type Placeable = Exclude<Product, { kind: 'crop' }>;

export type ProductInfo = {
  readonly name: string;
  readonly level: number;
  // What one costs. For a crop that's the seed, paid at each planting.
  readonly price: number;
  readonly buyXp: number;
  readonly width: number;
  readonly depth: number;
};

export function productInfo(p: Product): ProductInfo {
  switch (p.kind) {
    case 'crop': {
      const c = CROPS[p.id];
      return { name: c.name, level: c.level, price: c.seed, buyXp: c.plantXp, width: 1, depth: 1 };
    }
    case 'tree':
    case 'animal': {
      const item = p.kind === 'tree' ? TREES[p.id] : ANIMALS[p.id];
      return { name: item.name, level: item.level, price: item.price, buyXp: item.buyXp, width: 1, depth: 1 };
    }
    case 'decoration': {
      const d = DECORATIONS[p.id];
      return { name: d.name, level: d.level, price: d.price, buyXp: d.buyXp, width: d.width, depth: d.depth };
    }
    case 'support': {
      const t = SUPPORTS[p.id];
      return { name: t.name, level: t.level, price: t.price, buyXp: t.buyXp, width: 1, depth: 1 };
    }
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
}

// Every product of a kind, in market order: by unlock level, then price.
export function productsOf(kind: ProductKind): Product[] {
  const all: Product[] =
    kind === 'crop'
      ? CROP_IDS.map((id) => ({ kind, id }))
      : kind === 'tree'
        ? TREE_IDS.map((id) => ({ kind, id }))
        : kind === 'animal'
          ? ANIMAL_IDS.map((id) => ({ kind, id }))
          : kind === 'decoration'
            ? DECORATION_IDS.map((id) => ({ kind, id }))
            : SUPPORT_IDS.map((id) => ({ kind, id }));
  return all.sort((a, b) => {
    const ia = productInfo(a);
    const ib = productInfo(b);
    return ia.level - ib.level || ia.price - ib.price;
  });
}

export const PRODUCT_KINDS: readonly ProductKind[] = ['crop', 'tree', 'animal', 'decoration', 'support'];

export function sameProduct(a: Product, b: Product): boolean {
  return a.kind === b.kind && a.id === b.id;
}
