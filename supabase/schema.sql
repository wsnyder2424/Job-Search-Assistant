-- Pet medication tracker — schema, row-level security, and helpers.
--
-- Apply with the Supabase SQL editor, or:
--   psql "$SUPABASE_DB_URL" -f supabase/schema.sql
--
-- The access model is the household: a user sees a pet, its medications, and
-- its dose log if and only if they are a member of that pet's household.
-- Every policy resolves that question through the SECURITY DEFINER helpers
-- below, which is what keeps household_members' own policies from recursing.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 80),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  -- References profiles rather than auth.users so PostgREST can embed the
  -- member's display name; profiles.id is itself keyed to auth.users.
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'caregiver' check (role in ('owner', 'caregiver')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx
  on public.household_members (user_id);

-- Short shareable codes so a second caregiver can join without an email round-trip.
create table if not exists public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code         text not null unique,
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_by  uuid references auth.users (id) on delete set null,
  accepted_at  timestamptz
);

create table if not exists public.pets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 60),
  species      text,
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists pets_household_idx on public.pets (household_id);

create table if not exists public.medications (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references public.pets (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 120),
  directions text,
  -- Frequency union from src/core/types.ts, stored verbatim.
  frequency  jsonb not null,
  start_at   timestamptz not null,
  end_at     timestamptz,
  color_id   text not null default 'coral',
  archived   boolean not null default false,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint medications_frequency_has_kind
    check (frequency ? 'kind'),
  constraint medications_end_after_start
    check (end_at is null or end_at > start_at)
);

create index if not exists medications_pet_idx on public.medications (pet_id);

create table if not exists public.doses (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  -- The scheduled slot this dose fills. Slots themselves are derived from the
  -- medication's frequency at read time, so only *given* doses are stored.
  scheduled_for timestamptz not null,
  given_at      timestamptz not null default now(),
  -- References profiles so the schedule can show who gave the dose.
  given_by      uuid not null references public.profiles (id) on delete cascade,
  notes         text,
  -- Two caregivers checking the same slot at once must not double-log it.
  unique (medication_id, scheduled_for)
);

create index if not exists doses_medication_scheduled_idx
  on public.doses (medication_id, scheduled_for desc);

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- SECURITY DEFINER so they bypass RLS on household_members. Without that, a
-- policy on household_members that queries household_members recurses and
-- Postgres aborts the query.
-- ---------------------------------------------------------------------------

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.household_members m
     where m.household_id = target_household
       and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.household_members m
     where m.household_id = target_household
       and m.user_id = auth.uid()
       and m.role = 'owner'
  );
$$;

create or replace function public.household_of_pet(target_pet uuid)
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select p.household_id from public.pets p where p.id = target_pet;
$$;

create or replace function public.household_of_medication(target_medication uuid)
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select p.household_id
    from public.medications m
    join public.pets p on p.id = m.pet_id
   where m.id = target_medication;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every new auth user gets a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a household is its first owner. Done in a trigger so the
-- creator can immediately satisfy the membership policies on pets/medications.
create or replace function public.handle_new_household()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_household_created on public.households;
create trigger on_household_created
  after insert on public.households
  for each row execute function public.handle_new_household();

-- ---------------------------------------------------------------------------
-- Invites
--
-- Redeeming runs SECURITY DEFINER because the joiner is, by definition, not
-- yet a member and so cannot see the invite row under RLS.
-- ---------------------------------------------------------------------------

create or replace function public.create_household_invite(target_household uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_code text;
begin
  if not public.is_household_member(target_household) then
    raise exception 'Not a member of this household';
  end if;

  -- Ambiguous characters (0/O, 1/I) are left out so codes survive being read
  -- aloud or typed from a screenshot.
  new_code := upper(
    translate(
      substr(encode(gen_random_bytes(8), 'base64'), 1, 8),
      '01OI+/=', 'ABCDEFG'
    )
  );

  insert into public.household_invites (household_id, code, created_by)
  values (target_household, new_code, auth.uid());

  return new_code;
end;
$$;

create or replace function public.accept_household_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite public.household_invites;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to accept an invite';
  end if;

  select * into invite
    from public.household_invites
   where code = upper(btrim(invite_code))
   for update;

  if invite.id is null then
    raise exception 'That invite code is not valid';
  end if;
  if invite.accepted_at is not null then
    raise exception 'That invite has already been used';
  end if;
  if invite.expires_at < now() then
    raise exception 'That invite has expired';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (invite.household_id, auth.uid(), 'caregiver')
  on conflict (household_id, user_id) do nothing;

  update public.household_invites
     set accepted_by = auth.uid(), accepted_at = now()
   where id = invite.id;

  return invite.household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.pets              enable row level security;
alter table public.medications       enable row level security;
alter table public.doses             enable row level security;

-- profiles: your own row, plus anyone you share a household with (so the
-- schedule can show "given by Sam" rather than a bare user id).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
        from public.household_members mine
        join public.household_members theirs
          on theirs.household_id = mine.household_id
       where mine.user_id = auth.uid()
         and theirs.user_id = profiles.id
    )
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

-- households
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (public.is_household_member(id));

drop policy if exists households_insert on public.households;
create policy households_insert on public.households
  for insert with check (created_by = auth.uid());

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update using (public.is_household_owner(id))
  with check (public.is_household_owner(id));

drop policy if exists households_delete on public.households;
create policy households_delete on public.households
  for delete using (public.is_household_owner(id));

-- household_members
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select using (public.is_household_member(household_id));

drop policy if exists household_members_delete on public.household_members;
create policy household_members_delete on public.household_members
  for delete using (
    user_id = auth.uid() -- leave a household
    or public.is_household_owner(household_id) -- or an owner removes someone
  );

drop policy if exists household_members_update on public.household_members;
create policy household_members_update on public.household_members
  for update using (public.is_household_owner(household_id))
  with check (public.is_household_owner(household_id));

-- No INSERT policy: membership is granted only by the household trigger or by
-- accept_household_invite(), both SECURITY DEFINER. A client cannot add
-- itself to a household by inserting a row directly.

-- household_invites: members manage their household's invites. Redemption
-- goes through accept_household_invite(), which does not need a read policy.
drop policy if exists household_invites_select on public.household_invites;
create policy household_invites_select on public.household_invites
  for select using (public.is_household_member(household_id));

drop policy if exists household_invites_delete on public.household_invites;
create policy household_invites_delete on public.household_invites
  for delete using (public.is_household_member(household_id));

-- pets
drop policy if exists pets_select on public.pets;
create policy pets_select on public.pets
  for select using (public.is_household_member(household_id));

drop policy if exists pets_insert on public.pets;
create policy pets_insert on public.pets
  for insert with check (
    public.is_household_member(household_id) and created_by = auth.uid()
  );

drop policy if exists pets_update on public.pets;
create policy pets_update on public.pets
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Every member manages pets and medications equally; `role` gates only
-- household-level admin (renaming or deleting the household, removing members).
drop policy if exists pets_delete on public.pets;
create policy pets_delete on public.pets
  for delete using (public.is_household_member(household_id));

-- medications
drop policy if exists medications_select on public.medications;
create policy medications_select on public.medications
  for select using (public.is_household_member(public.household_of_pet(pet_id)));

drop policy if exists medications_insert on public.medications;
create policy medications_insert on public.medications
  for insert with check (
    public.is_household_member(public.household_of_pet(pet_id))
    and created_by = auth.uid()
  );

drop policy if exists medications_update on public.medications;
create policy medications_update on public.medications
  for update using (public.is_household_member(public.household_of_pet(pet_id)))
  with check (public.is_household_member(public.household_of_pet(pet_id)));

drop policy if exists medications_delete on public.medications;
create policy medications_delete on public.medications
  for delete using (public.is_household_member(public.household_of_pet(pet_id)));

-- doses: any member may log one, and it is recorded against them.
drop policy if exists doses_select on public.doses;
create policy doses_select on public.doses
  for select using (
    public.is_household_member(public.household_of_medication(medication_id))
  );

drop policy if exists doses_insert on public.doses;
create policy doses_insert on public.doses
  for insert with check (
    public.is_household_member(public.household_of_medication(medication_id))
    and given_by = auth.uid()
  );

-- Unchecking a box removes the record; any member may correct a mistake.
drop policy if exists doses_delete on public.doses;
create policy doses_delete on public.doses
  for delete using (
    public.is_household_member(public.household_of_medication(medication_id))
  );

drop policy if exists doses_update on public.doses;
create policy doses_update on public.doses
  for update using (
    public.is_household_member(public.household_of_medication(medication_id))
  )
  with check (
    public.is_household_member(public.household_of_medication(medication_id))
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.households, public.household_members,
  public.household_invites, public.pets, public.medications, public.doses
  to authenticated;

grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
