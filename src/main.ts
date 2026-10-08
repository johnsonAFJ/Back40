// Wires the pieces together: canvas sizing, the camera, input and the frame
// loop. Holds no rules of its own.

import './style.css';
import { STARTING_FARM_SIZE } from './core/data/expansions';
import {
  MIN_ZOOM,
  clampToBounds,
  pan,
  screenToWorld,
  zoomAt,
  type Bounds,
  type Camera,
  type Viewport,
} from './render/camera';
import { TILE_HEIGHT, TILE_WIDTH, pickTile, screen, tile, tileCenter, type ScreenPoint, type TilePoint } from './render/iso';
import { isOnFarm } from './render/draw/ground';
import { render } from './render/renderer';
import { attachInput } from './ui/input';

function required<T extends Element>(selector: string, type: new () => T): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Missing ${selector} in index.html`);
  return el;
}

const canvas = required('#farm', HTMLCanvasElement);
const readout = required('#readout', HTMLElement);
const ctxOrNull = canvas.getContext('2d', { alpha: false });
if (!ctxOrNull) throw new Error('This browser cannot draw on a canvas.');
const ctx = ctxOrNull;

const farmSize = STARTING_FARM_SIZE;

// The camera's center may roam anywhere over the farm's bounding box, so some
// part of the farm is always on screen.
const bounds: Bounds = {
  minX: -farmSize * (TILE_WIDTH / 2),
  maxX: farmSize * (TILE_WIDTH / 2),
  minY: 0,
  maxY: farmSize * TILE_HEIGHT,
};

let view: Viewport = { width: 1, height: 1 };
let pixelRatio = 1;
let camera: Camera = { center: tileCenter(tile(farmSize / 2 - 0.5, farmSize / 2 - 0.5)), zoom: 1 };
let highlight: TilePoint | null = null;

// The zoom that fits the whole farm on screen with a margin, within limits.
function fittedCamera(): Camera {
  const farmWidth = farmSize * TILE_WIDTH;
  const farmHeight = farmSize * TILE_HEIGHT;
  const fit = Math.min(view.width / (farmWidth * 1.1), view.height / (farmHeight * 1.4));
  return {
    center: tileCenter(tile(farmSize / 2 - 0.5, farmSize / 2 - 0.5)),
    zoom: Math.min(1.25, Math.max(MIN_ZOOM, fit)),
  };
}

// Draw only when something changed. Calls during the same frame collapse
// into one draw.
let frameRequested = false;
function requestDraw(): void {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    render(ctx, { camera, view, pixelRatio, farmSize, highlight });
    updateReadout();
  });
}

function updateReadout(): void {
  const zoom = `${Math.round(camera.zoom * 100)}%`;
  readout.textContent = highlight ? `Tile ${highlight.x}, ${highlight.y} · ${zoom}` : zoom;
}

function setCamera(next: Camera): void {
  camera = clampToBounds(next, bounds);
  requestDraw();
}

function farmTileAt(at: ScreenPoint): TilePoint | null {
  const t = pickTile(screenToWorld(camera, view, at));
  return isOnFarm(t.x, t.y, farmSize) ? t : null;
}

function setHighlight(next: TilePoint | null): void {
  if (next?.x === highlight?.x && next?.y === highlight?.y) return;
  highlight = next;
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

attachInput(canvas, {
  pan: (dx, dy) => setCamera(pan(camera, dx, dy)),
  zoom: (anchor, factor) => setCamera(zoomAt(camera, view, anchor, factor)),
  hover: (at) => setHighlight(at ? farmTileAt(at) : null),
  // Touch has no hover, so a tap is how a phone picks a tile.
  tap: (at) => setHighlight(farmTileAt(at)),
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
  if (e.target instanceof HTMLInputElement) return;
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
