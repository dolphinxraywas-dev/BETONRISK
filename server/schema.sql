-- TOP DICE chat foundation. Run in the Supabase SQL editor.
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_user_id bigint not null,
  sender_telegram_id bigint not null,
  sender_role text not null check (sender_role in ('user','host')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_user_id, created_at desc);

-- The API uses the Supabase service-role key only on the server and checks
-- Telegram identity + conversation access before each query. Do not expose that
-- key to the browser. For defense in depth, enable RLS and keep client access closed.
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
