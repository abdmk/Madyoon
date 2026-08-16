-- ============================================================================
-- Migration 0003: function hardening
--
-- Closes the gaps reported by the Supabase security linter:
--   * trigger functions without a pinned search_path
--   * SECURITY DEFINER functions reachable by the `anon` role over /rest/v1/rpc
-- ============================================================================

-- 1. Pin search_path on the trigger functions that were missing it.
alter function public.touch_updated_at() set search_path = public, pg_temp;
alter function public.sync_debt_status() set search_path = public, pg_temp;

-- 2. Trigger functions must never be reachable as RPC. Triggers fire as the
--    table owner, so revoking EXECUTE from the API roles costs nothing.
revoke all on function public.touch_updated_at()      from public, anon, authenticated;
revoke all on function public.sync_debt_status()      from public, anon, authenticated;
revoke all on function public.guard_role()            from public, anon, authenticated;
revoke all on function public.handle_new_user()       from public, anon, authenticated;
revoke all on function public.bootstrap_first_admin() from public, anon, authenticated;

-- 3. RLS helpers and RPCs: signed-in users only.
--    Each already guards on auth.uid()/is_admin internally — this removes the
--    unauthenticated surface as well. `authenticated` keeps EXECUTE because the
--    RLS policies evaluate these helpers as the invoking role.
revoke all on function public.is_admin(uuid)       from public, anon;
revoke all on function public.has_access(uuid)     from public, anon;
revoke all on function public.can_write(uuid)      from public, anon;
revoke all on function public.accept_invite(text)  from public, anon;
revoke all on function public.admin_stats()        from public, anon;
revoke all on function public.admin_users()        from public, anon;
revoke all on function public.admin_analytics(int) from public, anon;
revoke all on function public.write_log(text, uuid, text, text, jsonb) from public, anon;

grant execute on function public.is_admin(uuid)       to authenticated;
grant execute on function public.has_access(uuid)     to authenticated;
grant execute on function public.can_write(uuid)      to authenticated;
grant execute on function public.accept_invite(text)  to authenticated;
grant execute on function public.admin_stats()        to authenticated;
grant execute on function public.admin_users()        to authenticated;
grant execute on function public.admin_analytics(int) to authenticated;
grant execute on function public.write_log(text, uuid, text, text, jsonb) to authenticated;
