# نشر التطبيق على Vercel

## المتطلبات الأساسية

تطبيق Madyoon يحتاج إلى المتغيرات البيئية التالية في **Production** scope على Vercel:

### 1. متغيرات Supabase (مطلوبة)
```
NEXT_PUBLIC_SUPABASE_URL=https://zhkaddbfnwpjdzlfchwd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

احصل على هذه المفاتيح من:
- Supabase Dashboard → Settings → API → Project URL و anon public key

### 2. رابط الموقع (مطلوب للإنتاج)
```
NEXT_PUBLIC_SITE_URL=https://madyoon.vercel.app
```

**ملاحظة مهمة:** هذا المتغير **مطلوب** في بيئة الإنتاج. بدونه، سيفشل التطبيق عند محاولة إعادة توجيه OAuth أو تأكيد البريد الإلكتروني.

### 3. مفتاح Anthropic (اختياري - للمساعد الذكي)
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

احصل عليه من: https://console.anthropic.com/

## خطوات التثبيت

### في Vercel Dashboard:

1. اذهب إلى Project Settings
2. انتقل إلى **Environment Variables**
3. اختر **Production** scope
4. أضف كل متغير من المتغيرات أعلاه
5. اضغط **Save and Deploy**
6. انتظر إعادة النشر التلقائية

### التحقق من النشر

بعد إعادة النشر:
```bash
# تحقق من أن التطبيق يحمّل بدون أخطاء
curl -I https://madyoon.vercel.app/dashboard

# يجب أن ترى: 200 OK
```

## استكشاف الأخطاء

إذا كنت ترى الخطأ #2968107586 أو "حدث خطأ غير متوقع":

1. **تحقق من بيئة الإنتاج**: هل تم تعيين جميع المتغيرات في Production scope؟
2. **أعد النشر**: اذهب إلى Deployments → اختر آخر نشر → اضغط "Redeploy"
3. **تحقق من السجلات**: انقر على النشر واختر "View Logs" لرؤية الأخطاء التفصيلية

## التطوير المحلي

للتطوير المحلي، ما عليك سوى:
```bash
cp .env.example .env.local
# ثم عدّل القيم الفعلية في .env.local
npm run dev
```

المتغيرات المحلية **لا تحتاج** `NEXT_PUBLIC_SITE_URL` — يتم استخدام localhost تلقائياً.
