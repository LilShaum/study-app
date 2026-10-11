/**
 * The entry's number in the contents list.
 *
 * Roman for the same reason a book uses it in the front matter: it numbers
 * the entries without competing with the arabic figures in the right-hand
 * column, which are the ones carrying information.
 */
export function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [value, sign] of table) {
    while (n >= value) {
      out += sign;
      n -= value;
    }
  }
  return out;
}
