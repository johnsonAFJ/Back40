// The test panel: speed up the farm's clock, skip ahead, and cheat. It only
// exists when the address ends in ?test, so friends playing normally never
// see it. Everything it does goes through core/cheats.ts.

import { DAY, HOUR } from '../core/clock';
import { formatDuration } from './format';

export type TestActions = {
  readonly setSpeed: (speed: number) => void;
  readonly skip: (ms: number) => void;
  readonly addCoins: (coins: number) => void;
  readonly levelUp: () => void;
  readonly readyEverything: () => void;
  readonly reset: () => void;
};

export type TestPanel = { readonly update: (offset: number, speed: number) => void };

// Each speed is how much farm time passes per real second.
const SPEEDS: ReadonlyArray<readonly [number, string]> = [
  [1, 'Real time'],
  [60, '1 min/s'],
  [600, '10 min/s'],
  [3600, '1 hr/s'],
];

const SKIPS: ReadonlyArray<readonly [number, string]> = [
  [HOUR, '+1 hour'],
  [8 * HOUR, '+8 hours'],
  [DAY, '+1 day'],
];

export function isTestMode(): boolean {
  return new URLSearchParams(window.location.search).has('test');
}

export function createTestPanel(toggle: HTMLButtonElement, panel: HTMLElement, actions: TestActions): TestPanel {
  toggle.hidden = false;
  panel.innerHTML = `
    <header class="test-head">
      <h2>Test mode</h2>
      <p>Only on this device. Changes here are saved to this farm.</p>
    </header>
    <section class="test-group">
      <h3>Farm clock</h3>
      <p class="test-clock" data-clock></p>
      <div class="test-buttons" role="group" aria-label="Clock speed">
        ${SPEEDS.map(([speed, label]) => `<button type="button" class="chip" data-speed="${speed}" aria-pressed="false">${label}</button>`).join('')}
      </div>
      <div class="test-buttons" role="group" aria-label="Skip ahead">
        ${SKIPS.map(([ms, label]) => `<button type="button" class="chip" data-skip="${ms}">${label}</button>`).join('')}
      </div>
    </section>
    <section class="test-group">
      <h3>Coins and levels</h3>
      <div class="test-buttons">
        <button type="button" class="chip" data-coins="1000">+1,000 coins</button>
        <button type="button" class="chip" data-coins="10000">+10,000 coins</button>
        <button type="button" class="chip" data-level>+1 level</button>
      </div>
    </section>
    <section class="test-group">
      <h3>Farm</h3>
      <div class="test-buttons">
        <button type="button" class="chip" data-ready>Ready everything</button>
        <button type="button" class="chip chip-danger" data-reset>Start a new farm</button>
      </div>
    </section>`;

  const clockLine = panel.querySelector<HTMLElement>('[data-clock]');

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });

  panel.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>('button') : null;
    if (!el) return;
    const { speed, skip, coins } = el.dataset;
    if (speed) actions.setSpeed(Number(speed));
    else if (skip) actions.skip(Number(skip));
    else if (coins) actions.addCoins(Number(coins));
    else if ('level' in el.dataset) actions.levelUp();
    else if ('ready' in el.dataset) actions.readyEverything();
    else if ('reset' in el.dataset) actions.reset();
  });

  return {
    update(offset, speed) {
      if (clockLine) {
        clockLine.textContent = offset > 0 ? `${formatDuration(offset)} ahead of real time` : 'On real time';
      }
      for (const b of panel.querySelectorAll<HTMLElement>('[data-speed]')) {
        b.setAttribute('aria-pressed', String(Number(b.dataset['speed']) === speed));
      }
      toggle.dataset['fast'] = String(speed > 1);
    },
  };
}
