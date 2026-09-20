import type { StudyItem } from '@/schema/course';
import { McqCard } from './McqCard';
import { FlashcardCard } from './FlashcardCard';
import { DefinitionCard } from './DefinitionCard';
import { ExampleCard } from './ExampleCard';
import { GraphicCard } from './GraphicCard';
import type { ItemFrame } from './frame';

interface ItemRendererProps {
  item: StudyItem;
  /** "definitions" mode: definitions start hidden, click/Enter to reveal. */
  revealMode?: boolean;
  onAnswered?: (correct: boolean) => void;
  onNext?: () => void;
  onGot?: () => void;
  onMissed?: () => void;
  /** True only for the one card in a study session — Browse renders many at once. */
  keyboardEnabled?: boolean;
  /** 'sheet' in a session, where the page is the item's boundary. See frame.ts. */
  frame?: ItemFrame;
}

/** Routes to the right card by item.type — the one place that needs to know all five. */
export function ItemRenderer({
  item,
  revealMode,
  onAnswered,
  onNext,
  onGot,
  onMissed,
  keyboardEnabled,
  frame = 'card',
}: ItemRendererProps) {
  switch (item.type) {
    case 'mcq':
      return (
        <McqCard item={item} onAnswered={onAnswered} onNext={onNext} keyboardEnabled={keyboardEnabled} frame={frame} />
      );
    case 'flashcard':
      return (
        <FlashcardCard item={item} onGot={onGot} onMissed={onMissed} keyboardEnabled={keyboardEnabled} />
      );
    case 'definition':
      return (
        <DefinitionCard
          item={item}
          revealMode={revealMode}
          keyboardEnabled={keyboardEnabled}
          onNext={onNext}
          frame={frame}
        />
      );
    case 'example':
      return <ExampleCard item={item} frame={frame} />;
    case 'graphic':
      return <GraphicCard item={item} frame={frame} />;
  }
}
