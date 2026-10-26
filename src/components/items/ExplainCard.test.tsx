import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ExplainItem } from '@/schema/course';
import { StudyItemSchema } from '@/schema/course';
import { ExplainCard } from './ExplainCard';

afterEach(cleanup);

const item = {
  id: 'e1',
  type: 'explain',
  title: 'Why the signal lasts',
  text: 'Phosphodiesterase breaks cAMP down.\n\nBlock it and cAMP builds up, so the signal runs on.',
  source_excerpt: 'phosphodiesterase breaks down cAMP',
} as ExplainItem;

describe('ExplainCard', () => {
  it('shows the title and each paragraph, asking nothing', () => {
    render(<ExplainCard item={item} />);
    expect(screen.getByRole('heading', { name: 'Why the signal lasts' })).toBeTruthy();
    expect(screen.getByText('Phosphodiesterase breaks cAMP down.')).toBeTruthy();
    expect(screen.getByText('Block it and cAMP builds up, so the signal runs on.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /know|got it|check/i })).toBeNull();
  });

  it('is a type a lecture file can hold, with a title and text', () => {
    expect(StudyItemSchema.safeParse(item).success).toBe(true);
    expect(StudyItemSchema.safeParse({ id: 'e2', type: 'explain', title: 'No text' }).success).toBe(false);
  });
});
