import type { AnyItem } from '@/lib/buildSessionItems';
import { McqCard } from './McqCard';
import { FlashcardCard } from './FlashcardCard';
import { DefinitionCard } from './DefinitionCard';
import { ExampleCard } from './ExampleCard';
import { GraphicCard } from './GraphicCard';
import { RecallCard } from './RecallCard';
import type { ItemFrame } from './frame';

interface ItemRendererProps {
  /** A file item, or one the app derives from it for a session (see RecallItem). */
  item: AnyItem;
  onAnswered?: (correct: boolean) => void;
  onNext?: () => void;
  onGot?: () => void;
  onMissed?: () => void;
  /** The student overruling a typed answer's verdict. */
  onOverride?: (correct: boolean) => void;
  /** True only for the one card in a study session — Browse renders many at once. */
  keyboardEnabled?: boolean;
  /** 'sheet' in a session, where the page is the item's boundary. See frame.ts. */
  frame?: ItemFrame;
}

/** Routes to the right card by item.type — the one place that needs to know them all. */
export function ItemRenderer({
  item,
  onAnswered,
  onNext,
  onGot,
  onMissed,
  onOverride,
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
          keyboardEnabled={keyboardEnabled}
          onNext={onNext}
          frame={frame}
        />
      );
    case 'example':
      return <ExampleCard item={item} frame={frame} />;
    case 'graphic':
      return <GraphicCard item={item} frame={frame} />;
    case 'recall':
      return (
        <RecallCard
          item={item}
          onAnswered={onAnswered}
          onOverride={onOverride}
          onNext={onNext}
          keyboardEnabled={keyboardEnabled}
          frame={frame}
        />
      );
  }
}
