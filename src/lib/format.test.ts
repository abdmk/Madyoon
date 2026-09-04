import { describe, expect, it } from 'vitest';
import { formatCompactAmount } from './format';

describe('formatCompactAmount', () => {
  it('shows small amounts in full', () => {
    expect(formatCompactAmount(9999)).toBe('9,999');
    expect(formatCompactAmount(0)).toBe('0');
  });

  it('abbreviates thousands and millions so a stat card never has to truncate it', () => {
    expect(formatCompactAmount(510_000)).toBe('510K');
    expect(formatCompactAmount(17_000_000)).toBe('17M');
    expect(formatCompactAmount(1_250_000)).toBe('1.3M');
  });

  it('appends the currency symbol when given one', () => {
    expect(formatCompactAmount(17_000_000, 'IQD')).toBe('17M د.ع');
  });

  it('treats a negative amount the same as its positive magnitude', () => {
    expect(formatCompactAmount(-2_000_000)).toBe('-2M');
  });
});
