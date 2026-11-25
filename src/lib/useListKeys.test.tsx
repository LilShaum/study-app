import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useListKeys } from './useListKeys';

afterEach(cleanup);

function List() {
  useListKeys();
  return (
    <div>
      <input data-find aria-label="Find" />
      {['One', 'Two', 'Three'].map((t) => (
        <a key={t} href={`#${t}`} data-list-item>
          {t}
        </a>
      ))}
    </div>
  );
}

// jsdom lays nothing out, so every row reads as hidden; give them a parent to read as shown.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get: () => document.body });
Element.prototype.scrollIntoView = () => {};

describe('useListKeys', () => {
  it('moves through the rows with J and K, and / goes to the search box', () => {
    const { getByText, getByLabelText } = render(<List />);
    fireEvent.keyDown(window, { key: 'j' });
    expect(document.activeElement).toBe(getByText('One'));
    fireEvent.keyDown(window, { key: 'j' });
    expect(document.activeElement).toBe(getByText('Two'));
    fireEvent.keyDown(window, { key: 'k' });
    expect(document.activeElement).toBe(getByText('One'));
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(getByLabelText('Find'));
    // Typing in the search box is typing, not moving.
    fireEvent.keyDown(getByLabelText('Find'), { key: 'j' });
    expect(document.activeElement).toBe(getByLabelText('Find'));
  });
});
