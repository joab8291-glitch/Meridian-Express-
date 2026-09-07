-- ============================================================
-- Admin catalog management: categories, products, images, storage
-- Reuses the existing public.categories / public.products /
-- public.product_images / public.businesses tables and the
-- existing 'products' storage bucket (already used by the PIA
-- publish-to-catalog pipeline). This migration adds the
-- admin-facing RLS + a helper function so the general admin
-- panel can create categories/products directly, without going
-- through a PIA supplier submission.
-- ============================================================

-- ---------- CATEGORIES: admin write, public read active ----------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories public read active" ON public.categories;
CREATE POLICY "categories public read active"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "categories admin read all" ON public.categories;
CREATE POLICY "categories admin read all"
  ON public.categories FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "categories admin write" ON public.categories;
CREATE POLICY "categories admin write"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- PRODUCTS: admin write, public read approved ----------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products public read approved" ON public.products;
CREATE POLICY "products public read approved"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "products admin read all" ON public.products;
CREATE POLICY "products admin read all"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "products admin write" ON public.products;
CREATE POLICY "products admin write"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- PRODUCT_IMAGES: admin write, public read for approved products ----------
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_images public read approved" ON public.product_images;
CREATE POLICY "product_images public read approved"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND p.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "product_images admin read all" ON public.product_images;
CREATE POLICY "product_images admin read all"
  ON public.product_images FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "product_images admin write" ON public.product_images;
CREATE POLICY "product_images admin write"
  ON public.product_images FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- STORAGE: admin can upload/replace/remove in the 'products' bucket ----------
DROP POLICY IF EXISTS "products bucket admin write" ON storage.objects;
CREATE POLICY "products bucket admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "products bucket admin update" ON storage.objects;
CREATE POLICY "products bucket admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "products bucket admin delete" ON storage.objects;
CREATE POLICY "products bucket admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------- Helper: a single "direct" business row for admin-added products ----------
-- public.products.business_id is NOT NULL, since the schema was built for a
-- multi-seller marketplace. Admin-added products (no specific seller/PIA
-- supplier) are attached to one shared "Meridian Express Direct Catalog"
-- business record, created lazily on first use.
CREATE OR REPLACE FUNCTION public.get_or_create_direct_business(_admin_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can manage the direct catalog business';
  END IF;

  SELECT id INTO v_id FROM public.businesses
   WHERE business_name = 'Meridian Express Direct Catalog'
   LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.businesses (
      business_name, contact_person, county, location, phone, email, owner_id, status
    ) VALUES (
      'Meridian Express Direct Catalog', 'Meridian Express', 'Nairobi City', 'Kamukunji',
      '0700000000', 'admin@meridianexpress.co.ke', _admin_id, 'approved'
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_direct_business(uuid) TO authenticated;
