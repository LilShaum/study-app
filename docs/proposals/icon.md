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

## The pick: C, the sprig on paper (the owner, 2026-11-25)

> "I'd choose c since I'm not a big fan of the leaves falling on the tree and
> I think c is a good icon"

The same sprig is the header mark, so the app icon, the tab and the header
are one drawing.

## The build, as built

`scripts/make-icons.mjs` now draws the sprig (the candidate's geometry moved
in; `scripts/icon-candidates.mjs` is deleted) and writes `icon.svg`,
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (the drawing inside
the 80% safe circle), `apple-touch-icon.png`, the new white-on-transparent
`badge-96.png` (used by the push handler in `src/sw.ts`) and
`src/lib/sprigMark.ts` for `src/components/Sprig.tsx`. The manifest's
`background_color` and `theme_color` and the light `theme-color` meta in
`index.html` are now the app's paper, #faf8f0. `public/og.png` shows the
course tree, not the sprig, so it is unchanged. Still to check: the
installed splash on the owner's phone after the merge.
