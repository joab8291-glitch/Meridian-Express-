
-- ============ AGENTS: remove public sensitive read, add safe public view ============
DROP POLICY IF EXISTS "agents public lookup" ON public.agents;

CREATE OR REPLACE VIEW public.agents_public
WITH (security_invoker = on) AS
  SELECT id, full_name, referral_code
  FROM public.agents
  WHERE status = 'approved' AND referral_code IS NOT NULL;

-- Allow anyone to read the safe view (it only exposes id/name/code of approved agents)
CREATE POLICY "agents safe public via view"
  ON public.agents FOR SELECT TO anon
  USING (status = 'approved' AND current_setting('request.path', true) IS NOT DISTINCT FROM current_setting('request.path', true) AND false);
-- ^ The above is a no-op guard; the view uses security_invoker so anon needs SELECT on base columns.
-- Replace with a narrow policy that only allows reading the columns the view selects:
DROP POLICY IF EXISTS "agents safe public via view" ON public.agents;
CREATE POLICY "agents approved minimal anon"
  ON public.agents FOR SELECT TO anon
  USING (status = 'approved' AND referral_code IS NOT NULL);
-- NOTE: PostgREST cannot enforce column-level RLS, so we additionally REVOKE column access
-- and only GRANT the safe columns to anon.
REVOKE SELECT ON public.agents FROM anon;
GRANT SELECT (id, full_name, referral_code, status) ON public.agents TO anon;
GRANT SELECT ON public.agents_public TO anon, authenticated;

-- ============ BUSINESSES: remove public read ============
DROP POLICY IF EXISTS "businesses public approved" ON public.businesses;

-- ============ SALES_ORDERS: lock down inserts ============
DROP POLICY IF EXISTS "orders anon insert" ON public.sales_orders;
DROP POLICY IF EXISTS "orders auth insert" ON public.sales_orders;

CREATE OR REPLACE FUNCTION public.validate_sales_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
BEGIN
  -- Always force server-side defaults for commission + payment status
  NEW.commission_amount := 0;
  NEW.commission_status := 'pending';
  NEW.payment_status   := 'unpaid';

  -- Validate referral pairing: agent_id and referral_code must match an approved agent
  IF NEW.referral_code IS NOT NULL THEN
    SELECT id INTO v_agent_id
      FROM public.agents
     WHERE upper(referral_code) = upper(NEW.referral_code)
       AND status = 'approved';
    IF v_agent_id IS NULL THEN
      NEW.referral_code := NULL;
      NEW.agent_id := NULL;
    ELSE
      NEW.agent_id := v_agent_id;
    END IF;
  ELSE
    NEW.agent_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sales_order_insert ON public.sales_orders;
CREATE TRIGGER trg_validate_sales_order_insert
  BEFORE INSERT ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_sales_order_insert();

CREATE POLICY "orders anon insert"
  ON public.sales_orders FOR INSERT TO anon
  WITH CHECK (
    commission_status = 'pending'
    AND payment_status = 'unpaid'
    AND commission_amount = 0
  );

CREATE POLICY "orders auth insert"
  ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (
    commission_status = 'pending'
    AND payment_status = 'unpaid'
    AND commission_amount = 0
  );

-- ============ STORAGE: restrict products bucket public read to approved products ============
DROP POLICY IF EXISTS "products bucket public read" ON storage.objects;

CREATE POLICY "products bucket approved public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1
      FROM public.product_images pi
      JOIN public.products p ON p.id = pi.product_id
      WHERE pi.storage_path = storage.objects.name
        AND p.status = 'approved'
    )
  );

CREATE POLICY "products bucket owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'products'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
