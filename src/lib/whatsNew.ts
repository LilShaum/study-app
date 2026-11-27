/**
 * What's new, as Help shows it: only what a student would notice. How the
 * app teaches, what the prompt makes, a new way to study, a screen that
 * works differently. Not fixes nobody saw, refactors or checks.
 *
 * The owner, 2026-11-10: "really concise and only really things that the
 * user would care about or notice like prompt changes or improvements to
 * the actually teaching system". One plain sentence an item, newest date
 * first; whatsNew.test.ts holds both. A change to the prompt says it is for
 * lectures made from now, since lectures already made keep what they have.
 *
 * Add the line in the commit that ships the change (CLAUDE.md).
 */
export interface Change {
  /** The day it went live, YYYY-MM-DD. */
  date: string;
  items: string[];
}

export const WHATS_NEW: Change[] = [
  {
    date: '2026-11-27',
    items: [
      'A lecture leads with Today: what it holds, a 10, 15 or 30 minute choice that sizes the sitting, and one Start.',
      'Learn and Today count within the part you are in, like Review 2 of 5, and a section opens on Start reading.',
      'Progress says what needs you first, lists the sections not started, and keeps Review at your thumb.',
      'Clicking a branch opens its section, as its number does, and pointing at a branch’s leaves picks it.',
      'Lectures made from now account for every slide. Each card names the slide it came from, and the lecture check names any slide skipped.',
    ],
  },
  {
    date: '2026-11-25',
    items: [
      'A new first run: grow a tree by studying its branches, watch a section fade, and pick your daily time.',
      'Opening a lecture, its tree grows and the leaves you have let fade fall. Sweeping a finger over it names a section.',
      'On a phone, Prev and Next sit at the bottom, a swipe turns the page, and Diagrams shows which section you are in.',
      'Settings, at the foot of every page: your name, light or dark, reminders, your account, backups and Help.',
      'New lecture: let the AI choose the kinds of card, or pick Only these. On a computer, a lecture opens as two facing pages.',
    ],
  },
  {
    date: '2026-11-24',
    items: [
      'Adaptive quiz: questions keep coming, picked from what is fading, what you missed and what you have not answered yet.','New lecture can ask the AI to explain more than your slides do: more context where they are thin, labelled as not from your notes.'],
  },
  {
    date: '2026-11-22',
    items: [
      'The library folds each class under its name, its lectures numbered from I, and class codes always read like BIOL 365.',
      'Each section in Learn starts by asking: Read it here first, or Questions first. Change it partway on the step line.',
      'For lectures made from now: up to five options, None or All of the other options, explanations that say why, and the AI\'s notes to you.',
      'Fewer words on the screens: the lines that explained what a button already says are gone.',
      'Options are shuffled every time a question appears; All of the above and None of the above stay last.',
    ],
  },
  {
    date: '2026-11-20',
    items: [
      'Going back with Prev shows a card as you left it, and the pause between steps has Back too.',
      'Enter checks your answer and never skips ahead: use → or Next to move on.',
      'I wasn\'t sure, under the verdict, for a right answer that was a guess: it opens the why.',
      'A wrong answer set aside as not on your exam stops coming back, and the glossary is shut while a question is asked.',
      'For lectures made from now: hard questions join ideas taught apart, and select-all questions can ask which do NOT apply.',
    ],
  },
  {
    date: '2026-11-16',
    items: [
      'On a computer, Glossary beside a sitting opens the lecture\'s terms next to the card, to check a meaning without leaving.',
      'Clearer names on New lecture: Step-by-step examples, and Problem sets (any method to work out, not only math: code, reactions, proofs).',
    ],
  },
  {
    date: '2026-11-11',
    items: [
      'Your own page, at the foot of every page: your days of study as leaves, your streaks and total time, and time by class.',
      'Time on a lecture you remove still counts, under its class.',
    ],
  },
  {
    date: '2026-11-10',
    items: [
      'A lecture opens at the top, with its tree in view.',
      'Share Arborous with a friend: Help has a code to scan with a phone camera.',
      'A phone turned sideways uses its width: a lecture in two columns, and a card on the first screen.',
    ],
  },
  {
    date: '2026-11-07',
    items: [
      'The tree has a new look: fewer, larger leaves with veins, uneven limbs and fallen leaves along the ground.',
      'Touch the tree to number its branches, and sweep across it to bring one section to the front with its name.',
    ],
  },
  {
    date: '2026-11-06',
    items: [
      'Learn gives the teacher’s narration: what each section builds to, the thread through the lecture, and why each figure is there.',
      'A lecture made before this gets the narration with Add explanations on its page, and keeps its progress.',
      'One Start on the library for the whole day, across every lecture.',
      'Progress opens with what is fading, each with its Review.',
      'A lecture’s first screen is for studying; its details fold under About this lecture.',
    ],
  },
  {
    date: '2026-11-05',
    items: [
      'A new kind of question for new lectures, Select all that apply: each statement is marked with why it is true or false.',
    ],
  },
  {
    date: '2026-11-03',
    items: [
      'Flashcards have Got it, Hard and Missed it, and each button says when the card comes back.',
      'After a miss, Why explains the idea behind the question. Tap Not sure before checking to see it when you get one right.',
      'Practice lets you tick the kinds of question and the sections you want, or start a ready-made Flashcards sitting.',
      'The practice test works like a paper one: marked at the end, a timer if you want it, and every question a tap away, with marks to come back to.',
      'For new lectures, questions that need two ideas together, and wrong options that are right but for one detail.',
    ],
  },
  {
    date: '2026-10-29',
    items: [
      'Choose what a lecture gets: tick only flashcards, for example, and the prompt makes only those.',
      'Problems to work out, for math, code and classes like them.',
      'Making a lecture is three short steps.',
    ],
  },
  {
    date: '2026-10-26',
    items: [
      'Learn goes in order in each part: read, then easy questions and flashcards, then harder questions, with written answers last.',
      'Short explanations teach each key idea before its questions, for when you missed the lecture.',
      'I don’t know on every question shows the answer and why, and brings the question back.',
      'Leave Learn partway and it picks up where you were.',
      'A new practice test asks first what you missed on the last one.',
    ],
  },
  {
    date: '2026-10-21',
    items: [
      'Multiple-choice options are shuffled every time you see them.',
      'A wrong pick tells you why it is wrong.',
      'Short and long written answers, where a class’s exam asks for them.',
    ],
  },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "10 November", with the year only when it is not this year's. */
export function changeDate(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const day = `${d} ${MONTHS[m - 1]}`;
  return y === now.getFullYear() ? day : `${day} ${y}`;
}
