\set ON_ERROR_STOP on
\pset pager off

-- How a new account gets its display name. This matters because the schedule
-- shows "Given by <name>", and the name arrives in a different metadata field
-- depending on whether they signed up with the email form or with Google.

create or replace function assert_name(label text, uid uuid, expected text)
returns void language plpgsql as $$
declare actual text;
begin
  select display_name into actual from public.profiles where id = uid;
  if actual is distinct from expected then
    raise exception 'FAIL % — expected %, got %', label, expected, coalesce(actual, '<null>');
  end if;
  raise notice 'pass  % -> %', label, coalesce(actual, '<null>');
end $$;

\echo '=== display name resolution ==='

-- Google returns full_name and name, and no display_name.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-0000-0000-0000-000000000001', 'whitney@gmail.com',
   '{"full_name":"Whitney Snyder","name":"Whitney Snyder","avatar_url":"https://x/y.png"}'::jsonb);
select assert_name('google signup uses full_name',
  'aaaa1111-0000-0000-0000-000000000001', 'Whitney Snyder');

-- Some providers send only `name`.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-0000-0000-0000-000000000002', 'jordan@gmail.com', '{"name":"Jordan Lee"}'::jsonb);
select assert_name('falls back to name',
  'aaaa1111-0000-0000-0000-000000000002', 'Jordan Lee');

-- The email form sends display_name, which outranks the rest.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-0000-0000-0000-000000000003', 'sam@example.com', '{"display_name":"Sam"}'::jsonb);
select assert_name('email signup uses display_name',
  'aaaa1111-0000-0000-0000-000000000003', 'Sam');

-- No metadata at all.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-0000-0000-0000-000000000004', 'casey@example.com', '{}'::jsonb);
select assert_name('no metadata falls back to the email prefix',
  'aaaa1111-0000-0000-0000-000000000004', 'casey');

-- A blank provider name must fall through rather than winning the coalesce
-- with whitespace and leaving the profile nameless.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-0000-0000-0000-000000000005', 'blank@example.com', '{"full_name":"   "}'::jsonb);
select assert_name('blank provider name falls through to the prefix',
  'aaaa1111-0000-0000-0000-000000000005', 'blank');

-- Whitespace around a real name is trimmed.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-0000-0000-0000-000000000006', 'padded@example.com', '{"full_name":"  Alex Kim  "}'::jsonb);
select assert_name('provider name is trimmed',
  'aaaa1111-0000-0000-0000-000000000006', 'Alex Kim');

\echo 'ALL PROFILE NAME ASSERTIONS PASSED'
