-- ============================================================================
-- Madyoon — Migration 0011: richer debt filters, attention feed, creditor
-- detail and reports
--
-- All read-side. No table, column, policy or grant on existing data changes,
-- so RLS keeps deciding visibility exactly as before — every function here is
-- SECURITY INVOKER (the default) and simply reads through the caller's
-- policies.
--
-- 1. list_debts gains currency + due-date-range filters, an `overdue` virtual
--    status, and returns phone/debt_date/last_payment_at so the list row can
--    show who, when, and when they last paid without a second query.
-- 2. attention_feed  — what is late, what lands this week, what was just paid.
-- 3. creditor_detail — the per-creditor view, derived from debts.creditor_name
--    (there is no customers table, and inventing one would migrate live data).
-- 4. reports_summary — the analytics page, aggregated in SQL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. list_debts — signature changes, so the old one is dropped first.
--    (create-or-replace would leave an ambiguous overload behind.)
-- ---------------------------------------------------------------------------

drop function if exists public.list_debts(uuid, text, text, text, text, text, int, int);

create or replace function public.list_debts(
  p_owner    uuid,
  p_search   text default null,
  p_category text default null,
  p_status   text default null,
  p_priority text default null,
  p_sort     text default 'due_asc',
  p_currency text default null,
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
begin
  with filtered as (
    select d.*
    from public.debts d
    where d.user_id = p_owner
      and (p_category is null or p_category = 'all' or d.category = p_category)
      -- 'overdue' is a display status, not a stored one: it is any unsettled
      -- debt whose due date has passed. Kept virtual so the stored status
      -- stays the single source of truth the payment trigger maintains.
      and (
        p_status is null or p_status = 'all'
        or (p_status = 'overdue' and d.status <> 'paid' and d.due_date < current_date)
        or (p_status <> 'overdue' and d.status = p_status)
      )
      and (p_priority is null or p_priority = 'all' or d.priority = p_priority)
      and (p_currency is null or p_currency = 'all' or d.currency = p_currency)
      and (p_from is null or d.due_date >= p_from)
      and (p_to   is null or d.due_date <= p_to)
      and (
        q is null
        or d.creditor_name   ilike '%' || q || '%'
        or d.phone           ilike '%' || q || '%'
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
          'phone',            p.phone,
          'amount',           p.amount,
          'paid_amount',      p.paid_amount,
          'remaining_amount', p.remaining_amount,
          'currency',         p.currency,
          'debt_date',        p.debt_date,
          'due_date',         p.due_date,
          'category',         p.category,
          'custom_category',  p.custom_category,
          'priority',         p.priority,
          'status',           p.status,
          'last_payment_at',  (
            select max(pp.paid_at) from public.debt_payments pp where pp.debt_id = p.id
          )
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
-- 2. attention_feed — the dashboard's "act on this" list.
-- ---------------------------------------------------------------------------

create or replace function public.attention_feed(p_owner uuid, p_limit int default 5)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  lim int := least(greatest(coalesce(p_limit, 5), 1), 20);
begin
  select jsonb_build_object(
    'overdue', coalesce((
      select jsonb_agg(row_to_json(o) order by o.due_date)
      from (
        select d.id, d.creditor_name, d.remaining_amount, d.currency, d.due_date,
               d.status, d.priority,
               (current_date - d.due_date) as days_late
        from public.debts d
        where d.user_id = p_owner and d.status <> 'paid' and d.due_date < current_date
        order by d.due_date asc
        limit lim
      ) o
    ), '[]'::jsonb),

    'dueSoon', coalesce((
      select jsonb_agg(row_to_json(s) order by s.due_date)
      from (
        select d.id, d.creditor_name, d.remaining_amount, d.currency, d.due_date,
               d.status, d.priority,
               (d.due_date - current_date) as days_left
        from public.debts d
        where d.user_id = p_owner
          and d.status <> 'paid'
          and d.due_date >= current_date
          and d.due_date <= current_date + 7
        order by d.due_date asc
        limit lim
      ) s
    ), '[]'::jsonb),

    'recentPayments', coalesce((
      select jsonb_agg(row_to_json(r) order by r.paid_at desc, r.created_at desc)
      from (
        select p.id, p.debt_id, p.amount, p.method, p.paid_at, p.created_at,
               d.creditor_name, d.currency, d.remaining_amount
        from public.debt_payments p
        join public.debts d on d.id = p.debt_id
        where p.user_id = p_owner
        order by p.paid_at desc, p.created_at desc
        limit lim
      ) r
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. creditor_detail — everything owed to one name, plus its ledger.
--    Grouped by creditor_name because that is the only identity the schema
--    has; phone is carried along for contact, not identity.
-- ---------------------------------------------------------------------------

create or replace function public.creditor_detail(p_owner uuid, p_name text)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  name text := btrim(coalesce(p_name, ''));
begin
  if name = '' then
    return null;
  end if;

  select jsonb_build_object(
    'name', name,
    'phone', (
      select d.phone from public.debts d
      where d.user_id = p_owner and d.creditor_name = name and d.phone is not null
      order by d.created_at desc limit 1
    ),
    'summary', (
      select jsonb_build_object(
        'total',      coalesce(sum(d.amount), 0),
        'paid',       coalesce(sum(d.paid_amount), 0),
        'remaining',  coalesce(sum(d.remaining_amount), 0),
        'count',      count(*),
        'settled',    count(*) filter (where d.status = 'paid'),
        'active',     count(*) filter (where d.status <> 'paid'),
        'overdue',    count(*) filter (where d.status <> 'paid' and d.due_date < current_date),
        'overdueAmount', coalesce(sum(d.remaining_amount) filter (
                           where d.status <> 'paid' and d.due_date < current_date), 0),
        'currency',   (select d2.currency from public.debts d2
                       where d2.user_id = p_owner and d2.creditor_name = name
                       order by d2.created_at desc limit 1),
        'firstDebtAt', min(d.created_at),
        'lastDebtAt',  max(d.created_at)
      )
      from public.debts d
      where d.user_id = p_owner and d.creditor_name = name
    ),
    'debts', coalesce((
      select jsonb_agg(row_to_json(x))
      from (
        select d.id, d.creditor_name, d.phone, d.amount, d.paid_amount,
               d.remaining_amount, d.currency, d.debt_date, d.due_date,
               d.category, d.custom_category, d.priority, d.status,
               (select max(pp.paid_at) from public.debt_payments pp where pp.debt_id = d.id)
                 as last_payment_at
        from public.debts d
        where d.user_id = p_owner and d.creditor_name = name
        order by
          case when d.status = 'paid' then 1 else 0 end,
          case when d.due_date is null then 1 else 0 end,
          d.due_date asc,
          d.created_at desc
      ) x
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(row_to_json(y))
      from (
        select p.id, p.debt_id, p.amount, p.method, p.paid_at, p.note, p.created_at,
               d.currency
        from public.debt_payments p
        join public.debts d on d.id = p.debt_id
        where p.user_id = p_owner and d.creditor_name = name
        order by p.paid_at desc, p.created_at desc
        limit 100
      ) y
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. reports_summary — the analytics page in one round trip.
-- ---------------------------------------------------------------------------

create or replace function public.reports_summary(p_owner uuid, p_months int default 6)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  months int := least(greatest(coalesce(p_months, 6), 3), 24);
  start_month date := (date_trunc('month', current_date) - make_interval(months => months - 1))::date;
begin
  select jsonb_build_object(
    -- Money in vs money out vs collected, month by month.
    'cashflow', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month',     to_char(m, 'YYYY-MM'),
        'revenues',  coalesce(rv.total, 0),
        'expenses',  coalesce(ex.total, 0),
        'collected', coalesce(co.total, 0),
        'newDebt',   coalesce(nd.total, 0)
      ) order by m)
      from generate_series(start_month, date_trunc('month', current_date)::date, '1 month') m
      left join lateral (
        select sum(r.amount) as total from public.revenues r
        where r.user_id = p_owner
          and r.date >= m::date and r.date < (m + interval '1 month')::date
      ) rv on true
      left join lateral (
        select sum(e.amount) as total from public.expenses e
        where e.user_id = p_owner
          and e.date >= m::date and e.date < (m + interval '1 month')::date
      ) ex on true
      left join lateral (
        select sum(p.amount) as total from public.debt_payments p
        where p.user_id = p_owner
          and p.paid_at >= m::date and p.paid_at < (m + interval '1 month')::date
      ) co on true
      left join lateral (
        select sum(d.amount) as total from public.debts d
        where d.user_id = p_owner
          and d.created_at >= m::timestamptz
          and d.created_at < (m + interval '1 month')::timestamptz
      ) nd on true
    ), '[]'::jsonb),

    -- What was billed vs what actually came back in, over the same window.
    'collection', (
      select jsonb_build_object(
        'billed',    coalesce((select sum(d.amount) from public.debts d
                               where d.user_id = p_owner
                                 and d.created_at >= start_month::timestamptz), 0),
        'collected', coalesce((select sum(p.amount) from public.debt_payments p
                               where p.user_id = p_owner and p.paid_at >= start_month), 0),
        'outstanding', coalesce((select sum(d.remaining_amount) from public.debts d
                                 where d.user_id = p_owner and d.status <> 'paid'), 0)
      )
    ),

    -- How stale the unpaid balance is. Anything without a due date is
    -- reported separately rather than silently bucketed as "current".
    'aging', (
      select jsonb_build_object(
        'current',  coalesce(sum(d.remaining_amount) filter (
                      where d.due_date is not null and d.due_date >= current_date), 0),
        'days1_30', coalesce(sum(d.remaining_amount) filter (
                      where d.due_date between current_date - 30 and current_date - 1), 0),
        'days31_60', coalesce(sum(d.remaining_amount) filter (
                      where d.due_date between current_date - 60 and current_date - 31), 0),
        'days61_90', coalesce(sum(d.remaining_amount) filter (
                      where d.due_date between current_date - 90 and current_date - 61), 0),
        'over90',   coalesce(sum(d.remaining_amount) filter (
                      where d.due_date < current_date - 90), 0),
        'undated',  coalesce(sum(d.remaining_amount) filter (where d.due_date is null), 0)
      )
      from public.debts d
      where d.user_id = p_owner and d.status <> 'paid'
    ),

    -- Who holds most of the outstanding balance.
    'topCreditors', coalesce((
      select jsonb_agg(row_to_json(t) order by t.remaining desc)
      from (
        select d.creditor_name as name,
               sum(d.remaining_amount) as remaining,
               count(*) as debts,
               count(*) filter (where d.due_date < current_date) as overdue,
               max(d.currency) as currency
        from public.debts d
        where d.user_id = p_owner and d.status <> 'paid'
        group by d.creditor_name
        having sum(d.remaining_amount) > 0
        order by sum(d.remaining_amount) desc
        limit 6
      ) t
    ), '[]'::jsonb),

    -- Where the money went, over the window.
    'expenseCategories', coalesce((
      select jsonb_agg(row_to_json(c) order by c.total desc)
      from (
        select e.category, sum(e.amount) as total, count(*) as count
        from public.expenses e
        where e.user_id = p_owner and e.date >= start_month
        group by e.category
        order by sum(e.amount) desc
        limit 10
      ) c
    ), '[]'::jsonb),

    -- This month against last, for the four headline numbers.
    'comparison', (
      select jsonb_build_object(
        'thisMonth', jsonb_build_object(
          'revenues',  coalesce((select sum(r.amount) from public.revenues r
                        where r.user_id = p_owner
                          and r.date >= date_trunc('month', current_date)::date), 0),
          'expenses',  coalesce((select sum(e.amount) from public.expenses e
                        where e.user_id = p_owner
                          and e.date >= date_trunc('month', current_date)::date), 0),
          'collected', coalesce((select sum(p.amount) from public.debt_payments p
                        where p.user_id = p_owner
                          and p.paid_at >= date_trunc('month', current_date)::date), 0)
        ),
        'lastMonth', jsonb_build_object(
          'revenues',  coalesce((select sum(r.amount) from public.revenues r
                        where r.user_id = p_owner
                          and r.date >= (date_trunc('month', current_date) - interval '1 month')::date
                          and r.date <  date_trunc('month', current_date)::date), 0),
          'expenses',  coalesce((select sum(e.amount) from public.expenses e
                        where e.user_id = p_owner
                          and e.date >= (date_trunc('month', current_date) - interval '1 month')::date
                          and e.date <  date_trunc('month', current_date)::date), 0),
          'collected', coalesce((select sum(p.amount) from public.debt_payments p
                        where p.user_id = p_owner
                          and p.paid_at >= (date_trunc('month', current_date) - interval '1 month')::date
                          and p.paid_at <  date_trunc('month', current_date)::date), 0)
        )
      )
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; RLS still decides which rows they see.
-- ---------------------------------------------------------------------------

revoke all on function public.list_debts(uuid, text, text, text, text, text, text, date, date, int, int) from public, anon;
revoke all on function public.attention_feed(uuid, int) from public, anon;
revoke all on function public.creditor_detail(uuid, text) from public, anon;
revoke all on function public.reports_summary(uuid, int) from public, anon;

grant execute on function public.list_debts(uuid, text, text, text, text, text, text, date, date, int, int) to authenticated;
grant execute on function public.attention_feed(uuid, int) to authenticated;
grant execute on function public.creditor_detail(uuid, text) to authenticated;
grant execute on function public.reports_summary(uuid, int) to authenticated;
