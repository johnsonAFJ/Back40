// The coins, level, XP and basket display at the top of the screen, and the
// bailout button when a farm is nearly out of coins.

import { bailoutStatus } from '../core/bailout';
import { basketTotal } from '../core/basket';
import { BAILOUT_COINS } from '../core/data/economy';
import { levelProgress } from '../core/levels';
import type { FarmState } from '../core/state';
import { formatCoins, formatDuration } from './format';

// `now` is farm time, for the bailout's countdown.
export type Hud = { readonly update: (farm: FarmState, now: number) => void };

export type HudActions = { readonly openBasket: () => void; readonly bailout: () => void };

export function createHud(root: HTMLElement, actions: HudActions): Hud {
  root.innerHTML = `
    <div class="pill stat" title="Coins">
      <span class="coin" aria-hidden="true"></span>
      <span class="stat-value" data-coins></span>
    </div>
    <div class="pill stat level" title="Level and experience">
      <span class="level-badge" data-level></span>
      <span class="xp">
        <span class="xp-bar"><span class="xp-fill" data-xp-fill></span></span>
        <span class="xp-label" data-xp-label></span>
      </span>
    </div>
    <button type="button" class="pill stat basket-button" data-basket title="Your harvest basket">
      <svg class="basket-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10h16l-2 10H6z" />
        <path d="M8 10 11 4M16 10l-3-6" />
      </svg>
      <span class="stat-value" data-basket-count></span>
      <span class="visually-hidden">items in your basket</span>
    </button>
    <button type="button" class="pill stat bailout" data-bailout hidden></button>`;

  const find = (attr: string): HTMLElement => {
    const el = root.querySelector(`[${attr}]`);
    if (!(el instanceof HTMLElement)) throw new Error(`HUD is missing ${attr}`);
    return el;
  };
  const coins = find('data-coins');
  const level = find('data-level');
  const fill = find('data-xp-fill');
  const label = find('data-xp-label');
  const basketCount = find('data-basket-count');
  const basketButton = find('data-basket');
  basketButton.addEventListener('click', actions.openBasket);
  const bailoutButton = find('data-bailout');
  if (!(bailoutButton instanceof HTMLButtonElement)) throw new Error('HUD bailout should be a button');
  bailoutButton.addEventListener('click', actions.bailout);
  let lastCount = -1;

  return {
    update(farm, now) {
      const progress = levelProgress(farm.xp);
      coins.textContent = formatCoins(farm.coins);
      level.textContent = String(progress.level);
      fill.style.width = `${(progress.intoLevel / progress.levelSize) * 100}%`;
      label.textContent = `${progress.intoLevel} / ${progress.levelSize} XP`;
      const count = basketTotal(farm.basket);
      basketCount.textContent = String(count);
      // A little hop when something new lands in the basket.
      if (lastCount >= 0 && count > lastCount) {
        basketButton.classList.remove('hop');
        void basketButton.offsetWidth;
        basketButton.classList.add('hop');
      }
      lastCount = count;

      const status = bailoutStatus(farm, now);
      bailoutButton.hidden = status.kind === 'notNeeded';
      bailoutButton.disabled = status.kind === 'waiting';
      bailoutButton.textContent =
        status.kind === 'waiting' ? `More coins in ${formatDuration(status.readyAt - now)}` : `Get ${formatCoins(BAILOUT_COINS)} coins`;
      bailoutButton.title =
        status.kind === 'waiting'
          ? 'Running low? You can get more coins once every 3 days'
          : `Running low? Get ${formatCoins(BAILOUT_COINS)} coins to keep farming. Once every 3 days`;
    },
  };
}
