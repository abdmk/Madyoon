-- ============================================================================
-- Madyoon — إدارة الديون والمصاريف
-- Migration 0001: core schema, helpers, RLS, realtime
-- Project: zhkaddbfnwpjdzlfchwd
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text not null default '',
  role        text not null default 'user' check (role in ('user', 'admin')),
  avatar_url  text,
  currency    text not null default 'IQD',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  kind        text not null default 'debt' check (kind in ('debt', 'expense')),
  color       text not null default '#3b82f6',
  created_at  timestamptz not null default now(),
  unique (user_id, kind, name)
);

create table if not exists public.debts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  creditor_name    text not null,
  amount           numeric(14, 2) not null default 0 check (amount >= 0),
  paid_amount      numeric(14, 2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(14, 2)
    generated always as (greatest(amount - paid_amount, 0)) stored,
  currency         text not null default 'IQD',
  due_date         date,
  category         text not null default 'personal'
    check (category in ('personal', 'credit_card', 'loan', 'bill', 'business', 'other')),
  custom_category  text,
  priority         text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status           text not null default 'pending'
    check (status in ('pending', 'partial', 'paid')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  description  text not null,
  amount       numeric(14, 2) not null default 0 check (amount >= 0),
  currency     text not null default 'IQD',
  date         date not null default current_date,
  category     text not null default 'other',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.shared_accounts (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  shared_with_id  uuid references auth.users (id) on delete cascade,
  invite_code     text not null unique,
  permission      text not null default 'read' check (permission in ('read', 'write')),
  status          text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);

-- A user may only be granted access to a given owner once.
create unique index if not exists shared_accounts_unique_pair
  on public.shared_accounts (owner_id, shared_with_id)
  where shared_with_id is not null;

create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references auth.users (id) on delete set null,
  action         text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  entity         text,
  entity_id      text,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create table if not exists public.chatbot_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'محادثة جديدة',
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists debts_user_idx      on public.debts (user_id);
create index if not exists debts_due_idx       on public.debts (due_date);
create index if not exists debts_status_idx    on public.debts (status);
create index if not exists expenses_user_idx   on public.expenses (user_id);
create index if not exists expenses_date_idx   on public.expenses (date desc);
create index if not exists shared_owner_idx    on public.shared_accounts (owner_id);
create index if not exists shared_with_idx     on public.shared_accounts (shared_with_id);
create index if not exists audit_created_idx   on public.audit_logs (created_at desc);
create index if not exists audit_actor_idx     on public.audit_logs (actor_id);
create index if not exists chat_user_idx       on public.chatbot_conversations (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies don't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = uid), false);
$$;

-- Can the current user READ data owned by `owner`?
create or replace function public.has_access(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    owner = auth.uid()
    or exists (
      select 1 from public.shared_accounts s
      where s.owner_id = owner
        and s.shared_with_id = auth.uid()
        and s.status = 'accepted'
    );
$$;

-- Can the current user WRITE data owned by `owner`?
create or replace function public.can_write(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    owner = auth.uid()
    or exists (
      select 1 from public.shared_accounts s
      where s.owner_id = owner
        and s.shared_with_id = auth.uid()
        and s.status = 'accepted'
        and s.permission = 'write'
    );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists debts_touch on public.debts;
create trigger debts_touch before update on public.debts
  for each row execute function public.touch_updated_at();

drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists chat_touch on public.chatbot_conversations;
create trigger chat_touch before update on public.chatbot_conversations
  for each row execute function public.touch_updated_at();

-- Keep debt status in sync with the amounts so the UI never disagrees with
-- the underlying data.
create or replace function public.sync_debt_status()
returns trigger
language plpgsql
as $$
begin
  if new.paid_amount >= new.amount and new.amount > 0 then
    new.status := 'paid';
  elsif new.paid_amount > 0 then
    new.status := 'partial';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists debts_sync_status on public.debts;
create trigger debts_sync_status before insert or update of amount, paid_amount
  on public.debts
  for each row execute function public.sync_debt_status();

-- Only admins may change a role; everyone else keeps whatever they had.
create or replace function public.guard_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role();

-- Provision a profile row whenever a new auth user signs up (Google OAuth
-- included). Runs as definer because auth.users triggers have no JWT context.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
    set email      = excluded.email,
        name       = case when public.profiles.name = '' then excluded.name
                          else public.profiles.name end,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data, email on auth.users
  for each row execute function public.handle_new_user();

-- The very first user to sign up becomes the admin, so the project is usable
-- immediately after deploy without touching the SQL editor.
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.profiles) = 1 then
    update public.profiles set role = 'admin' where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_bootstrap_admin on public.profiles;
create trigger profiles_bootstrap_admin after insert on public.profiles
  for each row execute function public.bootstrap_first_admin();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Redeem an invite code. Runs as definer because the invite row is not
-- visible to the redeemer until it belongs to them.
create or replace function public.accept_invite(code text)
returns public.shared_accounts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  rec public.shared_accounts;
begin
  if uid is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  select * into rec
  from public.shared_accounts s
  where s.invite_code = upper(trim(code))
    and s.status = 'pending'
    and s.shared_with_id is null
  for update;

  if rec.id is null then
    raise exception 'رمز الدعوة غير صالح أو مستخدم مسبقاً';
  end if;

  if rec.owner_id = uid then
    raise exception 'لا يمكنك استخدام رمز دعوة خاص بك';
  end if;

  if exists (
    select 1 from public.shared_accounts s
    where s.owner_id = rec.owner_id and s.shared_with_id = uid
  ) then
    raise exception 'لديك وصول بالفعل إلى هذا الحساب';
  end if;

  update public.shared_accounts
  set shared_with_id = uid,
      status         = 'accepted',
      accepted_at    = now()
  where id = rec.id
  returning * into rec;

  insert into public.audit_logs (actor_id, action, target_user_id, entity, entity_id, details)
  values (uid, 'share.accept', rec.owner_id, 'shared_accounts', rec.id::text,
          jsonb_build_object('permission', rec.permission));

  return rec;
end;
$$;

-- System-wide statistics for the admin dashboard.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'غير مصرح';
  end if;

  select jsonb_build_object(
    'total_users',      (select count(*) from public.profiles),
    'active_users',     (select count(distinct user_id) from public.debts
                          where created_at > now() - interval '30 days'),
    'admins',           (select count(*) from public.profiles where role = 'admin'),
    'total_debts',      (select coalesce(sum(amount), 0) from public.debts),
    'paid_debts',       (select coalesce(sum(paid_amount), 0) from public.debts),
    'remaining_debts',  (select coalesce(sum(remaining_amount), 0) from public.debts),
    'debts_count',      (select count(*) from public.debts),
    'settled_count',    (select count(*) from public.debts where status = 'paid'),
    'overdue_count',    (select count(*) from public.debts
                          where status <> 'paid' and due_date < current_date),
    'total_expenses',   (select coalesce(sum(amount), 0) from public.expenses),
    'expenses_count',   (select count(*) from public.expenses),
    'shares_count',     (select count(*) from public.shared_accounts where status = 'accepted'),
    'conversations',    (select count(*) from public.chatbot_conversations)
  ) into result;

  return result;
end;
$$;

-- Per-user rollup for the admin user list.
create or replace function public.admin_users()
returns table (
  id uuid,
  email text,
  name text,
  role text,
  avatar_url text,
  created_at timestamptz,
  debts_count bigint,
  total_amount numeric,
  paid_amount numeric,
  remaining_amount numeric,
  expenses_total numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'غير مصرح';
  end if;

  return query
  select
    p.id,
    p.email,
    p.name,
    p.role,
    p.avatar_url,
    p.created_at,
    coalesce(d.cnt, 0)       as debts_count,
    coalesce(d.total, 0)     as total_amount,
    coalesce(d.paid, 0)      as paid_amount,
    coalesce(d.remaining, 0) as remaining_amount,
    coalesce(e.total, 0)     as expenses_total
  from public.profiles p
  left join (
    select dd.user_id,
           count(*)                 as cnt,
           sum(dd.amount)           as total,
           sum(dd.paid_amount)      as paid,
           sum(dd.remaining_amount) as remaining
    from public.debts dd group by dd.user_id
  ) d on d.user_id = p.id
  left join (
    select ee.user_id, sum(ee.amount) as total
    from public.expenses ee group by ee.user_id
  ) e on e.user_id = p.id
  order by p.created_at desc;
end;
$$;

-- Monthly time series for the analytics page.
create or replace function public.admin_analytics(months int default 12)
returns table (
  month text,
  debts_total numeric,
  paid_total numeric,
  expenses_total numeric,
  new_users bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'غير مصرح';
  end if;

  return query
  with span as (
    select generate_series(
      date_trunc('month', now()) - make_interval(months => months - 1),
      date_trunc('month', now()),
      interval '1 month'
    ) as m
  )
  select
    to_char(span.m, 'YYYY-MM') as month,
    coalesce((select sum(d.amount) from public.debts d
              where date_trunc('month', d.created_at) = span.m), 0),
    coalesce((select sum(d.paid_amount) from public.debts d
              where date_trunc('month', d.created_at) = span.m), 0),
    coalesce((select sum(e.amount) from public.expenses e
              where date_trunc('month', e.date) = span.m), 0),
    coalesce((select count(*) from public.profiles p
              where date_trunc('month', p.created_at) = span.m), 0)
  from span
  order by span.m;
end;
$$;

-- Append-only audit writer used by server actions.
create or replace function public.write_log(
  p_action text,
  p_target_user uuid default null,
  p_entity text default null,
  p_entity_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.audit_logs (actor_id, action, target_user_id, entity, entity_id, details)
  values (auth.uid(), p_action, p_target_user, p_entity, p_entity_id,
          coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.debts                 enable row level security;
alter table public.expenses              enable row level security;
alter table public.shared_accounts       enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.chatbot_conversations enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1 from public.shared_accounts s
    where s.status = 'accepted'
      and ((s.owner_id = profiles.id and s.shared_with_id = auth.uid())
        or (s.shared_with_id = profiles.id and s.owner_id = auth.uid()))
  )
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

-- categories ----------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select to authenticated
using (public.has_access(user_id) or public.is_admin(auth.uid()));

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all to authenticated
using (public.can_write(user_id))
with check (public.can_write(user_id));

-- debts ---------------------------------------------------------------------
drop policy if exists debts_select on public.debts;
create policy debts_select on public.debts for select to authenticated
using (public.has_access(user_id) or public.is_admin(auth.uid()));

drop policy if exists debts_insert on public.debts;
create policy debts_insert on public.debts for insert to authenticated
with check (public.can_write(user_id));

drop policy if exists debts_update on public.debts;
create policy debts_update on public.debts for update to authenticated
using (public.can_write(user_id))
with check (public.can_write(user_id));

drop policy if exists debts_delete on public.debts;
create policy debts_delete on public.debts for delete to authenticated
using (public.can_write(user_id));

-- expenses ------------------------------------------------------------------
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated
using (public.has_access(user_id) or public.is_admin(auth.uid()));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated
with check (public.can_write(user_id));

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated
using (public.can_write(user_id))
with check (public.can_write(user_id));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated
using (public.can_write(user_id));

-- shared accounts -----------------------------------------------------------
drop policy if exists shared_select on public.shared_accounts;
create policy shared_select on public.shared_accounts for select to authenticated
using (owner_id = auth.uid() or shared_with_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists shared_insert on public.shared_accounts;
create policy shared_insert on public.shared_accounts for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists shared_update on public.shared_accounts;
create policy shared_update on public.shared_accounts for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- The owner may revoke; the invitee may walk away from the share.
drop policy if exists shared_delete on public.shared_accounts;
create policy shared_delete on public.shared_accounts for delete to authenticated
using (owner_id = auth.uid() or shared_with_id = auth.uid());

-- audit logs (read-only, admins only; writes go through write_log) -----------
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select to authenticated
using (public.is_admin(auth.uid()));

-- chatbot -------------------------------------------------------------------
drop policy if exists chat_all on public.chatbot_conversations;
create policy chat_all on public.chatbot_conversations for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.debts;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.expenses;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.shared_accounts;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Backfill profiles for users that already exist
-- ---------------------------------------------------------------------------

insert into public.profiles (id, email, name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
from auth.users u
on conflict (id) do nothing;
