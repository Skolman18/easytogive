-- Private storage bucket for PDF receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,       -- private: access via signed URLs only
  5242880,     -- 5 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can read objects in their own folder
-- Path structure: {donor_id}/{receipt_id}.pdf
CREATE POLICY "Users read own receipt PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NOTE: The Supabase service role bypasses RLS entirely on application tables,
-- but Storage object policies ARE enforced even for the service role.
-- These explicit policies allow the webhook's service-role client to upload PDFs.
CREATE POLICY "Service role upload receipt PDFs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Service role update receipt PDFs"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'receipts');
