# The app icon

The owner, 2026-11-25: "I also think the apps icon needs an update since the
current icon I think was made once at the start and never touched."

## How to decide

- **Where a student meets it.** The phone's home screen (about 60 points,
  among other apps' icons, on any wallpaper, light or dark); the browser tab
  (16 to 32 pixels); the header beside ARBOROUS (about 20 pixels); a
  notification; the splash screen while the installed app opens.
- **What it should say.** The app is a tree that grows as you learn and loses
  its leaves as you forget. Its look is a printed book: ink on paper, drawn
  by hand, no gradients or clip-art.
- **What is wrong with today's.** A four-leaf sprig drawn in outline on a
  tile of the old paper colour (#e2e0d5, before the paper became #faf8f0).
  Thin outline leaves go faint at small sizes; it says "plant", not "this
  app"; and the manifest's colours have drifted with it.
- **Evidence.** Each candidate drawn and set at 60, 32 and 16 pixels on a
  light and a dark wallpaper (the sheet on the part 4 page, Round 5).

## The options

- **Keep today's, recoloured.** For: no change to learn. Against: the
  faint outline and the generic "plant" remain; it is the thing asked about.
- **A. The tree, on paper.** A small tree, its right side in leaf and its
  left bare, one leaf falling and one on the ground: the app's own story in
  one picture. For: unmistakably this app; matches the course page. Against:
  at 16 pixels it is a smudge (as the generated course tree was when first
  tried); a light tile can wash out on a light wallpaper.
- **B. The tree, on ink.** The same in paper-white on near-black. For: stands
  out on any wallpaper, reads as a printed plate. Against: the same smudge at
  16 pixels; the app itself is mostly paper.
- **C and D. The sprig, redrawn**, on paper or ink: today's idea with solid
  leaves and pale midribs. For: crisp at every size, including 16 pixels.
  Against: still a generic plant; says nothing about growing and fading.
- **A single veined leaf** (drawn and dropped): clean but the most generic of
  all.
- **A specimen sprig taped to the sheet** (drawn and dropped): the tape read
  as tags, and the drawing was cluttered at home-screen size.

## The pick, pending the owner

**The tree for the app icon (A or B), and the redrawn sprig for the tab and
the header**, the same hand at two sizes, as a printed mark has a small
version. The tree is the only option that says what Arborous is; the sprig
is the only one that survives 16 pixels. Paper or ink is the owner's call:
ink stands out more on a home screen, paper matches the app.

## The build, once picked

`scripts/make-icons.mjs` takes the chosen drawings (from
`scripts/icon-candidates.mjs`, then deleted): icon.svg, the PNGs (192, 512,
maskable 512 with the drawing inside the safe circle, apple-touch-icon),
`src/lib/sprigMark.ts` for the header, the manifest's `background_color` and
`theme_color` (now the stale #e2e0d5), and the notification badge. Then the
share image (`public/og.png`) if it carries the old mark. Checked on the
built app at phone size, and the installed splash on the owner's phone after
the merge.
