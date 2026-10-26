import { describe, expect, it } from 'vitest';


describe('isMissed — the latest answer decides', () => {
  it('stops counting an item as missed once it is got right, whatever the totals', async () => {
    const { useProgressStore, isMissed } = await import('./progress');
    const s = useProgressStore.getState();
    for (let k = 0; k < 3; k++) s.recordResult('m', 'x', false);
    expect(isMissed(useProgressStore.getState().getProgress('m').x)).toBe(true);
    useProgressStore.getState().recordResult('m', 'x', true);
    // 1 right, 3 wrong: the counts would still call it missed.
    expect(isMissed(useProgressStore.getState().getProgress('m').x)).toBe(false);
  });

  it('follows an override of the latest answer', async () => {
    const { useProgressStore, isMissed } = await import('./progress');
    useProgressStore.getState().recordResult('m2', 'y', false);
    useProgressStore.getState().reviseResult('m2', 'y', true);
    expect(isMissed(useProgressStore.getState().getProgress('m2').y)).toBe(false);
  });

  it('falls back to the counts for records from before', async () => {
    const { isMissed } = await import('./progress');
    expect(isMissed({ got: 1, missed: 2, lastSeen: 1 })).toBe(true);
    expect(isMissed({ got: 2, missed: 1, lastSeen: 1 })).toBe(false);
    expect(isMissed(undefined)).toBe(false);
  });
});

describe('what an answer keeps', () => {
  it('remembers when it was missed, through a right retry', async () => {
    const { useProgressStore } = await import('./progress');
    const s = useProgressStore.getState();
    s.recordResult('k', 'a', false);
    const missedAt = useProgressStore.getState().getProgress('k').a.missedAt;
    expect(missedAt).toBeTypeOf('number');
    useProgressStore.getState().recordResult('k', 'a', true);
    expect(useProgressStore.getState().getProgress('k').a.missedAt).toBe(missedAt);
  });

  it('forgets a miss that was overruled', async () => {
    const { useProgressStore } = await import('./progress');
    useProgressStore.getState().recordResult('k2', 'b', false);
    useProgressStore.getState().reviseResult('k2', 'b', true);
    expect(useProgressStore.getState().getProgress('k2').b.missedAt).toBeUndefined();
  });

  it('keeps a mix-up through later answers the same day', async () => {
    const { useProgressStore } = await import('./progress');
    const s = useProgressStore.getState();
    s.recordResult('k3', 'c', false);
    useProgressStore.getState().noteConfusion('k3', 'c', 'other');
    useProgressStore.getState().recordResult('k3', 'c', false);
    useProgressStore.getState().recordResult('k3', 'c', true);
    expect(useProgressStore.getState().getProgress('k3').c.confusedWith).toEqual(['other']);
  });
});

describe('isMistake: Practice keeps a miss until it is right on a later day', () => {
  const day = 86_400_000;
  const at = new Date(2026, 9, 21, 10).getTime();

  it('keeps a card got right minutes after its miss, and lets it go when right a later day', async () => {
    const { isMistake } = await import('./progress');
    expect(isMistake({ got: 1, missed: 1, lastSeen: at + 60_000, lastGot: true, missedAt: at })).toBe(true);
    expect(isMistake({ got: 1, missed: 1, lastSeen: at + day, lastGot: true, missedAt: at })).toBe(false);
    expect(isMistake({ got: 0, missed: 1, lastSeen: at, lastGot: false, missedAt: at })).toBe(true);
    expect(isMistake({ got: 2, missed: 0, lastSeen: at, lastGot: true })).toBe(false);
    expect(isMistake(undefined)).toBe(false);
  });

  it('is what the store lists, and an overruled miss is not one', async () => {
    const { useProgressStore } = await import('./progress');
    const s = useProgressStore.getState();
    s.recordResult('k', 'a', false);
    s.recordResult('k', 'a', true);
    expect(useProgressStore.getState().missedIds('k').has('a')).toBe(true);
    s.recordResult('k', 'b', false);
    s.reviseResult('k', 'b', true);
    expect(useProgressStore.getState().missedIds('k').has('b')).toBe(false);
  });
});

describe('noteTested', () => {
  it('marks a card as on a test, and a later answer anywhere keeps the mark', async () => {
    const { useProgressStore } = await import('./progress');
    useProgressStore.getState().recordResult('t', 'q', true);
    useProgressStore.getState().noteTested('t', ['q', 'never-answered'], 1000);
    expect(useProgressStore.getState().getProgress('t').q.testedAt).toBe(1000);
    expect(useProgressStore.getState().getProgress('t')['never-answered']).toBeUndefined();
    useProgressStore.getState().recordResult('t', 'q', false);
    expect(useProgressStore.getState().getProgress('t').q.testedAt).toBe(1000);
  });
});
