# 🚀 دليل نشر Madyoon على Vercel

## المشكلة الحالية

الموقع يظهر خطأ **403 Forbidden** أو **Error #2968107586** عند فتح https://madyoon.vercel.app

## السبب

متغيرات البيئة **ناقصة أو لم تُحفظ بشكل صحيح** على Vercel.

---

## ✅ الحل الكامل

### الخطوة 1️⃣: الذهاب إلى Vercel Dashboard

1. فتح https://vercel.com/dashboard
2. اختر Project **Madyoon**
3. اذهب إلى **Settings** (الترس ⚙️)

### الخطوة 2️⃣: إضافة متغيرات البيئة

اذهب إلى: **Settings → Environment Variables**

**تأكد من:**
- الـ scope يقول **"Production"** (مهم جداً!)
- لا تختار Development أو Preview

### الخطوة 3️⃣: أضف هذه المتغيرات (واحد واحد)

#### المتغير الأول:
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://zhkaddbfnwpjdzlfchwd.supabase.co
```
اضغط **Add** أو **Save**

#### المتغير الثاني:
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [انسخ من Supabase Dashboard → Settings → API → اللي كاتب "anon public"]
```
اضغط **Add** أو **Save**

#### المتغير الثالث (مهم جداً):
```
Key: NEXT_PUBLIC_SITE_URL
Value: https://madyoon.vercel.app
```
اضغط **Add** أو **Save**

#### المتغير الرابع (اختياري - للمساعد الذكي):
```
Key: ANTHROPIC_API_KEY
Value: sk-ant-[المفتاح من Anthropic Console]
```

### الخطوة 4️⃣: إعادة النشر

1. اذهب إلى **Deployments** (في الأعلى)
2. اختر آخر نشر (الأحمر مع كلمة "Failed")
3. اضغط الزر **Redeploy** (أزرق)
4. انتظر "Deployment ready" ✓

**لا تعيد المحاولة قبل 5 دقائق على الأقل!**

### الخطوة 5️⃣: تحقق من النتيجة

فتح https://madyoon.vercel.app في متصفح جديد

- إذا ظهر صفحة login → **نجح!** ✅
- إذا لا زال خطأ → جرب الخطوات أدناه

---

## 🔍 استكشاف الأخطاء

### إذا لا زال في مشكلة:

#### 1. تحقق من الـ Logs:
- Deployments → آخر نشر
- اضغط عليه
- اختر **View Logs**
- شنو الخطأ اللي تشوفه؟

#### 2. تأكد من المتغيرات:
- Settings → Environment Variables
- تأكد كل الثلاثة موجودة
- تأكد في Production scope

#### 3. حذف وأعادة:
- احذف المتغيرات
- أضفهم من جديد بدقة
- Save كل واحد
- Redeploy

#### 4. فحص Supabase:
- روح https://app.supabase.com
- اختر Madyoon project
- Settings → API
- شنو اللي تشوفه؟

---

## 📋 Checklist النشر

قبل الـ Redeploy تأكد من:

- [ ] NEXT_PUBLIC_SUPABASE_URL موجود و صحيح
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY موجود من Supabase
- [ ] NEXT_PUBLIC_SITE_URL = https://madyoon.vercel.app
- [ ] كل المتغيرات في **Production** scope
- [ ] اضغطت **Save** لكل واحد
- [ ] اضغطت **Redeploy**
- [ ] انتظرت 5 دقائق على الأقل
- [ ] فتحت الرابط في متصفح جديد (Incognito)

---

## 🎯 الأخطاء الشائعة

| الخطأ | السبب | الحل |
|------|------|------|
| 403 Forbidden | متغيرات ناقصة | أضف كل المتغيرات في Production |
| Error #2968107586 | NEXT_PUBLIC_SITE_URL ناقص | أضف NEXT_PUBLIC_SITE_URL |
| Build Failed | vercel.json خاطئ | الملف موجود وصحيح الآن |
| لسه يظهر الخطأ بعد حل | Vercel cache | اضغط Redeploy مرة ثانية |

---

## 📞 معلومات التواصل

إذا لا زالت المشكلة:

1. شنو الخطأ في الـ Logs بالضبط؟
2. كل المتغيرات موجودة وصحيحة؟
3. في Production scope؟
4. اضغطت Redeploy؟

---

**النتيجة المتوقعة:**

✅ صفحة تسجيل الدخول تحمّل
✅ تستطيع تسجيل الدخول
✅ تشوف Dashboard
✅ التطبيق كامل يشتغل

**يلا! حظ موفق! 🚀**
