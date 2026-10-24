-- Run against a local Supabase stack: `supabase start`, then `supabase test db`.
-- The test creates two auth users, seeds one row per owner, and switches the
-- request JWT claims between them to exercise the RLS policies.

begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'learner-a@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'learner-b@example.com', 'authenticated', 'authenticated');

insert into public.debate_sessions
  (id, user_id, topic, learner_position, persona, difficulty, duration_minutes)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   'Should schools ban phones?', 'for', 'skeptic', 'challenge', 5),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222',
   'Should cities ban cars?', 'against', 'strategist', 'warm-up', 5);

insert into public.debate_turns (id, session_id, turn_index, speaker, content) values
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   0, 'learner', 'Attention improves without phones.'),
  ('b1111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   0, 'learner', 'Traffic hurts residents.');

insert into public.debate_analyses (session_id, report) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"ratings": {}}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{"ratings": {}}');

insert into public.profiles (user_id, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'Learner A'),
  ('22222222-2222-4222-8222-222222222222', 'Learner B');

insert into public.learning_plans (user_id, plan, sessions_considered) values
  ('11111111-1111-4111-8111-111111111111', '{"headline": "A plan"}', 1),
  ('22222222-2222-4222-8222-222222222222', '{"headline": "B plan"}', 1);

-- Learner A
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}';

select is((select count(*) from public.debate_sessions), 1::bigint,
  'A sees only their own debate sessions');
select is((select count(*) from public.debate_turns), 1::bigint,
  'A sees only turns in their own sessions');
select is((select count(*) from public.debate_analyses), 1::bigint,
  'A sees only analyses for their own sessions');
select is((select count(*) from public.profiles), 1::bigint,
  'A sees only their own profile');
select is((select count(*) from public.learning_plans), 1::bigint,
  'A sees only their own learning plans');

select lives_ok(
  $$insert into public.debate_turns (session_id, turn_index, speaker, content)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 'opponent', 'Which evidence?')$$,
  'A can write a turn in their own session'
);
select throws_ok(
  $$insert into public.debate_turns (session_id, turn_index, speaker, content)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'opponent', 'Which evidence?')$$,
  '42501', null,
  'A cannot write a turn into B''s session'
);
select throws_ok(
  $$insert into public.profiles (user_id, display_name)
    values ('22222222-2222-4222-8222-222222222222', 'Impostor')$$,
  '42501', null,
  'A cannot write B''s profile'
);

-- Learner B
set local request.jwt.claims = '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}';

select is((select count(*) from public.debate_sessions), 1::bigint,
  'B sees only their own debate sessions');
select is((select count(*) from public.debate_turns), 1::bigint,
  'B does not see the turn A just added');
select is((select count(*) from public.profiles), 1::bigint,
  'B sees only their own profile');
select is(
  (select topic from public.debate_sessions),
  'Should cities ban cars?',
  'B reads the topic of their own session, not A''s'
);

-- Signed-out visitors have no table grants at all.
set local role anon;

select throws_ok(
  $$select count(*) from public.debate_sessions$$,
  '42501', null,
  'anon cannot read debate sessions'
);
select throws_ok(
  $$select count(*) from public.presentation_feedbacks$$,
  '42501', null,
  'anon cannot read presentation feedback'
);

reset role;
select * from finish();
rollback;
