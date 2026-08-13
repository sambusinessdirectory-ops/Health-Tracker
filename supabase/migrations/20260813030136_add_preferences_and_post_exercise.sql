-- Adds the four personal preference/goal lists and the post-exercise rating.
-- This migration preserves the existing table, rows and owner-only RLS policies.

begin;

alter table public.health_entries
  drop constraint if exists health_entries_category_check;

alter table public.health_entries
  add constraint health_entries_category_check
  check (
    category = any (
      array[
        'weight'::text,
        'water'::text,
        'cardio'::text,
        'strength'::text,
        'food'::text,
        'groceries'::text,
        'mealPrep'::text,
        'calories'::text,
        'foodDesire'::text,
        'exerciseDesire'::text,
        'postExerciseFeeling'::text,
        'foodPreference'::text,
        'foodCutGoal'::text,
        'sportPreference'::text,
        'sportFocusGoal'::text
      ]
    )
  );

drop index if exists public.health_entries_one_daily_record_idx;

create unique index health_entries_one_daily_record_idx
  on public.health_entries (user_id, category, entry_date)
  where deleted_at is null
    and category = any (
      array[
        'weight'::text,
        'water'::text,
        'calories'::text,
        'exerciseDesire'::text,
        'postExerciseFeeling'::text
      ]
    );

commit;
