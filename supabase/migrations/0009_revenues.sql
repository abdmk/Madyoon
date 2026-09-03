-- ============================================================================
-- Madyoon — Migration 0009: revenues (income tracking)
--
-- Mirrors the expenses feature end to end: a table, RLS following the same
-- has_access()/can_write() sharing model, an updated_at trigger, a paged
-- list_revenues() RPC matching list_expenses()'s shape, and a revenues block
-- added to dashboard_summary() alongside the existing debts/expenses ones.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.revenues (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  source       text not null,
  amount       numeric(14, 2) not null default 0 check (amount >= 0),
  currency     text not null default 'IQD',
  date         date not null default current_date,
  category     text not null default 'other',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists revenues_user_idx on public.revenues (user_id);
create index if not exists revenues_date_idx on public.revenues (date desc);

drop trigger if exists revenues_touch on public.revenues;
create trigger revenues_touch before update on public.revenues
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — identical sharing model to expenses
-- ---------------------------------------------------------------------------

alter table public.revenues enable row level security;

drop policy if exists revenues_select on public.revenues;
create policy revenues_select on public.revenues for select to authenticated
using (public.has_access(user_id) or public.is_admin(auth.uid()));

drop policy if exists revenues_insert on public.revenues;
create policy revenues_insert on public.revenues for insert to authenticated
with check (public.can_write(user_id));

drop policy if exists revenues_update on public.revenues;
create policy revenues_update on public.revenues for update to authenticated
using (public.can_write(user_id))
with check (public.can_write(user_id));

drop policy if exists revenues_delete on public.revenues;
create policy revenues_delete on public.revenues for delete to authenticated
using (public.can_write(user_id));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.revenues;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- list_revenues — one page of revenues plus totals and the category breakdown
-- Mirrors list_expenses(); SECURITY INVOKER so revenues_select still governs
-- visibility.
-- ---------------------------------------------------------------------------

create or replace function public.list_revenues(
  p_owner    uuid,
  p_search   text default null,
  p_category text default null,
  p_from     date default null,
  p_to       date default null,
  p_limit    int  default 20,
  p_offset   int  default 0
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  q text := nullif(btrim(coalesce(p_search, '')), '');
  lim int := least(greatest(coalesce(p_limit, 20), 1), 100);
  off int := greatest(coalesce(p_offset, 0), 0);
  month_start date := date_trunc('month', current_date)::date;
begin
  with filtered as (
    select r.*
    from public.revenues r
    where r.user_id = p_owner
      and (p_category is null or p_category = 'all' or r.category = p_category)
      and (p_from is null or r.date >= p_from)
      and (p_to   is null or r.date <= p_to)
      and (
        q is null
        or r.source ilike '%' || q || '%'
        or r.notes  ilike '%' || q || '%'
      )
  ),
  page as (
    select * from filtered
    order by date desc, created_at desc, id
    limit lim offset off
  )
  select jsonb_build_object(
    'rows', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'id',       p.id,
          'source',   p.source,
          'amount',   p.amount,
          'currency', p.currency,
          'date',     p.date,
          'category', p.category
        )
      ) from page p),
      '[]'::jsonb
    ),
    'total', (select count(*) from filtered),
    'sum',   (select coalesce(sum(f.amount), 0) from filtered f),
    'monthTotal', (
      select coalesce(sum(r.amount), 0)
      from public.revenues r
      where r.user_id = p_owner and r.date >= month_start
    ),
    'byCategory', coalesce((
      select jsonb_agg(row_to_json(c) order by c.total desc)
      from (
        select f.category, sum(f.amount) as total, count(*) as count
        from filtered f
        group by f.category
      ) c
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- dashboard_summary — re-created from 0008's version with a 'revenues' block
-- added, same shape as 'expenses'. Everything else (debts, breakdown, trend,
-- urgent) is unchanged from 0008.
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_summary(p_owner uuid)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'debts', (
      select jsonb_build_object(
        'total',     coalesce(sum(d.amount), 0),
        'paid',      coalesce(sum(d.paid_amount), 0),
        'remaining', coalesce(sum(d.remaining_amount), 0),
        'count',     count(*),
        'settled',   count(*) filter (where d.status = 'paid'),
        'active',    count(*) filter (where d.status <> 'paid'),
        'overdue',   count(*) filter (
                       where d.status <> 'paid' and d.due_date < current_date),
        'dueSoon',   count(*) filter (
                       where d.status <> 'paid'
                         and d.due_date >= current_date
                         and d.due_date <= current_date + 7)
      )
      from public.debts d
      where d.user_id = p_owner
    ),

    'expenses', (
      select jsonb_build_object(
        'count',      count(*),
        'monthTotal', coalesce(
          sum(e.amount) filter (
            where date_trunc('month', e.date::date) = date_trunc('month', current_date)
          ), 0)
      )
      from public.expenses e
      where e.user_id = p_owner
    ),

    'revenues', (
      select jsonb_build_object(
        'count',      count(*),
        'monthTotal', coalesce(
          sum(r.amount) filter (
            where date_trunc('month', r.date::date) = date_trunc('month', current_date)
          ), 0)
      )
      from public.revenues r
      where r.user_id = p_owner
    ),

    'breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('key', b.category, 'value', b.value))
      from (
        select d.category, sum(d.remaining_amount) as value
        from public.debts d
        where d.user_id = p_owner and d.status <> 'paid'
        group by d.category
      ) b
    ), '[]'::jsonb),

    'trend', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'YYYY-MM'),
        'total', coalesce(t.total, 0)
      ) order by m)
      from generate_series(
        date_trunc('month', current_date) - interval '5 months',
        date_trunc('month', current_date),
        '1 month'
      ) m
      left join lateral (
        select sum(d.amount) as total
        from public.debts d
        where d.user_id = p_owner
          and date_trunc('month', d.created_at) = m
      ) t on true
    ), '[]'::jsonb),

    'urgent', coalesce((
      select jsonb_agg(row_to_json(u))
      from (
        select
          d.id, d.creditor_name, d.phone,
          d.amount, d.paid_amount, d.remaining_amount,
          d.currency, d.debt_date, d.due_date,
          d.category, d.custom_category, d.priority, d.status
        from public.debts d
        where d.user_id = p_owner and d.status <> 'paid'
        order by
          public.priority_weight(d.priority) desc,
          case when d.due_date is null then 1 else 0 end,
          d.due_date asc,
          d.created_at desc
        limit 6
      ) u
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated users only; RLS still decides which rows they see.
-- ---------------------------------------------------------------------------

revoke all on function public.list_revenues(uuid, text, text, date, date, int, int) from public, anon;
grant execute on function public.list_revenues(uuid, text, text, date, date, int, int) to authenticated;
