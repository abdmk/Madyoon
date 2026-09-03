import {
  Building2,
  CreditCard,
  Landmark,
  Tag,
  FileText,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DebtCategory, DebtStatus, Priority } from './types';

export const APP_NAME = 'مديون';
export const APP_TAGLINE = 'إدارة الديون والمصاريف';

export const DEFAULT_CURRENCY = 'IQD';

export const CURRENCIES = [
  { code: 'IQD', label: 'دينار عراقي', symbol: 'د.ع' },
  { code: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', label: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'USD', label: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', label: 'يورو', symbol: '€' },
] as const;

export const DEBT_CATEGORIES: Record<
  DebtCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  personal: { label: 'ديون شخصية', icon: User, color: 'hsl(217 91% 60%)' },
  credit_card: { label: 'بطاقات ائتمان', icon: CreditCard, color: 'hsl(258 90% 66%)' },
  loan: { label: 'قروض', icon: Landmark, color: 'hsl(199 89% 48%)' },
  bill: { label: 'فواتير', icon: FileText, color: 'hsl(38 92% 50%)' },
  business: { label: 'ديون تجارية', icon: Building2, color: 'hsl(142 71% 45%)' },
  other: { label: 'أخرى', icon: Tag, color: 'hsl(215 16% 47%)' },
};

export const PRIORITIES: Record<
  Priority,
  { label: string; weight: number; className: string }
> = {
  critical: {
    label: 'حرجة',
    weight: 4,
    className: 'bg-destructive/10 text-destructive border-destructive/25',
  },
  high: {
    label: 'عالية',
    weight: 3,
    className: 'bg-warning/10 text-warning border-warning/25',
  },
  medium: {
    label: 'متوسطة',
    weight: 2,
    className: 'bg-primary/10 text-primary border-primary/25',
  },
  low: {
    label: 'منخفضة',
    weight: 1,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export const DEBT_STATUS: Record<DebtStatus, { label: string; className: string }> = {
  paid: {
    label: 'مسدد',
    className: 'bg-success/10 text-success border-success/25',
  },
  partial: {
    label: 'سداد جزئي',
    className: 'bg-warning/10 text-warning border-warning/25',
  },
  pending: {
    label: 'قيد السداد',
    className: 'bg-primary/10 text-primary border-primary/25',
  },
};

export const PAYMENT_METHODS: Record<'cash' | 'transfer', { label: string; icon: string }> = {
  cash: { label: 'نقداً', icon: '💵' },
  transfer: { label: 'تحويل بنكي', icon: '🏦' },
};

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'طعام وشراب', icon: '🍽️', color: 'hsl(38 92% 50%)' },
  { value: 'transport', label: 'مواصلات', icon: '🚗', color: 'hsl(217 91% 60%)' },
  { value: 'housing', label: 'سكن وإيجار', icon: '🏠', color: 'hsl(258 90% 66%)' },
  { value: 'utilities', label: 'فواتير وخدمات', icon: '💡', color: 'hsl(199 89% 48%)' },
  { value: 'health', label: 'صحة', icon: '🏥', color: 'hsl(0 84% 60%)' },
  { value: 'education', label: 'تعليم', icon: '📚', color: 'hsl(142 71% 45%)' },
  { value: 'shopping', label: 'تسوق', icon: '🛍️', color: 'hsl(330 81% 60%)' },
  { value: 'entertainment', label: 'ترفيه', icon: '🎬', color: 'hsl(280 65% 60%)' },
  { value: 'family', label: 'عائلة', icon: '👨‍👩‍👧', color: 'hsl(174 72% 40%)' },
  { value: 'charity', label: 'صدقة', icon: '🤲', color: 'hsl(158 64% 40%)' },
  { value: 'other', label: 'أخرى', icon: '📦', color: 'hsl(215 16% 47%)' },
] as const;

export const REVENUE_CATEGORIES = [
  { value: 'salary', label: 'راتب', icon: '💼', color: 'hsl(142 71% 45%)' },
  { value: 'business', label: 'عمل حر / تجارة', icon: '🧾', color: 'hsl(217 91% 60%)' },
  { value: 'investment', label: 'استثمار', icon: '📈', color: 'hsl(199 89% 48%)' },
  { value: 'gift', label: 'هدية', icon: '🎁', color: 'hsl(330 81% 60%)' },
  { value: 'refund', label: 'استرجاع مبلغ', icon: '↩️', color: 'hsl(258 90% 66%)' },
  { value: 'other', label: 'أخرى', icon: '💰', color: 'hsl(215 16% 47%)' },
] as const;

/** Days before the due date at which a debt starts showing as "قريب". */
export const DUE_SOON_DAYS = 7;

export const AUDIT_ACTIONS: Record<string, string> = {
  'debt.create': 'إضافة دين',
  'debt.update': 'تعديل دين',
  'debt.delete': 'حذف دين',
  'debt.pay': 'تسديد دين',
  'expense.create': 'إضافة مصروف',
  'expense.update': 'تعديل مصروف',
  'expense.delete': 'حذف مصروف',
  'revenue.create': 'إضافة إيراد',
  'revenue.update': 'تعديل إيراد',
  'revenue.delete': 'حذف إيراد',
  'share.create': 'إنشاء دعوة مشاركة',
  'share.accept': 'قبول دعوة مشاركة',
  'share.revoke': 'إلغاء مشاركة',
  'profile.update': 'تحديث الملف الشخصي',
  'admin.role_change': 'تغيير صلاحية مستخدم',
  'chat.message': 'رسالة للمساعد الذكي',
};
