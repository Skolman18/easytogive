-- Add #explore to nav_links to make it orderable/toggleable in the admin panel
INSERT INTO nav_links (href, label, sort_order, visible)
SELECT '#explore', 'Explore', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM nav_links WHERE href = '#explore'
);
