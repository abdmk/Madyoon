import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  LayoutDashboard,
  Receipt,
  Share2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { ThemeToggle } from '@/components/theme-toggle';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const FEATURES = [
  {
    icon: Wallet,
    title: 'إدارة الديون',
    description: 'اعرف من عليك له، وكم المبلغ المتبقي، ومواعيد الدفع — كل ذلك في مكان واحد.',
  },
  {
    icon: CheckCircle2,
    title: 'متابعة الدفعات',
    description: 'سجّل كل دفعة بتاريخها وطريقتها، واعرف الرصيد المتبقي فور تسجيلها.',
  },
  {
    icon: Receipt,
    title: 'إدارة المصاريف',
    description: 'تابع مصاريفك اليومية وصنّفها لتعرف أين يذهب مالك كل شهر.',
  },
  {
    icon: LayoutDashboard,
    title: 'لوحة تحكم واضحة',
    description: 'شاهد وضعك المالي كاملاً — الديون والمصاريف والمسدد — بنظرة واحدة.',
  },
  {
    icon: Share2,
    title: 'مشاركة الحساب',
    description: 'شارك حسابك مع من تثق به، بصلاحية اطّلاع أو تعديل حسب الحاجة.',
  },
  {
    icon: Bot,
    title: 'مساعد ذكي',
    description: 'اسأل المساعد عن ديونك ومصاريفك، وسيساعدك على فهم وضعك المالي.',
  },
];

const STEPS = [
  { title: 'أنشئ حسابك', description: 'سجّل الدخول ببريدك الإلكتروني أو حساب Google خلال ثوانٍ.' },
  { title: 'أضف ديونك ومصاريفك', description: 'سجّل من عليك له ومصاريفك اليومية بخطوات بسيطة.' },
  { title: 'سجّل الدفعات', description: 'وثّق كل دفعة بتاريخها وطريقتها فور حدوثها.' },
  { title: 'تابع وضعك المالي', description: 'راقب التقدّم والمواعيد القريبة من لوحة تحكم واضحة.' },
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

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-xs">
            ₪
          </span>
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
    <section className="relative overflow-hidden px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50rem_32rem_at_50%_-10%,hsl(var(--primary)/0.10),transparent)]"
      />

      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="soft" className="animate-fade-up">
          إدارة ديون ومصاريف بسيطة وواضحة
        </Badge>

        <h1
          className="mt-5 animate-fade-up font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          style={{ animationDelay: '40ms' }}
        >
          رتّب ديونك، واعرف
          <br />
          أين يذهب مالك
        </h1>

        <p
          className="mx-auto mt-5 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: '80ms' }}
        >
          {APP_NAME} يساعدك على إدارة الديون ومتابعة الدفعات وتنظيم المصاريف، ومعرفة المبالغ
          المتبقية عليك — في مكان واحد وبنظرة واحدة.
        </p>

        <div
          className="mt-8 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: '120ms' }}
        >
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/login">
              ابدأ الآن
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="#features">تعرّف على {APP_NAME}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** A miniature, static mockup of the real dashboard — not a screenshot. */
function ProductPreview() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div
        className="mx-auto max-w-4xl animate-fade-up rounded-2xl border bg-card p-3 shadow-lg sm:p-6"
        style={{ animationDelay: '160ms' }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PreviewStat label="إجمالي الديون" value="٤٬٢٥٠٬٠٠٠" tone="primary" icon={Wallet} />
          <PreviewStat label="المتبقي" value="١٬٨٠٠٬٠٠٠" tone="warning" icon={Receipt} />
          <PreviewStat label="المسدد" value="٢٬٤٥٠٬٠٠٠" tone="success" icon={CheckCircle2} />
          <PreviewStat label="مصاريف الشهر" value="٦٥٠٬٠٠٠" tone="accent" icon={LayoutDashboard} />
        </div>

        <div className="mt-4 rounded-xl border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">نسبة السداد</span>
            <span className="font-display text-lg font-semibold text-primary">58%</span>
          </div>
          <Progress value={58} className="mt-2 h-2.5" />
        </div>

        <div className="mt-4 space-y-2">
          {[
            { name: 'بنك الرافدين', amount: '٩٠٠٬٠٠٠', status: 'قيد السداد' },
            { name: 'شركة الكهرباء', amount: '١٥٠٬٠٠٠', status: 'متأخر' },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <span className="font-medium">{row.name}</span>
              <div className="flex items-center gap-2">
                <span className="tabular text-muted-foreground">{row.amount} د.ع</span>
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
    <div className="rounded-xl border p-3">
      <span className={`mb-2 flex size-8 items-center justify-center rounded-lg ${TONE[tone]}`}>
        <Icon className="size-4" />
      </span>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-semibold tabular">{value}</p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight">كل ما تحتاجه لإدارة أموالك</h2>
          <p className="mt-3 text-muted-foreground">أدوات بسيطة ومباشرة، بدون تعقيد.</p>
        </div>

        <div className="mt-10 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
    <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight">كيف يعمل؟</h2>
          <p className="mt-3 text-muted-foreground">أربع خطوات بسيطة للبدء.</p>
        </div>

        <ol className="mt-10 grid gap-4 stagger sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular">
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
      <div className="mx-auto max-w-2xl text-center">
        <ShieldCheck className="mx-auto size-9 text-primary" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
          ابدأ باستخدام {APP_NAME}
        </h2>
        <p className="mt-3 text-muted-foreground">
          مجاني للبدء، وبياناتك محمية بصلاحيات على مستوى الصف — لا يراها أحد غيرك.
        </p>
        <Button size="lg" asChild className="mt-6">
          <Link href="/login">
            ابدأ باستخدام {APP_NAME}
            <ArrowLeft className="size-4" />
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
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              ₪
            </span>
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
