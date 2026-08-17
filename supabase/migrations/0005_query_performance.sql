-- ============================================================================
-- Madyoon — Migration 0005: query performance
--
-- Everything here is additive and read-only:
--   * composite indexes matching the filters the app actually issues
--   * SECURITY INVOKER functions that do the filtering, sorting, paging and
--     aggregation in Postgres instead of shipping every row to the browser
--
-- No table, column, policy or trigger is changed. The functions run as the
-- caller, so every existing RLS policy still applies exactly as before.
-- ============================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- The debts list is always scoped to one owner and then ordered by due date,
-- status, priority or recency. Single-column indexes could not serve those.
create index if not exists debts_user_due_idx
  on public.debts (user_id, due_date nulls last);

create index if not exists debts_user_status_idx
  on public.debts (user_id, status);

create index if not exists debts_user_created_idx
  on public.debts (user_id, created_at desc);

create index if not exists debts_user_remaining_idx
  on public.debts (user_id, remaining_amount desc);

-- Overdue / due-soon counters scan unpaid rows only.
create index if not exists debts_open_due_idx
  on public.debts (user_id, due_date)
  where status <> 'paid';

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc);

create index if not exists expenses_user_category_idx
  on public.expenses (user_id, category);

-- Free-text search inside a single account.
create index if not exists debts_creditor_trgm_idx
  on public.debts using gin (creditor_name gin_trgm_ops);

create index if not exists expenses_description_trgm_idx
  on public.expenses using gin (description gin_trgm_ops);

-- has_access()/can_write() run on every RLS check; this is the lookup they do.
create index if not exists shared_accounts_lookup_idx
  on public.shared_accounts (shared_with_id, owner_id, status);

-- ---------------------------------------------------------------------------
-- Helper: priority weight, mirroring PRIORITIES in src/lib/constants.ts
-- ---------------------------------------------------------------------------

create or replace function public.priority_weight(p text)
returns int
language sql
immutable
as $$
  select case p
    when 'critical' then 4
    when 'high'     then 3
    when 'medium'   then 2
    when 'low'      then 1
    else 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- list_debts — one page of debts plus the totals for the whole filtered set
--
-- Returns: { rows: [...], total: int, summary: { ... } }
-- SECURITY INVOKER (the default) so debts_select still governs visibility.
-- ---------------------------------------------------------------------------

create or replace function public.list_debts(
  p_owner    uuid,
  p_search   text default null,
  p_category text default null,
  p_status   text default null,
  p_priority text default null,
  p_sort     text default 'due_asc',
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
begin
  with filtered as (
    select d.*
    from public.debts d
    where d.user_id = p_owner
      and (p_category is null or p_category = 'all' or d.category = p_category)
      and (p_status   is null or p_status   = 'all' or d.status   = p_status)
      and (p_priority is null or p_priority = 'all' or d.priority = p_priority)
      and (
        q is null
        or d.creditor_name   ilike '%' || q || '%'
        or d.notes           ilike '%' || q || '%'
        or d.custom_category ilike '%' || q || '%'
      )
  ),
  page as (
    select *
    from filtered
    order by
      -- Rows without a due date always sink to the bottom, either direction.
      case when p_sort in ('due_asc', 'due_desc') and due_date is null then 1 else 0 end,
      case when p_sort = 'due_asc'  then due_date end asc,
      case when p_sort = 'due_desc' then due_date end desc,
      case when p_sort = 'amount_desc' then remaining_amount end desc,
      case when p_sort = 'amount_asc'  then remaining_amount end asc,
      case when p_sort = 'priority' then public.priority_weight(priority) end desc,
      case when p_sort = 'priority' and due_date is null then 1 else 0 end,
      case when p_sort = 'priority' then due_date end asc,
      created_at desc,
      id
    limit lim offset off
  )
  select jsonb_build_object(
    'rows', coalesce(
      (select jsonb_agg(
        -- Deliberately narrow: `notes` is fetched only when a debt is opened.
        jsonb_build_object(
          'id',               p.id,
          'creditor_name',    p.creditor_name,
          'amount',           p.amount,
          'paid_amount',      p.paid_amount,
          'remaining_amount', p.remaining_amount,
          'currency',         p.currency,
          'due_date',         p.due_date,
          'category',         p.category,
          'custom_category',  p.custom_category,
          'priority',         p.priority,
          'status',           p.status
        )
      ) from page p),
      '[]'::jsonb
    ),
    'total', (select count(*) from filtered),
    'summary', (
      select jsonb_build_object(
        'total',     coalesce(sum(f.amount), 0),
        'paid',      coalesce(sum(f.paid_amount), 0),
        'remaining', coalesce(sum(f.remaining_amount), 0),
        'count',     count(*),
        'settled',   count(*) filter (where f.status = 'paid'),
        'overdue',   count(*) filter (
                       where f.status <> 'paid' and f.due_date < current_date),
        'dueSoon',   count(*) filter (
                       where f.status <> 'paid'
                         and f.due_date >= current_date
                         and f.due_date <= current_date + 7)
      )
      from filtered f
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- list_expenses — one page of expenses plus totals and the category breakdown
-- ---------------------------------------------------------------------------

create or replace function public.list_expenses(
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
    select e.*
    from public.expenses e
    where e.user_id = p_owner
      and (p_category is null or p_category = 'all' or e.category = p_category)
      and (p_from is null or e.date >= p_from)
      and (p_to   is null or e.date <= p_to)
      and (
        q is null
        or e.description ilike '%' || q || '%'
        or e.notes       ilike '%' || q || '%'
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
          'id',          p.id,
          'description', p.description,
          'amount',      p.amount,
          'currency',    p.currency,
          'date',        p.date,
          'category',    p.category
        )
      ) from page p),
      '[]'::jsonb
    ),
    'total', (select count(*) from filtered),
    'sum',   (select coalesce(sum(f.amount), 0) from filtered f),
    'monthTotal', (
      select coalesce(sum(e.amount), 0)
      from public.expenses e
      where e.user_id = p_owner and e.date >= month_start
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
-- dashboard_summary — every number on the dashboard in a single round trip
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_summary(p_owner uuid)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  month_start date := date_trunc('month', current_date)::date;
  trend_start date := (date_trunc('month', current_date) - interval '5 months')::date;
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
        'monthTotal', coalesce(sum(e.amount) filter (where e.date >= month_start), 0)
      )
      from public.expenses e
      where e.user_id = p_owner
    ),

    -- Remaining amount per category, unpaid debts only — feeds the donut.
    'breakdown', coalesce((
      select jsonb_agg(row_to_json(b) order by b.value desc)
      from (
        select d.category as key, sum(d.remaining_amount) as value
        from public.debts d
        where d.user_id = p_owner and d.status <> 'paid'
        group by d.category
        having sum(d.remaining_amount) > 0
      ) b
    ), '[]'::jsonb),

    -- Six monthly buckets, oldest first, zero-filled — feeds the area chart.
    'trend', coalesce((
      select jsonb_agg(row_to_json(t) order by t.month)
      from (
        select
          to_char(m, 'YYYY-MM') as month,
          coalesce((
            select sum(e.amount)
            from public.expenses e
            where e.user_id = p_owner
              and e.date >= m::date
              and e.date < (m + interval '1 month')::date
          ), 0) as total
        from generate_series(trend_start, month_start, interval '1 month') as m
      ) t
    ), '[]'::jsonb),

    -- The six debts worth acting on first.
    'urgent', coalesce((
      select jsonb_agg(row_to_json(u))
      from (
        select
          d.id, d.creditor_name, d.amount, d.paid_amount, d.remaining_amount,
          d.currency, d.due_date, d.category, d.custom_category, d.priority, d.status
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
-- due_alerts — the header bell. Counts everything, returns only what it shows.
-- ---------------------------------------------------------------------------

create or replace function public.due_alerts(p_owner uuid, p_limit int default 8)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  lim int := least(greatest(coalesce(p_limit, 8), 1), 50);
begin
  with alerts as (
    select d.id, d.creditor_name, d.remaining_amount, d.currency, d.due_date, d.status
    from public.debts d
    where d.user_id = p_owner
      and d.status <> 'paid'
      and d.due_date is not null
      and d.due_date <= current_date + 7
  )
  select jsonb_build_object(
    'count', (select count(*) from alerts),
    'rows', coalesce((
      select jsonb_agg(row_to_json(a) order by a.due_date)
      from (select * from alerts order by due_date limit lim) a
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- debt_detail — the columns the list deliberately skips, on demand
-- ---------------------------------------------------------------------------

create or replace function public.debt_detail(p_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select to_jsonb(d) from public.debts d where d.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated users only; RLS still decides which rows they see.
-- ---------------------------------------------------------------------------

revoke all on function public.list_debts(uuid, text, text, text, text, text, int, int) from public, anon;
revoke all on function public.list_expenses(uuid, text, text, date, date, int, int) from public, anon;
revoke all on function public.dashboard_summary(uuid) from public, anon;
revoke all on function public.due_alerts(uuid, int) from public, anon;
revoke all on function public.debt_detail(uuid) from public, anon;

grant execute on function public.list_debts(uuid, text, text, text, text, text, int, int) to authenticated;
grant execute on function public.list_expenses(uuid, text, text, date, date, int, int) to authenticated;
grant execute on function public.dashboard_summary(uuid) to authenticated;
grant execute on function public.due_alerts(uuid, int) to authenticated;
grant execute on function public.debt_detail(uuid) to authenticated;
grant execute on function public.priority_weight(text) to authenticated;
