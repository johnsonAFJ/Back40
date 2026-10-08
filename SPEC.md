# Back40 spec

A browser clone of the 2009 Facebook farm game loop. You start with a small
plot of land and 200 coins. Plow, plant, wait in real time, harvest before
crops wither, earn coins and XP, level up to unlock more crops, buy trees,
animals and decorations, and expand your land. Simulated neighbors move in as
you level, help on your farm, send gifts, and have farms of their own to visit.

This is a learning project first. The aim is to build the engine pieces by
hand (game loop, isometric rendering, picking, timers, save files) and to
practice game design by tuning a real economy. Why each design choice was made,
and every place Back40 departs from the original, lives in
[DESIGN.md](DESIGN.md).

## Ground rules

- **Real time.** Every timer runs on the computer's clock. There is no fast
  mode. Changing the device clock will grow crops early; that is accepted until
  there is a server.
- **One clock function.** The game asks `clock.now()` for the time and never
  calls `Date.now()` anywhere else. Tests swap in a fake clock to jump hours
  ahead, and a test mode can be added later in one place.
- **Nothing derived is stored.** Level comes from XP, growth stage from
  `plantedAt` and the clock, the neighbor count from the level. The save holds
  only facts that cannot be recomputed, so it can never disagree with itself.
- **All numbers in data files.** Prices, timers, XP and unlock levels live in
  `src/core/data/`. Tuning the economy never means touching game logic.
- **Original names and art.** Crop names are ordinary words, but nothing may
  use another game's name, characters, logos or artwork.

## The farm

The farm is an isometric grid of square tiles drawn as 2:1 diamonds.

- **Starting size:** 12 x 12 tiles.
- **Starting state:** a farmhouse in one corner, 6 plowed plots with
  strawberries already growing (ready 5 minutes after the farm is created, so
  the first harvest happens in the first session), and 200 coins.
- **One plot per tile.** Trees, animals and most decorations also take one
  tile. The farmhouse takes 3 x 3.
- **Land outside the farm** is drawn as grass and trees out to the edge of the
  screen, so the farm never floats on a void.

## Farming

Every crop goes through the same plot states:

    empty land --plow--> plowed --plant--> growing --time--> ready --harvest--> harvested
                           ^                                   |                      |
                           |                         (left too long)                  |
                           |                                   v                      |
                           +-------------plow------------- withered                   |
                           +-------------plow-----------------------------------------+

| Action | Cost | Reward |
| --- | --- | --- |
| Plow | 15 coins | 1 XP |
| Plant | the crop's seed price | the crop's planting XP |
| Harvest | free | the crop's sale price and 1 XP (2 XP if fertilized) |
| Plow a harvested or withered plot | 15 coins | 1 XP |

Harvesting leaves bare stubble that must be **plowed again** before the next
crop, as in the original. So every crop really costs its seed plus 15 coins,
and earns its planting XP plus 2 (1 for plowing, 1 for harvesting). Plowing a
plot that has a growing crop destroys the crop; the game asks first.

### Growth stages

A growing crop is drawn in four stages, derived from the fraction of its grow
time that has passed: seeded (0 to 25%), sprouting (25 to 50%), growing (50 to
100%), ready (100%). Hovering or tapping a plot shows the crop name and the
time left ("Strawberries, ready in 2h 14m").

### Withering

Faithful to the original:

- A ripe crop is **guaranteed safe** for a span equal to its grow time. A 4
  hour strawberry crop ripens at 4 hours and is safe until 8 hours.
- After that comes a **cushion** of half the grow time, during which each plot
  withers at its own random moment. Strawberries can wither anywhere from 8 to
  10 hours after planting.
- Each plot's wither moment is rolled once, at planting, and stored as
  `witherAt`. Rolling it once means reloading the game cannot re-roll a
  luckier time.
- A withered crop is worth nothing. Plowing it again costs 15 coins.

## Crops

Starting values for levels 1 to 20, taken from fan-documented market listings
(see Sources). Seed price excludes the 15 coin plow. Harvest XP is always 1,
plus 1 if fertilized.

| Crop | Level | Seed | Sells for | Grows in | Plant XP |
| --- | --- | --- | --- | --- | --- |
| Strawberries | 1 | 10 | 35 | 4h | 1 |
| Wheat | 1 | 13 | 61 | 12h | 1 |
| Soybeans | 1 | 15 | 63 | 1d | 2 |
| Peanuts | 1 | 20 | 78 | 16h | 1 |
| Eggplant | 1 | 25 | 88 | 2d | 2 |
| Lilac | 4 | 35 | 75 | 10h | 1 |
| Squash | 4 | 40 | 121 | 2d | 2 |
| Pumpkin | 5 | 30 | 68 | 8h | 1 |
| Spinach | 6 | 35 | 95 | 14h | 2 |
| Artichokes | 6 | 70 | 204 | 4d | 2 |
| Rice | 7 | 45 | 96 | 12h | 1 |
| Raspberries | 8 | 20 | 46 | 2h | 0 |
| Daffodils | 8 | 60 | 135 | 2d | 2 |
| Cotton | 9 | 75 | 207 | 3d | 2 |
| Cranberries | 10 | 55 | 98 | 10h | 1 |
| Chickpeas | 10 | 80 | 210 | 20h | 2 |
| Bell Peppers | 11 | 75 | 198 | 2d | 2 |
| Rhubarb | 11 | 65 | 150 | 16h | 1 |
| Peppers | 12 | 70 | 162 | 1d | 2 |
| Morning Glory | 13 | 60 | 123 | 12h | 1 |
| Aloe Vera | 14 | 50 | 85 | 6h | 1 |
| Pineapples | 15 | 95 | 242 | 2d | 2 |
| Red Tulips | 15 | 75 | 159 | 1d | 2 |
| Pattypan Squash | 16 | 65 | 160 | 16h | 1 |
| Blueberries | 17 | 50 | 91 | 4h | 1 |
| Watermelon | 18 | 130 | 348 | 4d | 2 |
| Grapes | 19 | 85 | 270 | 1d | 2 |
| Tomatoes | 20 | 100 | 173 | 8h | 1 |
| Pink Roses | 20 | 120 | 254 | 2d | 2 |

The interesting tension, kept from the original: short crops earn more XP per
hour if you keep coming back, long crops earn more coins per click and survive
a night's sleep or a weekend away. Raspberries give no planting XP at all; they
are a pure "I'm at my desk all afternoon" crop.

## Levels

Level is derived from total XP. XP needed to go from level `L` to `L + 1` is
`20L - 5`: 15, then 35, 55, 75 and so on, growing by 20 each level.

| Level | Total XP |
| --- | --- |
| 2 | 15 |
| 3 | 50 |
| 4 | 105 |
| 5 | 180 |
| 10 | 855 |
| 15 | 2,030 |
| 20 | 3,705 |
| 25 | 5,880 |

There is no level cap. The curve is ours; see DESIGN.md for why.

Leveling up shows a short banner naming what unlocked (crops, trees, animals,
decorations, an expansion, a new neighbor). Version 1 has content through level
20; levels past that still count but unlock nothing until more content lands.

## Trees and animals

Trees and animals are bought from the market, placed on a tile, and produce on
a repeating timer. They never wither and never die. Harvesting one restarts
its timer. An unharvested tree or animal simply waits.

Starting values, ours rather than documented (tune freely):

| Item | Kind | Level | Price | Produces | Every | Sells for | Buy XP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Apple tree | tree | 1 | 50 | apples | 3d | 30 | 1 |
| Cherry tree | tree | 3 | 120 | cherries | 3d | 45 | 1 |
| Lemon tree | tree | 6 | 200 | lemons | 3d | 60 | 2 |
| Orange tree | tree | 9 | 300 | oranges | 3d | 75 | 3 |
| Peach tree | tree | 13 | 450 | peaches | 4d | 110 | 4 |
| Plum tree | tree | 17 | 650 | plums | 4d | 140 | 6 |
| Chicken | animal | 2 | 60 | eggs | 1d | 15 | 1 |
| Cow | animal | 5 | 250 | milk | 1d | 50 | 2 |
| Sheep | animal | 8 | 400 | wool | 3d | 120 | 4 |
| Pig | animal | 11 | 600 | truffles | 2d | 140 | 6 |
| Horse | animal | 15 | 900 | hair | 3d | 260 | 9 |

Harvesting a tree or animal gives 1 XP.

## Decorations and buildings

Decorations are bought, placed and moved freely. They give XP once, when
bought, at roughly 1 XP per 100 coins with a minimum of 1. Selling one returns
5% of its price.

| Item | Level | Price | XP | Size |
| --- | --- | --- | --- | --- |
| Hay bale | 1 | 100 | 1 | 1 x 1 |
| White fence | 1 | 50 | 1 | 1 x 1 |
| Picket fence | 3 | 75 | 1 | 1 x 1 |
| Dirt path | 1 | 20 | 1 | 1 x 1 |
| Flower pot | 4 | 150 | 2 | 1 x 1 |
| Scarecrow | 6 | 300 | 3 | 1 x 1 |
| Wheelbarrow | 8 | 400 | 4 | 1 x 1 |
| Water pump | 12 | 1,000 | 10 | 1 x 1 |
| Shed | 15 | 5,000 | 50 | 2 x 2 |
| Red barn | 20 | 20,000 | 200 | 3 x 3 |

Fences and paths connect visually to matching neighbors on adjacent tiles.

## Expansions

Each expansion grows the farm outward. It needs a minimum level, a number of
neighbors, and coins.

| Expansion | Size | Level | Neighbors | Coins |
| --- | --- | --- | --- | --- |
| Starting farm | 12 x 12 | 1 | 0 | 0 |
| 1 | 14 x 14 | 5 | 1 | 2,000 |
| 2 | 16 x 16 | 10 | 2 | 10,000 |
| 3 | 18 x 18 | 15 | 3 | 30,000 |
| 4 | 20 x 20 | 20 | 4 | 75,000 |
| 5 | 22 x 22 | 25 | 5 | 150,000 |

New land is added on two sides so existing objects keep their tiles.

## Neighbors

Five simulated neighbors, all original characters. Each moves in at a set
level and stays.

| Neighbor | Moves in at | Their farm |
| --- | --- | --- |
| Martha | level 3 | An old orchard, rows of fruit trees |
| Gus | level 6 | A dairy with cows and a big red barn |
| June | level 10 | Flower fields in neat color bands |
| Earl | level 15 | Corn and wheat as far as the eye can see |
| Pearl | level 20 | A tidy hobby farm with every decoration she can find |

They show in a **neighbor bar** along the bottom of the screen, like the
original. Empty slots read "A neighbor moves in at level N".

What neighbors do:

1. **Their farms.** Each neighbor has a fixed, hand-built farm you can visit
   from the neighbor bar. Their farms grow and change by the day, so a visit
   looks a little different each time.
2. **You help them.** On each visit you can take up to 5 helping actions per
   neighbor per day: fertilize a crop, chase off crows, or feed an animal.
   Each action pays 10 coins and 1 XP.
3. **They help you.** Once a day, each neighbor stops by and fertilizes up to 6
   of your growing crops. Fertilized plots show a sparkle and pay 1 extra XP at
   harvest. Visits that happened while the game was closed are worked out when
   it opens, and a "While you were away" card lists who helped.
4. **Daily gift.** Once a day, one neighbor leaves a gift in your gift box: a
   tree, an animal, a decoration or a stack of seeds, drawn from items unlocked
   at your level. Gifts sit in the gift box until you place them.
5. **News feed.** A quiet side panel shows what neighbors have been up to
   ("June harvested 40 daffodils", "Gus's cow had a calf", "Martha fertilized
   your soybeans"). It never pops up and never asks for anything. It keeps the
   last 30 items.

Neighbor activity is generated from a seeded random generator keyed by the
save's seed, the neighbor and the day. The same day always produces the same
events, so reloading cannot farm extra gifts.

**A "day"** runs from local midnight to local midnight on the player's device.

## Controls

Three tools sit in a toolbar, plus the market button:

| Tool | Click or tap on |
| --- | --- |
| **Multi-tool** (default) | Empty land, a harvested plot or a withered crop: plow. Plowed plot: plant the selected seed. Ready crop, tree or animal: harvest. |
| **Move** | An object, then a tile: move it there. |
| **Sell** | A tree, animal or decoration: sell it, after a confirmation. |

Buying a crop in the market selects it as the current seed and returns to the
farm with the multi-tool. Each plant charges the seed price; nothing is bought
in advance. Buying a tree, animal or decoration puts it on the cursor to
place.

Camera:

- **Pan:** drag with the mouse or one finger.
- **Zoom:** mouse wheel or pinch, between 50% and 200%.
- **Drag versus click:** a press that moves more than 6 pixels is a pan and
  never triggers the tool.

The HUD shows coins, level, an XP bar with "XP to next level", and the
neighbor bar.

## Architecture

Vite and TypeScript. No game framework and no UI framework.

    src/
      core/          game rules, pure TypeScript, no browser APIs
        data/        crops, trees, animals, decorations, levels, expansions, neighbors
        clock.ts     now(), and a fake clock for tests
        rng.ts       seeded random numbers
        state.ts     the save shape and a new-farm factory
        actions.ts   plow, plant, harvest, buy, place, move, sell, expand
        neighbors.ts daily visits, gifts and feed events
        save.ts      validate and migrate saves between versions
      render/        Canvas 2D drawing
        iso.ts       tile <-> screen math and diamond hit-testing
        camera.ts    pan and zoom
        draw/        procedural sprites: tiles, crops, trees, animals, decorations
        renderer.ts  depth-sorted drawing of the visible scene
      ui/            HTML and CSS: HUD, toolbar, market, dialogs, neighbor bar, feed
      platform/      localStorage save, backup export and import
      main.ts        wires the pieces together and runs the frame loop
    tests/           Vitest, against src/core with a fake clock

The rule that holds this together: **`src/core` never imports from `render`,
`ui` or `platform`**, and never touches the DOM. Every rule in this spec can be
tested without a browser, and the UI can later be swapped for React (or a
native app) without touching the game.

Actions are plain functions: `plow(state, x, y, clock)` returns either a new
state or an error ("Not enough coins"). The UI shows errors as short toasts
near the cursor.

### Drawing

- Tiles are 64 x 32 pixel diamonds at 100% zoom.
- Objects are sorted back to front by `x + y`, then by `x`, so nearer objects
  overlap farther ones.
- Clicks are mapped back to a tile with the inverse isometric transform, then
  checked against the diamond's edges so clicks near a corner pick the right
  tile.
- The canvas redraws every animation frame while something moves (a pan, a
  harvest pop) and once a second otherwise, so growth timers stay current
  without burning battery.
- All art is drawn in code for now. Every sprite goes through one
  `drawSprite(id, ...)` function, so swapping in image files later changes one
  module.

## Save file

Stored in `localStorage` under the key `back40`. Every GitHub Pages project on
`johnsonafj.github.io` shares one storage area, so the key must stay unique.

```json
{
  "version": 1,
  "seed": 482913,
  "createdAt": 1791436800000,
  "lastSeenAt": 1791480000000,
  "coins": 340,
  "xp": 62,
  "expansion": 0,
  "objects": [
    { "id": "p1", "kind": "plot", "x": 3, "y": 4, "state": "planted",
      "cropId": "strawberries", "plantedAt": 1791470000000,
      "witherAt": 1791502400000, "fertilized": false },
    { "id": "p2", "kind": "plot", "x": 4, "y": 4, "state": "plowed" },
    { "id": "p3", "kind": "plot", "x": 5, "y": 4, "state": "harvested" },
    { "id": "t1", "kind": "tree", "typeId": "apple", "x": 8, "y": 2,
      "lastHarvestAt": 1791436800000 },
    { "id": "d1", "kind": "decoration", "typeId": "hayBale", "x": 9, "y": 9 }
  ],
  "giftBox": { "cherryTree": 1 },
  "neighbors": {
    "martha": { "lastVisitedDay": "2026-10-08", "helpsToday": 3 }
  },
  "lastNeighborDay": "2026-10-08",
  "feed": [
    { "at": 1791476000000, "text": "Martha fertilized 6 of your crops" }
  ]
}
```

- `version` goes up whenever the shape changes, and `save.ts` migrates older
  saves forward on load.
- Saving happens after every action. There is no save button.
- If the stored save cannot be read, it is copied to `back40-unreadable-<time>`
  before a new farm starts, so a bad save never silently erases a farm.
- **Export backup** writes `back40-<date>.json`. On a computer it downloads; in
  the home-screen app on a phone it opens the share sheet ("Save to Files").
  **Import** validates the file and asks before replacing the current farm.

## Phones and installing

Desktop first, touch supported throughout. Milestone 7 adds a web app manifest,
icons and a service worker so Back40 can be added to a phone's home screen and
opened offline, the same way HabitMonster works. The browser and the home-screen
app keep separate saves; export and import move a farm between them.

## Hosting

Public repo `johnsonAFJ/Back40`, deployed by a GitHub Actions workflow to
GitHub Pages at `https://johnsonafj.github.io/Back40/` on every merge to
`main`. Vite's `base` is `/Back40/`.

## Milestones

Each milestone is one branch and one pull request. The PR description is the
walkthrough: what was built, how it works, and which files to read first.
Merging deploys.

| # | Milestone | Done when |
| --- | --- | --- |
| 1 | **Ground** | A 12 x 12 isometric grid draws, pans and zooms with mouse and touch, and the hovered tile highlights correctly at every zoom level. Deploys to Pages. |
| 2 | **Farming loop** (first playable) | Plow, plant strawberries, wheat, soybeans, peanuts and eggplant, watch them grow in real time, harvest. Coins, XP and level in the HUD. The farm survives a reload. |
| 3 | **Progression** | The market with all crops, level unlocks and the level-up banner, withering. |
| 4 | **Farm life** | Trees, animals and decorations: buy, place, move, sell, harvest. |
| 5 | **Land** | Expansions with their level, neighbor and coin requirements. |
| 6 | **Neighbors** | Neighbor bar, farm visits and helping, overnight fertilizing, daily gifts and the gift box, news feed. |
| 7 | **Polish** | Installable app, backup export and import, art pass, image-generation prompts in `prompts/`. |
| 8 | **Later** | Real multiplayer: accounts, cloud saves, real friends taking neighbor slots. Sound and music. |

## Not in version 1

Sound and music, a premium currency, ribbons and achievements, crop mastery,
multi-plot tools (tractor, seeder, harvester), the farmer avatar, real
multiplayer, and any anti-cheat.

## Open questions

These don't block milestones 1 or 2. They get settled before the milestone that
needs them.

- **The farmer avatar.** In the original, your farmer walked to each plot and
  actions queued up behind them. It adds a lot of charm, and a lot of work
  (pathfinding, an action queue, animation). Not planned for version 1; worth
  deciding before milestone 7.
- **Neighbor gifts.** Should you be able to "send" a gift back to a neighbor,
  for nothing more than a thank-you line in the feed? Decide in milestone 6.

## Sources

Crop prices, grow times and unlock levels come from fan-maintained market
listings, mostly from around 2011, which is the earliest complete record found.
Plowing (15 coins, 1 XP), the 200 starting coins and the withering rule are
documented for the original release.

- GamePressure seed list: https://www.gamepressure.com/farmville/seeds/z128eb
- Ave Maria Songs crop table: https://www.avemariasongs.org/games/FarmVille/FV-crops.htm
- Withering: https://www.gamepressure.com/farmville/withered-crops/z228dd
- Adam Nash, "FarmVille Economics: What Price Experience?" (2009): https://adamnash.blog/2009/09/10/farmville-economics-what-price-experience/
- Starting coins: https://en.wikipedia.org/wiki/FarmVille
