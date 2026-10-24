create table public.learning_plan_drills (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.learning_plans(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drill_index smallint not null check (drill_index between 0 and 23),
  completed_at timestamptz not null default now(),
  unique (plan_id, drill_index)
);

create index learning_plan_drills_owner_idx
  on public.learning_plan_drills (user_id, plan_id);

alter table public.learning_plan_drills enable row level security;
revoke all on public.learning_plan_drills from anon, authenticated;
grant select, insert, update, delete on public.learning_plan_drills to authenticated;

create policy "Learners manage completion for their own plans"
  on public.learning_plan_drills
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.learning_plans
      where learning_plans.id = learning_plan_drills.plan_id
        and learning_plans.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.learning_plans
      where learning_plans.id = learning_plan_drills.plan_id
        and learning_plans.user_id = (select auth.uid())
    )
  );
