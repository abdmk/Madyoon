-- ============================================================================
-- Madyoon — Migration 0008: fix nested-aggregate bug in dashboard_summary
--
-- 0007's rewrite of dashboard_summary called sum() directly inside jsonb_agg()
-- in the 'breakdown' block, which Postgres rejects (error 42803: aggregate
-- function calls cannot be nested). Every call to dashboard_summary since
-- 0007 landed returned HTTP 400, leaving the dashboard blank. Fixed by
-- computing the per-category sum in an inner subquery, same pattern 0005 used.
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

    -- Computed in an inner subquery, then wrapped in jsonb_agg — nesting
    -- sum() directly inside jsonb_agg() is invalid (Postgres error 42803).
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
