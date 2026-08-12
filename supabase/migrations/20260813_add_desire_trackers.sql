-- Applied to the dedicated Health Tracker Supabase project on 2026-08-13.
-- This preserves the existing table and rows while admitting the two new
-- record categories. The policies remain private to the signed-in row owner.

alter table public.health_entries enable row level security;

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
        'exerciseDesire'::text
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
        'exerciseDesire'::text
      ]
    );

drop policy if exists "Health entries: owner can read" on public.health_entries;
drop policy if exists "Health entries: owner can insert" on public.health_entries;
drop policy if exists "Health entries: owner can update" on public.health_entries;
drop policy if exists "Health entries: owner can delete" on public.health_entries;

create policy "Health entries: owner can read"
on public.health_entries
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "Health entries: owner can insert"
on public.health_entries
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "Health entries: owner can update"
on public.health_entries
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
)
with check (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "Health entries: owner can delete"
on public.health_entries
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);
