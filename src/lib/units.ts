// Shop measurements are in inches and often fractions. These accept what people
// type ("3/4", "1 1/2", "1-1/2", "1.5", '2"') and print the same way back.

export function parseInches(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/(inches|inch|in|")$/, '').trim();
  if (s === '') return null;

  const mixed = s.match(/^(\d+(?:\.\d+)?)[\s-]+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    return +den === 0 ? null : +whole + +num / +den;
  }
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const [, num, den] = frac;
    return +den === 0 ? null : +num / +den;
  }
  if (/^\d*\.?\d+$/.test(s)) return parseFloat(s);
  return null;
}

/** 3.125 -> "3-1/8 in", 0.25 -> "1/4 in", 9 -> "9 in". Rounds to 1/16. */
export function formatInches(value: number, unit = true): string {
  const sixteenths = Math.round(value * 16);
  const whole = Math.floor(sixteenths / 16);
  let num = sixteenths % 16;
  let den = 16;
  while (num > 0 && num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  const text = num === 0 ? `${whole}` : whole === 0 ? `${num}/${den}` : `${whole}-${num}/${den}`;
  return unit ? `${text} in` : text;
}
