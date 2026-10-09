# Claude Design brief: Back40 art

Back40 draws all of its art in code for now. Each file below replaces one
code-drawn thing: drop the PNG into `src/art/` with the exact file name, and
the game uses it the next time it loads. Anything without a file keeps its
code-drawn version, so the art can arrive one piece at a time.

Ready-to-paste prompts for each group are in [prompts/](prompts/). This file
is the reference they're built from.

The game slices sheets by pixel coordinates, so sizes and layouts are strict.
Art that's a few pixels off-center in a cell is fine for animals, trees and
upright decorations (the game finds the drawing's feet); crops, buildings and
the hay bale must sit exactly as described, because they line up with the
ground grid.

## Style, for every file

- **Look:** bright, friendly, cartoony farm, in the spirit of 2009 browser
  farm games. Rounded, chunky shapes that read clearly when small. Flat color
  with one soft highlight and one soft shade per surface.
- **Outlines:** soft, about 2 pixels, in a darker shade of the fill color.
  Never pure black.
- **Light:** from the upper left. Shading falls on the lower right.
- **View:** isometric, 2:1. A floor tile is a diamond 128 pixels wide and 64
  tall at the size these files are drawn.
- **Background:** fully transparent. No ground, no grass, no shadow under
  things (the game draws shadows), no text, no grid lines, no border.
- **Edges:** crisp, not blurry. Export as PNG with transparency.
- **Original only.** Back40 is public. Nothing may copy or closely resemble
  another game's characters, buildings, logos or artwork.

## 1. Animals: one sheet each

Files: `animal-chicken.png`, `animal-cow.png`, `animal-sheep.png`,
`animal-pig.png`, `animal-horse.png`

Size: exactly **896 x 256**. Grid: **7 columns x 2 rows**, each cell
**128 x 128**.

    Row 0 (y 0 to 127):    facing down and to the left, toward the viewer
    Row 1 (y 128 to 255):  facing up and to the left, seen from behind

    Column 0:      standing still
    Columns 1-4:   walk cycle, four frames that loop smoothly
    Columns 5-6:   idle action, two frames that alternate
                   (chicken pecks, cow and sheep graze, pig roots with its
                    snout, horse lowers its head and swishes its tail)

The game mirrors the sheet for the right-facing directions, so draw left only.

- **Feet:** the lowest point of the feet is at **y 112** in every cell,
  centered at **x 64**.
- **Size**, the same in every frame (height from feet to top of head):

  | Animal | Height | Notes |
  | --- | --- | --- |
  | Chicken | 40 | Small, round, white, red comb, yellow beak |
  | Pig | 52 | Pink, round, curly tail, snout |
  | Sheep | 56 | Fluffy white wool, black face and legs |
  | Cow | 76 | White with black patches, pink nose, small horns |
  | Horse | 92 | Chestnut brown, dark mane and tail |

- Nothing the animal produces is drawn on it; the game shows eggs, milk and
  the rest in a bubble.

## 2. Crops: one strip each

Files: `crop-<id>.png` for each crop below.

Size: exactly **640 x 128**. Grid: **5 columns x 1 row**, each cell
**128 x 128**.

    Column 0: seeded      a few small dark mounds where seeds went in
    Column 1: sprouting   tiny two-leaf sprouts
    Column 2: growing     leafy plants at about two-thirds height, no crop showing
    Column 3: ready       full plants with the crop clearly visible
    Column 4: withered    brown, drooping, dead plants

- **The plot** is the diamond in the bottom half of each cell: top corner
  (64, 64), right (128, 96), bottom (64, 128), left (0, 96). The game draws
  the soil there; draw **only the plants**, as a small cluster of four to six
  spread over the diamond. Plants may rise above it, up to the top of the
  cell.

| id | Crop | Ready looks like |
| --- | --- | --- |
| strawberries | Strawberries | Low leafy bushes, bright red berries |
| wheat | Wheat | Tall golden stalks with heavy heads |
| soybeans | Soybeans | Bushy pale-green plants with fuzzy pods |
| peanuts | Peanuts | Low clover-like leaves, a few tan shells showing |
| eggplant | Eggplant | Dark leafy plants, glossy purple eggplants |
| lilac | Lilac | Shrubs with cones of pale purple blossom |
| squash | Squash | Broad leaves on the ground, yellow squash |
| pumpkin | Pumpkin | Broad leaves and vines, round orange pumpkins |
| spinach | Spinach | Rosettes of deep green leaves |
| artichokes | Artichokes | Silvery-green plants topped with artichoke buds |
| rice | Rice | Bright green grass-like stalks, pale golden tips |
| raspberries | Raspberries | Leafy canes with deep pink-red berries |
| daffodils | Daffodils | Green stems, yellow trumpet flowers |
| cotton | Cotton | Woody plants with white cotton bolls |
| cranberries | Cranberries | Low dark vines with small dark red berries |
| chickpeas | Chickpeas | Feathery leaves with tan pods |
| bellPeppers | Bell Peppers | Dark leafy plants, chunky green peppers |
| rhubarb | Rhubarb | Big leaves on red-pink stalks |
| peppers | Peppers | Leafy plants with long red chili peppers |
| morningGlory | Morning Glory | Twining vines with blue trumpet flowers |
| aloeVera | Aloe Vera | Spiky blue-green succulent rosettes |
| pineapples | Pineapples | Spiky leaves with a golden pineapple in each |
| redTulips | Red Tulips | Green stems, red cup-shaped flowers |
| pattypanSquash | Pattypan Squash | Broad leaves, pale yellow scalloped squash |
| blueberries | Blueberries | Leafy bushes with clusters of blueberries |
| watermelon | Watermelon | Vines with big striped green watermelons |
| grapes | Grapes | Short vines on stakes with purple grape bunches |
| tomatoes | Tomatoes | Staked plants with round red tomatoes |
| pinkRoses | Pink Roses | Thorny bushes with pink roses |
| sugarCane | Sugar Cane | Tall green-and-gold jointed canes with long leaves |
| carrots | Carrots | Feathery green tops with orange carrot shoulders showing above the soil |
| coffee | Coffee | Glossy dark-green shrubs with clusters of red coffee cherries |
| sunflowers | Sunflowers | Tall stems with big yellow sunflowers and brown centers |
| broccoli | Broccoli | Blue-green leafy plants with dark green broccoli heads |
| corn | Corn | Tall green stalks with yellow corn ears and tassels |

## 3. Fruit trees: one strip each

Files: `tree-appleTree.png`, `tree-cherryTree.png`, `tree-lemonTree.png`,
`tree-orangeTree.png`, `tree-peachTree.png`, `tree-plumTree.png`

Size: exactly **256 x 128**. Grid: **2 columns**, each cell **128 x 128**.

    Column 0: leafy, no fruit (growing)
    Column 1: the same tree with ripe fruit (ready to pick)

- **Trunk:** the base of the trunk is at **(64, 120)**. About 100 pixels
  tall, round leafy canopy, fitting inside the cell.
- Fruit colors: apples red, cherries dark red in pairs, lemons yellow,
  oranges orange, peaches peach with a pink blush, plums deep purple.

## 4. Buildings

| File | Size | Footprint |
| --- | --- | --- |
| `building-farmhouse.png` | 384 x 384 | 3 x 3 tiles |
| `deco-shed.png` | 256 x 256 | 2 x 2 tiles |
| `deco-redBarn.png` | 384 x 384 | 3 x 3 tiles |

- **Footprint:** a diamond in the bottom half of the image, spanning its full
  width. For 384 x 384: top (192, 192), right (384, 288), bottom (192, 384),
  left (0, 288). For 256 x 256: top (128, 128), right (256, 192), bottom
  (128, 256), left (0, 192).
- The building stands inside its footprint with a little margin, its walls
  rising from it, and may use the whole height of the image for its roof.
- **Farmhouse:** cream walls, red gable roof, a brown door on the right-hand
  wall, two blue windows on the left-hand wall.
- **Shed:** weathered wooden walls, grey tin roof, a plank door.
- **Red barn:** red walls, dark roof, a large white-trimmed barn door with an
  X brace, one window high up.

## 5. Decorations

All **128 x 128**.

| File | Placed | What it is |
| --- | --- | --- |
| `deco-hayBale.png` | fills its tile | A rectangular golden hay bale bound with twine, filling the bottom-half diamond (top (64, 64), right (128, 96), bottom (64, 128), left (0, 96)) with a little margin |
| `deco-flowerPot.png` | stands on a point | A terracotta pot of mixed pink, yellow and purple flowers, base at (64, 112) |
| `deco-scarecrow.png` | stands on a point | A scarecrow on a post: straw hat, blue shirt, straw hands, base of the post at (64, 116) |
| `deco-wheelbarrow.png` | stands on a point | A green wooden wheelbarrow, wheel and legs resting at y 112 |
| `deco-waterPump.png` | stands on a point | An old cast-iron hand pump on a small stone base, base at (64, 112) |

Fences and paths stay drawn in code, since they join up with their
neighbors in many combinations.

## 6. Basket produce icons

Files: `produce-<id>.png` for apples, cherries, lemons, oranges, peaches,
plums, eggs, milk, wool, truffles, hair.

Size: exactly **96 x 96**, the item centered and resting on y 88.

| id | Icon |
| --- | --- |
| apples | A red apple with a leaf |
| cherries | Two dark red cherries on joined stems |
| lemons | A yellow lemon with a leaf |
| oranges | An orange with a leaf |
| peaches | A peach with a pink blush and a leaf |
| plums | A deep purple plum |
| eggs | Two brown-cream eggs |
| milk | A glass milk bottle with a blue cap |
| wool | A soft white ball of wool |
| truffles | A few dark brown knobbly truffles |
| hair | A tied bundle of chestnut horsehair |

## What stays code-drawn

Ground tiles, soil, fences, dirt paths, the hungry and ready bubbles, crows,
sparkles, scenery trees and the whole interface. The app icon is drawn from
game art by `tools/icons.ts`.
