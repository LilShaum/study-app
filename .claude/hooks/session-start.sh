#!/bin/bash
# Gets a Claude Code on the web session ready to work on Arborous: the npm
# dependencies, so the checks run (tsc, eslint, vitest, build), and Playwright,
# so a session can screenshot the app at phone and desktop sizes. Playwright is
# not a dependency of the app; Chromium is already in the image at
# /opt/pw-browsers/chromium, so nothing is downloaded for it.
set -euo pipefail

# What the owner has asked for and is not done yet, in every session's
# context from its first turn (docs/ASKS.md).
# One line per ask, not the whole entries: the full Open list was about
# 35 KB (some 9,000 tokens) in every session's context before a word was
# said, and grows with every ask. Read an ask's full entry, in the owner's
# words, before working on it (the scope-check skill searches ASKS and
# FEEDBACK for the subject, which also finds an ask made more than once).
if [ -f "$CLAUDE_PROJECT_DIR/docs/ASKS.md" ]; then
  echo "Open asks from the owner, one line each, to work before anything new."
  echo "Read the full entry in docs/ASKS.md (their words) before working on one:"
  sed -n '/^## Open/,/^## Done/p' "$CLAUDE_PROJECT_DIR/docs/ASKS.md" | sed '$d' | awk '
    /^- \*\*/ {
      line = $0; if ((getline next_line) > 0) line = line " " next_line
      gsub(/[ \t]+/, " ", line)
      title = line
      if (match(line, /\*\*[^*]+\*\*/)) title = substr(line, RSTART + 2, RLENGTH - 4)
      date = ""
      if (title !~ /20[0-9][0-9]-/ && match(line, /20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]/)) date = " (" substr(line, RSTART, RLENGTH) ")"
      print "- " title date
    }'
fi

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
# After npm install, which would prune it.
npm install --no-save --no-audit --no-fund playwright@1.56
