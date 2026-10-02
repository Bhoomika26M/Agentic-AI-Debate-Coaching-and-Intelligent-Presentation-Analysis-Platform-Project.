create table public.debate_analyses (
  session_id uuid primary key references public.debate_sessions(id) on delete cascade,
  report jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.debate_analyses enable row level security;
revoke all on public.debate_analyses from anon, authenticated;
grant select, insert, update, delete on public.debate_analyses to authenticated;

create policy "Learners manage analysis for their own sessions"
  on public.debate_analyses
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.debate_sessions
      where debate_sessions.id = debate_analyses.session_id
        and debate_sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.debate_sessions
      where debate_sessions.id = debate_analyses.session_id
        and debate_sessions.user_id = (select auth.uid())
    )
  );
