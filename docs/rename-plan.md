# Renaming the repo from study-app to arborous

**Status: on hold.** The owner wants to do this eventually, and wants the
switch to be as seamless as possible for anyone using the app.

## What still says study-app

Everything user-facing already says Arborous: the app name, the package name
and the storage keys. What's left is the repo name and the web address, and
the address follows the repo name on GitHub Pages:

- `vite.config.ts` (`BASE`)
- `public/manifest.webmanifest` (`start_url`, `scope`)
- `.github/workflows/deploy.yml` (live-site check URL)
- `scripts/screenshots.mjs`, `README.md`
- comments in `src/lib/basePath.ts`, `src/sw.ts`, `src/store/migrateLegacy.ts`
- `docs/briefs/fable-audit.md` (historical, can stay)

## Why it isn't just a find-and-replace

Renaming the repo moves the app from lilshaum.github.io/study-app/ to
lilshaum.github.io/arborous/, and GitHub doesn't forward the old address.

- **Desktop browsers:** saved data carries over automatically, because both
  addresses are on the same origin and localStorage is per origin.
- **A home-screen app on iPhone:** the old icon stops updating and has to be
  re-added from the new address. iOS keeps a home-screen app's storage
  separate, so the new icon will probably start empty, and progress would be
  lost without a way to carry it across.

## Plan for a seamless switch

**Sync (2026-09-27) makes this much simpler:** a student signed in to Sync
signs in again at the new address and everything comes back, on any device,
the installed iPhone app included. The backup steps below remain for anyone
not using Sync.

1. ~~**Add "Back up everything" / "Restore".**~~ Done (2026-09-27):
   Help → "Where your courses are saved", and a "Restore a backup" link on
   the empty library (`src/lib/backup.ts`).
2. **Ship one release at the old address that announces the move.** It shows
   the new address and a one-tap "Save backup" button, and stays up long
   enough for users to see it.
3. **The owner renames the repo** in GitHub's settings. This session can't.
   Then, in the same push: change the paths listed above, and update the
   session's repo access (`add_repo`) and the git remote.
4. **Open the new address with no data saved.** The empty library already
   offers "Restore a backup"; consider offering it in the welcome too.
5. **Optionally forward the old address.** Make a new repo named `study-app`
   whose Pages site redirects to /arborous/, with a `sw.js` that unregisters
   itself, so old links and bookmarks still land somewhere.

When the address changes, also update the two places that hold it in full:
the `og:image` tag in `index.html` (link previews need an absolute URL) and
the redirect in `public/404.html`.
