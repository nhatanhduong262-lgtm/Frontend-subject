-- Run this in your Supabase SQL Editor
-- Creates the messages table for the real-time chat system

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id bigint not null references public.users(id) on delete cascade,
  receiver_id bigint not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Enable Row Level Security (RLS)
alter table public.messages enable row level security;

-- Create indexes for faster queries when loading chat histories
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_receiver_id_idx on public.messages (receiver_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- RLS Policies (Optional but recommended if users query Supabase directly from frontend)
-- Right now our API handles queries, so these are just standard protections.
create policy "Users can read their own messages"
  on public.messages for select
  using ( auth.uid()::text = sender_id::text or auth.uid()::text = receiver_id::text );

create policy "Users can insert their own messages"
  on public.messages for insert
  with check ( auth.uid()::text = sender_id::text );

-- Turn on Realtime for the messages table
-- Note: You might also need to enable Realtime for this table in the Supabase Dashboard (Database -> Replication -> Source -> supabase_realtime).
alter publication supabase_realtime add table public.messages;
