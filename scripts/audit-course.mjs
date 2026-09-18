#!/usr/bin/env node
/**
 * Audits a generated .study.json against the source material it claims to
 * come from.
 *
 *   node scripts/audit-course.mjs course.study.json [source.txt]
 *
 * The app already rejects a file that doesn't match the schema, and `npm test`
 * covers the merge and parsing logic. What neither can do is check whether the
 * content is *honest* — whether every source_excerpt really appears in the
 * notes, whether MCQs obey the contract in CLAUDE.md, and whether the metadata
 * counts are true. That's what this is for.
 *
 * Pass a source file (plain text — `pdftotext -layout lecture.pdf source.txt`
 * for slides) to enable the grounding check, which is the one that catches
 * fabricated content. Without it the structural checks still run.
 *
 * Exit code is 1 if any hard check fails, so it can gate a workflow.
 *
 * Dependency-free on purpose: this should run against a course file anywhere,
 * without installing the app.
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const termsFlag = argv.indexOf('--terms');
const termsPath = termsFlag === -1 ? null : argv[termsFlag + 1];
const consumed = termsFlag === -1 ? new Set() : new Set([termsFlag, termsFlag + 1]);
const positional = argv.filter((a, i) => !consumed.has(i) && !a.startsWith('--'));
const [coursePath, sourcePath] = positional;

if (!coursePath) {
  console.error('usage: node scripts/audit-course.mjs <course.study.json> [source.txt] [--terms terms.txt]');
  process.exit(2);
}

const course = JSON.parse(fs.readFileSync(coursePath, 'utf8'));
const sourceRaw = sourcePath ? fs.readFileSync(sourcePath, 'utf8') : null;
/* A terms file is the marking scheme for coverage: one concept per line,
   "|" separating acceptable synonyms, "#" for comments. Without it we can
   still check that definitions exist, but not that the RIGHT ones do. */
const expectedTerms = termsPath
  ? fs
      .readFileSync(termsPath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split('|').map((v) => v.trim()).filter(Boolean))
  : null;

/* Normalise both sides identically. Filtering words on only one side makes
   a verbatim quote unmatchable; mapping ×/·/⋅/* to a common token stops an
   ASCII transliteration of a formula reading as a fabrication. */
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[×⋅·*]/g, ' x ')
    // Sub/superscript digits carry meaning here (v₀, K₀.₅, IC₅₀). Fold them to
    // ASCII before stripping punctuation, or "v₀" collapses to a bare "v" and
    // matches anything containing the letter v.
    .replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)))
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const SRC = sourceRaw ? norm(sourceRaw) : null;

const pass = [];
const warn = [];
const fail = [];
const check = (cond, msg, bucket = fail) => (cond ? pass.push(msg) : bucket.push(msg));

const sections = Array.isArray(course.sections) ? course.sections : [];
const items = sections.flatMap((s) => (Array.isArray(s.items) ? s.items : []));

/* ---- structure ---- */
check(course.schema_version === '1.0', `schema_version is "1.0" (found ${JSON.stringify(course.schema_version)})`);
check(!!course.metadata?.title, 'metadata.title is present');
const ids = items.map((i) => i.id);
const dupIds = ids.filter((id, n) => ids.indexOf(id) !== n);
check(dupIds.length === 0, `item ids unique across the course${dupIds.length ? ` — repeated: ${[...new Set(dupIds)].join(', ')}` : ` (${ids.length} items)`}`);
const secIds = sections.map((s) => s.id);
check(new Set(secIds).size === secIds.length, `section ids unique (${secIds.length} sections)`);

/* ---- grounding (Rule zero) ---- */
const noExcerpt = items.filter((i) => !String(i.source_excerpt ?? '').trim());
check(noExcerpt.length === 0, `every item has a source_excerpt${noExcerpt.length ? ` — missing on: ${noExcerpt.map((i) => i.id).join(', ')}` : ''}`);

if (SRC) {
  const groundedRun = (text) => {
    const words = norm(text).split(' ').filter(Boolean);
    if (!words.length) return false;
    if (words.length < 4) return SRC.includes(words.join(' '));
    const n = Math.min(words.length, 6);
    for (let i = 0; i + n <= words.length; i++) {
      if (SRC.includes(words.slice(i, i + n).join(' '))) return true;
    }
    return false;
  };
  // An excerpt may stitch two passages with an ellipsis; each half must trace.
  const grounded = (excerpt) => {
    const parts = String(excerpt).split(/\s*(?:\.\.\.|…)\s*/).filter((p) => p.trim());
    return parts.length > 0 && parts.every(groundedRun);
  };
  const ungrounded = items.filter((i) => i.source_excerpt && !grounded(i.source_excerpt));
  check(
    ungrounded.length === 0,
    `every source_excerpt traces to the source${ungrounded.length ? ` — NOT FOUND (${ungrounded.length}): ${ungrounded.map((i) => i.id).join(', ')}` : ''}`,
  );
} else {
  warn.push('no source file given — skipped the grounding check (pass one to catch fabricated content)');
}

/* ---- MCQ contract ---- */
const mcqs = items.filter((i) => i.type === 'mcq');
const badOpts = mcqs.filter((m) => !Array.isArray(m.options) || m.options.length !== 4);
check(badOpts.length === 0, `every MCQ has exactly 4 options (${mcqs.length} MCQs)${badOpts.length ? ` — bad: ${badOpts.map((m) => m.id).join(', ')}` : ''}`);
const badIdx = mcqs.filter((m) => !Number.isInteger(m.correct_index) || m.correct_index < 0 || m.correct_index >= (m.options?.length ?? 0));
check(badIdx.length === 0, `every correct_index is in range${badIdx.length ? ` — bad: ${badIdx.map((m) => `${m.id}=${m.correct_index}`).join(', ')}` : ''}`);
const badRat = mcqs.filter((m) => !Array.isArray(m.distractor_rationale) || m.distractor_rationale.length !== (m.options?.length ?? 0));
check(badRat.length === 0, `distractor_rationale is index-aligned with options${badRat.length ? ` — bad: ${badRat.map((m) => `${m.id} (${m.distractor_rationale?.length ?? 0}/${m.options?.length ?? 0})`).join(', ')}` : ''}`);
const filler = mcqs.filter((m) => m.options?.some((o) => /^(all|none) of the above$/i.test(String(o).trim())));
check(filler.length === 0, `no "all/none of the above" filler${filler.length ? ` — ${filler.map((m) => m.id).join(', ')}` : ''}`);
const noExpl = mcqs.filter((m) => !String(m.explanation ?? '').trim());
check(noExpl.length === 0, `every MCQ has an explanation${noExpl.length ? ` — missing: ${noExpl.map((m) => m.id).join(', ')}` : ''}`);
const filledSlot = mcqs.filter((m) => Array.isArray(m.distractor_rationale) && String(m.distractor_rationale[m.correct_index] ?? '').trim() !== '');
check(filledSlot.length === 0, `correct answer's rationale slot left empty${filledSlot.length ? ` — ${filledSlot.map((m) => m.id).join(', ')}` : ''}`, warn);

/* ---- duplicates ---- */
const promptOf = (i) => (i.type === 'mcq' ? i.question : i.type === 'flashcard' ? i.front : i.type === 'definition' ? i.term : i.title);
const seen = new Map();
const dupes = [];
for (const i of items) {
  const key = `${i.type}:${norm(promptOf(i) ?? '')}`;
  if (seen.has(key)) dupes.push(`${i.id} ~ ${seen.get(key)}`);
  else seen.set(key, i.id);
}
check(dupes.length === 0, `no two items of one type share a prompt${dupes.length ? ` — ${dupes.join(', ')}` : ''}`);

/* ---- graded spine ---- */
const graded = items.filter((i) => i.type === 'mcq' || i.type === 'flashcard');
check(
  items.length === 0 || graded.length >= Math.ceil(items.length * 0.4),
  `enough gradable items: ${graded.length}/${items.length} are MCQ or flashcard (only these are scored)`,
  warn,
);

/* ---- term coverage ----
   The point of the generator's inventory pass: every piece of jargon in the
   notes should end up with a definition. This is the check that catches a
   course which is internally consistent but only covers a third of the
   syllabus — the failure mode that looks fine until the exam. */
const definitions = items.filter((i) => i.type === 'definition');
if (expectedTerms) {
  // A term counts as covered if a definition's `term` matches one of its
  // accepted spellings, either way round — "Km" should match a definition
  // titled "Km (Michaelis constant)".
  const defTerms = definitions.map((d) => norm(d.term ?? ''));
  // Match whole token sequences, not bare substrings. Padding both sides with
  // spaces makes "km" match "km michaelis constant" but not "kinase", and a
  // short variant like "ki" no longer matches every word containing those
  // letters — a false pass here would report coverage that isn't there, which
  // is worse than reporting none.
  const phraseIn = (haystack, needle) => ` ${haystack} `.includes(` ${needle} `);
  const covers = (variants) =>
    variants.some((v) => {
      const nv = norm(v);
      if (!nv) return false;
      return defTerms.some(
        (dt) => dt === nv || phraseIn(dt, nv) || (dt.length >= 4 && phraseIn(nv, dt)),
      );
    });
  const missing = expectedTerms.filter((variants) => !covers(variants));
  const covered = expectedTerms.length - missing.length;
  const pct = Math.round((covered / expectedTerms.length) * 100);
  check(
    missing.length === 0,
    `every expected term has a definition — ${covered}/${expectedTerms.length} (${pct}%)${missing.length ? `\n      uncovered: ${missing.map((v) => v[0]).join(', ')}` : ''}`,
  );
} else {
  warn.push('no --terms file given — skipped jargon-coverage checking');
}

/* ---- gradable coverage of the definitions ----
   Definitions are read, never scored. A term that only ever appears as a
   definition is shown to the student but never tested. */
if (definitions.length) {
  const gradableText = norm(
    items
      .filter((i) => i.type === 'mcq' || i.type === 'flashcard')
      .map((i) => `${i.question ?? ''} ${i.front ?? ''} ${i.back ?? ''} ${(i.options ?? []).join(' ')} ${i.explanation ?? ''}`)
      .join(' '),
  );
  const untested = definitions.filter((d) => {
    const t = norm(d.term ?? '');
    return t.length > 2 && !gradableText.includes(t);
  });
  const testedPct = Math.round(((definitions.length - untested.length) / definitions.length) * 100);
  check(
    untested.length <= Math.floor(definitions.length * 0.25),
    `defined terms also appear in a gradable item — ${definitions.length - untested.length}/${definitions.length} (${testedPct}%)${untested.length ? `\n      never tested: ${untested.slice(0, 12).map((d) => d.term).join(', ')}${untested.length > 12 ? `, +${untested.length - 12} more` : ''}` : ''}`,
    warn,
  );
}

/* ---- diagrams ---- */
for (const g of items.filter((i) => i.type === 'graphic')) {
  const svg = String(g.svg ?? '');
  check(!/<script|\son[a-z]+\s*=|<foreignObject|href\s*=\s*["']?\s*(https?:|javascript:)/i.test(svg), `${g.id}: no script, event handlers or external refs in svg`);
  check(/viewBox/i.test(svg), `${g.id}: svg has a viewBox`);
  check(!!String(g.alt_text ?? '').trim(), `${g.id}: has alt_text`);
  check(!/\b(width|height)\s*=\s*["']?\d/.test(svg), `${g.id}: svg has no fixed pixel size (so it fills a phone screen)`, warn);
  check(/currentColor/i.test(svg), `${g.id}: svg uses currentColor (legible on the dark themes)`, warn);
}

/* ---- metadata honesty ---- */
if (course.metadata?.total_items !== undefined)
  check(course.metadata.total_items === items.length, `metadata.total_items (${course.metadata.total_items}) matches the real count (${items.length})`);
if (course.metadata?.item_counts) {
  const actual = {};
  for (const i of items) actual[i.type] = (actual[i.type] ?? 0) + 1;
  const declared = course.metadata.item_counts;
  const off = [...new Set([...Object.keys(actual), ...Object.keys(declared)])].filter((k) => (actual[k] ?? 0) !== (declared[k] ?? 0));
  check(off.length === 0, `metadata.item_counts matches reality${off.length ? ` — off on ${off.map((k) => `${k}: says ${declared[k] ?? 0}, really ${actual[k] ?? 0}`).join('; ')}` : ''}`);
}

/* ---- report ---- */
const byType = {};
for (const i of items) byType[i.type] = (byType[i.type] ?? 0) + 1;
console.log(`\n${course.metadata?.title ?? '(untitled)'} — ${sections.length} sections, ${items.length} items`);
console.log(`  ${Object.entries(byType).map(([k, v]) => `${v} ${k}`).join(', ') || '(no items)'}`);

console.log(`\nPASS (${pass.length})`);
for (const m of pass) console.log(`  ✓ ${m}`);
if (warn.length) {
  console.log(`\nWARN (${warn.length})`);
  for (const m of warn) console.log(`  ! ${m}`);
}
if (fail.length) {
  console.log(`\nFAIL (${fail.length})`);
  for (const m of fail) console.log(`  ✗ ${m}`);
}
console.log(fail.length ? `\n${fail.length} hard failure(s).` : '\nNo hard failures.');

// Note: this cannot tell you whether an MCQ's correct_index points at the
// genuinely correct option — that needs a human (or the source) to read. It
// checks the contract, not the truth of the answer.
process.exit(fail.length ? 1 : 0);
