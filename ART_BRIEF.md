# Back40 art brief

Not started. Art is drawn in code until milestone 7. This brief gets filled in
once the full sprite list is known, and the image-generation prompts for each
sheet go in [prompts/](prompts/).

## Direction

- **Look:** bright, friendly, cartoony isometric farm, in the spirit of 2009
  browser farm games. Soft outlines, saturated greens and dirt browns, chunky
  readable shapes that still read at 50% zoom.
- **Original only.** The game is public. Nothing may copy or closely resemble
  another game's characters, buildings, logos or artwork.
- **Projection:** 2:1 isometric. A floor tile is a 64 x 32 pixel diamond at
  100% zoom. Art is drawn at 2x (128 x 64 tiles) for sharp screens.
- **Light** comes from the upper left, so shadows fall down and to the right.

## Sprite list (to be completed)

Each of these exists as code-drawn art first. The rows become real image
requests in milestone 7.

| Group | Sprites | States |
| --- | --- | --- |
| Ground | grass, plowed soil, harvested stubble, withered soil | |
| Crops | one per crop in SPEC.md | seeded, sprouting, growing, ready, withered |
| Trees | one per tree | growing, ready (fruit showing) |
| Animals | one sprite sheet per animal (see below) | idle, walking, idle action |
| Decorations | one per decoration | fences and paths need connecting variants |
| Buildings | farmhouse, shed, red barn | |
| Neighbors | portrait for each neighbor bar slot | |
| UI | coin, XP star, level badge, gift box, tool icons | |

## Animal sprite sheets

All five animals (chicken, cow, sheep, pig, horse) move in milestone 7, so
each needs a sheet of frames, not a single picture. Order them together so
they match in style, size and timing.

- **One sheet per animal**, transparent background.
- **Cells are 128 x 128 pixels** (2x scale; an animal fits within one floor
  tile, which is 128 x 64 at 2x).
- **Anchor:** the point between the animal's feet sits at x 64, y 112 in
  every cell, so frames line up without jumping.
- **Two rows, two facings.** Row 0 faces down-left (toward the viewer), row 1
  faces up-left (away). The game mirrors them for the two right-facing
  directions.
- **Seven columns:**

      Column 0:     standing still
      Columns 1-4:  walk cycle, four frames
      Columns 5-6:  idle action, two frames (chicken pecks, cow and sheep
                    graze, pig roots, horse swishes its tail)

  So each sheet is 896 x 256 pixels.
- **No product on the animal.** The game draws the "ready" bubble (egg, milk,
  wool, truffles, hair) above it separately.
- Same light direction as everything else: upper left, shadows down and to
  the right. Leave the ground shadow out; the game draws it.

