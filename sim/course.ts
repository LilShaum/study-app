import type { Course, StudyItem } from '@/schema/course';
import { rng, type Rand } from './random';

/**
 * Synthetic courses for the simulator.
 *
 * The simulator never uses a real course: the repo is public, and a student's
 * course is made from their own lecture notes. Instead it builds a stand-in
 * from a SHAPE — counts and rates only, no content — so a shape can be
 * measured from any real course (see shape.sim.ts) and committed safely.
 *
 * What the app's logic reads from content, and so what the stand-in has to
 * get right:
 *  - which questions name which terms (Learn puts a question in the step
 *    whose terms it uses — lib/learnSteps.ts);
 *  - abbreviations, which are matched too ("Michaelis constant (Km)" is also
 *    "Km");
 *  - a section's subject term, which turns up in a large share of its
 *    questions and is ignored for placement;
 *  - MCQs whose right answer is a term's name, which Review asks typed.
 * Everything else — the answers, the wording — only needs to be distinct.
 */

export interface SectionShape {
  definition: number;
  mcq: number;
  flashcard: number;
  example: number;
  graphic: number;
}

export interface CourseShape {
  name: string;
  /** Where the numbers come from, and how far to trust them. */
  source: string;
  sections: SectionShape[];
  /** Mean number of defined terms a question, flashcard, example or diagram names. */
  termsPerItem: number;
  /** Share of those items that name no defined term at all. */
  untagged: number;
  /** Share of terms written with an abbreviation, "Full name (FN)". */
  abbreviated: number;
  /** Share of MCQs whose right answer is a term's name. */
  answerIsTerm: number;
}

/**
 * Measured from the one real course available (Cell Signaling, 12 sections),
 * generated with an OLDER version of the course prompt. Use it as one shape
 * among several, not as what the prompt produces today.
 */
const OLD_PROMPT: CourseShape = {
  name: 'old-prompt',
  source: 'Measured 2026-09-25 from a real 12-section course made with an older prompt (counts only).',
  sections: [
    [6, 3, 4, 1, 1],
    [19, 10, 10, 2, 0],
    [16, 9, 11, 0, 0],
    [17, 10, 9, 2, 0],
    [28, 17, 15, 3, 1],
    [31, 10, 15, 1, 0],
    [8, 8, 6, 1, 1],
    [10, 8, 6, 1, 1],
    [10, 5, 5, 1, 0],
    [37, 18, 18, 3, 1],
    [26, 14, 13, 1, 0],
    [16, 16, 10, 2, 1],
  ].map(([definition, mcq, flashcard, example, graphic]) => ({ definition, mcq, flashcard, example, graphic })),
  termsPerItem: 3.1,
  untagged: 0.04,
  abbreviated: 0.16,
  answerIsTerm: 0.15,
};

/**
 * An ESTIMATE of what the current prompt asks for, on the same lectures: the
 * same terms (the lecture teaches what it teaches), with more questions per
 * term — the prompt now asks for two to four items per idea and for every
 * section to have questions that apply, not only recall. Replace it with a
 * measured shape as soon as a course made with the current prompt exists.
 */
const SPEC_ESTIMATE: CourseShape = {
  name: 'spec-estimate',
  source: 'Estimate from CLAUDE.md, not measured: old-prompt terms, ~0.9 MCQs and ~0.6 flashcards per term.',
  sections: OLD_PROMPT.sections.map((s) => ({
    ...s,
    mcq: Math.round(s.definition * 0.9),
    flashcard: Math.round(s.definition * 0.6),
  })),
  termsPerItem: 2.8,
  untagged: 0.04,
  abbreviated: 0.16,
  answerIsTerm: 0.15,
};

export const SHAPES: Record<string, CourseShape> = {
  [OLD_PROMPT.name]: OLD_PROMPT,
  [SPEC_ESTIMATE.name]: SPEC_ESTIMATE,
};

// Invented words, so no two terms collide and filler text never names one.
const ONSETS = ['t', 'v', 'm', 'k', 'r', 's', 'l', 'n', 'p', 'd', 'g', 'b', 'z', 'f'];
const NUCLEI = ['a', 'e', 'i', 'o', 'u', 'ai', 'ou'];
const CODAS = ['n', 'r', 'l', 'x', 'm', 's', 'th', 'v'];
const NOUNS = ['kinase', 'receptor', 'channel', 'hormone', 'factor', 'pathway', 'domain', 'messenger', 'enzyme', 'protein', 'ligand', 'cascade'];
const FILLER = ['which', 'statement', 'best', 'describes', 'role', 'when', 'what', 'happens', 'during', 'effect', 'on', 'cell', 'the', 'is', 'a', 'of', 'in'];

function word(r: Rand): string {
  const syl = () => ONSETS[Math.floor(r() * ONSETS.length)] + NUCLEI[Math.floor(r() * NUCLEI.length)];
  return syl() + syl() + CODAS[Math.floor(r() * CODAS.length)];
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const filler = (r: Rand, n: number) => Array.from({ length: n }, () => FILLER[Math.floor(r() * FILLER.length)]).join(' ');

interface Term {
  term: string;
  /** Names a question may use for it. */
  names: string[];
}

export function makeCourse(shape: CourseShape, seed = 1): Course {
  const r = rng(seed);
  const used = new Set<string>();
  const fresh = () => {
    for (;;) {
      const w = word(r);
      if (!used.has(w)) return used.add(w), w;
    }
  };

  const sections = shape.sections.map((sh, j) => {
    const noun = NOUNS[j % NOUNS.length];
    const terms: Term[] = [];
    for (let k = 0; k < sh.definition; k++) {
      if (k === 0) {
        // The section's subject: a bare noun its other terms share.
        terms.push({ term: cap(noun), names: [cap(noun)] });
        continue;
      }
      const w = fresh();
      const second = r() < 0.35 ? noun : NOUNS[Math.floor(r() * NOUNS.length)];
      const full = `${cap(w)} ${second}`;
      if (r() < shape.abbreviated) {
        const abbr = (w.slice(0, 2) + second[0]).toUpperCase();
        terms.push({ term: `${full} (${abbr})`, names: [full, abbr] });
      } else terms.push({ term: full, names: [full] });
    }

    // The terms an item names: one it is about, which moves through the
    // section as the items do (they are written in lecture order), and a few
    // from before it, mostly recent.
    const namesFor = (k: number, of: number): string[] => {
      if (!terms.length || r() < shape.untagged) return [];
      const T = terms.length;
      const at = Math.round(((k + 0.5) / of) * T - 0.5 + (r() * 2 - 1));
      const focus = Math.max(T > 1 ? 1 : 0, Math.min(T - 1, at));
      const extra = Math.min(4, Math.floor(r() * (2 * Math.max(0, shape.termsPerItem - 1) + 1)));
      const chosen = new Set([focus]);
      for (let e = 0; e < extra; e++) chosen.add(Math.max(0, focus - Math.floor(r() * r() * (focus + 1))));
      return [...chosen].map((i) => {
        const t = terms[i];
        return t.names[Math.floor(r() * t.names.length)];
      });
    };

    const items: StudyItem[] = [];
    terms.forEach((t, k) =>
      items.push({
        id: `s${j}_d${k}`,
        type: 'definition',
        term: t.term,
        definition: `The ${filler(r, 6)} number ${j}.${k}.`,
        ...(t.names.length > 1 ? { also_known_as: [t.names[1]] } : {}),
      } as StudyItem),
    );
    for (let k = 0; k < sh.mcq; k++) {
      const names = namesFor(k, sh.mcq);
      const answer = names.length && r() < shape.answerIsTerm ? names[0] : `Option ${filler(r, 3)} ${k}`;
      const others = answer === names[0] ? names.slice(1) : names;
      items.push({
        id: `s${j}_q${k}`,
        type: 'mcq',
        question: `${cap(filler(r, 5))} ${others.join(' and ')} ${k}?`,
        options: [answer, `Wrong ${k} a`, `Wrong ${k} b`, `Wrong ${k} c`],
        correct_index: 0,
        explanation: filler(r, 8),
        distractor_rationale: ['', 'x', 'x', 'x'],
      } as StudyItem);
    }
    for (let k = 0; k < sh.flashcard; k++) {
      items.push({
        id: `s${j}_f${k}`,
        type: 'flashcard',
        front: `${cap(filler(r, 4))} ${namesFor(k, sh.flashcard).join(' and ')} ${k}?`,
        back: filler(r, 6),
      } as StudyItem);
    }
    for (let k = 0; k < sh.example; k++) {
      items.push({
        id: `s${j}_e${k}`,
        type: 'example',
        title: `Worked ${namesFor(k, sh.example).join(' and ')} ${k}`,
        steps: [filler(r, 6), filler(r, 6), filler(r, 6)],
      } as StudyItem);
    }
    for (let k = 0; k < sh.graphic; k++) {
      items.push({
        id: `s${j}_g${k}`,
        type: 'graphic',
        title: `Diagram of ${namesFor(k, sh.graphic).join(' and ')} ${k}`,
        svg: '<svg viewBox="0 0 10 10"><path d="M1 1L9 9" stroke="currentColor"/></svg>',
        alt_text: 'A line.',
      } as StudyItem);
    }
    return { id: `s${j}`, title: `Section ${j + 1}`, order: j + 1, items };
  });

  return { schema_version: '1.0', metadata: { title: `Synthetic (${shape.name})` }, sections } as Course;
}
