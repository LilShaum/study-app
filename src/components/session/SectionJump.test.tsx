import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionItem } from '@/lib/buildSessionItems';
import { SectionJump } from './SectionJump';
import { sessionSections } from '@/lib/sessionSections';

const item = (id: string, sectionId: string, title: string): SessionItem =>
  ({
    id,
    type: 'mcq',
    question: id,
    options: ['a', 'b'],
    correct_index: 0,
    _sectionId: sectionId,
    _sectionTitle: title,
    _sectionOrder: 1,
  }) as SessionItem;

const grouped = [
  item('a1', 's1', 'Kinetics'),
  item('a2', 's1', 'Kinetics'),
  item('b1', 's2', 'Inhibition'),
];

afterEach(cleanup);

describe('sessionSections', () => {
  it('counts each section run in list order', () => {
    expect(sessionSections(grouped)).toEqual([
      { id: 's1', title: 'Kinetics', count: 2 },
      { id: 's2', title: 'Inhibition', count: 1 },
    ]);
  });

  it('treats a section that recurs later as a separate run', () => {
    // A shuffled list interleaves sections; this is why the control hides for
    // those modes rather than offering meaningless jumps.
    const shuffled = [grouped[0], grouped[2], grouped[1]];
    expect(sessionSections(shuffled).map((s) => s.id)).toEqual(['s1', 's2', 's1']);
  });

  it('is empty for an empty session', () => {
    expect(sessionSections([])).toEqual([]);
  });
});

describe('SectionJump', () => {
  const renderJump = (props: Partial<Parameters<typeof SectionJump>[0]> = {}) =>
    render(
      <SectionJump
        items={grouped}
        mode="learn"
        activeSectionId="s1"
        onJump={vi.fn()}
        {...props}
      />,
    );

  it('shows where you are and offers every section', () => {
    renderJump();
    expect(screen.getByText('Section 1 of 2')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Kinetics (2)' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Inhibition (1)' })).toBeTruthy();
  });

  it('jumps on selection', () => {
    const onJump = vi.fn();
    renderJump({ onJump });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's2' } });
    expect(onJump).toHaveBeenCalledWith('s2');
  });

  it('hides itself in the modes that reorder, where a jump means nothing', () => {
    for (const mode of ['mixed', 'missed', 'weakest'] as const) {
      const { container } = renderJump({ mode });
      expect(container.querySelector('select')).toBeNull();
      cleanup();
    }
  });

  it('hides itself in a single-section session', () => {
    const { container } = renderJump({ items: [grouped[0]] });
    expect(container.querySelector('select')).toBeNull();
  });
});
