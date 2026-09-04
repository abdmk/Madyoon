import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SYSTEM_PROMPT, buildContext } from '@/features/chatbot/prompt';
import type { ChatMessage, Debt, Expense, Profile } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'claude-opus-5';
/** Keep the request bounded — older turns rarely change the advice. */
const MAX_HISTORY = 20;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'لم يتم ضبط مفتاح Anthropic API على الخادم.' },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  let body: { messages?: ChatMessage[]; conversationId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim())
    .slice(-MAX_HISTORY);

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'لا توجد رسالة للرد عليها' }, { status: 400 });
  }

  // Pull the user's own data server-side — never trust figures from the client.
  const [{ data: profile }, { data: debts }, { data: expenses }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      // Unpaid debts are what the assistant reasons about — they must survive
      // the cap even on an account with hundreds of old, settled debts.
      // ('pending' > 'partial' > 'paid' alphabetically, so descending puts
      // unpaid statuses first.)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(300),
  ]);

  const currency = (profile as Profile | null)?.currency ?? 'IQD';
  const context = buildContext((debts as Debt[]) ?? [], (expenses as Expense[]) ?? [], currency);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const messageStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          // Low effort keeps the assistant snappy; the task is advice, not research.
          output_config: { effort: 'low' },
          system: [
            { type: 'text', text: SYSTEM_PROMPT },
            { type: 'text', text: context },
          ],
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        });

        messageStream.on('text', (delta) => send('delta', { text: delta }));

        const final = await messageStream.finalMessage();

        if (final.stop_reason === 'refusal') {
          send('error', {
            message: 'تعذّر الرد على هذا الطلب. جرّب صياغة سؤالك بشكل مختلف.',
          });
        } else {
          send('done', { stop_reason: final.stop_reason });
        }
      } catch (error) {
        const message =
          error instanceof Anthropic.APIError
            ? `تعذّر الاتصال بالمساعد (${error.status ?? 'خطأ'})`
            : 'حدث خطأ غير متوقع أثناء توليد الرد.';
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
