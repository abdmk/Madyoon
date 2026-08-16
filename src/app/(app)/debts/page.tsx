import type { Metadata } from 'next';
import { DebtsView } from '@/components/debts/debts-view';

export const metadata: Metadata = { title: 'الديون' };

export default function DebtsPage() {
  return <DebtsView />;
}
