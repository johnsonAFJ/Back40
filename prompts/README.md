# Image prompts

Ready-to-paste prompts for Claude Design, one file per group of art. Each
prompt is complete on its own: it carries the shared style, the exact size
and layout, and what to draw. [ART_BRIEF.md](../ART_BRIEF.md) is the
reference they come from.

How to use them:

1. Open a file and copy one prompt (each is in a code block).
2. Paste it into Claude Design. Ask for one file per message, so each gets
   full attention.
3. Export the PNG at exactly the size the prompt gives, with a transparent
   background.
4. Save it into `src/art/` with the file name the prompt gives.
5. Reload the game (`npm run dev`). The new art replaces the code-drawn
   version; anything still missing keeps its code-drawn look.

Order that pays off fastest: animals (they move, so they show off the most),
then the farmhouse, then the starting crops (strawberries, wheat, soybeans,
peanuts, eggplant), then everything else.

| File | What |
| --- | --- |
| [animals.md](animals.md) | Five animal sprite sheets with walk cycles |
| [crops.md](crops.md) | 29 crops, five growth stages each |
| [trees.md](trees.md) | Six fruit trees, with and without fruit |
| [buildings-and-decorations.md](buildings-and-decorations.md) | Farmhouse, shed, red barn, hay bale and the upright decorations |
| [produce.md](produce.md) | Eleven basket icons |
