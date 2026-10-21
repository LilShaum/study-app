#!/bin/bash
# Gets a Claude Code on the web session ready to work on Arborous: the npm
# dependencies, so the checks run (tsc, eslint, vitest, build), and Playwright,
# so a session can screenshot the app at phone and desktop sizes. Playwright is
# not a dependency of the app; Chromium is already in the image at
# /opt/pw-browsers/chromium, so nothing is downloaded for it.
set -euo pipefail

# What the owner has asked for and is not done yet, in every session's
# context from its first turn (docs/ASKS.md).
if [ -f "$CLAUDE_PROJECT_DIR/docs/ASKS.md" ]; then
  echo "Open asks from the owner (docs/ASKS.md), to work before anything new:"
  sed -n '/^## Open/,/^## Done/p' "$CLAUDE_PROJECT_DIR/docs/ASKS.md" | sed '$d'
fi

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
# After npm install, which would prune it.
npm install --no-save --no-audit --no-fund playwright@1.56
