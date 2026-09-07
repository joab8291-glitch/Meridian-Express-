
-- 1. Add new role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_introducer';

-- 2. Sequence for PI codes
CREATE SEQUENCE IF NOT EXISTS public.pi_code_seq START 1024;

-- 3. product_introducers table (mirrors agents pattern)
CREATE TABLE IF NOT EXISTS public.product_introducers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  email text NOT NULL,
  id_number text,
  county text,
  town text,
  payment_method text NOT NULL DEFAULT 'mpesa',
  mpesa_number text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | suspended | rejected
  referral_code text UNIQUE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.product_introducers TO authenticated;
GRANT ALL ON public.product_introducers TO service_role;
GRANT SELECT ON public.product_introducers TO anon; -- for referral-code validation only (see policy)

ALTER TABLE public.product_introducers ENABLE ROW LEVEL SECURITY;

-- Anon can only look up approved referral codes (for prefill validation on signup)
CREATE POLICY "pi approved anon minimal" ON public.product_introducers
  FOR SELECT TO anon
  USING (status = 'approved' AND referral_code IS NOT NULL);

CREATE POLICY "pi self read" ON public.product_introducers
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "pi self insert" ON public.product_introducers
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "pi self update" ON public.product_introducers
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Trigger: mint referral code on approval, grant role
CREATE OR REPLACE FUNCTION public.assign_pi_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.referral_code IS NULL THEN
      v_slug := upper(regexp_replace(split_part(coalesce(NEW.full_name,''), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
      IF v_slug = '' THEN v_slug := 'INT'; END IF;
      NEW.referral_code := 'PI-' || v_slug || '-' || nextval('public.pi_code_seq')::text;
      NEW.approved_at := now();
    END IF;
    INSERT INTO public.user_roles(user_id, role)
      VALUES (NEW.id, 'product_introducer'::public.app_role)
      ON CONFLICT DO NOTHING;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_product_introducers_upd ON public.product_introducers;
CREATE TRIGGER t_product_introducers_upd
BEFORE UPDATE ON public.product_introducers
FOR EACH ROW EXECUTE FUNCTION public.assign_pi_code();

-- Protect sensitive PI columns from self-edit
CREATE OR REPLACE FUNCTION public.protect_pi_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.status        := OLD.status;
    NEW.referral_code := OLD.referral_code;
    NEW.approved_at   := OLD.approved_at;
    NEW.id            := OLD.id;
    NEW.applied_at    := OLD.applied_at;
    NEW.id_number     := OLD.id_number;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_product_introducers_protect ON public.product_introducers;
CREATE TRIGGER t_product_introducers_protect
BEFORE UPDATE ON public.product_introducers
FOR EACH ROW EXECUTE FUNCTION public.protect_pi_sensitive_columns();

-- 5. Link businesses -> product_introducer
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS product_introducer_id uuid REFERENCES public.product_introducers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pi_referral_code text;

CREATE INDEX IF NOT EXISTS businesses_pi_idx ON public.businesses(product_introducer_id);

-- Admins can also update businesses (for reassigning PI)
DROP POLICY IF EXISTS "businesses admin update" ON public.businesses;
CREATE POLICY "businesses admin update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Product Introducers can read businesses they referred
CREATE POLICY "businesses pi read" ON public.businesses
  FOR SELECT TO authenticated
  USING (product_introducer_id = auth.uid());

-- 6. pi_commissions table
CREATE TABLE IF NOT EXISTS public.pi_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_introducer_id uuid NOT NULL REFERENCES public.product_introducers(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  product_id uuid,
  product_name text,
  sale_amount numeric(12,2) NOT NULL DEFAULT 0,
  rate numeric(6,4) NOT NULL DEFAULT 0.0100,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed', -- confirmed | payable | paid | cancelled
  payment_reference text,
  paid_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pi_commissions_pi_idx ON public.pi_commissions(product_introducer_id);
CREATE INDEX IF NOT EXISTS pi_commissions_order_idx ON public.pi_commissions(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS pi_commissions_uniq ON public.pi_commissions(order_id, product_id, product_introducer_id);

GRANT SELECT ON public.pi_commissions TO authenticated;
GRANT ALL ON public.pi_commissions TO service_role;

ALTER TABLE public.pi_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pi_commissions pi read own" ON public.pi_commissions
  FOR SELECT TO authenticated
  USING (product_introducer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "pi_commissions admin write" ON public.pi_commissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER t_pi_commissions_upd BEFORE UPDATE ON public.pi_commissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. Trigger on sales_orders admin_approved -> generate 1% commission for qualifying items
CREATE OR REPLACE FUNCTION public.generate_pi_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_business_id uuid;
  v_pi_id uuid;
  v_subtotal numeric(12,2);
  v_name text;
BEGIN
  -- On approval: create commission rows for qualifying items
  IF NEW.admin_approved = true AND (OLD.admin_approved IS DISTINCT FROM true) THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      -- Try to match item.id to a real product UUID
      BEGIN
        v_product_id := (item->>'id')::uuid;
      EXCEPTION WHEN others THEN
        v_product_id := NULL;
      END;
      IF v_product_id IS NULL THEN CONTINUE; END IF;

      SELECT p.business_id, b.product_introducer_id, p.title
        INTO v_business_id, v_pi_id, v_name
      FROM public.products p
      LEFT JOIN public.businesses b ON b.id = p.business_id
      WHERE p.id = v_product_id;

      IF v_pi_id IS NULL THEN CONTINUE; END IF;

      v_subtotal := COALESCE((item->>'subtotal')::numeric, 0);
      IF v_subtotal <= 0 THEN CONTINUE; END IF;

      INSERT INTO public.pi_commissions(
        order_id, product_introducer_id, business_id, product_id, product_name,
        sale_amount, rate, commission_amount, status
      ) VALUES (
        NEW.id, v_pi_id, v_business_id, v_product_id, COALESCE(v_name, item->>'name'),
        v_subtotal, 0.01, round(v_subtotal * 0.01, 2), 'confirmed'
      )
      ON CONFLICT (order_id, product_id, product_introducer_id) DO NOTHING;
    END LOOP;
  END IF;

  -- On cancellation/rejection: cancel any related commissions
  IF NEW.status IN ('cancelled','rejected','refunded') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.pi_commissions
       SET status = 'cancelled', updated_at = now()
     WHERE order_id = NEW.id AND status <> 'paid';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_orders_pi_commission ON public.sales_orders;
CREATE TRIGGER t_orders_pi_commission
AFTER UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_pi_commissions();
