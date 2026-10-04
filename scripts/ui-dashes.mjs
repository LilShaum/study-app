#!/usr/bin/env node
/**
 * Lists em dashes in text a student sees: string literals and JSX text under
 * src/, not comments. AI-written copy scatters them by habit, so each one
 * should be there on purpose: where it reads better than a period, comma or
 * colon, or does a design job. This lists them to be judged; it does not
 * fail. The prompts the app hands to an AI (src/lib/build*Prompt.ts) are
 * skipped: only the AI reads them.
 *
 *   node scripts/ui-dashes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const SKIP = /\.test\.|[\\/]lib[\\/]build\w*Prompt\.ts$/;
const found = [];

function scan(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (n) => {
    const literal =
      ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n) ||
      ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n);
    if (literal && n.text.includes('—')) {
      const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
      found.push(`${path.relative(path.dirname(SRC), file)}:${line + 1}  ${n.text.replace(/\s+/g, ' ').trim().slice(0, 100)}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p) && !SKIP.test(p)) scan(p);
  }
})(SRC);

console.log(found.length ? found.join('\n') : 'No em dashes in UI text.');
