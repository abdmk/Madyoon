-- ============================================================================
-- Migration 0002: point relationship columns at public.profiles
--
-- The columns originally referenced auth.users, which PostgREST cannot embed
-- (auth is not an exposed schema). Re-pointing them at public.profiles keeps
-- the same referential guarantee — profiles.id itself references auth.users —
-- while letting the client fetch the related profile in one round trip, e.g.
--   .select('*, actor:profiles!audit_logs_actor_id_fkey(id,name,email,avatar_url)')
-- ============================================================================

alter table public.shared_accounts
  drop constraint if exists shared_accounts_owner_id_fkey,
  drop constraint if exists shared_accounts_shared_with_id_fkey;

alter table public.shared_accounts
  add constraint shared_accounts_owner_id_fkey
    foreign key (owner_id) references public.profiles (id) on delete cascade,
  add constraint shared_accounts_shared_with_id_fkey
    foreign key (shared_with_id) references public.profiles (id) on delete cascade;

alter table public.audit_logs
  drop constraint if exists audit_logs_actor_id_fkey,
  drop constraint if exists audit_logs_target_user_id_fkey;

alter table public.audit_logs
  add constraint audit_logs_actor_id_fkey
    foreign key (actor_id) references public.profiles (id) on delete set null,
  add constraint audit_logs_target_user_id_fkey
    foreign key (target_user_id) references public.profiles (id) on delete set null;

alter table public.debts
  drop constraint if exists debts_user_id_fkey;
alter table public.debts
  add constraint debts_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.expenses
  drop constraint if exists expenses_user_id_fkey;
alter table public.expenses
  add constraint expenses_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.categories
  drop constraint if exists categories_user_id_fkey;
alter table public.categories
  add constraint categories_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.chatbot_conversations
  drop constraint if exists chatbot_conversations_user_id_fkey;
alter table public.chatbot_conversations
  add constraint chatbot_conversations_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
