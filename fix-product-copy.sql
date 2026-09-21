-- Fix product copy that stored UTF-8 punctuation as Latin-1
-- (don’t → donâ t, em dashes → â ).
-- Run once in the Supabase SQL editor.

update public.products
set
  caption = trim(both from regexp_replace(
    replace(replace(replace(replace(replace(replace(
      coalesce(caption, ''),
      E'\u00e2\u0080\u0099', ''''),
      E'\u00e2\u0080\u0098', ''''),
      E'\u00e2\u0080\u0094', ' - '),
      E'\u00e2\u0080\u0093', ' - '),
      E'\u2019', ''''),
      E'\u2018', ''''),
    ' {2,}', ' ', 'g')),
  description = trim(both from regexp_replace(
    replace(replace(replace(replace(replace(replace(
      coalesce(description, ''),
      E'\u00e2\u0080\u0099', ''''),
      E'\u00e2\u0080\u0098', ''''),
      E'\u00e2\u0080\u0094', ' - '),
      E'\u00e2\u0080\u0093', ' - '),
      E'\u2019', ''''),
      E'\u2018', ''''),
    ' {2,}', ' ', 'g'))
where caption ~ E'\u00e2\u0080|[\u2018\u2019\u2013\u2014]'
   or description ~ E'\u00e2\u0080|[\u2018\u2019\u2013\u2014]';
