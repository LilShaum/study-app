import type { SessionItem } from './buildSessionItems';

/** A missed card's question and its right answer, as plain text. */
export function missedLine(item: SessionItem): { question: string; answer: string; why?: string } | null {
  switch (item.type) {
    case 'mcq':
      return { question: item.question, answer: item.options?.[item.correct_index] ?? '', why: item.explanation };
    case 'multi':
      return { question: item.question, answer: (item.correct ?? []).map((k) => item.options[k]).filter(Boolean).join(' · '), why: item.explanation };
    case 'flashcard':
      return { question: item.front, answer: item.back };
    case 'recall':
      return item.question
        ? { question: item.question, answer: item.answer ?? '', why: item.explanation }
        : { question: item.target.definition, answer: item.target.term };
    case 'problem':
      return { question: item.question, answer: item.answer != null ? `${item.answer}${item.unit ? ` ${item.unit}` : ''}` : (item.steps?.at(-1) ?? '') };
    default:
      return null;
  }
}
