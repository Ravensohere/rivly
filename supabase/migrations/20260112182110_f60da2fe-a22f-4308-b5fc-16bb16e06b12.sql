-- Update storage bucket to accept PDF and images with size limit
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'timetable-images';

-- Drop existing storage policies if they exist and recreate with proper access
DROP POLICY IF EXISTS "Users can upload their own timetable images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own timetable images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own timetable images" ON storage.objects;
DROP POLICY IF EXISTS "Timetable images are publicly accessible" ON storage.objects;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload their own timetable files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'timetable-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can read files in their own folder
CREATE POLICY "Users can read their own timetable files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'timetable-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete files in their own folder
CREATE POLICY "Users can delete their own timetable files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'timetable-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Public read access (needed for displaying images)
CREATE POLICY "Timetable files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'timetable-images');