-- ============================================================================
-- Madyoon — Migration 0006: payment records and debtor contact
--
-- Until now a payment was a bare increment of debts.paid_amount, so the app
-- could show *how much* was paid but never when, how, or against what note.
-- This adds the ledger without touching how the balance is calculated:
-- `paid_amount` is still the single source of truth for the amount, the
-- existing sync_debt_status trigger still derives the status from it, and
-- `remaining_amount` is still the generated column it always was.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Debtor contact — shown in the debt details, optional everywhere.
-- ---------------------------------------------------------------------------

alter table public.debts add column if not exists phone text;

-- ---------------------------------------------------------------------------
-- Payment ledger
-- ---------------------------------------------------------------------------

create table if not exists public.debt_payments (
  id         uuid primary key default gen_random_uuid(),
  debt_id    uuid not null references public.debts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     numeric(14, 2) not null check (amount > 0),
  method     text not null default 'cash' check (method in ('cash', 'transfer')),
  paid_at    date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists debt_payments_debt_idx
  on public.debt_payments (debt_id, paid_at desc, created_at desc);

create index if not exists debt_payments_user_idx
  on public.debt_payments (user_id, paid_at desc);

alter table public.debt_payments enable row level security;

-- Same access rules as the debt the payment belongs to.
drop policy if exists debt_payments_select on public.debt_payments;
create policy debt_payments_select on public.debt_payments for select to authenticated
using (public.has_access(user_id) or public.is_admin(auth.uid()));

drop policy if exists debt_payments_insert on public.debt_payments;
create policy debt_payments_insert on public.debt_payments for insert to authenticated
with check (public.can_write(user_id));

drop policy if exists debt_payments_update on public.debt_payments;
create policy debt_payments_update on public.debt_payments for update to authenticated
using (public.can_write(user_id))
with check (public.can_write(user_id));

drop policy if exists debt_payments_delete on public.debt_payments;
create policy debt_payments_delete on public.debt_payments for delete to authenticated
using (public.can_write(user_id));

-- ---------------------------------------------------------------------------
-- record_payment — one transaction: log the payment, raise paid_amount
--
-- The arithmetic is unchanged (paid_amount += amount, capped at amount, status
-- left to the trigger). Doing both writes here means a logged payment and the
-- balance can never disagree.
-- ---------------------------------------------------------------------------

create or replace function public.record_payment(
  p_debt_id uuid,
  p_amount  numeric,
  p_method  text default 'cash',
  p_paid_at date default current_date,
  p_note    text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  d public.debts;
  updated public.debts;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'مبلغ الدفعة غير صالح';
  end if;

  if coalesce(p_method, 'cash') not in ('cash', 'transfer') then
    raise exception 'طريقة الدفع غير صالحة';
  end if;

  -- RLS decides whether this row is visible/writable at all.
  select * into d from public.debts where id = p_debt_id for update;

  if d.id is null then
    raise exception 'الدين غير موجود';
  end if;

  if p_amount > d.remaining_amount then
    raise exception 'المبلغ أكبر من المتبقي';
  end if;

  insert into public.debt_payments (debt_id, user_id, amount, method, paid_at, note)
  values (
    d.id,
    d.user_id,
    p_amount,
    coalesce(p_method, 'cash'),
    coalesce(p_paid_at, current_date),
    nullif(btrim(coalesce(p_note, '')), '')
  );

  update public.debts
  set paid_amount = d.paid_amount + p_amount
  where id = d.id
  returning * into updated;

  return to_jsonb(updated);
end;
$$;

-- ---------------------------------------------------------------------------
-- debt_detail — everything the details panel shows, in one round trip
--
-- Replaces the 0005 version: the list query stays narrow, and the columns it
-- skips (notes, phone, timestamps) plus the payment history are fetched only
-- when a debt is actually opened.
-- ---------------------------------------------------------------------------

create or replace function public.debt_detail(p_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'debt', to_jsonb(d),
    'payments', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.paid_at desc, p.created_at desc)
      from public.debt_payments p
      where p.debt_id = d.id
    ), '[]'::jsonb),
    'paymentsCount', (
      select count(*) from public.debt_payments p where p.debt_id = d.id
    )
  )
  from public.debts d
  where d.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- list_debts — same contract as 0005, plus `phone` in the projection
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
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.record_payment(uuid, numeric, text, date, text) from public, anon;
grant execute on function public.record_payment(uuid, numeric, text, date, text) to authenticated;
grant execute on function public.debt_detail(uuid) to authenticated;
