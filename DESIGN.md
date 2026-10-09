# Back40 design notes

Why Back40 works the way it does, and every place it departs from the 2009
original. [SPEC.md](SPEC.md) says *what* the rules are; this file says *why*.

Add an entry whenever a rule changes, including the numbers that were tried
before. A design note that only records the winner loses the lesson.

## Stance

Back40 is **faithful by default**. When the original did something, Back40
does it too, including the harsh parts like withering. Softening happens by
tuning numbers in `src/core/data/`, not by removing systems, and only after
playing with the faithful version first.

Departures happen for a few reasons, and each entry below names which:

- **No Facebook.** The original leaned on real friends. Back40 simulates them
  until real multiplayer exists.
- **Missing data.** Some 2009 values were never documented. Back40 fills the
  gap with its own numbers and says so.
- **Scope.** Features left out of version 1 to ship a playable game sooner.
- **Our own choice.** A deliberate change to how the game plays, explained in
  its own note.

## Departures from the original

| What | Original | Back40 | Reason |
| --- | --- | --- | --- |
| Neighbors | Real Facebook friends | Five simulated neighbors who move in at levels 3, 6, 10, 15 and 20 | No Facebook |
| Expansion requirements | Level, coins and a neighbor count | The same, but neighbors arrive by level (see below) | No Facebook |
| Requests and wall posts | Help requests posted to friends' walls | A quiet news feed in the Neighbors window that never asks for anything | No Facebook |
| Neighbor bar | A strip of friends along the bottom of the screen | A Neighbors button and window, which fits a phone | Scope |
| Gifts | Anything, including seeds and premium items | Trees, animals and decorations up to 1,000 coins | Scope |
| Level curve | Not documented for early levels | `20L - 5` XP per level | Missing data |
| Trees, animals and decorations | Hundreds of items | 6 trees, 5 animals and 10 decorations, with our own prices | Missing data and scope |
| Crop numbers | 2009 market values | Earliest complete listings found, mostly from about 2011 | Missing data |
| Starting crops | The tutorial walked you through your first planting | 6 plots of strawberries ready 5 minutes after the farm is created | Scope (no tutorial yet) |
| Premium currency | Farm Cash, bought with real money | None | Scope |
| Farmer avatar | Walked to each plot; actions queued | Actions happen instantly | Scope (open question in SPEC) |
| Sound | Music and effects | None | Scope |
| Animals per square | A finer grid, so many small animals fit in a pen | Squares hold 4 spaces: 4 chickens, 2 sheep or pigs, or 1 cow or horse | Our own choice (see below) |
| Tree and animal produce | Sold the moment it was collected | Goes into a harvest basket, sold when you choose | Our own choice (see below) |
| Saves | Zynga's servers | The browser, with backup export and import | Scope |

### Neighbors arrive by level

With simulated neighbors moving in at fixed levels, the neighbor requirement on
each expansion is always met by the time the level requirement is. So for now
the requirement is effectively decorative.

It's kept anyway, for two reasons. It tells the player who made the expansion
possible, which makes the neighbors feel like part of the farm. And when real
multiplayer arrives, a real friend takes a neighbor's slot, and the requirement
starts to matter exactly as it did in 2009.

### The level curve

Early-level XP thresholds for the original aren't documented anywhere
trustworthy. Back40 uses `20L - 5` XP per level (15, 35, 55, ...), which puts
level 2 within the first session and level 5 within the first day or two. A
full 36-plot strawberry field earns about 108 XP per cycle (plow, plant and
harvest are 1 XP each), so someone checking in three times a day reaches level
20 in roughly two weeks. That pace is a guess to test, not a target to defend.

### Starting crops

The original opened with a guided tutorial. Back40 has no tutorial yet, so the
farm starts with strawberries that ripen in 5 minutes. The first harvest, with
its coins and XP, lands in the first session and teaches the loop by doing it.
This is the one place Back40 bends real time, and only for a brand new farm.

## Design notes

### Withering is the core tension

Withering is what made the original a daily habit. Short crops pay more XP per
hour but punish you for walking away; long crops are forgiving but slow. Every
planting is a small bet on when you'll be back. Back40 keeps the rule exactly
(safe for one grow time after ripening, then a random moment within half a grow
time) because the bet is the game.

If friends find it too harsh, adjust in this order:

1. Lengthen the cushion (half a grow time to a full grow time).
2. Lengthen the guaranteed-safe window.
3. Add an item that unwithers crops, earned rather than bought.

### Rolling randomness once

Wither moments and neighbor events are rolled from a seeded generator and
stored or keyed by day. If they were rolled each time the game loaded,
reloading would be a free re-roll. Random events have to be decided once and
then become facts.

### Selling things back

Selling a tree, animal or decoration first returned 5% of its price, so a 75
coin picket fence sold for 3. Rearranging the farm felt like throwing money
away. It now returns a third (the picket fence sells for 25), which still
costs something to change your mind but doesn't punish redecorating. Worth
another look once there's more to buy.

### XP versus coins

Every action in the original converts between coins and XP at a roughly stable
rate. Plowing is 15 coins for 1 XP; buildings give about 1 XP per 100 coins.
Choosing between the best coin crop and the best XP crop is the player's real
decision, so once the data files exist, write a small script that prints coins
per hour and XP per hour for every crop (seed, plow and all).

### Test mode moves the clock forward, never back

Planning ruled out a fast mode for players, but testing a game built on
multi-day timers needs one. The catch is that every timer is a timestamp. If
test mode simply sped up the clock and then let it snap back to real time, a
crop planted "in the future" would un-grow. So the farm stores how far ahead
its clock is, and that number only ever grows. Slowing down just stops the
gap from widening. It's hidden behind `?test` rather than removed, because
it's a tool for building the game, not part of playing it.

### The harvest basket

The original sold everything the instant it was collected. Back40 keeps that
for crops, but tree and animal produce goes into a basket first. Seeing eggs
and apples pile up makes the animals feel like they're producing something
rather than just paying out, and it gives the neighbors in milestone 6
something to trade in. Crops stay instant because a field of 36 plots would
otherwise mean 36 more things to sell every few hours.

### Neighbors happen on a schedule, not on a timer

The simulated neighbors could have been driven by timers firing while the game
is open, but then nothing would happen overnight, and reloading might fire
them again. Instead, each day's events are fixed in advance by seeded
randomness, and the game just replays whatever's happened since it last
looked. It's the same idea as rolling withering once at planting: decide
randomness once, then treat it as fact.

### Crops on a neighbor's farm don't ripen

On the first try, Martha's strawberries (4 hours) were all ripe by noon, so
there was nothing to help with. Their crops now hold a growth stage for the
whole day, which keeps every visit worth making.

### Animals share squares

A pen made of fences takes up the squares around it, so with one animal per
square a 3 x 3 fence ring held a single chicken, which looked silly. The
original avoided this with a finer grid underneath everything. Rather than
change the whole grid, Back40 lets animals share a square by size. One click
still places one animal, so filling a pen is still a choice, and one click
collects the whole square so a full pen isn't a chore.

### Animals move without being saved

An animal's position at any moment comes from its id and the clock, so
moving animals added nothing to the save and nothing to keep in sync. It
also means the game can't "lose" an animal mid-walk: reload and it's
somewhere along the same path. The trade-off is that animals can't react to
anything (they don't flee crows or follow you), which suits a farm better
than it would an adventure game.

### Art arrives one file at a time

The game never waits for a full art set. Every drawing function tries the
real art first and falls back to its code version, so the first sheet that
lands (say, the chicken) changes the farm right away and nothing else breaks.
That's what made it safe to write the art brief before any art exists.

