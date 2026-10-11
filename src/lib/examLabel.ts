import { examTime } from './memory';

/** 1,2,3,5,7,8 → "1–3, 5, 7–8". */
export function ranges(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j > i ? `${sorted[i]}–${sorted[j]}` : `${sorted[i]}`);
    i = j;
  }
  return out.join(', ');
}


/** "Thu 12 Nov · in 48 days" — the date and the distance, which is the part that matters. */
export function examLabel(date: string | undefined): string | null {
  const at = examTime(date);
  if (at == null) return null;
  const day = new Date(at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(at);
  exam.setHours(0, 0, 0, 0);
  const days = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${day} · passed`;
  if (days === 0) return `${day} · today`;
  if (days === 1) return `${day} · tomorrow`;
  return `${day} · in ${days} days`;
}
