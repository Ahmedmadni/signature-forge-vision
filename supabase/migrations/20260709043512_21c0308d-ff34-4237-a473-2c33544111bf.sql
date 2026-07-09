ALTER TABLE public.document_versions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'fields',
  ADD COLUMN IF NOT EXISTS operation text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS page_count integer;