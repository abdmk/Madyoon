-- ============================================================================
-- Migration 0004: fix the "first user becomes admin" bootstrap
--
-- The original bootstrap_first_admin ran as an AFTER INSERT trigger on
-- profiles that issued a separate UPDATE. That UPDATE passed through
-- profiles_guard_role (BEFORE UPDATE), which reverts any role change made
-- without an authenticated JWT — auth.uid() is null during trigger-chain
-- execution (signup, or a direct SQL insert), so is_admin() is always false
-- there, and the guard silently undid the promotion every time.
--
-- Fix: set the role on the incoming row itself, in a BEFORE INSERT trigger.
-- guard_role only fires on UPDATE, so this path never touches it.
-- ============================================================================

create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.profiles) = 0 then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_bootstrap_admin on public.profiles;
create trigger profiles_bootstrap_admin before insert on public.profiles
  for each row execute function public.bootstrap_first_admin();
