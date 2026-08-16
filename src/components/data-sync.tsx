'use client';

import * as React from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/use-app-store';
import type { Debt, Expense, Profile } from '@/lib/types';

/**
 * Seeds the store with the server-rendered rows, then keeps it live via
 * Supabase realtime. Renders nothing — it exists for the subscription.
 */
export function DataSync({
  profile,
  initialDebts,
  initialExpenses,
}: {
  profile: Profile;
  initialDebts: Debt[];
  initialExpenses: Expense[];
}) {
  const { setProfile, setDebts, setExpenses, upsertDebt, removeDebt, upsertExpense, removeExpense } =
    useAppStore();

  // Re-seed on every server render so navigations pick up fresh data.
  React.useEffect(() => {
    setProfile(profile);
    setDebts(initialDebts);
    setExpenses(initialExpenses);
  }, [profile, initialDebts, initialExpenses, setProfile, setDebts, setExpenses]);

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`madyoon:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') removeDebt((payload.old as Debt).id);
          else upsertDebt(payload.new as Debt);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') removeExpense((payload.old as Expense).id);
          else upsertExpense(payload.new as Expense);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, upsertDebt, removeDebt, upsertExpense, removeExpense]);

  return null;
}
