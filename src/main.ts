// Wires the pieces together: the farm, the camera, input, the HUD and the
// frame loop. Holds no rules of its own; every rule lives in src/core.

import './style.css';
import { useMultiTool } from './core/actions';
import { systemClock } from './core/clock';
import { levelForXp } from './core/levels';
import { unlocksBetween } from './core/unlocks';
import { farmSize, isOnFarm, type FarmState } from './core/state';
import { MIN_ZOOM, clampToBounds, pan, screenToWorld, worldToScreen, zoomAt, type Bounds, type Camera, type Viewport } from './render/camera';
import { liveEffects, type FloatingText } from './render/effects';
import { TILE_HEIGHT, TILE_WIDTH, pickTile, screen, tile, tileCenter, tileToWorld, type ScreenPoint, type TilePoint } from './render/iso';
import { render } from './render/renderer';
import { loadFarm, saveFarm } from './platform/storage';
import { formatCoins } from './ui/format';
import { createHud } from './ui/hud';
import { attachInput } from './ui/input';
import { describeTile, failureMessage } from './ui/messages';
import { createLevelUp } from './ui/levelUp';
import { createMarket } from './ui/market';
import { createToast, createTooltip } from './ui/notices';

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

const hud = createHud(required('#hud', HTMLElement));
const market = createMarket(required('#market', HTMLDialogElement), required('#market-button', HTMLButtonElement), () =>
  refreshTooltip(),
);
const levelUp = createLevelUp(required('#levelup', HTMLDialogElement));
const tooltip = createTooltip(required('#tooltip', HTMLElement));
const toast = createToast(required('#toast', HTMLElement));

let view: Viewport = { width: 1, height: 1 };
let pixelRatio = 1;
let camera: Camera = fittedCamera();
let highlight: TilePoint | null = null;
let pointerKind: 'mouse' | 'touch' = 'mouse';
let effects: FloatingText[] = [];

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

// Draw only when something changed, and every frame while rewards are
// floating. Calls during the same frame collapse into one draw.
let frameRequested = false;
function requestDraw(): void {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame((frameTime) => {
    frameRequested = false;
    effects = liveEffects(effects, frameTime);
    render(ctx, { camera, view, pixelRatio, farm, now: clock.now(), highlight, effects, frameTime });
    if (effects.length > 0) requestDraw();
  });
}

function refreshTooltip(): void {
  if (!highlight) {
    tooltip.hide();
    return;
  }
  const text = describeTile(farm, highlight.x, highlight.y, market.selected(), clock.now());
  if (!text) {
    tooltip.hide();
    return;
  }
  // Anchor above the tile's top corner, a little higher for tall things.
  const top = worldToScreen(camera, view, tileToWorld(highlight));
  tooltip.show(text, screen(top.x, top.y - 18 * camera.zoom));
}

function setCamera(next: Camera): void {
  camera = clampToBounds(next, bounds());
  refreshTooltip();
  requestDraw();
}

function farmTileAt(at: ScreenPoint): TilePoint | null {
  const t = pickTile(screenToWorld(camera, view, at));
  return isOnFarm(farm, t.x, t.y) ? t : null;
}

function setHighlight(next: TilePoint | null): void {
  if (next?.x !== highlight?.x || next?.y !== highlight?.y) {
    highlight = next;
    requestDraw();
  }
  refreshTooltip();
}

function float(at: TilePoint, lines: ReadonlyArray<readonly [string, string]>): void {
  const center = tileCenter(at);
  const startedAt = performance.now();
  lines.forEach(([text, color], i) => {
    effects.push({ at: { ...center, y: center.y - 10 - i * 16 }, text, color, startedAt: startedAt + i * 120 });
  });
}

function act(at: TilePoint): void {
  const now = clock.now();
  const levelBefore = levelForXp(farm.xp);
  const outcome = useMultiTool(farm, at.x, at.y, market.selected(), now);
  if (!outcome.ok) {
    toast.show(failureMessage(outcome.failure, now));
    return;
  }

  farm = outcome.state;
  if (!saveFarm(farm)) toast.show("Couldn't save. This browser is blocking storage");
  hud.update(farm);

  const { coins, xp } = outcome.reward;
  const lines: Array<readonly [string, string]> = [];
  if (coins !== 0) lines.push([`${coins > 0 ? '+' : '−'}${formatCoins(Math.abs(coins))}`, coins > 0 ? '#ffd23f' : '#ffe9c2']);
  if (xp > 0) lines.push([`+${xp} XP`, '#9fe3ff']);
  float(at, lines);

  const levelAfter = levelForXp(farm.xp);
  if (levelAfter > levelBefore) {
    market.setLevel(levelAfter);
    levelUp.show(levelAfter, unlocksBetween(levelBefore, levelAfter));
  }

  refreshTooltip();
  requestDraw();
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
    // On a phone there's no hover, so the tapped tile shows its tooltip.
    if (pointerKind === 'touch') setHighlight(t);
    if (t) act(t);
  },
});

// Growth is driven by the clock, so redraw once a second to keep crops and
// countdowns current. Browsers pause this in background tabs.
window.setInterval(() => {
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
  switch (e.key) {
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
market.setLevel(levelForXp(farm.xp));
