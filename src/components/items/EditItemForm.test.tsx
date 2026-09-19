import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { McqItem, StudyItem } from '@/schema/course';
import { EditItemForm } from './EditItemForm';

const mcq = (extra: Partial<McqItem> = {}): StudyItem =>
  ({
    id: 'q1',
    type: 'mcq',
    question: 'Which is it?',
    options: ['alpha', 'beta', 'gamma', 'delta'],
    correct_index: 1,
    explanation: 'Because beta.',
    distractor_rationale: ['wrong a', '', 'wrong c', 'wrong d'],
    ...extra,
  }) as StudyItem;

function open(item: StudyItem = mcq()) {
  const onSave = vi.fn();
  render(<EditItemForm item={item} onSave={onSave} onCancel={vi.fn()} />);
  return onSave;
}
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const saved = (onSave: ReturnType<typeof vi.fn>) => onSave.mock.calls[0][0] as McqItem;

afterEach(cleanup);

describe('EditItemForm — MCQ options', () => {
  it('adds an option', () => {
    const onSave = open();
    fireEvent.click(screen.getByRole('button', { name: '+ Add option' }));
    fireEvent.change(screen.getByLabelText('Option E'), { target: { value: 'epsilon' } });
    save();
    expect(saved(onSave).options).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
  });

  it('removes an option and keeps the remaining text with its own box', () => {
    // The bug an uncontrolled list would have: removing B leaves C's text in
    // B's box, silently rewriting the question.
    const onSave = open();
    fireEvent.click(screen.getByLabelText('Remove option A'));
    save();
    expect(saved(onSave).options).toEqual(['beta', 'gamma', 'delta']);
  });

  it('moves the answer key up when an option before it goes', () => {
    const onSave = open();
    fireEvent.click(screen.getByLabelText('Remove option A')); // correct was index 1
    save();
    const item = saved(onSave);
    expect(item.correct_index).toBe(0);
    expect(item.options[item.correct_index]).toBe('beta');
  });

  it('leaves the answer key alone when an option after it goes', () => {
    const onSave = open();
    fireEvent.click(screen.getByLabelText('Remove option D'));
    save();
    const item = saved(onSave);
    expect(item.correct_index).toBe(1);
    expect(item.options[item.correct_index]).toBe('beta');
  });

  it('falls back to the first option when the answer itself is removed', () => {
    const onSave = open();
    fireEvent.click(screen.getByLabelText('Remove option B'));
    save();
    expect(saved(onSave).correct_index).toBe(0);
  });

  it('keeps each rationale with its own option', () => {
    // A stale rationale is a silent corruption: it explains the wrong answer
    // under the wrong option.
    const onSave = open();
    fireEvent.click(screen.getByLabelText('Remove option A'));
    save();
    expect(saved(onSave).distractor_rationale).toEqual(['', 'wrong c', 'wrong d']);
  });

  it('normalises a per-wrong-option rationale array to one per option', () => {
    const onSave = open(mcq({ distractor_rationale: ['wrong a', 'wrong c', 'wrong d'] }));
    save();
    expect(saved(onSave).distractor_rationale).toEqual(['wrong a', '', 'wrong c', 'wrong d']);
  });

  it('will not cut a question below two options', () => {
    open(mcq({ options: ['alpha', 'beta'], correct_index: 0, distractor_rationale: ['', 'wrong b'] }));
    expect(screen.getByLabelText('Remove option A')).toHaveProperty('disabled', true);
  });

  it('says so when the option count is off-contract', () => {
    open(mcq({ options: ['alpha', 'beta', 'gamma'], correct_index: 0 }));
    expect(screen.getByText(/3 options — the generator/)).toBeTruthy();
  });

  it('leaves the question and explanation editable as before', () => {
    const onSave = open();
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Rewritten?' } });
    save();
    expect(saved(onSave).question).toBe('Rewritten?');
    expect(saved(onSave).explanation).toBe('Because beta.');
  });
});
