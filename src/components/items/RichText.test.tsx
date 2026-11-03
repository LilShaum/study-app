import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { RichText } from './RichText';

afterEach(cleanup);

describe('RichText', () => {
  it('leaves plain text alone', () => {
    const { container } = render(<p><RichText text="F = ma, with m in kg" /></p>);
    expect(container.innerHTML).toBe('<p>F = ma, with m in kg</p>');
  });

  it('sets inline code and a fenced block as code, the block exactly as written', () => {
    const { container } = render(
      <p>
        <RichText text={'What does `total` print?\n```python\nfor x in xs:\n    total += x\n```\nTrace it.'} />
      </p>,
    );
    const codes = container.querySelectorAll('code');
    expect(codes[0].textContent).toBe('total');
    expect(codes[1].textContent).toBe('for x in xs:\n    total += x');
    expect(container.textContent).toContain('Trace it.');
  });

  it('never reads a lecture’s text as markup', () => {
    const { container } = render(<p><RichText text={'`<img src=x onerror=alert(1)>` <b>bold</b>'} /></p>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror=alert(1)> <b>bold</b>');
  });
});
