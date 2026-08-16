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

export interface Debt {
  id: string;
  user_id: string;
  creditor_name: string;
  amount: number;
  paid_amount: number;
  /** Generated column: max(amount - paid_amount, 0). */
  remaining_amount: number;
  currency: string;
  due_date: string | null;
  category: DebtCategory;
  custom_category: string | null;
  priority: Priority;
  status: DebtStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
