import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GraphicItem } from '@/schema/course';
import { GraphicCard } from './GraphicCard';
import { SlidesCard } from './SlidesCard';
import { SourceNote } from './SourceNote';

afterEach(cleanup);

const figure = (over: Partial<GraphicItem> = {}): GraphicItem => ({ id: 'g', type: 'graphic', title: 'Supply and demand', ...over }) as GraphicItem;

describe('a figure on a card', () => {
  it('says what to look at, and what the figure is for', () => {
    render(<GraphicCard item={figure({ why: 'Follow the curves to where they cross.', purpose: 'know' })} />);
    expect(screen.getByText('Follow the curves to where they cross.')).toBeTruthy();
    expect(screen.getByText(/to know/)).toBeTruthy();
  });

  it('with no drawing, says where the real one is and never reads as broken', () => {
    render(<GraphicCard item={figure({ why: 'Look at the crossing.', purpose: 'picture', where: 'slide 10' })} />);
    expect(screen.getByText('slide 10')).toBeTruthy();
    expect(screen.getByText(/In your own notes/)).toBeTruthy();
    expect(screen.getByText(/just to picture it/)).toBeTruthy();
    expect(screen.queryByText(/No diagram provided/)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('with a drawing, shows it and sends the student nowhere', () => {
    render(<GraphicCard item={figure({ svg: '<svg viewBox="0 0 1 1"></svg>', alt_text: 'Two curves' })} />);
    expect(screen.getByRole('img', { name: 'Two curves' })).toBeTruthy();
    expect(screen.queryByText(/In your own notes/)).toBeNull();
  });
});

describe('the card that opens a section', () => {
  it('always offers the choice, read it here first or questions first (the owner, 2026-11-22)', () => {
    const teach = vi.fn();
    const ask = vi.fn();
    render(<SlidesCard sectionTitle="Markets" buildsTo="To where two curves cross." onTeachHere={teach} onReadThem={ask} />);
    expect(screen.getByRole('heading', { name: 'Markets' })).toBeTruthy();
    expect(screen.getByText('To where two curves cross.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Read it here first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Questions first' }));
    expect(teach).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/In your notes/)).toBeNull();
  });

  it('with a place in the notes, says where', () => {
    render(<SlidesCard sectionTitle="Markets" range="slides 4–9" buildsTo="To where two curves cross." />);
    expect(screen.getByText('Slides 4–9')).toBeTruthy();
    expect(screen.getByText(/In your notes/)).toBeTruthy();
  });

  it('with nothing more than its title, still asks', () => {
    render(<SlidesCard sectionTitle="Markets" />);
    expect(screen.getByRole('heading', { name: 'Markets' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Questions first' })).toBeTruthy();
  });

  it('on a lecture\'s first section, says first where the whole lecture is going', () => {
    render(<SlidesCard sectionTitle="Markets" lectureBuildsTo="To why prices move." buildsTo="To where two curves cross." />);
    expect(screen.getByText('Where this lecture is going')).toBeTruthy();
    expect(screen.getByText('To why prices move.')).toBeTruthy();
    expect(screen.getByText('To where two curves cross.')).toBeTruthy();
  });

});

describe('where a passage comes from', () => {
  it('says so when it is not from the student', () => {
    render(<SourceNote excerpt="Outside the slides: the reason walls are thick. Slide: arteries have thick walls" />);
    expect(screen.getAllByText(/Not from your notes/).length).toBeGreaterThan(0);
  });

  it('says it is theirs otherwise', () => {
    render(<SourceNote excerpt="arteries have thick walls" />);
    expect(screen.getAllByText(/^From your notes/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Not from your notes/)).toBeNull();
  });
});
