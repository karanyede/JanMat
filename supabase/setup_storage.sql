-- Setup Supabase Storage for existing buckets
-- This script configures policies for your existing buckets: avatars, issues, news, stories, documents

-- Update existing storage buckets configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', true, 10485760, '{"image/*","application/pdf"}'),
  ('avatars', 'avatars', true, 5242880, '{"image/*"}'),
  ('issues', 'issues', true, 10485760, '{"image/*"}'),
  ('news', 'news', true, 10485760, '{"image/*"}'),
  ('stories', 'stories', true, 10485760, '{"image/*"}')
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload issue images" ON storage.objects;
DROP POLICY IF EXISTS "Government users can upload news images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view issue images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view news images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Create storage policies for uploads
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload issue images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'issues' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload news images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'news' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload stories" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

-- Create storage policies for viewing
CREATE POLICY "Anyone can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can view issue images" ON storage.objects
  FOR SELECT USING (bucket_id = 'issues');

CREATE POLICY "Anyone can view news images" ON storage.objects
  FOR SELECT USING (bucket_id = 'news');

CREATE POLICY "Anyone can view stories" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

-- Create policies for deleting (users can delete their own files)
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

SELECT 'Storage buckets and policies configured successfully!' as status;
