-- Create a public storage bucket for org images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-images',
  'org-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is public, but explicit policy for clarity)
CREATE POLICY "Public read org images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload org images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'org-images' AND auth.role() = 'authenticated');

-- Allow replace (upsert)
CREATE POLICY "Authenticated users can update org images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'org-images' AND auth.role() = 'authenticated');

-- Allow delete
CREATE POLICY "Authenticated users can delete org images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'org-images' AND auth.role() = 'authenticated');
