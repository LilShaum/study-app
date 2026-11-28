/** "1 card", "3 cards"; pass `pluralWord` where adding "s" is wrong. */
export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
