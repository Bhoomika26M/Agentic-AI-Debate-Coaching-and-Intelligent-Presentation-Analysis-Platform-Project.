create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  experience text check (experience is null or experience in ('new', 'developing', 'confident')),
  goals text check (goals is null or char_length(goals) between 1 and 500),
  retain_audio boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Learners manage their own profile"
  on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.custom_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 240),
  domain text check (domain is null or char_length(domain) between 1 and 60),
  created_at timestamptz not null default now()
);

create index custom_topics_owner_created_idx
  on public.custom_topics (user_id, created_at desc);

alter table public.custom_topics enable row level security;
revoke all on public.custom_topics from anon, authenticated;
grant select, insert, update, delete on public.custom_topics to authenticated;

create policy "Learners read curated and own topics"
  on public.custom_topics
  for select
  to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "Learners manage their own topics"
  on public.custom_topics
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Learners update their own topics"
  on public.custom_topics
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Learners delete their own topics"
  on public.custom_topics
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

insert into public.custom_topics (user_id, title, domain) values
  (null, 'Should social platforms verify every user?', 'technology'),
  (null, 'Do grades measure what matters?', 'education'),
  (null, 'Should cities ban cars from their centres?', 'cities'),
  (null, 'Is a four-day work week better for everyone?', 'work');

alter table public.presentation_feedbacks add column audio_path text;

insert into storage.buckets (id, name, public)
  values ('presentation-audio', 'presentation-audio', false)
  on conflict (id) do nothing;

create policy "Learners manage their own audio"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'presentation-audio' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'presentation-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
