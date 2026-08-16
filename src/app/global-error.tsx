'use client';

/**
 * Replaces the root layout when it throws, so it must render its own
 * <html>/<body>. Keep the styling inline — globals.css may not have loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, Segoe UI, Tahoma, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>تعذّر تشغيل التطبيق</h1>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 20, lineHeight: 1.7 }}>
            حدث خطأ جذري أثناء التحميل. أعد المحاولة أو حدّث الصفحة.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
