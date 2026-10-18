import { describe, expect, it } from 'vitest';
import { readReply } from './readReply';
import fs from 'node:fs';

const item = (n: number) => `{"id":"q${n}","type":"flashcard","front":"F${n} {braces} \\"quoted\\"","back":"B","source_excerpt":"s"}`;
const course = (items: string) =>
  `{"schema_version":"1.0","metadata":{"title":"T"},"sections":[{"id":"s1","title":"One","items":[${items}]}]}`;

describe('readReply', () => {
  it('reads plain JSON', () => {
    const r = readReply(course(item(1)));
    expect(r.ok && r.cut).toBe(null);
  });

  it('finds JSON after a verdict list, inside a fence', () => {
    const r = readReply(`Verdicts:\n- term A: skipped, only named.\n\n\`\`\`json\n${course(item(1))}\n\`\`\`\n`);
    expect(r.ok).toBe(true);
  });

  it('keeps everything up to the last complete item when the reply was cut off', () => {
    const full = course([item(1), item(2), item(3)].join(','));
    const cutAt = full.indexOf('"q3"') + 10;
    const r = readReply(full.slice(0, cutAt));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const json = r.json as { sections: { items: { id: string }[] }[] };
    expect(json.sections[0].items.map((i) => i.id)).toEqual(['q1', 'q2']);
    expect(r.cut).toEqual({ lastSection: 's1' });
  });

  it('keeps finished sections and the finished part of the one cut off', () => {
    const two = `{"sections":[{"id":"a","items":[${item(1)}]},{"id":"b","items":[${item(2)},${item(3)}`;
    const r = readReply(two.slice(0, two.lastIndexOf(',')));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const json = r.json as { sections: { id: string; items: unknown[] }[] };
    expect(json.sections.map((s) => [s.id, s.items.length])).toEqual([['a', 1], ['b', 1]]);
    expect(r.cut?.lastSection).toBe('b');
  });

  it('is not fooled by brackets inside strings', () => {
    // Cut inside the second item's text, just after its "{braces}".
    const full = course([item(1), item(2)].join(','));
    const r = readReply(full.slice(0, full.indexOf('F2 {braces}') + 11));
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.json as { sections: { items: unknown[] }[] }).sections[0].items).toHaveLength(1);
  });

  it('gives up plainly when there is no complete item to keep', () => {
    const r = readReply('{"schema_version":"1.0","metadata":{"title":"T"');
    expect(r.ok).toBe(false);
  });
});

describe('a compact reply, one item per line (prompts/generator.md asks for it)', () => {
  const course = JSON.parse(fs.readFileSync('scripts/__fixtures__/biochem.study.json', 'utf8'));
  const line = (o: unknown) => JSON.stringify(o);
  const compact =
    '{\n"schema_version":"1.0",\n"metadata":' +
    line(course.metadata) +
    ',\n"sections":[\n' +
    course.sections
      .map((s: { items: unknown[] }) => {
        const { items, ...rest } = s;
        return line(rest).slice(0, -1) + ',"items":[\n' + items.map(line).join(',\n') + '\n]}';
      })
      .join(',\n') +
    '\n]}';
  const count = (json: unknown) => (json as { sections: { items: unknown[] }[] }).sections.reduce((n, s) => n + s.items.length, 0);

  it('reads whole', () => {
    const r = readReply(compact);
    expect(r.ok && count(r.json)).toBe(count(course));
  });

  it('keeps every whole item before a cut', () => {
    const r = readReply(compact.slice(0, Math.floor(compact.length * 0.6)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(count(r.json)).toBeGreaterThan(0);
      expect(count(r.json)).toBeLessThan(count(course));
      expect(r.cut).not.toBeNull();
    }
  });
});
