export type CardFragment = { fields: Record<string, string>; continuation: boolean };

/** Fill successive card fragments in field order, preserving complete graphemes. */
export function splitCardFields(
  fields: { key: string; text: string }[],
  fits: (fields: Record<string, string>, continuation: boolean) => boolean,
  hasMedia: boolean,
): CardFragment[] {
  const fragments: CardFragment[] = [];
  let values: Record<string, string> = {};
  let continuation = false;
  const emit = () => {
    fragments.push({ fields: values, continuation });
    values = {};
    continuation = true;
  };
  const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
  for (const { key, text } of fields) {
    const units = Array.from(segmenter.segment(text), unit => unit.segment);
    let start = 0;
    if (!units.length) values[key] = text;
    while (start < units.length) {
      const remaining = units.slice(start).join('');
      if (fits({ ...values, [key]: remaining }, continuation)) {
        values[key] = remaining;
        break;
      }
      let low = 1, high = units.length - start, best = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fits({ ...values, [key]: units.slice(start, start + mid).join('') }, continuation)) {
          best = mid; low = mid + 1;
        } else high = mid - 1;
      }
      if (best) {
        values[key] = units.slice(start, start + best).join('');
        start += best;
        emit();
      } else if (Object.keys(values).length || (!continuation && hasMedia)) {
        emit();
      } else {
        // Unfit non-text layout stays intact for the existing export overflow guard.
        values[key] = remaining;
        break;
      }
    }
  }
  if (Object.keys(values).length || !fragments.length) emit();
  return fragments;
}
