'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { AlertCircle, ArrowUp, Bot, Plus, Sparkles, Square, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/misc';
import { useSession } from '@/components/session-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChatMessage, Conversation, Profile } from '@/lib/types';

const SUGGESTIONS = [
  'ما هي أفضل خطة لسداد ديوني؟',
  'أي دين يجب أن أبدأ به أولاً؟',
  'كيف أقلّل مصاريفي الشهرية؟',
  'حلّل وضعي المالي الحالي',
];

export function ChatView({ initialConversation }: { initialConversation: Conversation | null }) {
  const { profile } = useSession();

  const [conversationId, setConversationId] = React.useState<string | null>(
    initialConversation?.id ?? null,
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>(
    initialConversation?.messages ?? [],
  );
  const [input, setInput] = React.useState('');
  const [streaming, setStreaming] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view as tokens arrive.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  /** Persists the full transcript, creating the row on the first exchange. */
  const persist = React.useCallback(
    async (next: ChatMessage[]) => {
      const supabase = getSupabaseBrowserClient();

      if (conversationId) {
        await supabase
          .from('chatbot_conversations')
          .update({ messages: next })
          .eq('id', conversationId);
        return;
      }

      const title = next[0]?.content.slice(0, 60) || 'محادثة جديدة';
      const { data } = await supabase
        .from('chatbot_conversations')
        .insert({ user_id: profile.id, title, messages: next })
        .select()
        .single();

      if (data) setConversationId((data as Conversation).id);
    },
    [conversationId, profile],
  );

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;

    const next = [...messages, { role: 'user' as const, content, at: new Date().toISOString() }];
    setMessages(next);
    setInput('');
    setStreaming('');
    setError(null);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assembled = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, conversationId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'تعذّر الاتصال بالمساعد.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Minimal SSE parser: frames are separated by a blank line.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const eventLine = frame.split('\n').find((l) => l.startsWith('event: '));
          const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(7).trim();
          const payload = JSON.parse(dataLine.slice(6));

          if (event === 'delta') {
            assembled += payload.text;
            setStreaming(assembled);
          } else if (event === 'error') {
            throw new Error(payload.message);
          }
        }
      }

      if (assembled.trim()) {
        const withReply = [
          ...next,
          { role: 'assistant' as const, content: assembled, at: new Date().toISOString() },
        ];
        setMessages(withReply);
        void persist(withReply);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // Keep whatever streamed in before the user stopped it.
        if (assembled.trim()) {
          const partial = [
            ...next,
            { role: 'assistant' as const, content: assembled, at: new Date().toISOString() },
          ];
          setMessages(partial);
          void persist(partial);
        }
      } else {
        const message = (e as Error).message || 'حدث خطأ غير متوقع.';
        setError(message);
        toast.error(message);
      }
    } finally {
      setStreaming('');
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    stop();
    setMessages([]);
    setStreaming('');
    setError(null);
    setConversationId(null);
  }

  const empty = messages.length === 0 && !streaming;

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col sm:h-[calc(100dvh-9rem)]">
      {/* Header ----------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold">المساعد الذكي</h1>
            <p className="text-xs text-muted-foreground">يحلّل بياناتك ويقترح خطة سداد</p>
          </div>
        </div>

        {messages.length > 0 ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <Plus className="size-4" />
            محادثة جديدة
          </Button>
        ) : null}
      </div>

      {/* Transcript ------------------------------------------------------- */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Bot className="size-8" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">كيف أقدر أساعدك اليوم؟</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                اسألني عن ديونك أو مصاريفك، وسأحلّل بياناتك وأقترح خطوات عملية.
              </p>
            </div>

            <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border bg-card p-3 text-start text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <Bubble key={i} message={m} profile={profile} />
            ))}
            {streaming ? (
              <Bubble
                message={{ role: 'assistant', content: streaming }}
                profile={profile}
                pending
              />
            ) : null}
            {busy && !streaming ? <TypingIndicator /> : null}
          </>
        )}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* Composer --------------------------------------------------------- */}
      <Card className="p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter adds a newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="اكتب سؤالك…"
            rows={1}
            disabled={busy}
            className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />

          {busy ? (
            <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="إيقاف">
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="إرسال">
              <ArrowUp className="size-4" />
            </Button>
          )}
        </form>
      </Card>

      <p className="pt-2 text-center text-[11px] text-muted-foreground">
        المساعد يقدّم إرشادات عامة وليس بديلاً عن استشارة مالية مختصة.
      </p>
    </div>
  );
}

function Bubble({
  message,
  profile,
  pending,
}: {
  message: ChatMessage;
  profile: Profile;
  pending?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="mt-0.5 size-8 shrink-0">
        {isUser && profile.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
        ) : null}
        <AvatarFallback className={cn(!isUser && 'bg-accent/10 text-accent')}>
          {isUser ? initials(profile.name, profile.email) : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]',
          isUser ? 'bg-primary text-primary-foreground' : 'border bg-card',
        )}
      >
        <FormattedText text={message.content} />
        {pending ? (
          <span className="ms-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-middle" />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The model replies in light markdown. Rendering a full markdown pipeline is
 * overkill here — headings, bullets, and bold are all that show up.
 */
function FormattedText({ text }: { text: string }) {
  const blocks = text.split('\n');

  return (
    <div className="space-y-1.5">
      {blocks.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          return (
            <p key={i} className="pt-1 font-display font-semibold">
              {inline(trimmed.replace(/^#{2,3}\s+/, ''))}
            </p>
          );
        }

        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2 ps-1">
              <span aria-hidden>•</span>
              <span>{inline(trimmed.replace(/^[-*]\s+/, ''))}</span>
            </p>
          );
        }

        const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          return (
            <p key={i} className="flex gap-2 ps-1">
              <span className="tabular font-medium">{numbered[1]}.</span>
              <span>{inline(numbered[2])}</span>
            </p>
          );
        }

        return <p key={i}>{inline(trimmed)}</p>;
      })}
    </div>
  );
}

function inline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5 size-8 shrink-0">
        <AvatarFallback className="bg-accent/10 text-accent">
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-xl border bg-card px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
