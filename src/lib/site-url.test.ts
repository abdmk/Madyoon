import { afterEach, describe, expect, it } from 'vitest';
import { getSiteUrl } from './site-url';

/**
 * Unit tests for the pure redirect-URL logic only. These do NOT exercise a
 * real browser, a real Vercel deployment, or real Supabase OAuth — they
 * cannot prove the production site actually works end to end. They only
 * prove that getSiteUrl() itself makes the right decision for each
 * environment/env-var combination.
 */

const ENV_KEYS = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_VERCEL_ENV'] as const;
const originalEnv: Record<string, string | undefined> = {};

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

describe('getSiteUrl', () => {
  it('returns NEXT_PUBLIC_SITE_URL when set, regardless of environment', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app/';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';

    expect(getSiteUrl('https://madyoon-xxxxx.vercel.app')).toBe('https://madyoon.vercel.app');
  });

  it('strips trailing slashes from the configured value', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app///';
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    expect(getSiteUrl()).toBe('https://madyoon.vercel.app');
  });

  it('throws in real Production when NEXT_PUBLIC_SITE_URL is missing, and never falls back to the request host', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';

    expect(() => getSiteUrl('https://madyoon-xxxxx.vercel.app')).toThrow(
      /NEXT_PUBLIC_SITE_URL is not set in Production/,
    );
  });

  it('does NOT throw for a Preview deployment and falls back to the caller-supplied origin', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';

    expect(getSiteUrl('https://madyoon-git-branch-madyoon.vercel.app')).toBe(
      'https://madyoon-git-branch-madyoon.vercel.app',
    );
  });

  it('falls back to the caller-supplied origin in local development (no NEXT_PUBLIC_VERCEL_ENV at all)', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    expect(getSiteUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('throws outside Production if called with no fallback origin at all', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    expect(() => getSiteUrl()).toThrow(/without a fallback origin/);
  });
});
