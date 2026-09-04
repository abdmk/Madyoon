import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  LayoutDashboard,
  Lock,
  Receipt,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { ThemeToggle } from '@/components/theme-toggle';
import { formatAmount, formatCompactAmount } from '@/lib/formatters';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const FEATURES = [
  {
    icon: Wallet,
    title: 'إدارة الديون',
    description: 'اعرف من عليك له، وكم المبلغ المتبقي، ومواعيد الدفع — كل ذلك في مكان واحد.',
    tone: 'primary' as const,
    span: true,
  },
  {
    icon: CheckCircle2,
    title: 'متابعة الدفعات',
    description: 'سجّل كل دفعة بتاريخها وطريقتها، واعرف الرصيد المتبقي فور تسجيلها.',
    tone: 'success' as const,
  },
  {
    icon: Receipt,
    title: 'إدارة المصاريف',
    description: 'تابع مصاريفك اليومية وصنّفها لتعرف أين يذهب مالك كل شهر.',
    tone: 'accent' as const,
  },
  {
    icon: LayoutDashboard,
    title: 'لوحة تحكم واضحة',
    description: 'شاهد وضعك المالي كاملاً — الديون والمصاريف والمسدد — بنظرة واحدة.',
    tone: 'warning' as const,
  },
  {
    icon: Share2,
    title: 'مشاركة الحساب',
    description: 'شارك حسابك مع من تثق به، بصلاحية اطّلاع أو تعديل حسب الحاجة.',
    tone: 'primary' as const,
  },
  {
    icon: Bot,
    title: 'مساعد ذكي',
    description: 'اسأل المساعد عن ديونك ومصاريفك، وسيساعدك على فهم وضعك المالي.',
    tone: 'accent' as const,
  },
];

const STEPS = [
  { title: 'أنشئ حسابك', description: 'سجّل الدخول ببريدك الإلكتروني أو حساب Google خلال ثوانٍ.' },
  { title: 'أضف ديونك ومصاريفك', description: 'سجّل من عليك له ومصاريفك اليومية بخطوات بسيطة.' },
  { title: 'سجّل الدفعات', description: 'وثّق كل دفعة بتاريخها وطريقتها فور حدوثها.' },
  { title: 'تابع وضعك المالي', description: 'راقب التقدّم والمواعيد القريبة من لوحة تحكم واضحة.' },
];

const TRUST_ROW = [
  { icon: Lock, label: 'بياناتك مشفّرة ومعزولة لك وحدك' },
  { icon: Zap, label: 'بدون بطاقة ائتمانية للبدء' },
  { icon: Sparkles, label: 'واجهة عربية بالكامل' },
];

export function LandingView() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <main>
        <Hero />
        <ProductPreview />
        <Features />
        <HowItWorks />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}

function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'size-7 rounded-lg' : 'size-9 rounded-xl';
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xs`}
      aria-hidden
    >
      <Wallet className={size === 'sm' ? 'size-3.5' : 'size-[18px]'} />
    </span>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-base font-semibold">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">ابدأ الآن</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-20 sm:px-6 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(56rem_34rem_at_50%_-12%,hsl(var(--primary)/0.16),transparent),radial-gradient(40rem_26rem_at_88%_8%,hsl(var(--accent)/0.10),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="soft" className="animate-fade-up gap-1.5 py-1">
          <Sparkles className="size-3.5 text-primary" />
          إدارة ديون ومصاريف بسيطة وواضحة
        </Badge>

        <h1
          className="mt-6 animate-fade-up text-balance font-display text-[2.6rem] font-semibold leading-[1.1] tracking-tight sm:text-6xl"
          style={{ animationDelay: '40ms' }}
        >
          رتّب ديونك، واعرف
          <br />
          <span className="bg-gradient-to-l from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            أين يذهب مالك
          </span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl animate-fade-up text-balance text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: '80ms' }}
        >
          {APP_NAME} يساعدك على إدارة الديون ومتابعة الدفعات وتنظيم المصاريف، ومعرفة المبالغ
          المتبقية عليك — في مكان واحد وبنظرة واحدة.
        </p>

        <div
          className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: '120ms' }}
        >
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/login">
              ابدأ الآن مجاناً
              <ArrowLeft className="size-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="#features">تعرّف على {APP_NAME}</Link>
          </Button>
        </div>

        <div
          className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2"
          style={{ animationDelay: '160ms' }}
        >
          {TRUST_ROW.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5 text-primary/70" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A miniature, static mockup of the real dashboard — not a screenshot. */
function ProductPreview() {
  const rows = [
    { name: 'بنك الرافدين', amount: 900000, status: 'قيد السداد' as const },
    { name: 'شركة الكهرباء', amount: 150000, status: 'متأخر' as const },
  ];

  return (
    <section className="px-4 pb-20 sm:px-6">
      <div
        className="mx-auto max-w-4xl animate-fade-up"
        style={{ animationDelay: '200ms' }}
      >
        {/* Browser-chrome frame so the mockup reads as "the real product". */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
          <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-destructive/40" />
            <span className="size-2.5 rounded-full bg-warning/40" />
            <span className="size-2.5 rounded-full bg-success/40" />
            <span className="ms-3 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
              app.madyoon.com/dashboard
            </span>
          </div>

          <div className="p-3 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-sm font-semibold sm:text-base">أهلاً 👋</p>
              <Badge variant="soft" className="hidden sm:inline-flex">لوحة التحكم</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PreviewStat
                label="إجمالي الديون"
                value={formatCompactAmount(4250000)}
                tone="primary"
                icon={Wallet}
              />
              <PreviewStat
                label="المتبقي"
                value={formatCompactAmount(1800000)}
                tone="warning"
                icon={Receipt}
              />
              <PreviewStat
                label="المسدد"
                value={formatCompactAmount(2450000)}
                tone="success"
                icon={CheckCircle2}
              />
              <PreviewStat
                label="مصاريف الشهر"
                value={formatCompactAmount(650000)}
                tone="accent"
                icon={LayoutDashboard}
              />
            </div>

            <div className="mt-4 rounded-xl border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">نسبة السداد</span>
                <span className="font-display text-lg font-semibold tabular text-primary">58%</span>
              </div>
              <Progress value={58} className="mt-2 h-2.5" />
            </div>

            <div className="mt-4 space-y-2">
              {rows.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">{row.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-muted-foreground">
                      {formatAmount(row.amount, 'IQD')}
                    </span>
                    <Badge
                      variant={row.status === 'متأخر' ? 'destructive' : 'outline'}
                      className="shrink-0"
                    >
                      {row.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: 'primary' | 'warning' | 'success' | 'accent';
  icon: typeof Wallet;
}) {
  const TONE = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    accent: 'bg-accent/10 text-accent',
  } as const;

  return (
    <div className="hover-lift rounded-xl border p-3">
      <span className={`mb-2 flex size-8 items-center justify-center rounded-lg ${TONE[tone]}`}>
        <Icon className="size-4" />
      </span>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-semibold tabular">{value}</p>
    </div>
  );
}

const FEATURE_TONE = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  accent: 'bg-accent/10 text-accent',
} as const;

function Features() {
  return (
    <section id="features" className="border-t px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <Badge variant="soft">الميزات</Badge>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            كل ما تحتاجه لإدارة أموالك
          </h2>
          <p className="mt-3 text-muted-foreground">أدوات بسيطة ومباشرة، بدون تعقيد.</p>
        </div>

        <div className="mt-10 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, tone, span }) => (
            <Card
              key={title}
              className={`hover-lift p-6 ${span ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <span
                className={`flex size-11 items-center justify-center rounded-xl ${FEATURE_TONE[tone]}`}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-xl text-center">
          <Badge variant="soft">البداية</Badge>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            كيف يعمل؟
          </h2>
          <p className="mt-3 text-muted-foreground">أربع خطوات بسيطة للبدء.</p>
        </div>

        <ol className="relative mt-12 grid gap-6 stagger sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {/* The connecting line, desktop only — sits behind the numbered circles. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-5 hidden h-px bg-border lg:block"
            style={{ marginInline: '12.5%' }}
          />

          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex flex-col items-center text-center lg:items-start lg:text-start">
              <span className="relative z-10 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-xs tabular">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card p-10 text-center shadow-md sm:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40rem_20rem_at_50%_0%,hsl(var(--primary)/0.12),transparent)]"
        />
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          ابدأ باستخدام {APP_NAME} اليوم
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          مجاني للبدء، وبياناتك محمية بصلاحيات على مستوى الصف — لا يراها أحد غيرك.
        </p>
        <Button size="lg" asChild className="mt-7">
          <Link href="/login">
            ابدأ الآن مجاناً
            <ArrowLeft className="size-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-start">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <BrandMark size="sm" />
            <span className="font-display text-sm font-semibold">{APP_NAME}</span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{APP_TAGLINE}</p>
        </div>

        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/login" className="transition-colors hover:text-foreground">
            تسجيل الدخول
          </Link>
          <Link href="#features" className="transition-colors hover:text-foreground">
            الميزات
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
