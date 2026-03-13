-- Fix RLS: allow anon access to salon_tables (same as products/orders)
DROP POLICY IF EXISTS "Full access tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Public read tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Authenticated users can update tables" ON public.salon_tables;

CREATE POLICY "Public access tables"
ON public.salon_tables FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- Ensure items column exists (in case migration wasn't applied)
ALTER TABLE public.salon_tables
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
