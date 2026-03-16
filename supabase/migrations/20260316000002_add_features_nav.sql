-- Add Features page to nav_links
INSERT INTO nav_links (href, label, sort_order, visible)
SELECT '/features', 'Features', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM nav_links WHERE href = '/features'
);

-- Shift existing links with sort_order >= 1 to make room
UPDATE nav_links SET sort_order = sort_order + 1
WHERE href != '/features' AND href != '/discover' AND sort_order >= 1;
