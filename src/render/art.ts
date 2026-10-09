// Real art, when it exists. Every picture in the game is code-drawn until a
// PNG for it lands in src/art/; from then on that PNG is used instead, with
// no other change. ART_BRIEF.md says what each file must contain.
//
// Sheets are split into a grid of equal cells, and each cell is placed by
// one of two anchors:
//
//   'feet'  Things that stand on a point (animals, trees, a scarecrow). The
//           cell is trimmed to its drawing and placed by the middle of the
//           drawing's bottom edge, so art that isn't perfectly centered in
//           its cell still stands in the right place.
//   'cell'  Things that must line up with their plot or footprint (crops,
//           buildings, a hay bale). The cell's bottom middle is the front
//           corner of the footprint, exactly as ART_BRIEF.md lays it out.

import { CROP_IDS } from '../core/data/crops';
import { ANIMAL_IDS, DECORATION_IDS, DECORATIONS, TREE_IDS, type DecorationId } from '../core/data/items';
import { PRODUCE_IDS } from '../core/data/produce';

// Vite lists the PNGs that exist when the game is built. Missing ones simply
// aren't in the list, which is how the code-drawn fallback works.
const FILES = import.meta.glob('../art/*.png', { eager: true, query: '?url', import: 'default' });

// The grid each kind of file is laid out in. See ART_BRIEF.md.
export const GRIDS = {
  animal: { cols: 7, rows: 2 }, // stand, walk x4, idle action x2; facing toward and away
  crop: { cols: 5, rows: 1 }, // seeded, sprouting, growing, ready, withered
  tree: { cols: 2, rows: 1 }, // growing, with fruit
  single: { cols: 1, rows: 1 }, // decorations, buildings, produce icons
} as const;

export type GridKind = keyof typeof GRIDS;
export type Anchor = 'feet' | 'cell';

type Cell = {
  readonly image: HTMLCanvasElement;
  // Where the drawing touches the ground, in the cell's own pixels.
  readonly anchorX: number;
  readonly anchorY: number;
};

const sheets = new Map<string, Cell[]>();

function urlFor(name: string): string | null {
  const url = FILES[`../art/${name}.png`];
  return typeof url === 'string' ? url : null;
}

// Cuts a loaded sheet into trimmed cells.
function slice(img: HTMLImageElement, kind: GridKind, anchor: Anchor): Cell[] {
  const { cols, rows } = GRIDS[kind];
  const cw = Math.floor(img.naturalWidth / cols);
  const ch = Math.floor(img.naturalHeight / rows);
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;
      ctx.drawImage(img, col * cw, row * ch, cw, ch, 0, 0, cw, ch);
      if (anchor === 'cell') {
        cells.push({ image: canvas, anchorX: cw / 2, anchorY: ch });
        continue;
      }
      // Find the drawing's bounds from its non-transparent pixels.
      const { data } = ctx.getImageData(0, 0, cw, ch);
      let minX = cw;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if ((data[(y * cw + x) * 4 + 3] ?? 0) > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      cells.push(
        maxX < 0
          ? { image: canvas, anchorX: cw / 2, anchorY: ch }
          : { image: canvas, anchorX: (minX + maxX + 1) / 2, anchorY: maxY + 1 },
      );
    }
  }
  return cells;
}

// Starts loading every art file that exists. `onLoaded` runs after each one
// is ready, so the farm can redraw with it.
export function loadArt(files: ReadonlyArray<readonly [string, GridKind, Anchor]>, onLoaded: () => void): void {
  for (const [name, kind, anchor] of files) {
    const url = urlFor(name);
    if (!url) continue;
    const img = new Image();
    img.onload = () => {
      sheets.set(name, slice(img, kind, anchor));
      onLoaded();
    };
    img.src = url;
  }
}

export function hasArt(name: string): boolean {
  return sheets.has(name);
}

// Draws cell `index` of a sheet with its ground point at (x, y) in world
// space, scaled so the cell is `width` world pixels wide. Mirrored when
// `flip` is set. Returns false if the art isn't there, so the caller can draw
// the code version instead.
export function drawArt(
  ctx: CanvasRenderingContext2D,
  name: string,
  index: number,
  x: number,
  y: number,
  width: number,
  flip = false,
): boolean {
  const cell = sheets.get(name)?.[index];
  if (!cell) return false;
  const scale = width / cell.image.width;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -scale : scale, scale);
  ctx.drawImage(cell.image, -cell.anchorX, -cell.anchorY);
  ctx.restore();
  return true;
}

// ---- What can have art ----

// Fences and paths stay code-drawn: they join up with their neighbors, which
// would need a picture for every way they can connect.
export function decorationHasArt(id: DecorationId): boolean {
  return !DECORATIONS[id].connects;
}

// Decorations that stand on a point rather than filling their footprint.
export const UPRIGHT_DECORATIONS: ReadonlySet<DecorationId> = new Set(['flowerPot', 'scarecrow', 'wheelbarrow', 'waterPump']);

// Every file the game looks for, how it's laid out, and how it's anchored.
export const ART_FILES: ReadonlyArray<readonly [string, GridKind, Anchor]> = [
  ...ANIMAL_IDS.map((id) => [`animal-${id}`, 'animal', 'feet'] as const),
  ...CROP_IDS.map((id) => [`crop-${id}`, 'crop', 'cell'] as const),
  ...TREE_IDS.map((id) => [`tree-${id}`, 'tree', 'feet'] as const),
  ...DECORATION_IDS.filter(decorationHasArt).map(
    (id) => [`deco-${id}`, 'single', UPRIGHT_DECORATIONS.has(id) ? 'feet' : 'cell'] as const,
  ),
  ['building-farmhouse', 'single', 'cell'] as const,
  ...PRODUCE_IDS.map((id) => [`produce-${id}`, 'single', 'feet'] as const),
];
