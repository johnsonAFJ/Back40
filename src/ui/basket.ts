// The harvest basket: what's been collected from trees and animals, and
// buttons to sell it.

import { basketContents, basketTotal, basketValue } from '../core/basket';
import { PRODUCE, isProduceId, type ProduceId } from '../core/data/produce';
import type { FarmState } from '../core/state';
import { produceThumbnail } from '../render/thumbnails';
import { formatCoins } from './format';

export type BasketActions = {
  readonly sellOne: (id: ProduceId) => void;
  readonly sellAll: () => void;
};

export type BasketView = {
  readonly open: (farm: FarmState) => void;
  readonly refresh: (farm: FarmState) => void;
};

const coinIcon = '<span class="coin coin-small" aria-hidden="true"></span>';

export function createBasket(dialog: HTMLDialogElement, actions: BasketActions): BasketView {
  const render = (farm: FarmState): void => {
    const contents = basketContents(farm.basket);
    const rows = contents
      .map(({ id, count }) => {
        const p = PRODUCE[id];
        return `
          <li class="basket-row">
            <img class="basket-icon" src="${produceThumbnail(id)}" alt="" />
            <span class="basket-main">
              <span class="card-name">${count} ${count === 1 ? p.single : p.name}</span>
              <span class="card-line card-money">${coinIcon}${formatCoins(p.sells)} each</span>
            </span>
            <button type="button" class="secondary basket-sell" data-sell="${id}">Sell for ${formatCoins(count * p.sells)}</button>
          </li>`;
      })
      .join('');
    const total = basketTotal(farm.basket);
    dialog.innerHTML = `
      <div class="basket">
        <header class="market-head">
          <h2>Basket</h2>
          <button type="button" class="close" data-close aria-label="Close basket">×</button>
        </header>
        ${
          total === 0
            ? `<p class="basket-empty">Nothing yet. Eggs, milk, fruit and the rest go here when you collect them from your trees and animals.</p>`
            : `<ul class="basket-list">${rows}</ul>
               <footer class="basket-foot">
                 <span>${total} ${total === 1 ? 'item' : 'items'}</span>
                 <button type="button" class="primary" data-sell-all>Sell everything for ${formatCoins(basketValue(farm.basket))}</button>
               </footer>`
        }
      </div>`;
  };

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) return dialog.close();
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest('[data-close]')) return dialog.close();
    if (target.closest('[data-sell-all]')) return actions.sellAll();
    const id = target.closest<HTMLElement>('[data-sell]')?.dataset['sell'];
    if (isProduceId(id)) actions.sellOne(id);
  });

  return {
    open(farm) {
      render(farm);
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-sell-all], [data-close]')?.focus();
    },
    refresh(farm) {
      if (dialog.open) render(farm);
    },
  };
}
