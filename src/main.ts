// Wires the pieces together: the farm, the camera, input, the HUD, the
// tools and the frame loop. Holds no rules of its own; every rule lives in
// src/core.

import './style.css';
import { move, place, sell, sellValue, useMultiTool, type Outcome } from './core/actions';
import { productInfo, type Placeable } from './core/catalog';
import { sellBasket, sellProduce, type Sale } from './core/basket';
import { addCoins, farmNow, levelUp as cheatLevelUp, readyEverything, skipAhead } from './core/cheats';
import { systemClock } from './core/clock';
import { PRODUCE } from './core/data/produce';
import { expand, nextExpansion } from './core/land';
import { levelForXp } from './core/levels';
import { newSeed } from './core/rng';
import { farmSize, footprint, isAreaFree, isOnFarm, newFarm, objectAt, type FarmState } from './core/state';
import { unlocksBetween } from './core/unlocks';
import { MIN_ZOOM, clampToBounds, pan, screenToWorld, worldToScreen, zoomAt, type Bounds, type Camera, type Viewport } from './render/camera';
import { liveEffects, type FloatingText } from './render/effects';
import { TILE_HEIGHT, TILE_WIDTH, pickTile, screen, tile, tileCenter, tileToWorld, type ScreenPoint, type TilePoint } from './render/iso';
import { objectAtPoint } from './render/hit';
import { render, type Ghost } from './render/renderer';
import { loadFarm, saveFarm } from './platform/storage';
import { formatCoins } from './ui/format';
import { createBasket } from './ui/basket';
import { createHud } from './ui/hud';
import { attachInput } from './ui/input';
import { createLevelUp } from './ui/levelUp';
import { createMarket } from './ui/market';
import { describeSell, describeTile, expandFailureMessage, failureMessage, objectName } from './ui/messages';
import { createToast, createTooltip } from './ui/notices';
import { createTestPanel, isTestMode } from './ui/testPanel';
import { createConfirm, createToolbar, type Mode } from './ui/tools';

function required<T extends Element>(selector: string, type: new () => T): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Missing ${selector} in index.html`);
  return el;
}

const canvas = required('#farm', HTMLCanvasElement);
const ctxOrNull = canvas.getContext('2d', { alpha: false });
if (!ctxOrNull) throw new Error('This browser cannot draw on a canvas.');
const ctx = ctxOrNull;

const clock = systemClock;
let farm: FarmState = loadFarm(clock.now());
saveFarm(farm);

// The farm's time: real time, plus however far test mode has moved it ahead.
// Every rule gets its `now` from here.
const now = (): number => farmNow(farm, clock.now());

let mode: Mode = { kind: 'farm' };
let view: Viewport = { width: 1, height: 1 };
let pixelRatio = 1;
let camera: Camera = fittedCamera();
let highlight: TilePoint | null = null;
let pointerKind: 'mouse' | 'touch' = 'mouse';
let effects: FloatingText[] = [];

const basket = createBasket(required('#basket', HTMLDialogElement), {
  sellOne: (id) => sold(sellProduce(farm, id)),
  sellAll: () => sold(sellBasket(farm)),
});
const hud = createHud(required('#hud', HTMLElement), () => basket.open(farm));
const tooltip = createTooltip(required('#tooltip', HTMLElement));
const toast = createToast(required('#toast', HTMLElement));
const levelUp = createLevelUp(required('#levelup', HTMLDialogElement));
const askConfirm = createConfirm(required('#confirm', HTMLDialogElement));
const market = createMarket(required('#market', HTMLDialogElement), required('#market-button', HTMLButtonElement), {
  onSeed: () => setMode({ kind: 'farm' }),
  onBuy: (item) => setMode({ kind: 'place', item }),
  onExpand: () => void expandFarm(),
});
const toolbar = createToolbar(
  required('#tools', HTMLElement),
  required('#mode-banner', HTMLElement),
  (tool) => setMode(tool === 'farm' ? { kind: 'farm' } : tool === 'move' ? { kind: 'move', held: null, grab: { dx: 0, dy: 0 } } : { kind: 'sell' }),
  () => setMode({ kind: 'farm' }),
);

// ---- Camera ----

// The camera's center may roam anywhere over the farm's bounding box, so some
// part of the farm is always on screen.
function bounds(): Bounds {
  const size = farmSize(farm);
  return { minX: -size * (TILE_WIDTH / 2), maxX: size * (TILE_WIDTH / 2), minY: 0, maxY: size * TILE_HEIGHT };
}

// The zoom that fits the whole farm on screen with a margin, within limits.
function fittedCamera(): Camera {
  const size = farmSize(farm);
  const fit = Math.min(view.width / (size * TILE_WIDTH * 1.1), view.height / (size * TILE_HEIGHT * 1.6));
  return {
    center: tileCenter(tile(size / 2 - 0.5, size / 2 - 0.5)),
    zoom: Math.min(1.25, Math.max(MIN_ZOOM, fit)),
  };
}

function setCamera(next: Camera): void {
  camera = clampToBounds(next, bounds());
  refreshTooltip();
  requestDraw();
}

// ---- Drawing ----

// Where the held item or object would land if dropped on tile `at`. Big
// things are held by their middle (or by the tile they were grabbed by), so
// they stay centered under the cursor.
function ghostAt(at: TilePoint | null): Ghost | null {
  if (!at) return null;
  if (mode.kind === 'place') {
    const { width, depth } = productInfo(mode.item);
    const x = at.x - Math.floor((width - 1) / 2);
    const y = at.y - Math.floor((depth - 1) / 2);
    return { kind: 'product', product: mode.item, x, y, fits: isAreaFree(farm, { x, y, width, depth }) };
  }
  if (mode.kind === 'move' && mode.held) {
    const x = at.x - mode.grab.dx;
    const y = at.y - mode.grab.dy;
    const fits = isAreaFree(farm, { x, y, ...footprint(mode.held) }, mode.held.id);
    return { kind: 'object', obj: mode.held, x, y, fits };
  }
  return null;
}

// Draw only when something changed, and every frame while rewards are
// floating. Calls during the same frame collapse into one draw.
let frameRequested = false;
function requestDraw(): void {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame((frameTime) => {
    frameRequested = false;
    effects = liveEffects(effects, frameTime);
    const hiddenId = mode.kind === 'move' && mode.held ? mode.held.id : null;
    render(ctx, { camera, view, pixelRatio, farm, now: now(), highlight, ghost: ghostAt(highlight), hiddenId, effects, frameTime });
    if (effects.length > 0) requestDraw();
  });
}

// ---- Tooltip and mode banner ----

function tooltipText(t: TilePoint): string | null {
  switch (mode.kind) {
    case 'farm':
      return describeTile(farm, t.x, t.y, market.selected(), now());
    case 'sell':
      return describeSell(farm, t.x, t.y);
    case 'move': {
      if (mode.held) return null;
      const obj = objectAt(farm, t.x, t.y);
      return obj ? `Pick up ${objectName(obj).toLowerCase()}` : null;
    }
    case 'place':
      return null;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function refreshTooltip(): void {
  const text = highlight ? tooltipText(highlight) : null;
  if (!highlight || !text) {
    tooltip.hide();
    return;
  }
  // Anchor above the tile's top corner, a little higher for tall things.
  const top = worldToScreen(camera, view, tileToWorld(highlight));
  tooltip.show(text, screen(top.x, top.y - 18 * camera.zoom));
}

function bannerText(): string | null {
  switch (mode.kind) {
    case 'farm':
      return null;
    case 'place': {
      const info = productInfo(mode.item);
      return `Placing ${info.name.toLowerCase()}, ${formatCoins(info.price)} coins each. Click every spot you want one`;
    }
    case 'move':
      return mode.held ? `Moving ${objectName(mode.held).toLowerCase()}. Click where it goes` : 'Click something to move it';
    case 'sell':
      return 'Click something to sell it';
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function setMode(next: Mode): void {
  mode = next;
  canvas.dataset['mode'] = mode.kind;
  toolbar.show(mode, bannerText());
  refreshTooltip();
  requestDraw();
}

// ---- Acting on the farm ----

function float(at: { x: number; y: number }, lines: ReadonlyArray<readonly [string, string]>): void {
  const center = tileCenter(tile(at.x, at.y));
  const startedAt = performance.now();
  lines.forEach(([text, color], i) => {
    effects.push({ at: { ...center, y: center.y - 10 - i * 16 }, text, color, startedAt: startedAt + i * 120 });
  });
}

// Applies an outcome: on success saves, updates the HUD, shows the reward and
// celebrates a new level; on failure explains why. Returns whether it worked.
function apply(outcome: Outcome): boolean {
  if (!outcome.ok) {
    toast.show(failureMessage(outcome.failure, now()));
    return false;
  }
  const levelBefore = levelForXp(farm.xp);
  setFarm(outcome.state);

  const { coins, xp } = outcome.reward;
  const lines: Array<readonly [string, string]> = [];
  if (coins !== 0) lines.push([`${coins > 0 ? '+' : '−'}${formatCoins(Math.abs(coins))}`, coins > 0 ? '#ffd23f' : '#ffe9c2']);
  if (outcome.reward.produce) lines.push([`+1 ${PRODUCE[outcome.reward.produce].single}`, '#fff3c4']);
  if (xp > 0) lines.push([`+${xp} XP`, '#9fe3ff']);
  float(outcome.at, lines);

  celebrate(levelBefore);
  refreshTooltip();
  requestDraw();
  return true;
}

// Replaces the farm, saves it and updates everything that shows it.
function setFarm(next: FarmState): void {
  farm = next;
  if (!saveFarm(farm)) toast.show("Couldn't save. This browser is blocking storage");
  hud.update(farm);
  market.setFarm(farm);
  basket.refresh(farm);
}

function sold(sale: Sale): void {
  if (sale.sold === 0) return;
  setFarm(sale.state);
  toast.show(`Sold ${sale.sold} ${sale.sold === 1 ? 'item' : 'items'} for ${formatCoins(sale.coins)} coins`);
}

function celebrate(levelBefore: number): void {
  const levelAfter = levelForXp(farm.xp);
  if (levelAfter > levelBefore) levelUp.show(levelAfter, unlocksBetween(levelBefore, levelAfter));
}

async function tapTile(t: TilePoint): Promise<void> {
  switch (mode.kind) {
    case 'farm':
      apply(useMultiTool(farm, t.x, t.y, market.selected(), now()));
      return;
    case 'place': {
      const g = ghostAt(t);
      const item: Placeable = mode.item;
      if (!g || !apply(place(farm, item, g.x, g.y, now()))) return;
      // The next one stays in hand, so a row of trees or a flock of chickens
      // is one click each. It goes back to the multi-tool once another one
      // can't be afforded.
      const info = productInfo(item);
      if (farm.coins < info.price) {
        toast.show(`Not enough coins for another ${info.name.toLowerCase()}`);
        setMode({ kind: 'farm' });
      }
      return;
    }
    case 'move': {
      if (!mode.held) {
        const obj = objectAt(farm, t.x, t.y);
        if (obj) setMode({ kind: 'move', held: obj, grab: { dx: t.x - obj.x, dy: t.y - obj.y } });
        return;
      }
      const g = ghostAt(t);
      if (g && apply(move(farm, mode.held.id, g.x, g.y, now()))) setMode({ kind: 'move', held: null, grab: { dx: 0, dy: 0 } });
      return;
    }
    case 'sell': {
      const obj = objectAt(farm, t.x, t.y);
      if (!obj) return;
      const value = sellValue(obj);
      if (value === null) {
        toast.show(`The ${objectName(obj).toLowerCase()} can't be sold`);
        return;
      }
      const name = objectName(obj).toLowerCase();
      const question =
        obj.kind === 'plot'
          ? obj.state === 'planted'
            ? `Remove this plot? The ${name} growing on it will be lost.`
            : 'Remove this plot?'
          : `Sell the ${name} for ${formatCoins(value)} coins?`;
      if (await askConfirm(question, obj.kind === 'plot' ? 'Remove' : 'Sell')) apply(sell(farm, obj.id, now()));
      return;
    }
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

// ---- Land ----

async function expandFarm(): Promise<void> {
  const next = nextExpansion(farm);
  if (!next) return;
  const question = `Expand your farm to ${next.size} × ${next.size} for ${formatCoins(next.coins)} coins?`;
  if (!(await askConfirm(question, 'Expand'))) return;
  const outcome = expand(farm, now());
  if (!outcome.ok) {
    toast.show(expandFailureMessage(outcome.failure));
    return;
  }
  setFarm(outcome.state);
  setMode({ kind: 'farm' });
  // Pull back to show the whole bigger farm.
  setCamera(fittedCamera());
  toast.show(`Your farm is now ${outcome.size} × ${outcome.size}`);
}

// ---- Input ----

// The tile a click or hover means. While placing, that's the ground under
// the pointer. Otherwise a click on something standing up (a tree's leaves,
// a barn's roof) means that thing, even where it's drawn over the tiles
// behind it.
function farmTileAt(at: ScreenPoint): TilePoint | null {
  const w = screenToWorld(camera, view, at);
  const holding = mode.kind === 'place' || (mode.kind === 'move' && mode.held !== null);
  const obj = holding ? null : objectAtPoint(farm, w);
  if (obj) {
    // Keep the exact tile when the pointer is over the object's own
    // footprint, so a big building is grabbed where it was clicked.
    const ground = pickTile(w);
    return objectAt(farm, ground.x, ground.y)?.id === obj.id ? ground : tile(obj.x, obj.y);
  }
  const t = pickTile(w);
  return isOnFarm(farm, t.x, t.y) ? t : null;
}

function setHighlight(next: TilePoint | null): void {
  if (next?.x !== highlight?.x || next?.y !== highlight?.y) {
    highlight = next;
    requestDraw();
  }
  refreshTooltip();
}

// Keep the canvas's backing store at the screen's real pixel density, so lines
// stay sharp on high-density screens.
function resize(): void {
  const rect = canvas.getBoundingClientRect();
  const firstSize = view.width === 1;
  view = { width: rect.width, height: rect.height };
  pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * pixelRatio);
  canvas.height = Math.round(rect.height * pixelRatio);
  if (firstSize) camera = fittedCamera();
  setCamera(camera);
}

new ResizeObserver(resize).observe(canvas);

canvas.addEventListener('pointerdown', (e) => {
  pointerKind = e.pointerType === 'mouse' ? 'mouse' : 'touch';
});

attachInput(canvas, {
  pan: (dx, dy) => setCamera(pan(camera, dx, dy)),
  zoom: (anchor, factor) => setCamera(zoomAt(camera, view, anchor, factor)),
  hover: (at) => setHighlight(at ? farmTileAt(at) : null),
  tap: (at) => {
    const t = farmTileAt(at);
    // On a phone there's no hover, so the tapped tile is the highlight.
    if (pointerKind === 'touch' || !highlight) setHighlight(t);
    if (t) void tapTile(t);
  },
});

// ---- Test mode ----

// How fast the farm's clock runs while this page is open: farm seconds per
// real second. Never saved, so every visit starts on real time. Time that
// passes while the game is closed always counts at real speed.
let speed = 1;
let lastTick = clock.now();

const testPanel = isTestMode()
  ? createTestPanel(required('#test-toggle', HTMLButtonElement), required('#test-panel', HTMLElement), {
      setSpeed: (next) => {
        speed = next;
        afterCheat();
      },
      skip: (ms) => {
        setFarm(skipAhead(farm, ms));
        afterCheat();
      },
      addCoins: (coins) => {
        setFarm(addCoins(farm, coins));
        afterCheat();
      },
      levelUp: () => {
        const before = levelForXp(farm.xp);
        setFarm(cheatLevelUp(farm));
        celebrate(before);
        afterCheat();
      },
      readyEverything: () => {
        setFarm(readyEverything(farm, now()));
        afterCheat();
      },
      reset: () => void startOver(),
    })
  : null;

async function startOver(): Promise<void> {
  if (!(await askConfirm('Throw away this farm and start a new one? This can’t be undone.', 'Start over'))) return;
  setFarm(newFarm(clock.now(), newSeed()));
  speed = 1;
  setMode({ kind: 'farm' });
  setCamera(fittedCamera());
  afterCheat();
}

function afterCheat(): void {
  testPanel?.update(farm.timeOffset, speed);
  refreshTooltip();
  requestDraw();
}

// Growth is driven by the clock, so redraw once a second to keep crops and
// countdowns current. Browsers pause this in background tabs. In test mode
// this is also where a faster clock pushes the farm's time ahead.
window.setInterval(() => {
  const real = clock.now();
  if (speed > 1) {
    farm = skipAhead(farm, (real - lastTick) * (speed - 1));
    saveFarm(farm);
    testPanel?.update(farm.timeOffset, speed);
  }
  lastTick = real;
  refreshTooltip();
  requestDraw();
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestDraw();
});

const middle = (): ScreenPoint => screen(view.width / 2, view.height / 2);
const ZOOM_STEP = 1.25;

required('#zoom-in', HTMLButtonElement).addEventListener('click', () =>
  setCamera(zoomAt(camera, view, middle(), ZOOM_STEP)),
);
required('#zoom-out', HTMLButtonElement).addEventListener('click', () =>
  setCamera(zoomAt(camera, view, middle(), 1 / ZOOM_STEP)),
);
required('#recenter', HTMLButtonElement).addEventListener('click', () => setCamera(fittedCamera()));

const PAN_STEP = 48;
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
  if (document.querySelector('dialog[open]')) return;
  switch (e.key) {
    case 'Escape':
      setMode({ kind: 'farm' });
      break;
    case '+':
    case '=':
      setCamera(zoomAt(camera, view, middle(), ZOOM_STEP));
      break;
    case '-':
    case '_':
      setCamera(zoomAt(camera, view, middle(), 1 / ZOOM_STEP));
      break;
    case 'ArrowLeft':
      setCamera(pan(camera, PAN_STEP, 0));
      break;
    case 'ArrowRight':
      setCamera(pan(camera, -PAN_STEP, 0));
      break;
    case 'ArrowUp':
      setCamera(pan(camera, 0, PAN_STEP));
      break;
    case 'ArrowDown':
      setCamera(pan(camera, 0, -PAN_STEP));
      break;
    default:
      return;
  }
  e.preventDefault();
});

hud.update(farm);
market.setFarm(farm);
setMode({ kind: 'farm' });
testPanel?.update(farm.timeOffset, speed);
