create table public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan jsonb not null,
  sessions_considered int not null default 0 check (sessions_considered between 0 and 500),
  created_at timestamptz not null default now()
);

create index learning_plans_owner_created_idx
  on public.learning_plans (user_id, created_at desc);

alter table public.learning_plans enable row level security;
revoke all on public.learning_plans from anon, authenticated;
grant select, insert, update, delete on public.learning_plans to authenticated;

create policy "Learners manage their own learning plans"
  on public.learning_plans
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
