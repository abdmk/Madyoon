export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

  return Response.json({
    env: {
      supabaseUrl: supabaseUrl ? '✓ Set' : '✗ Missing',
      supabaseKey: supabaseKey ? '✓ Set' : '✗ Missing',
      siteUrl: siteUrl ? `✓ ${siteUrl}` : '✗ Missing',
      vercelEnv: vercelEnv || 'Not set',
    },
    status: supabaseUrl && supabaseKey && siteUrl ? 'OK' : 'MISSING_ENV_VARS',
  });
}
