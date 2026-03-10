create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  role text not null default 'parent'
);

alter table users
alter column role set default 'caregiver';

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    'caregiver'
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

insert into users (id, display_name, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', split_part(coalesce(email, ''), '@', 1)),
  'caregiver'
from auth.users
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  preferred_language text not null default 'et',
  notes text
);

alter table child_profiles
alter column user_id drop not null;

create table if not exists pictogram_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  sort_order int not null default 0
);

create table if not exists pictograms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category_id uuid references pictogram_categories(id) on delete set null,
  created_by_user_id uuid references users(id) on delete set null,
  label_et text not null,
  label_en text,
  label_ru text,
  image_url text,
  is_custom boolean not null default false,
  sort_order int not null default 0,
  is_enabled boolean not null default true
);

alter table pictograms
add column if not exists created_by_user_id uuid references users(id) on delete set null;

alter table pictograms
add column if not exists is_custom boolean not null default false;

insert into storage.buckets (id, name, public)
values ('pictograms', 'pictograms', true)
on conflict (id) do update
set public = excluded.public;

create unique index if not exists pictogram_categories_name_key
on pictogram_categories (name);

drop index if exists pictograms_label_et_key;

create unique index if not exists pictograms_default_label_et_key
on pictograms (label_et)
where is_custom = false;

create unique index if not exists pictograms_custom_owner_label_et_key
on pictograms (created_by_user_id, label_et)
where is_custom = true;

create table if not exists sentence_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child_profile_id uuid references child_profiles(id) on delete cascade,
  sentence_text text not null,
  plain_text text,
  pictogram_ids jsonb not null default '[]'::jsonb
);

alter table sentence_history
alter column child_profile_id drop not null;

create table if not exists favorite_sentences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child_profile_id uuid references child_profiles(id) on delete cascade,
  sentence_text text not null,
  plain_text text,
  pictogram_ids jsonb not null default '[]'::jsonb
);

alter table favorite_sentences
alter column child_profile_id drop not null;

create table if not exists child_pictogram_settings (
  child_profile_id uuid not null references child_profiles(id) on delete cascade,
  pictogram_id uuid not null references pictograms(id) on delete cascade,
  is_enabled boolean not null default true,
  is_favorite boolean not null default false,
  custom_label_et text,
  updated_at timestamptz not null default now(),
  primary key (child_profile_id, pictogram_id)
);

alter table child_pictogram_settings
add column if not exists custom_label_et text;

insert into child_profiles (name, preferred_language, notes)
select 'Kevin', 'et', 'MVP child profile'
where not exists (
  select 1 from child_profiles where name = 'Kevin'
);

insert into child_profiles (name, preferred_language, notes)
select 'Maria', 'et', 'MVP child profile'
where not exists (
  select 1 from child_profiles where name = 'Maria'
);

insert into pictogram_categories (name, sort_order)
values
  ('Soovid', 1),
  ('Tegevused', 2),
  ('Tunded', 3),
  ('Igapaev', 4),
  ('Kool', 5),
  ('Toit', 6),
  ('Inimesed', 7)
on conflict (name) do update
set sort_order = excluded.sort_order;

update pictograms
set label_et = 'syya'
where is_custom = false
  and label_et = 'sooma';

insert into pictograms (category_id, label_et, label_en, sort_order)
select
  categories.id,
  seed.label_et,
  seed.label_en,
  seed.sort_order
from (
  values
    ('Soovid', 'tahan', 'want', 1),
    ('Soovid', 'ei taha', 'do not want', 2),
    ('Soovid', 'veel', 'more', 3),
    ('Soovid', 'jah', 'yes', 4),
    ('Soovid', 'ei', 'no', 5),
    ('Soovid', 'abi', 'help', 6),
    ('Soovid', 'paus', 'break', 7),
    ('Tegevused', 'valjasoit', 'trip', 8),
    ('Tegevused', 'mangima', 'play', 9),
    ('Tegevused', 'kupsetama', 'bake', 10),
    ('Tunded', 'roomus', 'happy', 11),
    ('Tunded', 'kurb', 'sad', 12),
    ('Tunded', 'vihane', 'angry', 13),
    ('Tunded', 'rahulik', 'calm', 14),
    ('Tunded', 'valus', 'hurt', 15),
    ('Igapaev', 'koju', 'home', 16),
    ('Igapaev', 'magama', 'sleep', 17),
    ('Igapaev', 'hambapesu', 'brush teeth', 18),
    ('Igapaev', 'pidzaama', 'pajamas', 19),
    ('Igapaev', 'voodisse', 'to bed', 20),
    ('Igapaev', 'head und', 'good night', 21),
    ('Kool', 'kool', 'school', 22),
    ('Kool', 'hommikuring', 'morning circle', 23),
    ('Kool', 'uhislaulmine', 'group singing', 24),
    ('Toit', 'juua', 'drink', 25),
    ('Toit', 'syya', 'eat', 26),
    ('Inimesed', 'ema', 'mom', 27),
    ('Inimesed', 'isa', 'dad', 28),
    ('Inimesed', 'vanaema', 'grandma', 29),
    ('Inimesed', 'opetaja', 'teacher', 30)
) as seed(category_name, label_et, label_en, sort_order)
join pictogram_categories as categories
  on categories.name = seed.category_name
where not exists (
  select 1
  from pictograms
  where pictograms.label_et = seed.label_et
    and pictograms.is_custom = false
);

update pictograms
set category_id = categories.id,
    label_en = seed.label_en,
    sort_order = seed.sort_order
from (
  values
    ('Soovid', 'tahan', 'want', 1),
    ('Soovid', 'ei taha', 'do not want', 2),
    ('Soovid', 'veel', 'more', 3),
    ('Soovid', 'jah', 'yes', 4),
    ('Soovid', 'ei', 'no', 5),
    ('Soovid', 'abi', 'help', 6),
    ('Soovid', 'paus', 'break', 7),
    ('Tegevused', 'valjasoit', 'trip', 8),
    ('Tegevused', 'mangima', 'play', 9),
    ('Tegevused', 'kupsetama', 'bake', 10),
    ('Tunded', 'roomus', 'happy', 11),
    ('Tunded', 'kurb', 'sad', 12),
    ('Tunded', 'vihane', 'angry', 13),
    ('Tunded', 'rahulik', 'calm', 14),
    ('Tunded', 'valus', 'hurt', 15),
    ('Igapaev', 'koju', 'home', 16),
    ('Igapaev', 'magama', 'sleep', 17),
    ('Igapaev', 'hambapesu', 'brush teeth', 18),
    ('Igapaev', 'pidzaama', 'pajamas', 19),
    ('Igapaev', 'voodisse', 'to bed', 20),
    ('Igapaev', 'head und', 'good night', 21),
    ('Kool', 'kool', 'school', 22),
    ('Kool', 'hommikuring', 'morning circle', 23),
    ('Kool', 'uhislaulmine', 'group singing', 24),
    ('Toit', 'juua', 'drink', 25),
    ('Toit', 'syya', 'eat', 26),
    ('Inimesed', 'ema', 'mom', 27),
    ('Inimesed', 'isa', 'dad', 28),
    ('Inimesed', 'vanaema', 'grandma', 29),
    ('Inimesed', 'opetaja', 'teacher', 30)
) as seed(category_name, label_et, label_en, sort_order)
join pictogram_categories as categories
  on categories.name = seed.category_name
where pictograms.label_et = seed.label_et
and pictograms.is_custom = false
and (
  pictograms.category_id is distinct from categories.id
  or pictograms.label_en is distinct from seed.label_en
  or pictograms.sort_order is distinct from seed.sort_order
);

alter table child_profiles enable row level security;
alter table sentence_history enable row level security;
alter table favorite_sentences enable row level security;
alter table child_pictogram_settings enable row level security;
alter table pictograms enable row level security;

drop policy if exists "caregivers_select_own_child_profiles" on child_profiles;
create policy "caregivers_select_own_child_profiles"
on child_profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "caregivers_insert_own_child_profiles" on child_profiles;
create policy "caregivers_insert_own_child_profiles"
on child_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "caregivers_update_own_child_profiles" on child_profiles;
create policy "caregivers_update_own_child_profiles"
on child_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "caregivers_delete_own_child_profiles" on child_profiles;
create policy "caregivers_delete_own_child_profiles"
on child_profiles
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "caregivers_select_own_sentence_history" on sentence_history;
create policy "caregivers_select_own_sentence_history"
on sentence_history
for select
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = sentence_history.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_insert_own_sentence_history" on sentence_history;
create policy "caregivers_insert_own_sentence_history"
on sentence_history
for insert
to authenticated
with check (
  child_profile_id is not null
  and exists (
    select 1
    from child_profiles
    where child_profiles.id = sentence_history.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_update_own_sentence_history" on sentence_history;
create policy "caregivers_update_own_sentence_history"
on sentence_history
for update
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = sentence_history.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
)
with check (
  child_profile_id is not null
  and exists (
    select 1
    from child_profiles
    where child_profiles.id = sentence_history.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_delete_own_sentence_history" on sentence_history;
create policy "caregivers_delete_own_sentence_history"
on sentence_history
for delete
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = sentence_history.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_select_own_favorite_sentences" on favorite_sentences;
create policy "caregivers_select_own_favorite_sentences"
on favorite_sentences
for select
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = favorite_sentences.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_insert_own_favorite_sentences" on favorite_sentences;
create policy "caregivers_insert_own_favorite_sentences"
on favorite_sentences
for insert
to authenticated
with check (
  child_profile_id is not null
  and exists (
    select 1
    from child_profiles
    where child_profiles.id = favorite_sentences.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_update_own_favorite_sentences" on favorite_sentences;
create policy "caregivers_update_own_favorite_sentences"
on favorite_sentences
for update
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = favorite_sentences.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
)
with check (
  child_profile_id is not null
  and exists (
    select 1
    from child_profiles
    where child_profiles.id = favorite_sentences.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_delete_own_favorite_sentences" on favorite_sentences;
create policy "caregivers_delete_own_favorite_sentences"
on favorite_sentences
for delete
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = favorite_sentences.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_select_own_child_pictogram_settings" on child_pictogram_settings;
create policy "caregivers_select_own_child_pictogram_settings"
on child_pictogram_settings
for select
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = child_pictogram_settings.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_insert_own_child_pictogram_settings" on child_pictogram_settings;
create policy "caregivers_insert_own_child_pictogram_settings"
on child_pictogram_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = child_pictogram_settings.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_update_own_child_pictogram_settings" on child_pictogram_settings;
create policy "caregivers_update_own_child_pictogram_settings"
on child_pictogram_settings
for update
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = child_pictogram_settings.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = child_pictogram_settings.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_delete_own_child_pictogram_settings" on child_pictogram_settings;
create policy "caregivers_delete_own_child_pictogram_settings"
on child_pictogram_settings
for delete
to authenticated
using (
  exists (
    select 1
    from child_profiles
    where child_profiles.id = child_pictogram_settings.child_profile_id
      and child_profiles.user_id = auth.uid()
  )
);

drop policy if exists "caregivers_select_default_and_own_custom_pictograms" on pictograms;
create policy "caregivers_select_default_and_own_custom_pictograms"
on pictograms
for select
to authenticated
using (
  is_custom = false
  or created_by_user_id = auth.uid()
);

drop policy if exists "caregivers_insert_own_custom_pictograms" on pictograms;
create policy "caregivers_insert_own_custom_pictograms"
on pictograms
for insert
to authenticated
with check (
  is_custom = true
  and created_by_user_id = auth.uid()
);

drop policy if exists "caregivers_update_own_custom_pictograms" on pictograms;
create policy "caregivers_update_own_custom_pictograms"
on pictograms
for update
to authenticated
using (created_by_user_id = auth.uid())
with check (created_by_user_id = auth.uid());

drop policy if exists "caregivers_delete_own_custom_pictograms" on pictograms;
create policy "caregivers_delete_own_custom_pictograms"
on pictograms
for delete
to authenticated
using (created_by_user_id = auth.uid());
