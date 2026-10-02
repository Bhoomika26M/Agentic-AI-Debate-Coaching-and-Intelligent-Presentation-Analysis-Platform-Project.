create table public.debate_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 3 and 240),
  learner_position text not null check (learner_position in ('for', 'against')),
  persona text not null check (persona in ('strategist', 'skeptic', 'diplomat')),
  difficulty text not null check (difficulty in ('warm-up', 'challenge', 'cross-examination')),
  duration_minutes smallint not null check (duration_minutes between 2 and 10),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index debate_sessions_owner_created_idx
  on public.debate_sessions (user_id, created_at desc);

create table public.debate_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.debate_sessions(id) on delete cascade,
  turn_index smallint not null check (turn_index >= 0),
  speaker text not null check (speaker in ('learner', 'opponent')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  unique (session_id, turn_index)
);

create index debate_turns_session_order_idx
  on public.debate_turns (session_id, turn_index);

alter table public.debate_sessions enable row level security;
alter table public.debate_turns enable row level security;

revoke all on public.debate_sessions from anon, authenticated;
revoke all on public.debate_turns from anon, authenticated;
grant select, insert, update, delete on public.debate_sessions to authenticated;
grant select, insert, update, delete on public.debate_turns to authenticated;

create policy "Learners manage their own debate sessions"
  on public.debate_sessions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Learners manage turns in their own sessions"
  on public.debate_turns
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.debate_sessions
      where debate_sessions.id = debate_turns.session_id
        and debate_sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.debate_sessions
      where debate_sessions.id = debate_turns.session_id
        and debate_sessions.user_id = (select auth.uid())
    )
  );
