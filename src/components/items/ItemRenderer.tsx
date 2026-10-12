import type { AnyItem } from '@/lib/buildSessionItems';
import { McqCard } from './McqCard';
import { FlashcardCard } from './FlashcardCard';
import { DefinitionCard } from './DefinitionCard';
import { ExampleCard } from './ExampleCard';
import { GraphicCard } from './GraphicCard';
import { RecallCard } from './RecallCard';
import { PreviewCard } from './PreviewCard';
import { SlidesCard } from './SlidesCard';
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
  /** A typed answer named a different term; its definition's id. */
  onConfused?: (otherDefinitionId: string) => void;
  /** True only for the one card in a study session — Browse renders many at once. */
  keyboardEnabled?: boolean;
  /** 'sheet' in a session, where the page is the item's boundary. See frame.ts. */
  frame?: ItemFrame;
  /** Learn: reading cards show the passage from the notes open, and so does every answer. */
  learning?: boolean;
  /** Learn, on a section's slides card: the student has read them, so ask first. */
  onReadThem?: () => void;
}

/** Routes to the right card by item.type — the one place that needs to know them all. */
export function ItemRenderer({
  item,
  onAnswered,
  onNext,
  onGot,
  onMissed,
  onOverride,
  onConfused,
  keyboardEnabled,
  frame = 'card',
  learning = false,
  onReadThem,
}: ItemRendererProps) {
  switch (item.type) {
    case 'slides':
      return (
        <SlidesCard
          range={item.range}
          sectionTitle={'_sectionTitle' in item ? String(item._sectionTitle) : ''}
          keyboardEnabled={keyboardEnabled}
          onReadThem={onReadThem}
          onTeachHere={onNext}
          frame={frame}
        />
      );
    case 'mcq':
      return (
        <McqCard item={item} onAnswered={onAnswered} onNext={onNext} keyboardEnabled={keyboardEnabled} frame={frame} learning={learning} />
      );
    case 'flashcard':
      return (
        <FlashcardCard item={item} onGot={onGot} onMissed={onMissed} keyboardEnabled={keyboardEnabled} learning={learning} />
      );
    case 'definition':
      return (
        <DefinitionCard
          item={item}
          keyboardEnabled={keyboardEnabled}
          onNext={onNext}
          frame={frame}
          notesOpen={learning}
        />
      );
    case 'preview':
      return <PreviewCard item={item} keyboardEnabled={keyboardEnabled} onNext={onNext} frame={frame} />;
    case 'example':
      return <ExampleCard item={item} frame={frame} notesOpen={learning} />;
    case 'graphic':
      return <GraphicCard item={item} frame={frame} notesOpen={learning} />;
    case 'recall':
      return (
        <RecallCard
          item={item}
          onAnswered={onAnswered}
          onOverride={onOverride}
          onConfused={onConfused}
          onNext={onNext}
          keyboardEnabled={keyboardEnabled}
          frame={frame}
          learning={learning}
        />
      );
  }
}
