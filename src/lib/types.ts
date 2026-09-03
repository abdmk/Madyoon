export type Role = 'user' | 'admin';

export type DebtCategory =
  | 'personal'
  | 'credit_card'
  | 'loan'
  | 'bill'
  | 'business'
  | 'other';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type DebtStatus = 'pending' | 'partial' | 'paid';
export type SharePermission = 'read' | 'write';
export type ShareStatus = 'pending' | 'accepted' | 'revoked';

export interface Profile {
  id: string;
  email: string | null;
  name: string;
  role: Role;
  avatar_url: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'transfer';

export interface Debt {
  id: string;
  user_id: string;
  creditor_name: string;
  phone: string | null;
  amount: number;
  paid_amount: number;
  /** Generated column: max(amount - paid_amount, 0). */
  remaining_amount: number;
  currency: string;
  debt_date: string | null;
  due_date: string | null;
  category: DebtCategory;
  custom_category: string | null;
  priority: Priority;
  status: DebtStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  user_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  note: string | null;
  created_at: string;
}

export interface DebtDetail {
  debt: Debt;
  payments: DebtPayment[];
  paymentsCount: number;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * What the debts list actually renders. `notes`, `user_id` and the timestamps
 * are left in Postgres until a row is opened — see `getDebtDetail`.
 */
export type DebtListItem = Omit<Debt, 'user_id' | 'notes' | 'created_at' | 'updated_at'>;

/** What the expenses list renders. */
export type ExpenseListItem = Omit<
  Expense,
  'user_id' | 'notes' | 'created_at' | 'updated_at'
>;

export interface Revenue {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** What the revenues list renders. */
export type RevenueListItem = Omit<
  Revenue,
  'user_id' | 'notes' | 'created_at' | 'updated_at'
>;

export interface DebtsSummary {
  total: number;
  paid: number;
  remaining: number;
  count: number;
  settled: number;
  overdue: number;
  dueSoon: number;
}

export interface DebtsPage {
  rows: DebtListItem[];
  total: number;
  summary: DebtsSummary;
}

export interface ExpenseCategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface ExpensesPage {
  rows: ExpenseListItem[];
  total: number;
  sum: number;
  monthTotal: number;
  byCategory: ExpenseCategoryTotal[];
}

export interface RevenueCategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface RevenuesPage {
  rows: RevenueListItem[];
  total: number;
  sum: number;
  monthTotal: number;
  byCategory: RevenueCategoryTotal[];
}

export interface DashboardData {
  debts: {
    total: number;
    paid: number;
    remaining: number;
    count: number;
    settled: number;
    active: number;
    overdue: number;
    dueSoon: number;
  };
  expenses: { count: number; monthTotal: number };
  revenues: { count: number; monthTotal: number };
  breakdown: { key: string; value: number }[];
  trend: { month: string; total: number }[];
  urgent: DebtListItem[];
}

export interface DueAlertRow {
  id: string;
  creditor_name: string;
  remaining_amount: number;
  currency: string;
  due_date: string;
  status: DebtStatus;
}

export interface DueAlerts {
  count: number;
  rows: DueAlertRow[];
}

export interface SharedAccount {
  id: string;
  owner_id: string;
  shared_with_id: string | null;
  invite_code: string;
  permission: SharePermission;
  status: ShareStatus;
  created_at: string;
  accepted_at: string | null;
}

/** A share row joined with the two profiles involved, for the settings page. */
export interface SharedAccountView extends SharedAccount {
  owner?: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'> | null;
  shared_with?: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'> | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'> | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  admins: number;
  total_debts: number;
  paid_debts: number;
  remaining_debts: number;
  debts_count: number;
  settled_count: number;
  overdue_count: number;
  total_expenses: number;
  expenses_count: number;
  shares_count: number;
  conversations: number;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  name: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  debts_count: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  expenses_total: number;
}

export interface AnalyticsPoint {
  month: string;
  debts_total: number;
  paid_total: number;
  expenses_total: number;
  new_users: number;
}
