import { describe, expect, it, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests the redirect DECISIONS updateSession() makes, with the real
 * @supabase/ssr network call replaced by a stub returning a fixed user. This
 * proves the routing logic (who gets bounced to /login, who gets `next`
 * preserved, who is let through) without hitting a real Supabase project —
 * it is not a substitute for a real browser session test.
 */

const getUserMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function run(url: string) {
  const { updateSession } = await import('./middleware');
  return updateSession(new NextRequest(new Request(url)));
}

describe('updateSession', () => {
  it('redirects an unauthenticated visitor on a protected route to /login', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const res = await run('https://madyoon.vercel.app/dashboard');

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  it('preserves the original path as ?next= when redirecting to /login', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const res = await run('https://madyoon.vercel.app/debts/123');

    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('next')).toBe('/debts/123');
  });

  it('does not redirect an unauthenticated visitor on a public path', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const res = await run('https://madyoon.vercel.app/login');

    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects a signed-in visitor away from /login to /dashboard', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const res = await run('https://madyoon.vercel.app/login');

    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/dashboard');
  });

  it('lets a signed-in visitor through to a protected route', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const res = await run('https://madyoon.vercel.app/dashboard');

    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, must-revalidate');
  });
});
