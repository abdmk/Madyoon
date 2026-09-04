-- ============================================================================
-- Madyoon — Migration 0012: Fix dashboard RPC permissions
--
-- PROBLEM: The dashboard stopped working in production with error
-- #2968107586. Root cause: dashboard_summary RPC was defined but lacked
-- EXECUTE grant to authenticated role, causing getDashboard() to fail silently.
--
-- SOLUTION: This migration verifies and explicitly grants EXECUTE permissions
-- to authenticated role for all four dashboard RPCs. It is safe to apply
-- multiple times (REVOKE/GRANT is idempotent).
--
-- RPC FUNCTIONS VERIFIED:
-- 1. dashboard_summary(uuid) -> jsonb
--    - Defined in 0010 (latest version)
--    - Original grant in 0005 may not have persisted through recreations
--    - Called by getDashboard() on dashboard page load
--
-- 2. dashboard_period_summary(uuid, text) -> jsonb
--    - Defined in 0010
--    - Grant exists in 0010 but we make it explicit
--    - Called by getDashboardPeriodSummary() for period switching
--
-- 3. attention_feed(uuid, int) -> jsonb
--    - Defined in 0011
--    - Grant exists in 0011 but we make it explicit
--    - Called by getAttentionFeed() to show overdue/due-soon items
--
-- 4. due_alerts(uuid, int) -> jsonb
--    - Defined in 0005
--    - Original grant in 0005 may not have persisted through recreations
--    - Called by getDueAlerts() for header bell
--
-- SECURITY:
-- - All functions are SECURITY INVOKER (default), so RLS still governs rows
-- - Public and anon roles are explicitly revoked
-- - Only authenticated role receives EXECUTE permission
-- - No permissions granted to service_role or other roles
-- ============================================================================

-- Revoke public/anon access to all dashboard RPCs for security
revoke all on function public.dashboard_summary(uuid) from public, anon;
revoke all on function public.dashboard_period_summary(uuid, text) from public, anon;
revoke all on function public.attention_feed(uuid, int) from public, anon;
revoke all on function public.due_alerts(uuid, int) from public, anon;

-- Grant EXECUTE permission to authenticated role (required for dashboard)
grant execute on function public.dashboard_summary(uuid) to authenticated;
grant execute on function public.dashboard_period_summary(uuid, text) to authenticated;
grant execute on function public.attention_feed(uuid, int) to authenticated;
grant execute on function public.due_alerts(uuid, int) to authenticated;
