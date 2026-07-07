-- ============ document_pages ============
CREATE TABLE public.document_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  width_ratio double precision NOT NULL DEFAULT 0.72,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (document_id, page_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_pages TO authenticated;
GRANT ALL ON public.document_pages TO service_role;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages document pages" ON public.document_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()));

-- ============ document_fields ============
CREATE TABLE public.document_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  field_type text NOT NULL,
  x_pct double precision NOT NULL DEFAULT 0,
  y_pct double precision NOT NULL DEFAULT 0,
  w_pct double precision NOT NULL DEFAULT 0.2,
  h_pct double precision NOT NULL DEFAULT 0.06,
  rotation double precision NOT NULL DEFAULT 0,
  opacity double precision NOT NULL DEFAULT 1,
  value text,
  checked boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_fields_document ON public.document_fields(document_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_fields TO authenticated;
GRANT ALL ON public.document_fields TO service_role;
ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages document fields" ON public.document_fields
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()));

-- ============ field_versions ============
CREATE TABLE public.field_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id uuid NOT NULL REFERENCES public.document_fields(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_field_versions_field ON public.field_versions(field_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_versions TO authenticated;
GRANT ALL ON public.field_versions TO service_role;
ALTER TABLE public.field_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages field versions" ON public.field_versions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()));

-- ============ document_versions ============
CREATE TABLE public.document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  fields_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  modified_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);
CREATE INDEX idx_document_versions_document ON public.document_versions(document_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages document versions" ON public.document_versions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.owner_id = auth.uid()));

-- ============ updated_at triggers ============
CREATE TRIGGER trg_document_pages_updated BEFORE UPDATE ON public.document_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_document_fields_updated BEFORE UPDATE ON public.document_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();