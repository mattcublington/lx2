-- Allow authenticated users to upload scorecard images to their own folder
-- Path format: {user_id}/{timestamp}.{ext}

CREATE POLICY "Users can upload to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scorecard-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own uploads
CREATE POLICY "Users can read own uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scorecard-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
