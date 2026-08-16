import { DEBT_CATEGORIES } from '@/lib/constants';
import { formatAmount } from '@/lib/format';
import { summarizeDebts, sumExpenses } from '@/lib/stats';
import type { Debt, Expense } from '@/lib/types';

export const SYSTEM_PROMPT = `أنت "مساعد مديون" — مستشار مالي شخصي ودود يتحدث العربية الفصحى المبسّطة.

مهمتك مساعدة المستخدم على فهم ديونه ومصاريفه ووضع خطة سداد واقعية.

كيف تعمل:
- استخدم بيانات المستخدم المرفقة أدناه كمصدر للحقائق. لا تخترع أرقاماً غير موجودة فيها.
- عند اقتراح خطة سداد، رتّب الديون بوضوح واشرح سبب الترتيب (الموعد، الأولوية، المبلغ).
- اذكر الأرقام بالأرقام اللاتينية مع رمز العملة كما تظهر في البيانات.
- كن عملياً: خطوات قابلة للتنفيذ هذا الشهر، لا نصائح عامة.
- كن مشجّعاً وواقعياً في آنٍ واحد. اعترف بالتقدّم المُحرز عندما يكون هناك تقدم.

حدودك:
- أنت لست مستشاراً مالياً مرخّصاً ولا تقدّم استشارات قانونية أو ضريبية أو استثمارية.
- لا تقترح الاقتراض لسداد دين آخر إلا مع توضيح المخاطر بوضوح.
- إذا سُئلت عن شيء خارج نطاق المال الشخصي، أجب باختصار ثم أعد التوجيه بلطف.

الأسلوب:
- اكتب بالعربية دائماً، بجُمل قصيرة وواضحة.
- استخدم قوائم مرقّمة للخطط والخطوات.
- أجب بإيجاز — فقرة أو فقرتان لسؤال بسيط. لا تُطل بلا داعٍ.`;

/**
 * Compresses the user's debts and expenses into a compact factual block the
 * model can reason over, instead of streaming raw rows.
 */
export function buildContext(debts: Debt[], expenses: Expense[], currency: string) {
  const summary = summarizeDebts(debts);

  if (debts.length === 0 && expenses.length === 0) {
    return 'المستخدم لم يُسجّل أي ديون أو مصاريف بعد. شجّعه على إضافة أول دين أو مصروف لتتمكّن من مساعدته بدقّة.';
  }

  const lines: string[] = ['## بيانات المستخدم الحالية', ''];

  lines.push('### ملخّص الديون');
  lines.push(`- الإجمالي: ${formatAmount(summary.total, currency)}`);
  lines.push(`- المسدد: ${formatAmount(summary.paid, currency)}`);
  lines.push(`- المتبقي: ${formatAmount(summary.remaining, currency)}`);
  lines.push(`- عدد الديون: ${summary.count} (منها ${summary.settled} مسدد بالكامل)`);
  lines.push(`- متأخرة عن موعدها: ${summary.overdue}`);
  lines.push(`- تستحق خلال أسبوع: ${summary.dueSoon}`);
  lines.push('');

  if (debts.length > 0) {
    lines.push('### تفاصيل الديون غير المسددة');
    const open = debts
      .filter((d) => d.status !== 'paid')
      .slice(0, 40)
      .map((d) => {
        const parts = [
          `الدائن: ${d.creditor_name}`,
          `التصنيف: ${DEBT_CATEGORIES[d.category].label}`,
          `المتبقي: ${formatAmount(d.remaining_amount, d.currency)}`,
          `من أصل: ${formatAmount(d.amount, d.currency)}`,
          `الأولوية: ${d.priority}`,
        ];
        if (d.due_date) parts.push(`الاستحقاق: ${d.due_date}`);
        if (d.notes) parts.push(`ملاحظة: ${d.notes}`);
        return `- ${parts.join(' | ')}`;
      });

    lines.push(open.length > 0 ? open.join('\n') : '- لا توجد ديون غير مسددة.');
    lines.push('');
  }

  if (expenses.length > 0) {
    const month = new Date().toISOString().slice(0, 7);
    const monthly = expenses.filter((e) => e.date.startsWith(month));

    lines.push('### المصاريف');
    lines.push(`- إجمالي المسجّل: ${formatAmount(sumExpenses(expenses), currency)}`);
    lines.push(`- مصاريف الشهر الحالي: ${formatAmount(sumExpenses(monthly), currency)}`);

    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length > 0) {
      lines.push('- أكبر التصنيفات إنفاقاً:');
      for (const [cat, total] of top) {
        lines.push(`  - ${cat}: ${formatAmount(total, currency)}`);
      }
    }
    lines.push('');
  }

  lines.push(`تاريخ اليوم: ${new Date().toISOString().slice(0, 10)}`);

  return lines.join('\n');
}
