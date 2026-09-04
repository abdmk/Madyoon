import type { Profile, Role } from '@/lib/types';

/**
 * Who is allowed to see what, in one place.
 *
 * These are UI affordances only. Authorization is enforced at the database
 * layer — RLS policies on every table, plus SECURITY INVOKER functions that
 * can only ever see what the calling role's policies allow. Hiding a link
 * here does not protect anything, and revealing one does not grant anything:
 * a request that shouldn't succeed still fails in Postgres. Keep it that way,
 * and never move an authorization decision out of the database and into a
 * check like these.
 */
export function isAdmin(profile: Pick<Profile, 'role'> | null | undefined): boolean {
  return profile?.role === 'admin';
}

/** The label to show for a role. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'مدير النظام',
  user: 'مستخدم',
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? ROLE_LABELS.user;
}

/** Whether the admin area should appear in navigation for this profile. */
export function canSeeAdminArea(profile: Pick<Profile, 'role'> | null | undefined): boolean {
  return isAdmin(profile);
}
