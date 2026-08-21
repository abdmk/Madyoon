import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests the callback route's redirect DECISIONS against a stubbed Supabase
 * client — no real Google/Supabase round trip happens. This proves the
 * route's branching (missing code, invalid code, success, misconfigured
 * site URL) is wired correctly; it is not a substitute for a real OAuth
 * browser test.
 */

const exchangeCodeForSessionMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
  }),
}));

const ENV_KEYS = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_VERCEL_ENV'] as const;

afterEach(() => {
  vi.clearAllMocks();
  for (const key of ENV_KEYS) delete process.env[key];
});

async function run(url: string) {
  const { GET } = await import('./route');
  return GET(new NextRequest(new Request(url)));
}

describe('GET /auth/callback', () => {
  it('redirects to /login?error=oauth when no code is present', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app';

    const res = await run('https://madyoon.vercel.app/auth/callback');

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://madyoon.vercel.app/login?error=oauth');
  });

  it('redirects to /login?error=oauth when exchangeCodeForSession fails (invalid code)', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app';
    exchangeCodeForSessionMock.mockResolvedValue({ error: { message: 'invalid grant' } });

    const res = await run('https://madyoon.vercel.app/auth/callback?code=bad-code');

    expect(res.headers.get('location')).toBe('https://madyoon.vercel.app/login?error=oauth');
  });

  it('redirects to /dashboard on a valid code with no next param', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app';
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const res = await run('https://madyoon.vercel.app/auth/callback?code=good-code');

    expect(res.headers.get('location')).toBe('https://madyoon.vercel.app/dashboard');
  });

  it('redirects to the preserved next param on a valid code', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app';
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const res = await run(
      'https://madyoon.vercel.app/auth/callback?code=good-code&next=/debts/123',
    );

    expect(res.headers.get('location')).toBe('https://madyoon.vercel.app/debts/123');
  });

  it('ignores an off-site next param and falls back to /dashboard', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://madyoon.vercel.app';
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });

    const res = await run(
      'https://madyoon.vercel.app/auth/callback?code=good-code&next=https://evil.example.com',
    );

    expect(res.headers.get('location')).toBe('https://madyoon.vercel.app/dashboard');
  });

  it('returns a clear 500 instead of using the request host when NEXT_PUBLIC_SITE_URL is missing in Production', async () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';

    const res = await run('https://madyoon-xxxxx.vercel.app/auth/callback?code=good-code');

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toMatch(/NEXT_PUBLIC_SITE_URL is not set in Production/);
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });
});
