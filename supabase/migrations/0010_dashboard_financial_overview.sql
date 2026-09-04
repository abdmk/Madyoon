-- ============================================================================
-- Madyoon — Migration 0010: dashboard financial overview
--
-- Two additions, both read-only (no schema/table changes):
--
-- 1. dashboard_summary() gains overdueAmount/dueSoonAmount on the debts
--    object — the existing overdue/dueSoon fields were counts only, but a
--    stat card showing "متأخر" is far more useful as a sum than a count.
--
-- 2. A new dashboard_period_summary(owner, period) RPC: revenue, expense,
--    net and collected totals for a selectable window (today/week/month/
--    year), plus a zero-filled series for the same window at the
--    appropriate granularity (hourly for today, daily for week/month,
--    monthly for year) — the data source for the new dashboard chart.
--    revenues/expenses only carry a `date` column (no time of day), so
--    "today" buckets by created_at instead — the one place a precise
--    timestamp actually exists.
-- ============================================================================

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
        'total',        coalesce(sum(d.amount), 0),
        'paid',         coalesce(sum(d.paid_amount), 0),
        'remaining',    coalesce(sum(d.remaining_amount), 0),
        'count',        count(*),
        'settled',      count(*) filter (where d.status = 'paid'),
        'active',       count(*) filter (where d.status <> 'paid'),
        'overdue',      count(*) filter (
                          where d.status <> 'paid' and d.due_date < current_date),
        'overdueAmount', coalesce(sum(d.remaining_amount) filter (
                          where d.status <> 'paid' and d.due_date < current_date), 0),
        'dueSoon',      count(*) filter (
                          where d.status <> 'paid'
                            and d.due_date >= current_date
                            and d.due_date <= current_date + 7),
        'dueSoonAmount', coalesce(sum(d.remaining_amount) filter (
                          where d.status <> 'paid'
                            and d.due_date >= current_date
                            and d.due_date <= current_date + 7), 0)
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
-- dashboard_period_summary — revenue/expense/collected totals + series for
-- one of four windows. SECURITY INVOKER (default): RLS still governs which
-- rows a caller can see.
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_period_summary(
  p_owner  uuid,
  p_period text default 'month'
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  range_start timestamptz;
  range_end   timestamptz;
  bucket      interval;
  use_hourly  boolean;
begin
  case p_period
    when 'today' then
      range_start := date_trunc('day', now());
      range_end   := range_start + interval '1 day';
      bucket      := interval '1 hour';
      use_hourly  := true;
    when 'week' then
      range_start := date_trunc('day', now()) - interval '6 days';
      range_end   := date_trunc('day', now()) + interval '1 day';
      bucket      := interval '1 day';
      use_hourly  := false;
    when 'year' then
      range_start := date_trunc('year', now());
      range_end   := range_start + interval '1 year';
      bucket      := interval '1 month';
      use_hourly  := false;
    else -- 'month'
      range_start := date_trunc('month', now());
      range_end   := range_start + interval '1 month';
      bucket      := interval '1 day';
      use_hourly  := false;
  end case;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'revenues', coalesce((
        select sum(r.amount) from public.revenues r
        where r.user_id = p_owner
          and (case when use_hourly
                 then r.created_at >= range_start and r.created_at < range_end
                 else r.date >= range_start::date and r.date < range_end::date
               end)
      ), 0),
      'expenses', coalesce((
        select sum(e.amount) from public.expenses e
        where e.user_id = p_owner
          and (case when use_hourly
                 then e.created_at >= range_start and e.created_at < range_end
                 else e.date >= range_start::date and e.date < range_end::date
               end)
      ), 0),
      'collected', coalesce((
        select sum(p.amount) from public.debt_payments p
        where p.user_id = p_owner
          and (case when use_hourly
                 then p.created_at >= range_start and p.created_at < range_end
                 else p.paid_at >= range_start::date and p.paid_at < range_end::date
               end)
      ), 0),
      'newDebt', coalesce((
        select sum(d.amount) from public.debts d
        where d.user_id = p_owner
          and d.created_at >= range_start and d.created_at < range_end
      ), 0)
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'label',
          case
            when use_hourly then to_char(b, 'HH24:00')
            when p_period = 'year' then to_char(b, 'YYYY-MM')
            else to_char(b, 'YYYY-MM-DD')
          end,
        'revenues', coalesce(rv.total, 0),
        'expenses', coalesce(ex.total, 0),
        'collected', coalesce(co.total, 0)
      ) order by b)
      from generate_series(range_start, range_end - bucket, bucket) as b
      left join lateral (
        select sum(r.amount) as total from public.revenues r
        where r.user_id = p_owner
          and (case when use_hourly
                 then r.created_at >= b and r.created_at < b + bucket
                 else r.date >= b::date and r.date < (b + bucket)::date
               end)
      ) rv on true
      left join lateral (
        select sum(e.amount) as total from public.expenses e
        where e.user_id = p_owner
          and (case when use_hourly
                 then e.created_at >= b and e.created_at < b + bucket
                 else e.date >= b::date and e.date < (b + bucket)::date
               end)
      ) ex on true
      left join lateral (
        select sum(p.amount) as total from public.debt_payments p
        where p.user_id = p_owner
          and (case when use_hourly
                 then p.created_at >= b and p.created_at < b + bucket
                 else p.paid_at >= b::date and p.paid_at < (b + bucket)::date
               end)
      ) co on true
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.dashboard_summary(uuid) from public, anon;
grant execute on function public.dashboard_summary(uuid) to authenticated;

revoke all on function public.dashboard_period_summary(uuid, text) from public, anon;
grant execute on function public.dashboard_period_summary(uuid, text) to authenticated;
