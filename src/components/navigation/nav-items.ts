import {
  BarChart3,
  Bot,
  LayoutDashboard,
  MoreHorizontal,
  PieChart,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Matches nested routes too (e.g. /debts/123). */
  prefix?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/debts', label: 'الديون', icon: Wallet, prefix: true },
  { href: '/expenses', label: 'المصاريف', icon: Receipt, prefix: true },
  { href: '/revenues', label: 'الإيرادات', icon: TrendingUp, prefix: true },
  { href: '/reports', label: 'التقارير', icon: PieChart, prefix: true },
  { href: '/chatbot', label: 'المساعد الذكي', icon: Bot },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'لوحة التحكم', icon: ShieldCheck },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart3 },
  { href: '/admin/audit-logs', label: 'السجلات', icon: ScrollText },
];

/**
 * Bottom tab bar on phones. Four destinations, not seven — the fifth slot is
 * the floating add action, and anything past that lives behind "المزيد" so
 * every tab keeps a real thumb-sized target instead of seven slivers.
 */
export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/debts', label: 'الديون', icon: Wallet, prefix: true },
  { href: '/expenses', label: 'المصاريف', icon: Receipt, prefix: true },
];

/** What "المزيد" opens. */
export const MOBILE_MORE_NAV: NavItem[] = [
  { href: '/revenues', label: 'الإيرادات', icon: TrendingUp, prefix: true },
  { href: '/reports', label: 'التقارير', icon: PieChart, prefix: true },
  { href: '/chatbot', label: 'المساعد الذكي', icon: Bot },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

export const MORE_NAV_ITEM: NavItem = {
  href: '#more',
  label: 'المزيد',
  icon: MoreHorizontal,
};

export function isActive(pathname: string, item: NavItem) {
  if (item.prefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}

/** True when the current route lives behind the "المزيد" sheet. */
export function isMoreActive(pathname: string) {
  return MOBILE_MORE_NAV.some((item) => isActive(pathname, item));
}
