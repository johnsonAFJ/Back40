// Everything about neighbors on screen: portraits, the Neighbors window
// (who lives here, visiting, and the farm news), and the "While you were
// away" card.

import { productInfo } from '../core/catalog';
import { CROPS } from '../core/data/crops';
import { NEIGHBORS, NEIGHBOR_IDS, type NeighborId } from '../core/data/neighbors';
import { helpsLeft, HELPS_PER_DAY } from '../core/neighbors';
import type { FarmState, FeedEvent } from '../core/state';
import { formatDuration } from './format';

// A simple drawn portrait: a colored circle, a cap of hair, and an initial.
export function avatar(id: NeighborId, size: 'small' | 'large' = 'small'): string {
  const n = NEIGHBORS[id];
  return `<span class="avatar avatar-${size}" style="--face:${n.color};--hair:${n.hair}" aria-hidden="true">${n.name[0] ?? ''}</span>`;
}

// One line of news, in plain words.
export function newsLine(e: FeedEvent): string {
  const name = NEIGHBORS[e.neighbor].name;
  switch (e.kind) {
    case 'movedIn':
      return `${name} moved in down the road`;
    case 'fertilized':
      return `${name} fertilized ${e.count} of your crops`;
    case 'gift':
      return `${name} left you a gift: ${productInfo(e.gift).name.toLowerCase()}`;
    case 'harvested':
      return `${name} harvested ${e.count} ${CROPS[e.crop].name.toLowerCase()}`;
    default: {
      const _exhaustive: never = e;
      return _exhaustive;
    }
  }
}

const READ_KEY = 'back40-news-read';

// When the news was last looked at is a per-browser convenience, not part of
// the farm.
function readUpTo(): number {
  try {
    return Number(localStorage.getItem(READ_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function markRead(at: number): void {
  try {
    localStorage.setItem(READ_KEY, String(at));
  } catch {
    // Forgetting what was read only means the dot shows again.
  }
}

export function hasUnreadNews(farm: FarmState): boolean {
  const last = farm.feed[farm.feed.length - 1];
  return last !== undefined && last.at > readUpTo();
}

export type NeighborsWindow = {
  readonly open: (farm: FarmState, now: number, tz: number) => void;
  readonly refresh: (farm: FarmState, now: number, tz: number) => void;
};

export function createNeighborsWindow(dialog: HTMLDialogElement, onVisit: (id: NeighborId) => void, onRead: () => void): NeighborsWindow {
  const render = (farm: FarmState, now: number, tz: number): void => {
    const rows = NEIGHBOR_IDS.map((id) => {
      const n = NEIGHBORS[id];
      if (!farm.neighbors[id]) {
        return `
          <li class="neighbor-row" data-locked="true">
            ${avatar(id)}
            <span class="neighbor-main">
              <span class="card-name">${n.name}</span>
              <span class="card-line">Moves in at level ${n.movesInAt}</span>
            </span>
          </li>`;
      }
      const left = helpsLeft(farm, id, now, tz);
      return `
        <li class="neighbor-row">
          ${avatar(id)}
          <span class="neighbor-main">
            <span class="card-name">${n.name}</span>
            <span class="card-line">${n.farm}</span>
            <span class="card-line helps">${left > 0 ? `${left} of ${HELPS_PER_DAY} helps left today` : 'All helped out for today'}</span>
          </span>
          <button type="button" class="primary visit-button" data-visit="${id}">Visit</button>
        </li>`;
    }).join('');
    const news = [...farm.feed]
      .reverse()
      .map(
        (e) => `
        <li class="news-row">
          ${avatar(e.neighbor)}
          <span>${newsLine(e)}</span>
          <span class="news-when">${now - e.at < 60_000 ? 'just now' : `${formatDuration(now - e.at)} ago`}</span>
        </li>`,
      )
      .join('');
    dialog.innerHTML = `
      <div class="neighbors">
        <header class="market-head">
          <h2>Neighbors</h2>
          <button type="button" class="close" data-close aria-label="Close neighbors">×</button>
        </header>
        <ul class="neighbor-list">${rows}</ul>
        <h3 class="news-head">Farm news</h3>
        ${news ? `<ul class="news-list">${news}</ul>` : '<p class="basket-empty">No news yet. It starts when your first neighbor moves in, at level 3.</p>'}
      </div>`;
  };

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) return dialog.close();
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest('[data-close]')) return dialog.close();
    const id = NEIGHBOR_IDS.find((n) => n === target.closest<HTMLElement>('[data-visit]')?.dataset['visit']);
    if (id) {
      dialog.close();
      onVisit(id);
    }
  });

  return {
    open(farm, now, tz) {
      render(farm, now, tz);
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-visit], [data-close]')?.focus();
      const last = farm.feed[farm.feed.length - 1];
      if (last) markRead(last.at);
      onRead();
    },
    refresh(farm, now, tz) {
      if (dialog.open) render(farm, now, tz);
    },
  };
}

// The card shown on opening the game when neighbors did things while you
// were gone. Their own harvest news is left to the news list.
export function showAway(dialog: HTMLDialogElement, events: readonly FeedEvent[]): void {
  const worth = events.filter((e) => e.kind !== 'harvested');
  if (worth.length === 0) return;
  dialog.innerHTML = `
    <div class="levelup away">
      <p class="levelup-eyebrow">While you were away</p>
      <ul class="away-list">
        ${worth.map((e) => `<li>${avatar(e.neighbor)}<span>${newsLine(e)}</span></li>`).join('')}
      </ul>
      ${worth.some((e) => e.kind === 'gift') ? '<p class="levelup-next">Gifts are waiting in the market, under Gifts.</p>' : ''}
      <button type="button" class="primary" data-close>Back to the farm</button>
    </div>`;
  dialog.addEventListener(
    'click',
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (e.target === dialog || target?.closest('[data-close]')) dialog.close();
    },
    { once: false },
  );
  dialog.showModal();
  dialog.querySelector<HTMLElement>('[data-close]')?.focus();
}
