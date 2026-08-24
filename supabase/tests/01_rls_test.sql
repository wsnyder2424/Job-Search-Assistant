\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Seed three users directly (this is what Supabase Auth would do).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com');

\set alice '''11111111-1111-1111-1111-111111111111'''
\set bob   '''22222222-2222-2222-2222-222222222222'''
\set carol '''33333333-3333-3333-3333-333333333333'''

create or replace function assert(label text, actual anyelement, expected anyelement)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL % — expected %, got %', label, expected, actual;
  end if;
  raise notice 'pass  %', label;
end $$;

create or replace function assert_denied(label text, stmt text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'pass  % (blocked: %)', label, left(sqlerrm, 60);
    return;
  end;
  raise exception 'FAIL % — statement was allowed but should have been denied', label;
end $$;

\echo '=== profile trigger ==='
select assert('signup creates a profile', (select display_name from public.profiles where id = :alice), 'alice');

-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo ''
\echo '=== Alice sets up her household ==='

insert into public.households (id, name, created_by)
values ('aaaa0000-0000-0000-0000-00000000000a', 'Alice Home', :alice);

select assert('creator is auto-enrolled as owner',
  (select role from public.household_members
    where household_id = 'aaaa0000-0000-0000-0000-00000000000a' and user_id = :alice),
  'owner');

insert into public.pets (id, household_id, name, species, created_by)
values ('bbbb0000-0000-0000-0000-00000000000b', 'aaaa0000-0000-0000-0000-00000000000a',
        'Biscuit', 'dog', :alice);

insert into public.medications (id, pet_id, name, directions, frequency, start_at, color_id, created_by)
values ('cccc0000-0000-0000-0000-00000000000c', 'bbbb0000-0000-0000-0000-00000000000b',
        'Rimadyl', '1 tablet with food',
        '{"kind":"interval_hours","hours":12}'::jsonb,
        '2026-03-01T13:00:00Z', 'coral', :alice);

select assert('Alice sees her own pet', (select count(*) from public.pets), 1::bigint);
select assert('Alice sees her own medication', (select count(*) from public.medications), 1::bigint);

-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo ''
\echo '=== Bob (unrelated user) is fully walled off ==='

insert into public.households (id, name, created_by)
values ('dddd0000-0000-0000-0000-00000000000d', 'Bob Home', :bob);

select assert('Bob cannot see Alice''s household',
  (select count(*) from public.households where id = 'aaaa0000-0000-0000-0000-00000000000a'), 0::bigint);
select assert('Bob cannot see Alice''s pet', (select count(*) from public.pets where name = 'Biscuit'), 0::bigint);
select assert('Bob cannot see Alice''s medication', (select count(*) from public.medications), 0::bigint);
select assert('Bob cannot see Alice''s membership rows',
  (select count(*) from public.household_members where user_id = :alice), 0::bigint);
select assert('Bob cannot see Alice''s profile',
  (select count(*) from public.profiles where id = :alice), 0::bigint);

select assert_denied('Bob cannot add a medication to Alice''s pet', $q$
  insert into public.medications (pet_id, name, frequency, start_at, created_by)
  values ('bbbb0000-0000-0000-0000-00000000000b', 'Sneaky', '{"kind":"as_needed"}'::jsonb, now(),
          '22222222-2222-2222-2222-222222222222')
$q$);

select assert_denied('Bob cannot add a pet to Alice''s household', $q$
  insert into public.pets (household_id, name, created_by)
  values ('aaaa0000-0000-0000-0000-00000000000a', 'Trojan',
          '22222222-2222-2222-2222-222222222222')
$q$);

select assert_denied('Bob cannot enroll himself in Alice''s household', $q$
  insert into public.household_members (household_id, user_id, role)
  values ('aaaa0000-0000-0000-0000-00000000000a',
          '22222222-2222-2222-2222-222222222222', 'owner')
$q$);

select assert_denied('Bob cannot mint an invite to a household he is not in', $q$
  select public.create_household_invite('aaaa0000-0000-0000-0000-00000000000a')
$q$);

-- Update/delete must be no-ops rather than silent cross-tenant writes.
update public.medications set name = 'Hijacked' where id = 'cccc0000-0000-0000-0000-00000000000c';
select assert('Bob''s update of Alice''s medication affects nothing',
  (select count(*) from public.medications where id = 'cccc0000-0000-0000-0000-00000000000c'), 0::bigint);
delete from public.pets where id = 'bbbb0000-0000-0000-0000-00000000000b';

-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo ''
\echo '=== Alice''s data survived Bob''s attempts ==='
select assert('pet still exists', (select count(*) from public.pets where name = 'Biscuit'), 1::bigint);
select assert('medication name untouched',
  (select name from public.medications where id = 'cccc0000-0000-0000-0000-00000000000c'), 'Rimadyl');

\echo ''
\echo '=== Invite flow ==='
select public.create_household_invite('aaaa0000-0000-0000-0000-00000000000a') as code \gset
\echo 'invite code minted'

reset role;
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select assert('Carol sees nothing before accepting', (select count(*) from public.pets), 0::bigint);
select public.accept_household_invite(:'code');
select assert('Carol sees the shared pet after accepting', (select count(*) from public.pets where name = 'Biscuit'), 1::bigint);
select assert('Carol sees the shared medication', (select count(*) from public.medications), 1::bigint);
select assert('Carol joins as caregiver, not owner',
  (select role from public.household_members
    where household_id = 'aaaa0000-0000-0000-0000-00000000000a' and user_id = :carol), 'caregiver');
select assert('Carol can now see Alice''s display name',
  (select display_name from public.profiles where id = :alice), 'alice');
select assert_denied('an invite cannot be redeemed twice',
  format('select public.accept_household_invite(%L)', :'code'));

\echo ''
\echo '=== Carol logs a dose ==='
insert into public.doses (medication_id, scheduled_for, given_by)
values ('cccc0000-0000-0000-0000-00000000000c', '2026-03-01T13:00:00Z', :carol);
select assert('dose recorded', (select count(*) from public.doses), 1::bigint);

select assert_denied('Carol cannot attribute a dose to Alice', $q$
  insert into public.doses (medication_id, scheduled_for, given_by)
  values ('cccc0000-0000-0000-0000-00000000000c', '2026-03-02T01:00:00Z',
          '11111111-1111-1111-1111-111111111111')
$q$);

select assert_denied('the same slot cannot be double-logged', $q$
  insert into public.doses (medication_id, scheduled_for, given_by)
  values ('cccc0000-0000-0000-0000-00000000000c', '2026-03-01T13:00:00Z',
          '33333333-3333-3333-3333-333333333333')
$q$);

-- Any member may manage pets, so Carol's delete is expected to succeed; it is
-- rolled back here so the remaining cross-tenant assertions still have data.
begin;
delete from public.pets where id = 'bbbb0000-0000-0000-0000-00000000000b';
select assert('a caregiver may manage the household''s pets',
  (select count(*) from public.pets), 0::bigint);
rollback;
select assert('pet restored for the remaining checks',
  (select count(*) from public.pets), 1::bigint);

reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select assert('Alice sees the dose Carol gave', (select count(*) from public.doses), 1::bigint);

reset role;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select assert('Bob cannot see the dose log', (select count(*) from public.doses), 0::bigint);

reset role;
\echo ''
\echo 'ALL RLS ASSERTIONS PASSED'
