import { describe, expect, it } from 'vitest';
import { pctChange, repaymentProgress, share, sumBy, trendOf } from './index';

describe('pctChange', () => {
  it('reports a normal increase and decrease', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
  });

  it('treats a zero baseline as +100% when there is now something', () => {
    // Not Infinity: a dashboard has to render this.
    expect(pctChange(80, 0)).toBe(100);
  });

  it('treats nothing-to-nothing as no change', () => {
    expect(pctChange(0, 0)).toBe(0);
  });

  it('does not divide by a negative baseline', () => {
    expect(pctChange(10, -5)).toBe(100);
  });
});

describe('share', () => {
  it('computes a percentage of a total', () => {
    expect(share(25, 200)).toBe(12.5);
  });

  it('clamps at 100 so an overpayment cannot read as 120%', () => {
    expect(share(120, 100)).toBe(100);
  });

  it('returns 0 rather than NaN when the total is zero', () => {
    expect(share(5, 0)).toBe(0);
  });
});

describe('repaymentProgress', () => {
  it('is the paid portion of the debt', () => {
    expect(repaymentProgress(300, 1200)).toBe(25);
  });

  it('is 0 for a debt with no amount', () => {
    expect(repaymentProgress(0, 0)).toBe(0);
  });
});

describe('trendOf', () => {
  it('calls small movements flat', () => {
    expect(trendOf(0.2)).toBe('flat');
    expect(trendOf(-0.4)).toBe('flat');
  });

  it('reports direction beyond the deadband', () => {
    expect(trendOf(4)).toBe('up');
    expect(trendOf(-4)).toBe('down');
  });
});

describe('sumBy', () => {
  it('adds numeric strings, which is how Postgres returns numerics', () => {
    expect(sumBy([{ v: '10.5' }, { v: '4.5' }], (r) => r.v)).toBe(15);
  });

  it('treats a missing value as zero', () => {
    expect(sumBy([{ v: 5 }, {} as { v?: number }], (r) => r.v as number)).toBe(5);
  });

  it('is 0 for no rows', () => {
    expect(sumBy([], (r: number) => r)).toBe(0);
  });
});
