-- Seed existing lookbook pieces so prices can be edited in Admin.
-- Re-running keeps any prices you already set.

alter table public.products add column if not exists slug text;
create unique index if not exists products_slug_unique on public.products (slug);

insert into public.products
  (name, caption, description, price, category, stock, image_url, slug, sort_order)
values
  -- Bangles
  ('Butter stack', 'Honey resin, a gold cuff, and a slim ivory bangle.', 'Honey resin, a gold cuff, and a slim ivory bangle. The stack that looks like sunlight on skin.', 499, 'bangles', 1, 'assets/bangles/butter-wrist.jpg', 'butter-stack', 1),
  ('Honey tortoise', 'The same honey cuff, gold, and a dark tortoise ring.', 'The same honey cuff, gold, and a dark tortoise ring. A warmer, deeper stack.', 499, 'bangles', 1, 'assets/bangles/butter-collage.jpg', 'honey-tortoise', 2),
  ('Turquoise stack', 'Marble turquoise, gold, and a slim bamboo cuff.', 'Marble turquoise, gold, and a slim bamboo cuff. Made for blue florals and hard sunlight.', 499, 'bangles', 1, 'assets/bangles/turquoise-look.jpg', 'turquoise-stack', 3),
  ('Ivory stack', 'Carved ivory resin framed in gold.', 'Carved ivory resin framed in gold. Soft, marble, made for cream florals.', 499, 'bangles', 1, 'assets/bangles/ivory-dress.jpg', 'ivory-stack', 4),
  ('Tortoise stack', 'Bubble tortoise resin with gold.', 'Bubble tortoise resin with gold. Amber, glossy, a little vintage.', 499, 'bangles', 1, 'assets/bangles/tortoise-dress.jpg', 'tortoise-stack', 5),
  ('Sky stack', 'Two blues - faceted and bubble - with gold in between.', 'Two blues - faceted and bubble - with gold in between. Cool, glossy, not quiet.', 499, 'bangles', 1, 'assets/bangles/sky-stack.jpg', 'sky-stack', 6),
  ('Honey peach', 'Carved peach resin with gold companions.', 'Carved peach resin with gold companions. Two stacks, same glow.', 499, 'bangles', 1, 'assets/bangles/honey-peach.jpg', 'honey-peach', 7),
  ('Studded wood', 'Four stains, silver studs and pyramids.', 'Four stains, silver studs and pyramids. Heirloom weight, statement stack.', 499, 'bangles', 1, 'assets/bangles/studded-wood.jpg', 'studded-wood', 8),
  ('Carved wood', 'Four wood tones, smooth and sculpted.', 'Four wood tones, smooth and sculpted. No metal - just grain.', 499, 'bangles', 1, 'assets/bangles/wood-carved.jpg', 'carved-wood', 9),

  -- Watches
  ('Atlas raspberry', 'A cushion case, a sunburst berry dial, and a stretch bracelet.', 'A cushion case, a sunburst berry dial, and a stretch bracelet that sits close to the wrist. The one that photographs like jewellery and wears like a watch.', 999, 'watches', 1, 'assets/watches/atlas-raspberry.jpg', 'atlas-raspberry', 1),
  ('Atlas emerald', 'Same quiet geometry, a deeper green.', 'Same quiet geometry, a deeper green. Forest dial, gold indexes, and the kind of box you''d actually keep on the dresser.', 999, 'watches', 1, 'assets/watches/atlas-emerald.jpg', 'atlas-emerald', 2),
  ('Atraer forest & berry', 'Two cushion dials, one stretch bracelet.', 'Two cushion dials, one stretch bracelet. Forest for the days you want quiet. Berry for the ones you don''t.', 999, 'watches', 1, 'assets/watches/atraer-cushion-forest.jpg', 'atraer-forest-berry', 3),
  ('Atraer pearl & mint', 'Ivory and pale mint, gold markers, the same close bracelet.', 'Ivory and pale mint, gold markers, the same close bracelet. Soft enough for daytime. Finished enough for a close-up.', 999, 'watches', 1, 'assets/watches/atraer-cushion-pearl.jpg', 'atraer-pearl-mint', 4),
  ('Bracelet ovals', 'Four oval faces on a chunky gold bracelet.', 'Four oval faces on a chunky gold bracelet. Pearl, forest, blush, and champagne - the stack that looks like a cuff until you look twice.', 999, 'watches', 1, 'assets/watches/bracelet-ovals.jpg', 'bracelet-ovals', 5),
  ('Yong Jia rectangles', 'A five-row bracelet and a tank face.', 'A five-row bracelet and a tank face. Forest, cherry, and blush - Roman numerals if you want the vintage to read on camera.', 999, 'watches', 1, 'assets/watches/yongjia-rectangles.jpg', 'yongjia-rectangles', 6),
  ('Atraer mesh quartet', 'Milanese mesh, oval cases, four dials.', 'Milanese mesh, oval cases, four dials. Berry, forest, ink, and mint - light on the wrist, loud enough in a reel.', 999, 'watches', 1, 'assets/watches/atraer-mesh-four.jpg', 'atraer-mesh-quartet', 7),
  ('Atraer mesh pair', 'Just the two that get asked for most.', 'Just the two that get asked for most. Raspberry and forest, same mesh, same quiet oval.', 999, 'watches', 1, 'assets/watches/atraer-mesh-pair.jpg', 'atraer-mesh-pair', 8),
  ('Crystal mesh', 'Four tiny stones on the dial.', 'Four tiny stones on the dial. Mint, forest, and pearl - sparkle that stays put after the photo.', 999, 'watches', 1, 'assets/watches/atraer-crystal-three.jpg', 'crystal-mesh', 9),
  ('Crystal & berry', 'Raspberry sunburst beside a forest dial with stones.', 'Raspberry sunburst beside a forest dial with stones. Two moods, one mesh.', 999, 'watches', 1, 'assets/watches/atraer-crystal-pair.jpg', 'crystal-berry', 10),
  ('Mesh & stretch', 'Forest on mesh. Berry on a stretch bracelet.', 'Forest on mesh. Berry on a stretch bracelet. Same gold, two ways to wear it - pick the strap that matches the day.', 999, 'watches', 1, 'assets/watches/atraer-mixed.jpg', 'mesh-stretch', 11),
  ('The salon tray', 'Ten pieces, one velvet tray.', 'Ten pieces, one velvet tray. Pick the dial that matches the outfit - berry, forest, gold, or the square that reads a little vintage.', 999, 'watches', 1, 'assets/watches/atlas-tray.jpg', 'salon-tray', 12),
  ('The full line', 'Faces, sides, clasps, the case back.', 'Faces, sides, clasps, the case back. Everything you want to see before you DM - no guessing from a single close-up.', 999, 'watches', 1, 'assets/watches/atlas-lineup.jpg', 'full-line', 13),

  -- Everyday
  ('Everyday Sparkle', 'Anti-tarnish jewellery made to glow through class, commute, and late-night plans.', 'Anti-tarnish jewellery made to glow through class, commute, and late-night plans.', 799, 'everyday', 1, 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80', 'everyday-sparkle', 1)
on conflict (slug) do update set
  name = excluded.name,
  caption = excluded.caption,
  description = excluded.description,
  category = excluded.category,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;
