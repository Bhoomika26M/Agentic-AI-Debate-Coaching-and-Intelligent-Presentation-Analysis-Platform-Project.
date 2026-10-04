create table public.presentation_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid references public.debate_sessions(id) on delete cascade,
  topic text check (topic is null or char_length(topic) between 3 and 240),
  transcript text not null check (char_length(transcript) between 1 and 8000),
  signals jsonb not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

create index presentation_feedbacks_owner_created_idx
  on public.presentation_feedbacks (user_id, created_at desc);

alter table public.presentation_feedbacks enable row level security;
revoke all on public.presentation_feedbacks from anon, authenticated;
grant select, insert, update, delete on public.presentation_feedbacks to authenticated;

create policy "Learners manage their own presentation feedback"
  on public.presentation_feedbacks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
