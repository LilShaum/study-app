import type { ItemType, StudyItem } from '@/schema/course';

/** A minimal, valid starting point for a new item of the given type, used by "+ Add item". */
export function createBlankItem(type: ItemType, id: string): StudyItem {
  switch (type) {
    case 'mcq':
      return { id, type, question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' };
    case 'multi':
      return { id, type, question: '', options: ['', '', '', ''], correct: [0], option_rationale: ['', '', '', ''], explanation: '' };
    case 'flashcard':
      return { id, type, front: '', back: '' };
    case 'definition':
      return { id, type, term: '', definition: '' };
    case 'example':
      return { id, type, title: '', steps: [] };
    case 'explain':
      return { id, type, title: '', text: '' };
    case 'problem':
      return { id, type, question: '', steps: [''] };
    case 'graphic':
      return { id, type, title: '' };
  }
}
