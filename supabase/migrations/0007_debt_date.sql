-- Add debt_date: the date the debt was incurred (distinct from due_date).
alter table public.debts
  add column if not exists debt_date date;

-- ---------------------------------------------------------------------------
-- list_debts — add debt_date to the projection
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
        or d.phone           ilike '%' || q || '%'
        or d.notes           ilike '%' || q || '%'
        or d.custom_category ilike '%' || q || '%'
      )
  ),
  page as (
    select *
    from filtered
    order by
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
-- dashboard_summary — add debt_date + phone to the urgent projection
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

    'breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('key', d.category, 'value', sum(d.remaining_amount)))
      from public.debts d
      where d.user_id = p_owner and d.status <> 'paid'
      group by d.category
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
