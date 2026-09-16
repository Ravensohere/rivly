-- ============================================================
-- Riva TTS Audio Cache Bucket
-- Run this once in Supabase SQL Editor to create the storage
-- bucket used for caching Azure Neural TTS audio responses.
--
-- Benefit: Repeated phrases (greetings, briefings, confirmations)
-- are served from cache in <50ms at zero API cost.
-- ============================================================

-- 1. Create the storage bucket (public = false → secure reads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'riva-tts-cache',
  'riva-tts-cache',
  false,  -- private: authenticated access only
  1048576, -- 1MB max per file (TTS audio files are typically 50-200KB)
  ARRAY['audio/wav', 'audio/mpeg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Service role can read/write (our Worker uses service key)
CREATE POLICY "service_role_tts_cache_all"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'riva-tts-cache')
WITH CHECK (bucket_id = 'riva-tts-cache');

-- 3. Policy: Authenticated users can read cached audio via API
--    (The Worker reads the audio and proxies it as base64, so this
--     is mostly for the Worker's service key access -- keep user access off)
-- No public user policy needed since Worker reads + proxies audio.

-- OPTIONAL: Auto-delete cached files older than 30 days
-- (Supabase doesn't natively support TTL on storage, but you can
--  run a cron job or edge function to clean up stale cache entries)
-- 
-- To manually purge old cache:
-- DELETE FROM storage.objects 
-- WHERE bucket_id = 'riva-tts-cache' 
-- AND created_at < NOW() - INTERVAL '30 days';
