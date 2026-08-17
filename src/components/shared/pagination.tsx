'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';

/**
 * Page controls for a server-paged list. It never slices anything — it only
 * moves the `page` param, and the next page comes from Postgres.
 *
 * RTL note: "next" moves toward the start edge, so the chevrons are mirrored
 * relative to a Latin layout.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  pending,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  pending?: boolean;
}) {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  if (total <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      className="flex items-center justify-between gap-3 no-print"
      aria-label="تنقل بين الصفحات"
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        <span className="tabular">
          {formatNumber(first)}–{formatNumber(last)}
        </span>{' '}
        من <span className="tabular">{formatNumber(total)}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="الصفحة السابقة"
          disabled={page <= 1 || pending}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="size-4" />
        </Button>

        <span className="px-2 text-xs text-muted-foreground tabular">
          {formatNumber(page)} / {formatNumber(pageCount)}
        </span>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="الصفحة التالية"
          disabled={page >= pageCount || pending}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
