import type { StudyItem } from '@/schema/course';
import { McqCard } from './McqCard';
import { FlashcardCard } from './FlashcardCard';
import { DefinitionCard } from './DefinitionCard';
import { ExampleCard } from './ExampleCard';
import { GraphicCard } from './GraphicCard';

interface ItemRendererProps {
  item: StudyItem;
  /** "definitions" mode: definitions start hidden, click/Enter to reveal. */
  revealMode?: boolean;
  onAnswered?: (correct: boolean) => void;
  onNext?: () => void;
  onGot?: () => void;
  onMissed?: () => void;
}

/** Routes to the right card by item.type — the one place that needs to know all five. */
export function ItemRenderer({ item, revealMode, onAnswered, onNext, onGot, onMissed }: ItemRendererProps) {
  switch (item.type) {
    case 'mcq':
      return <McqCard item={item} onAnswered={onAnswered} onNext={onNext} />;
    case 'flashcard':
      return <FlashcardCard item={item} onGot={onGot} onMissed={onMissed} />;
    case 'definition':
      return <DefinitionCard item={item} revealMode={revealMode} />;
    case 'example':
      return <ExampleCard item={item} />;
    case 'graphic':
      return <GraphicCard item={item} />;
  }
}
