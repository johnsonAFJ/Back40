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

- **Real time.** Every timer runs on the computer's clock. Changing the device
  clock will grow crops early; that is accepted until there is a server.
- **One clock function.** The game asks `clock.now()` for the time and never
  calls `Date.now()` anywhere else. Tests swap in a fake clock to jump hours
  ahead.
- **Test mode** (see below) can push a farm's clock ahead of real time, never
  behind it.
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
and earns its planting XP plus 2 (1 for plowing, 1 for harvesting). A
growing crop can't be plowed over; to get rid of one, remove its plot with the
Sell tool, which asks first.

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
a repeating timer. They never wither and never die. Collecting from one
restarts its timer and puts one piece of produce (an apple, an egg) in the
**harvest basket**; see below. An uncollected tree or animal simply waits.

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

Collecting from a tree or animal gives 1 XP. What each piece of produce sells
for from the basket:

| Produce | From | Sells for |
| --- | --- | --- |
| Apples | Apple tree | 30 |
| Cherries | Cherry tree | 45 |
| Lemons | Lemon tree | 60 |
| Oranges | Orange tree | 75 |
| Peaches | Peach tree | 110 |
| Plums | Plum tree | 140 |
| Eggs | Chicken | 15 |
| Milk | Cow | 50 |
| Wool | Sheep | 120 |
| Truffles | Pig | 140 |
| Horsehair | Horse | 260 |

### Animals share squares

Small animals can share a square. Each square has 4 spaces:

| Animal | Spaces | Per square |
| --- | --- | --- |
| Chicken | 1 | 4 |
| Sheep, pig | 2 | 2 |
| Cow, horse | 4 | 1 |

Different animals can share as long as they add up (a sheep and two
chickens, say). Nothing else can share a square with animals. Placing is
still one animal per click; a full square says "No room for another animal on
that square".

Within a square each animal stands in its own spot: a quarter for a chicken,
a half for a sheep or pig, the whole square for a cow or horse. The spots are
worked out for drawing only (`src/render/animalSlots.ts`); the save just
records each animal's square. Clicking with the multi-tool collects from
every ready animal in the square at once. Move and Sell pick the particular
animal under the pointer. When animals start to wander (milestone 7), these
spots are where they wander from.

### The harvest basket

Produce from trees and animals goes into the basket instead of paying out on
the spot. The basket button in the top bar shows how many pieces are in it and
hops when one arrives. Opening it lists each kind with its count and price,
with a button to sell all of one kind and one to sell everything. Crops still
sell the moment they're harvested, so a big field never needs an extra step.

The basket is saved with the farm, has no size limit, and gives milestone 6's
neighbor gifts and requests something to work with.

### Animal movement

All five animals come to life together in milestone 7: they wander, pause and
do their idle action (the chicken pecks, the cow and sheep graze, the pig
roots, the horse swishes its tail).

- **Only the drawing moves.** The save keeps each animal on its tile, and
  moving, selling and collecting all work on that tile, so no rule changes.
- **Each animal stays within its own square**, around its spot in it (see
  "Animals share squares"), so it never walks through a fence, a crop or a
  building, and animals sharing a square don't wander into each other.
- **Every animal moves differently**, from seeded randomness keyed by its id,
  like withering. Its path is worked out from the time, not stored.
- **Clicks follow the drawing.** Hit-testing (`src/render/hit.ts`) uses the
  animal's drawn position, so clicking a chicken where it is now picks it.
- **It costs battery, so it holds back.** Animals on screen mean redrawing
  every frame instead of about once a second. It pauses in a hidden tab and
  stays still when the system's "reduce motion" setting is on.
- **How it moves** (`src/render/animalMotion.ts`): the animal lives in
  4.5-second beats. In each it walks for 1.4 seconds to a new point within
  its reach (0.22 of a tile alone, 0.1 sharing a square), then stands, and in
  about half the beats does its idle action. With code-drawn animals that's a
  bob while walking and a tip forward to peck; with a sprite sheet it plays
  the walk and action frames.

## Decorations and buildings

Decorations are bought, placed and moved freely. They give XP once, when
bought, at roughly 1 XP per 100 coins with a minimum of 1. Selling a
decoration, tree or animal returns a third of its price, rounded down.

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

Expansions are bought from the market's **Land** tab, which lists every size
with its requirements ticked or crossed. Only the next size can be bought, and
buying asks first. Afterwards the camera pulls back to show the whole farm.

New land is added along the far x and y edges, so existing objects keep their
tiles and the save only records which expansion the farm is on.

The neighbor count comes from your level (see Neighbors), so like level it's
never stored. Each new size also appears in the level-up banner when its level
is reached.

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

A **Neighbors** button in the bottom bar opens the Neighbors window: everyone
who has moved in (with a **Visit** button and how many helps are left today),
everyone still to come ("Moves in at level 10"), and the farm news. A red dot
on the button means there's news you haven't seen. Each new neighbor also
appears in the level-up banner.

What neighbors do:

1. **Their farms.** Each neighbor has a hand-made 16 x 16 farm
   (`src/core/neighborFarms.ts`). It's rebuilt from code on every visit and
   never saved. Each crop holds a growth stage for the whole day, picked by
   seeded randomness keyed by the day, so a visit looks a little different
   each day and there's always something growing to help with. Their trees
   always show fruit.
2. **You help them.** Visiting puts your own toolbar away and shows a banner
   with the helps left and a **Go home** button. You get 5 helping actions per
   neighbor per day, each paying 10 coins and 1 XP:
   - **Chase off crows:** three of their crops have crows each day.
   - **Feed an animal:** two of their animals are hungry each day (a hay
     bubble).
   - **Fertilize a crop:** any other growing crop.
3. **They help you.** Once a day, at their own time between 8am and 8pm, each
   neighbor fertilizes up to 6 of your growing crops. Fertilized crops show a
   sparkle and pay 1 extra XP at harvest.
4. **Daily gift.** Once a day, one neighbor leaves a gift: a tree, an animal
   or a decoration unlocked at your level and costing 1,000 coins or less.
   Gifts wait in the market's **Gifts** tab (the market button shows a count)
   and are placed for free. Seeds aren't given as gifts.
5. **News.** Each neighbor's day has a bit of news ("June harvested 40
   daffodils"), alongside their visits, gifts and arrivals. The Neighbors
   window keeps the last 30 items. It never pops up during play.

**While you were away.** On opening the game, a card lists what neighbors did
since you last played (visits, gifts, arrivals). A farm left alone for a long
time only catches up on the last 3 days.

**How it stays fair.** Every visit, gift and bit of news happens at a time
fixed by `random01(seed, neighbor, day)`. The farm remembers how far it has
checked (`neighborsCheckedAt`), and `syncNeighbors` replays whatever happened
between then and now. That works the same whether the game was open all day,
closed overnight, or pushed ahead by test mode, and reloading can never
produce an extra or different gift.

**A "day"** runs from local midnight to local midnight on the player's device.

## Controls

Three tools sit in a toolbar, plus the market button:

| Tool | Click or tap on |
| --- | --- |
| **Multi-tool** (default) | Empty land, a harvested plot or a withered crop: plow. Plowed plot: plant the selected seed. Ready crop, tree or animal: harvest. |
| **Move** | An object, then a tile: move it there, free. Plots move with their crops. |
| **Sell** | A tree, animal or decoration: sell it, after a confirmation. A plot: remove it, and whatever is growing on it, for nothing. The farmhouse can't be sold. |

While a tool other than the multi-tool is active, or while placing something,
a banner at the top says what a click will do and has a **Done** button.
Escape also returns to the multi-tool.

The market button in the bottom-left corner shows the crop being planted and
opens the market, which lists every crop in unlock order. Crops above your
level show greyed out with the level that unlocks them. Choosing a crop selects
it as the current seed and returns to the farm with the multi-tool. The last
seed chosen is remembered per browser under `back40-seed`, outside the save. Each plant charges the seed price; nothing is bought
in advance. Buying a tree, animal or decoration puts it on the cursor to
place; it's paid for when it goes down. A translucent preview follows the
pointer over a green footprint where it fits and a red one where it doesn't.
After placing one, the next stays on the cursor, so a row of trees or a
flock of chickens is one click each. **Done** or Escape puts it away, and it
goes back to the multi-tool on its own once another can't be afforded.

Camera:

- **Pan:** drag with the mouse or one finger.
- **Zoom:** mouse wheel or pinch, between 50% and 200%.
- **Drag versus click:** a press that moves more than 6 pixels is a pan and
  never triggers the tool.

The top bar shows coins, level with an XP bar, and the harvest basket. The
bottom bar holds the market button, the tools and the Neighbors button.

## Test mode

Adding `?test` to the address (`http://localhost:8440/Back40/?test`, or the
same on the live site) shows a **Test** button above the zoom buttons. It
opens a panel for testing without waiting:

| Control | What it does |
| --- | --- |
| Clock speed | Real time, 1 min/s, 10 min/s or 1 hr/s: how much farm time passes per real second while the page is open. Resets to real time on every visit. |
| Skip ahead | +1 hour, +8 hours or +1 day, instantly. |
| Coins and levels | +1,000 or +10,000 coins, or exactly enough XP for the next level (with its banner). |
| Ready everything | Ripens every crop (withered ones too) and readies every tree and animal, without moving the clock. |
| Start a new farm | Throws the farm away and starts over, after a confirmation. |

How the clock works: the save stores `timeOffset`, how many milliseconds this
farm's clock is ahead of real time. The farm's time is always real time plus
the offset, and every rule gets its `now` from that. The offset only grows, so
the farm's clock never runs backward: whatever has grown stays grown after
slowing down or reloading. Time that passes while the game is closed counts at
real speed. The cheats are pure functions in `src/core/cheats.ts`.

Without `?test` none of this appears, so friends playing normally never see it.

My own testing runs on port 8442, from whatever branch I'm working on. Port
8440 is kept for playing and always serves `main` from a separate copy in
`.claude/worktrees/play`, so a test build can never upgrade (and then strand)
the farm you play.

## Architecture

Vite and TypeScript. No game framework and no UI framework.

    src/
      core/          game rules, pure TypeScript, no browser APIs
        data/        crops, trees, animals, decorations, levels, expansions, neighbors
        clock.ts     now(), and a fake clock for tests
        growth.ts    growth stage and time left, from plantedAt and now
        levels.ts    level from XP
        rng.ts       seeded random numbers
        state.ts     the save shape and a new-farm factory
        actions.ts   plow, plant, harvest, buy, place, move, sell, expand
        neighbors.ts daily visits, gifts, news, and helping on their farms
        neighborFarms.ts  the neighbors' hand-made farms
        save.ts      validate and migrate saves between versions
      render/        Canvas 2D drawing
        iso.ts       tile <-> screen math and diamond hit-testing
        camera.ts    pan and zoom
        draw/        procedural sprites: tiles, crops, trees, animals, decorations
        renderer.ts  depth-sorted drawing of the visible scene
      ui/            HTML and CSS: HUD, toolbar, market, dialogs, neighbors, news
      platform/      localStorage save, backup export and import
      main.ts        wires the pieces together and runs the frame loop
    tests/           Vitest, against src/core with a fake clock

The rule that holds this together: **`src/core` never imports from `render`,
`ui` or `platform`**, and never touches the DOM. Every rule in this spec can be
tested without a browser, and the UI can later be swapped for React (or a
native app) without touching the game.

Actions are plain functions: `plow(state, x, y, now)` returns either a new
state and what was earned, or the reason it failed (`notEnoughCoins`,
`growing`, ...). They take the current time as a number rather than reading a
clock, so tests can pass "four hours later" directly. The UI turns failures
into short toasts.

### Drawing

- Tiles are 64 x 32 pixel diamonds at 100% zoom.
- Objects are sorted back to front by `x + y`, then by `x`, so nearer objects
  overlap farther ones.
- Clicks are mapped back to a tile with the inverse isometric transform. That
  transform turns every diamond back into a 1 x 1 square, so rounding down is
  an exact hit test, even right next to a diamond's corner.
- The canvas redraws every animation frame while something moves (a pan, a
  harvest pop) and once a second otherwise, so growth timers stay current
  without burning battery.
- Clicks on things that stand up (a tree's leaves, a barn's roof) pick that
  thing, even where it's drawn over the tiles behind it. Each object is
  tested nearest first: a quick box around it, then an exact check that the
  pixel under the pointer is really part of its drawing (it's drawn onto a
  one-pixel canvas to see). A click in the gap beside a thin scarecrow falls
  through to the plot behind it; shadows don't count. If nothing tall is
  hit, the click goes to the ground tile. See `src/render/hit.ts` and
  `src/render/pick.ts`.
- Art is drawn in code until a PNG for it exists in `src/art/`
  (`src/render/art.ts`). Each drawing function asks for the real art first and
  draws its code version only if there isn't any, so art can arrive one file
  at a time. Sheets are cut into a grid of cells. Things that stand on a point
  (animals, trees, a scarecrow) are trimmed and placed by their feet; things
  that fill a footprint (crops, buildings, a hay bale) are placed by the
  cell's bottom middle. File names, sizes and layouts are in ART_BRIEF.md.

## Save file

Stored in `localStorage` under the key `back40`. Every GitHub Pages project on
`johnsonafj.github.io` shares one storage area, so the key must stay unique.

```json
{
  "version": 6,
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
  "timeOffset": 0,
  "basket": { "eggs": 4, "apples": 2 },
  "neighbors": {
    "martha": { "day": 20734, "helped": ["martha-47", "martha-59"] }
  },
  "gifts": [{ "kind": "decoration", "id": "hayBale" }],
  "feed": [
    { "kind": "fertilized", "at": 1791476000000, "neighbor": "martha", "count": 6 }
  ],
  "neighborsCheckedAt": 1791480000000
}
```

- `version` goes up whenever the shape changes, and `save.ts` migrates older
  saves forward on load, one version at a time. Version 2 added trees
  (`lastHarvestAt`), animals (`lastHarvestAt`) and decorations. Version 3
  added `timeOffset` for test mode, 0 for every older farm. Version 4 added
  `basket`, the harvest basket's contents by produce, empty for older farms.
  Version 5 added `neighbors` (who has moved in and today's helps), `gifts`,
  `feed` and `neighborsCheckedAt`. Older farms start from their last play
  time, so they aren't flooded with visits that never happened. Version 6 let
  animals share a square; nothing in the save changed shape, but the new
  number stops older builds from reading a shared square as an overlap.
- A save from a **newer** version than the game knows (say, from a test build
  of the next milestone) is never replaced. The game shows a message and
  doesn't save at all until the right version is open.
- Saving happens after every action. There is no save button.
- If the stored save cannot be read, it is copied to `back40-unreadable-<time>`
  before a new farm starts, so a bad save never silently erases a farm.
- Backups: see "Backups" above.

## Phones and installing

Desktop first, touch supported throughout. Back40 can be added to a phone's
home screen (Safari: Share, then Add to Home Screen; Chrome: Install app) and
then opens full screen like an app, offline too:

- `public/manifest.webmanifest` gives the name, colors and icons. The icons
  are drawn from the game's own art by `tools/icons.ts`
  (http://localhost:8442/Back40/tools/icons.html).
- `public/sw.js` is the service worker. The page is network-first, so a new
  version shows up on the next open; everything else is cache-first, which is
  safe because Vite names every built file after its contents. It's
  registered with the build's commit (`?v=`), so each deploy gets a fresh
  cache and the old one is deleted. It only runs in the built site, never on
  the dev server.

The browser and the home-screen app keep separate saves; backups move a farm
between them.

## Backups

The **Farm menu** (the button above the zoom buttons) saves and loads
backups:

- **Save a backup** writes `back40-<date>.json`, the whole farm. On a
  computer it downloads; in the home-screen app on a phone it opens the share
  sheet ("Save to Files").
- **Load a backup** reads one back. It's checked like any save and upgraded
  if it's from an older version. The game shows both farms (level, coins,
  how much is on them) and asks before replacing this one. A file that isn't
  a backup, or that comes from a newer version, is refused with a message and
  nothing changes.
- The menu also shows the build and save version.

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
| 2 | **Farming loop** (first playable) | Plow, plant strawberries, wheat, soybeans, peanuts and eggplant, watch them grow in real time, harvest, withering. Coins, XP and level in the HUD. The farm survives a reload. |
| 3 | **Progression** | The market with all crops, level unlocks and the level-up banner. |
| 4 | **Farm life** | Trees, animals and decorations: buy, place, move, sell, harvest. |
| 4.5 | **Test mode** | `?test` opens a panel to speed up or skip the clock, add coins and levels, ready everything, and start over. |
| 5 | **Land** | Expansions with their level, neighbor and coin requirements. |
| 5.5 | **Harvest basket** | Produce from trees and animals collects in a basket you sell from. |
| 6 | **Neighbors** | Neighbor bar, farm visits and helping, overnight fertilizing, daily gifts and the gift box, news feed. |
| 7 | **Polish** | Installable app, backups, moving animals, the real-art loader, and the Claude Design art brief and prompts. |
| 8 | **Neighbor requests** | Neighbors ask for produce from your basket ("Martha would love 3 eggs"); filling a request pays bonus coins and XP, about double the items' sale price plus some XP. |
| Later | | Real multiplayer (accounts, cloud saves, real friends in neighbor slots), sound and music, the walking farmer. |

## Not in version 1

Sound and music, a premium currency, ribbons and achievements, crop mastery,
multi-plot tools (tractor, seeder, harvester), the farmer avatar, real
multiplayer, and any anti-cheat (test mode is a cheat panel on purpose).
Fences, paths and ground stay code-drawn even when the rest has real art.

## Decided for later

- **The farmer avatar.** The original's farmer walked to each plot while
  clicks queued behind them. Charming, but it's pathfinding, an action queue
  and a lot of animation: a milestone of its own, after the ones above.
  Actions stay instant until then.

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
