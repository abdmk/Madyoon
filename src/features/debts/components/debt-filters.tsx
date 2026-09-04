'use client';

import * as React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill } from '@/components/ui/pill';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEBT_CATEGORIES, PRIORITIES } from '@/lib/constants';
import { formatDate } from '@/lib/formatters';
import { DEBT_SORTS, DEBT_SORT_LABELS } from '@/features/debts/params';
import { DEBT_STATUS_FILTERS } from '@/features/debts/status';
import type { DebtQuery, DebtSort } from '@/features/debts/params';
import type { DebtCategory, DebtDisplayStatus, Priority } from '@/lib/types';

/** Everything that is currently narrowing the list, as removable chips. */
function activeChips(query: DebtQuery, currencies: string[]) {
  const chips: { key: keyof DebtQuery; label: string; reset: Partial<DebtQuery> }[] = [];

  if (query.status !== 'all') {
    const meta = DEBT_STATUS_FILTERS.find((s) => s.value === query.status);
    chips.push({ key: 'status', label: meta?.label ?? query.status, reset: { status: 'all' } });
  }
  if (query.category !== 'all') {
    chips.push({
      key: 'category',
      label: DEBT_CATEGORIES[query.category].label,
      reset: { category: 'all' },
    });
  }
  if (query.priority !== 'all') {
    chips.push({
      key: 'priority',
      label: `أولوية ${PRIORITIES[query.priority].label}`,
      reset: { priority: 'all' },
    });
  }
  if (query.currency !== 'all' && currencies.length > 0) {
    chips.push({ key: 'currency', label: query.currency, reset: { currency: 'all' } });
  }
  if (query.from) {
    chips.push({ key: 'from', label: `من ${formatDate(query.from)}`, reset: { from: '' } });
  }
  if (query.to) {
    chips.push({ key: 'to', label: `إلى ${formatDate(query.to)}`, reset: { to: '' } });
  }

  return chips;
}

/**
 * Search, sort and filters for the debts list.
 *
 * The filters themselves live in a sheet rather than an inline panel: on a
 * phone that is a bottom sheet you can reach with a thumb, and on a desktop
 * the same component becomes a centred modal — one implementation, so the
 * two never drift apart. What is *currently* filtering stays visible on the
 * page as removable chips, because a filter you cannot see is a filter you
 * forget you set.
 */
export function DebtFilters({
  query,
  currencies,
  activeCount,
  search,
  onSearchChange,
  update,
  onReset,
}: {
  query: DebtQuery;
  currencies: string[];
  activeCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  update: (patch: Partial<DebtQuery>) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const chips = activeChips(query, currencies);

  return (
    <Card className="no-print">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث باسم الجهة أو الهاتف…"
              className="pe-9"
              aria-label="بحث في الديون"
            />
          </div>

          <Select value={query.sort} onValueChange={(v) => update({ sort: v as DebtSort })}>
            <SelectTrigger className="sm:w-52" aria-label="الترتيب">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEBT_SORTS.map((key) => (
                <SelectItem key={key} value={key}>
                  {DEBT_SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={activeCount ? 'default' : 'outline'}
            onClick={() => setOpen(true)}
            className="shrink-0"
            aria-haspopup="dialog"
          >
            <Filter className="size-4" />
            فلاتر
            {activeCount ? (
              <span className="rounded-full bg-background/25 px-1.5 text-xs tabular">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </div>

        {/* Quick status row — the filter people reach for most, one tap away
            without opening the sheet at all. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip
            label="الكل"
            active={query.status === 'all'}
            onClick={() => update({ status: 'all' })}
          />
          {DEBT_STATUS_FILTERS.map((status) => (
            <StatusChip
              key={status.value}
              label={status.label}
              active={query.status === status.value}
              onClick={() => update({ status: status.value })}
            />
          ))}
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
            <span className="text-xs text-muted-foreground">مطبّق:</span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => update(chip.reset)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`إزالة فلتر ${chip.label}`}
              >
                <Pill tone="primary" icon={X}>
                  {chip.label}
                </Pill>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-xs">
              مسح الكل
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-5">
          <SheetHeader>
            <SheetTitle>تصفية الديون</SheetTitle>
            <SheetDescription>حدّد ما تريد رؤيته، وسيُحدَّث الجدول فوراً.</SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="filter-status" label="الحالة">
              <Select
                value={query.status}
                onValueChange={(v) => update({ status: v as DebtDisplayStatus | 'all' })}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {DEBT_STATUS_FILTERS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="filter-category" label="التصنيف">
              <Select
                value={query.category}
                onValueChange={(v) => update({ category: v as DebtCategory | 'all' })}
              >
                <SelectTrigger id="filter-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {Object.entries(DEBT_CATEGORIES).map(([key, cat]) => {
                    const CatIcon = cat.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="inline-flex items-center gap-2">
                          <CatIcon className="size-4" style={{ color: cat.color }} aria-hidden />
                          {cat.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field id="filter-priority" label="الأولوية">
              <Select
                value={query.priority}
                onValueChange={(v) => update({ priority: v as Priority | 'all' })}
              >
                <SelectTrigger id="filter-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأولويات</SelectItem>
                  {(Object.keys(PRIORITIES) as Priority[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PRIORITIES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Only worth showing once there is more than one currency to
                choose between — a filter with a single option is noise. */}
            {currencies.length > 1 ? (
              <Field id="filter-currency" label="العملة">
                <Select value={query.currency} onValueChange={(v) => update({ currency: v })}>
                  <SelectTrigger id="filter-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل العملات</SelectItem>
                    {currencies.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <Field id="filter-from" label="الاستحقاق من">
              <Input
                id="filter-from"
                type="date"
                value={query.from}
                max={query.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
                className="[unicode-bidi:isolate]"
                dir="ltr"
              />
            </Field>

            <Field id="filter-to" label="الاستحقاق إلى">
              <Input
                id="filter-to"
                type="date"
                value={query.to}
                min={query.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
                className="[unicode-bidi:isolate]"
                dir="ltr"
              />
            </Field>
          </div>

          <SheetFooter>
            <Button onClick={() => setOpen(false)} className="sm:min-w-32">
              عرض النتائج
            </Button>
            <Button variant="ghost" onClick={onReset} disabled={!activeCount && !query.search}>
              <X className="size-4" />
              مسح الفلاتر
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function StatusChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-transparent bg-soft-neutral text-soft-neutral-foreground hover:bg-secondary',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
