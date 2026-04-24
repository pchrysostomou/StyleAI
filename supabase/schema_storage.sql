-- Storage RLS Policies — run in Supabase SQL Editor
CREATE POLICY "wardrobe_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wardrobe-photos');
CREATE POLICY "wardrobe_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'wardrobe-photos');
CREATE POLICY "wardrobe_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'wardrobe-photos');
CREATE POLICY "body_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'body-photos');
CREATE POLICY "body_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'body-photos');
CREATE POLICY "body_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'body-photos');
