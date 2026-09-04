import type { Metadata } from 'next';
import { createClient, getProfile } from '@/lib/supabase/server';
import { ChatView } from '@/features/chatbot/components/chat-view';
import type { Conversation } from '@/lib/types';

export const metadata: Metadata = { title: 'المساعد الذكي' };

export default async function ChatbotPage() {
  const profile = await getProfile();
  const supabase = createClient();

  // Resume the most recent conversation so the assistant feels continuous.
  const { data } = profile
    ? await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return <ChatView initialConversation={(data as Conversation) ?? null} />;
}
