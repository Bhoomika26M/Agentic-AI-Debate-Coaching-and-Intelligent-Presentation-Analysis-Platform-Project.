-- Onboarding answers that personalise practice, stored beside the rest of the learner profile.

alter table public.profiles
  add column purpose text
    check (purpose is null or purpose in ('school', 'university', 'interview', 'confidence', 'competition')),
  add column practice_goal text
    check (practice_goal is null or practice_goal in ('structure', 'evidence', 'nerves', 'hostile', 'win')),
  add column focus_areas text[] not null default '{}'
    check (focus_areas <@ array['argument', 'delivery', 'confidence']::text[]),
  add column preferences_updated_at timestamptz;
