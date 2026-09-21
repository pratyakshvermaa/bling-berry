-- Run once in the Supabase SQL editor.
-- Stops two profiles from sharing the same email.
-- If this errors with "duplicate key", check for existing doubles first:
--   select lower(email) as email, count(*)
--   from public.profiles
--   group by 1
--   having count(*) > 1;

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email))
  where coalesce(email, '') <> '';
