-- Create timetable_entries table for recurring timetable blocks
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL, -- HH:MM format
  end_time TEXT NOT NULL, -- HH:MM format
  days_of_week INTEGER[] NOT NULL DEFAULT '{}', -- 0=Sun, 1=Mon, ..., 6=Sat
  category TEXT NOT NULL DEFAULT 'Class' CHECK (category IN ('Study', 'Class', 'Work', 'Other')),
  reminder_minutes INTEGER DEFAULT NULL, -- null = no reminder
  start_date DATE DEFAULT NULL, -- optional validity period
  end_date DATE DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timetable_reference_images table (one per user)
CREATE TABLE IF NOT EXISTS public.timetable_reference_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE, -- Only one image per user
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create timetable_overrides table for single-day modifications
CREATE TABLE IF NOT EXISTS public.timetable_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timetable_entry_id UUID NOT NULL REFERENCES public.timetable_entries(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  title TEXT, -- null = use original
  start_time TEXT, -- null = use original
  end_time TEXT, -- null = use original
  cancelled BOOLEAN NOT NULL DEFAULT false, -- true = skip this occurrence
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(timetable_entry_id, override_date)
);

-- Enable RLS on all tables
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timetable_entries
DROP POLICY IF EXISTS "Users can view their own timetable entries" ON public.timetable_entries;
CREATE POLICY "Users can view their own timetable entries"
ON public.timetable_entries FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own timetable entries" ON public.timetable_entries;
CREATE POLICY "Users can create their own timetable entries"
ON public.timetable_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own timetable entries" ON public.timetable_entries;
CREATE POLICY "Users can update their own timetable entries"
ON public.timetable_entries FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own timetable entries" ON public.timetable_entries;
CREATE POLICY "Users can delete their own timetable entries"
ON public.timetable_entries FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for timetable_reference_images
DROP POLICY IF EXISTS "Users can view their own reference image" ON public.timetable_reference_images;
CREATE POLICY "Users can view their own reference image"
ON public.timetable_reference_images FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reference image" ON public.timetable_reference_images;
CREATE POLICY "Users can insert their own reference image"
ON public.timetable_reference_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reference image" ON public.timetable_reference_images;
CREATE POLICY "Users can update their own reference image"
ON public.timetable_reference_images FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reference image" ON public.timetable_reference_images;
CREATE POLICY "Users can delete their own reference image"
ON public.timetable_reference_images FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for timetable_overrides
DROP POLICY IF EXISTS "Users can view their own overrides" ON public.timetable_overrides;
CREATE POLICY "Users can view their own overrides"
ON public.timetable_overrides FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own overrides" ON public.timetable_overrides;
CREATE POLICY "Users can create their own overrides"
ON public.timetable_overrides FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own overrides" ON public.timetable_overrides;
CREATE POLICY "Users can update their own overrides"
ON public.timetable_overrides FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own overrides" ON public.timetable_overrides;
CREATE POLICY "Users can delete their own overrides"
ON public.timetable_overrides FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for timetable images
INSERT INTO storage.buckets (id, name, public)
VALUES ('timetable-images', 'timetable-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for timetable images
DROP POLICY IF EXISTS "Anyone can view timetable images" ON storage.objects;
CREATE POLICY "Anyone can view timetable images"
ON storage.objects FOR SELECT
USING (bucket_id = 'timetable-images');

DROP POLICY IF EXISTS "Users can upload their own timetable images" ON storage.objects;
CREATE POLICY "Users can upload their own timetable images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'timetable-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own timetable images" ON storage.objects;
CREATE POLICY "Users can update their own timetable images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'timetable-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own timetable images" ON storage.objects;
CREATE POLICY "Users can delete their own timetable images"
ON storage.objects FOR DELETE
USING (bucket_id = 'timetable-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_timetable_entries_updated_at ON public.timetable_entries;
CREATE TRIGGER update_timetable_entries_updated_at
BEFORE UPDATE ON public.timetable_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();