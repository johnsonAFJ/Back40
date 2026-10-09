# Back40

A browser farming game in the style of the 2009 Facebook farm games. Plow,
plant, wait in real time, harvest before your crops wither, level up, and
expand your land with help from the neighbors down the road.

A learning project and a game to play with friends. Not affiliated with any
existing game or company; all art and names are original.

- **Rules and data:** [SPEC.md](SPEC.md)
- **Design decisions:** [DESIGN.md](DESIGN.md)
- **Art:** [ART_BRIEF.md](ART_BRIEF.md) and [prompts/](prompts/)

Play it at https://johnsonafj.github.io/Back40/

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:8440/Back40/. `npm test` runs the tests.

When Claude is working on the game, port 8440 serves `main` from a separate
copy and Claude tests on 8442, so test builds never touch the farm you play.

Add `?test` to the address for the test panel: speed up the clock, skip ahead,
add coins and levels, and start over.

Status: milestone 7 (installable app, backups, moving animals, art loader).

## Adding art

Art comes from Claude Design using the prompts in [prompts/](prompts/). Save
each PNG into `src/art/` with the name the prompt gives and reload: it
replaces the code-drawn version of that one thing. See
[ART_BRIEF.md](ART_BRIEF.md) for the full spec.

Done so far: all five animals and the first 29 crops. Still code-drawn:
the six crops added from the 2009 chart, trees, buildings, decorations and
basket icons.
