-- Run this once in the Supabase SQL editor.
-- Adds the reel field, and strips Instagram URLs that were pasted into caption/description.

alter table public.products
  add column if not exists instagram_url text not null default '';

alter table public.products disable trigger on_product_update;

update public.products
set
  description = trim(both from regexp_replace(
    regexp_replace(coalesce(description, ''),
      '(https?://)?(www\.)?(instagram\.com|instagr\.am|ig\.me)/\S+',
      ' ',
      'gi'),
    '\s+', ' ', 'g')),
  caption = trim(both from regexp_replace(
    regexp_replace(coalesce(caption, ''),
      '(https?://)?(www\.)?(instagram\.com|instagr\.am|ig\.me)/\S+',
      ' ',
      'gi'),
    '\s+', ' ', 'g'));

alter table public.products enable trigger on_product_update;

