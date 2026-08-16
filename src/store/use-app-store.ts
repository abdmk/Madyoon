'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Debt, DebtCategory, DebtStatus, Expense, Priority, Profile } from '@/lib/types';

export type DebtSort =
  | 'due_asc'
  | 'due_desc'
  | 'amount_desc'
  | 'amount_asc'
  | 'priority'
  | 'created_desc';

interface DebtFilters {
  search: string;
  category: DebtCategory | 'all';
  status: DebtStatus | 'all';
  priority: Priority | 'all';
  sort: DebtSort;
}

interface ExpenseFilters {
  search: string;
  category: string | 'all';
  from: string;
  to: string;
}

interface AppState {
  /* session -------------------------------------------------------------- */
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;

  /** Whose data we're looking at — self, or an account shared with us. */
  activeOwnerId: string | null;
  setActiveOwnerId: (id: string | null) => void;

  /* data ----------------------------------------------------------------- */
  debts: Debt[];
  expenses: Expense[];
  setDebts: (d: Debt[]) => void;
  setExpenses: (e: Expense[]) => void;
  upsertDebt: (d: Debt) => void;
  removeDebt: (id: string) => void;
  upsertExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;

  /* ui ------------------------------------------------------------------- */
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  debtFilters: DebtFilters;
  setDebtFilters: (f: Partial<DebtFilters>) => void;
  resetDebtFilters: () => void;

  expenseFilters: ExpenseFilters;
  setExpenseFilters: (f: Partial<ExpenseFilters>) => void;
  resetExpenseFilters: () => void;

  /** Alerts the user has dismissed this session, keyed by debt id. */
  dismissedAlerts: string[];
  dismissAlert: (id: string) => void;
}

const defaultDebtFilters: DebtFilters = {
  search: '',
  category: 'all',
  status: 'all',
  priority: 'all',
  sort: 'due_asc',
};

const defaultExpenseFilters: ExpenseFilters = {
  search: '',
  category: 'all',
  from: '',
  to: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),

      activeOwnerId: null,
      setActiveOwnerId: (activeOwnerId) => set({ activeOwnerId }),

      debts: [],
      expenses: [],
      setDebts: (debts) => set({ debts }),
      setExpenses: (expenses) => set({ expenses }),

      upsertDebt: (debt) =>
        set((s) => {
          const i = s.debts.findIndex((d) => d.id === debt.id);
          if (i === -1) return { debts: [debt, ...s.debts] };
          const next = s.debts.slice();
          next[i] = debt;
          return { debts: next };
        }),

      removeDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),

      upsertExpense: (expense) =>
        set((s) => {
          const i = s.expenses.findIndex((e) => e.id === expense.id);
          if (i === -1) return { expenses: [expense, ...s.expenses] };
          const next = s.expenses.slice();
          next[i] = expense;
          return { expenses: next };
        }),

      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      debtFilters: defaultDebtFilters,
      setDebtFilters: (f) => set((s) => ({ debtFilters: { ...s.debtFilters, ...f } })),
      resetDebtFilters: () => set({ debtFilters: defaultDebtFilters }),

      expenseFilters: defaultExpenseFilters,
      setExpenseFilters: (f) => set((s) => ({ expenseFilters: { ...s.expenseFilters, ...f } })),
      resetExpenseFilters: () => set({ expenseFilters: defaultExpenseFilters }),

      dismissedAlerts: [],
      dismissAlert: (id) =>
        set((s) => ({ dismissedAlerts: [...new Set([...s.dismissedAlerts, id])] })),
    }),
    {
      name: 'madyoon-ui',
      storage: createJSONStorage(() => localStorage),
      // Only UI preferences survive a reload; rows always come from Supabase.
      partialize: (s) => ({
        debtFilters: s.debtFilters,
        expenseFilters: s.expenseFilters,
        activeOwnerId: s.activeOwnerId,
      }),
    },
  ),
);
