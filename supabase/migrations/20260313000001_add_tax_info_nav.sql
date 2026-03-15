-- Add Tax Information to nav_links if it doesn't exist
INSERT INTO nav_links (href, label, sort_order, visible)
SELECT '/tax-information', 'Tax Information', 50, true
WHERE NOT EXISTS (
  SELECT 1 FROM nav_links WHERE href = '/tax-information'
);
