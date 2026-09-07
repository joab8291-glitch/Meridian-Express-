
-- 1. Attribution on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS introduced_by_pia_id uuid REFERENCES public.product_intro_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pia_agent_code text,
  ADD COLUMN IF NOT EXISTS pia_agent_name text,
  ADD COLUMN IF NOT EXISTS pia_supplier_introduction_id uuid REFERENCES public.supplier_introductions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pia_submission_id uuid REFERENCES public.product_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pia_date_introduced timestamptz,
  ADD COLUMN IF NOT EXISTS pia_date_approved timestamptz,
  ADD COLUMN IF NOT EXISTS pia_date_published timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_introduced_by_pia ON public.products(introduced_by_pia_id);

-- 2. Update publish RPC to stamp attribution
CREATE OR REPLACE FUNCTION public.publish_product_submission(_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.product_submissions;
  a public.product_intro_agents;
  new_product_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can publish product submissions';
  END IF;
  SELECT * INTO s FROM public.product_submissions WHERE id=_submission_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF s.published_product_id IS NOT NULL THEN
    RETURN s.published_product_id;
  END IF;

  SELECT * INTO a FROM public.product_intro_agents WHERE id = s.agent_id;

  INSERT INTO public.products (title, description, category, price, stock, images, active,
    introduced_by_pia_id, pia_agent_code, pia_agent_name, pia_supplier_introduction_id,
    pia_submission_id, pia_date_introduced, pia_date_approved, pia_date_published)
  VALUES (
    s.name,
    COALESCE(s.description,''),
    COALESCE(s.category,'uncategorized'),
    COALESCE(s.proposed_selling_price, 0),
    COALESCE(s.stock, 0),
    COALESCE(s.images, '{}'),
    true,
    s.agent_id, s.agent_code, a.full_name, s.supplier_introduction_id,
    s.id, s.created_at, COALESCE(s.approved_at, now()), now()
  )
  RETURNING id INTO new_product_id;

  UPDATE public.product_submissions SET
    status='live',
    approved_at = COALESCE(approved_at, now()),
    approved_by = COALESCE(approved_by, auth.uid()),
    published_at = now(),
    published_product_id = new_product_id
  WHERE id=_submission_id;

  INSERT INTO public.product_submission_reviews(submission_id, action, from_status, to_status, notes, admin_id)
    VALUES (_submission_id, 'publish', s.status::text, 'live', 'Published to catalog', auth.uid());

  INSERT INTO public.notifications(user_id, title, body, link)
    VALUES (s.agent_id, 'Product Published', 'Your product "' || s.name || '" is now live on Meridian Express.', '/product-agent');

  RETURN new_product_id;
END $function$;

-- Backfill existing published submissions
UPDATE public.products p SET
  introduced_by_pia_id = s.agent_id,
  pia_agent_code = s.agent_code,
  pia_agent_name = a.full_name,
  pia_supplier_introduction_id = s.supplier_introduction_id,
  pia_submission_id = s.id,
  pia_date_introduced = s.created_at,
  pia_date_approved = s.approved_at,
  pia_date_published = s.published_at
FROM public.product_submissions s
LEFT JOIN public.product_intro_agents a ON a.id = s.agent_id
WHERE s.published_product_id = p.id AND p.introduced_by_pia_id IS NULL;

-- 3. pia_commissions table
CREATE TABLE IF NOT EXISTS public.pia_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  order_item_key text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  supplier_introduction_id uuid REFERENCES public.supplier_introductions(id) ON DELETE SET NULL,
  supplier_name text,
  agent_id uuid REFERENCES public.product_intro_agents(id) ON DELETE SET NULL,
  agent_code text,
  agent_name text,
  customer_name text,
  customer_phone text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  line_value numeric(12,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.01,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  order_status text,
  commission_status text NOT NULL DEFAULT 'pending', -- pending|confirmed|approved|paid|on_hold|cancelled|reversed|disputed
  order_date timestamptz,
  completion_date timestamptz,
  confirmed_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  payment_method text,
  admin_notes text,
  reversal_reason text,
  dispute_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, order_item_key, product_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_pia_commissions_agent ON public.pia_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_pia_commissions_order ON public.pia_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_pia_commissions_status ON public.pia_commissions(commission_status);

GRANT SELECT, INSERT, UPDATE ON public.pia_commissions TO authenticated;
GRANT ALL ON public.pia_commissions TO service_role;
ALTER TABLE public.pia_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pia_commissions agent read own" ON public.pia_commissions
  FOR SELECT TO authenticated USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pia_commissions admin write" ON public.pia_commissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_pia_commissions_touch BEFORE UPDATE ON public.pia_commissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Payments
CREATE TABLE IF NOT EXISTS public.pia_commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.pia_commissions(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  payment_reference text,
  mpesa_number text,
  payment_date timestamptz NOT NULL DEFAULT now(),
  admin_id uuid REFERENCES auth.users(id),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pia_commission_payments TO authenticated;
GRANT ALL ON public.pia_commission_payments TO service_role;
ALTER TABLE public.pia_commission_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pia_pay agent read own" ON public.pia_commission_payments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.pia_commissions c WHERE c.id = pia_commission_payments.commission_id AND c.agent_id = auth.uid())
  );
CREATE POLICY "pia_pay admin write" ON public.pia_commission_payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5. Adjustments
CREATE TABLE IF NOT EXISTS public.pia_commission_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid REFERENCES public.pia_commissions(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.product_intro_agents(id) ON DELETE SET NULL,
  adjustment_type text NOT NULL, -- correction|bonus|deduction|refund_recovery|duplicate_removal|manual_reconciliation
  amount numeric(12,2) NOT NULL,
  reason text NOT NULL,
  internal_note text,
  admin_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pia_commission_adjustments TO authenticated;
GRANT ALL ON public.pia_commission_adjustments TO service_role;
ALTER TABLE public.pia_commission_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pia_adj agent read own" ON public.pia_commission_adjustments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR agent_id = auth.uid()
  );
CREATE POLICY "pia_adj admin write" ON public.pia_commission_adjustments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. Audit
CREATE TABLE IF NOT EXISTS public.pia_commission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid REFERENCES public.pia_commissions(id) ON DELETE CASCADE,
  agent_id uuid,
  event text NOT NULL,
  from_status text,
  to_status text,
  amount numeric(12,2),
  actor_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pia_commission_audit TO authenticated;
GRANT ALL ON public.pia_commission_audit TO service_role;
ALTER TABLE public.pia_commission_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pia_audit agent read own" ON public.pia_commission_audit
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR agent_id = auth.uid()
  );
CREATE POLICY "pia_audit admin insert" ON public.pia_commission_audit
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 7. Trigger: generate PIA commissions on order approval / status change
CREATE OR REPLACE FUNCTION public.generate_pia_commissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  v_product_id uuid;
  p public.products;
  v_qty integer;
  v_unit numeric(12,2);
  v_line numeric(12,2);
  v_key text;
  v_new_commission_status text;
BEGIN
  -- On approval: create pending commission rows for qualifying items
  IF NEW.admin_approved = true AND (OLD.admin_approved IS DISTINCT FROM true) THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      BEGIN v_product_id := (item->>'id')::uuid; EXCEPTION WHEN others THEN v_product_id := NULL; END;
      IF v_product_id IS NULL THEN CONTINUE; END IF;

      SELECT * INTO p FROM public.products WHERE id = v_product_id;
      IF p.id IS NULL OR p.introduced_by_pia_id IS NULL THEN CONTINUE; END IF;

      v_qty := COALESCE((item->>'qty')::integer, (item->>'quantity')::integer, 1);
      v_unit := COALESCE((item->>'unit_price')::numeric, (item->>'price')::numeric, 0);
      IF v_unit = 0 AND (item ? 'subtotal') AND v_qty > 0 THEN
        v_unit := (item->>'subtotal')::numeric / v_qty;
      END IF;
      v_line := round(v_unit * v_qty, 2);
      IF v_line <= 0 THEN CONTINUE; END IF;
      v_key := COALESCE(item->>'id','') || ':' || COALESCE(item->>'variant','');

      INSERT INTO public.pia_commissions(
        order_id, order_item_key, product_id, product_name,
        supplier_introduction_id, agent_id, agent_code, agent_name,
        customer_name, customer_phone,
        unit_price, quantity, line_value, commission_rate, commission_amount,
        order_status, commission_status, order_date
      ) VALUES (
        NEW.id, v_key, p.id, p.title,
        p.pia_supplier_introduction_id, p.introduced_by_pia_id, p.pia_agent_code, p.pia_agent_name,
        NEW.customer_name, NEW.customer_phone,
        v_unit, v_qty, v_line, 0.01, round(v_line * 0.01, 2),
        NEW.status, 'pending', NEW.created_at
      )
      ON CONFLICT (order_id, order_item_key, product_id, agent_id) DO NOTHING;

      INSERT INTO public.pia_commission_audit(commission_id, agent_id, event, to_status, amount, actor_id, details)
      SELECT c.id, c.agent_id, 'commission_created', 'pending', c.commission_amount, auth.uid(),
             jsonb_build_object('order_id', NEW.id, 'unit_price', v_unit, 'quantity', v_qty)
      FROM public.pia_commissions c
      WHERE c.order_id = NEW.id AND c.order_item_key = v_key AND c.product_id = p.id AND c.agent_id = p.introduced_by_pia_id;

      INSERT INTO public.notifications(user_id, title, body, link)
        VALUES (p.introduced_by_pia_id,
          'New pending commission',
          'A pending commission of KSh ' || round(v_line * 0.01)::text || ' has been created from the sale of "' || p.title || '".',
          '/product-agent');
    END LOOP;
  END IF;

  -- On status change: update commission status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_new_commission_status := CASE NEW.status
      WHEN 'completed' THEN 'confirmed'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'refunded' THEN 'reversed'
      WHEN 'rejected' THEN 'cancelled'
      ELSE NULL
    END;
    IF v_new_commission_status IS NOT NULL THEN
      UPDATE public.pia_commissions
         SET commission_status = v_new_commission_status,
             confirmed_at = CASE WHEN v_new_commission_status='confirmed' THEN COALESCE(confirmed_at, now()) ELSE confirmed_at END,
             completion_date = CASE WHEN NEW.status='completed' THEN COALESCE(completion_date, now()) ELSE completion_date END,
             order_status = NEW.status,
             reversal_reason = CASE WHEN v_new_commission_status IN ('cancelled','reversed') THEN COALESCE(reversal_reason, NEW.status) ELSE reversal_reason END
       WHERE order_id = NEW.id AND commission_status NOT IN ('paid');

      INSERT INTO public.pia_commission_audit(commission_id, agent_id, event, to_status, actor_id, details)
      SELECT c.id, c.agent_id, 'order_status_change', v_new_commission_status, auth.uid(),
             jsonb_build_object('order_status', NEW.status)
      FROM public.pia_commissions c WHERE c.order_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS t_orders_pia_commission ON public.sales_orders;
CREATE TRIGGER t_orders_pia_commission AFTER UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_pia_commissions();

-- 8. mark paid RPC
CREATE OR REPLACE FUNCTION public.mark_pia_commission_paid(
  _commission_id uuid,
  _amount numeric,
  _method text,
  _reference text,
  _mpesa text DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c public.pia_commissions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins'; END IF;
  SELECT * INTO c FROM public.pia_commissions WHERE id = _commission_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Commission not found'; END IF;
  IF c.commission_status = 'paid' THEN RAISE EXCEPTION 'Already paid'; END IF;
  IF c.commission_status NOT IN ('approved','confirmed') THEN
    RAISE EXCEPTION 'Commission must be approved before payment';
  END IF;

  INSERT INTO public.pia_commission_payments(commission_id, amount, payment_method, payment_reference, mpesa_number, admin_id, admin_note)
    VALUES (_commission_id, _amount, _method, _reference, _mpesa, auth.uid(), _note);

  UPDATE public.pia_commissions SET
    commission_status = 'paid',
    paid_at = now(),
    payment_reference = _reference,
    payment_method = _method
  WHERE id = _commission_id;

  INSERT INTO public.pia_commission_audit(commission_id, agent_id, event, from_status, to_status, amount, actor_id, details)
    VALUES (_commission_id, c.agent_id, 'marked_paid', c.commission_status, 'paid', _amount, auth.uid(),
      jsonb_build_object('method', _method, 'reference', _reference));

  INSERT INTO public.notifications(user_id, title, body, link)
    VALUES (c.agent_id, 'Commission paid',
      'Your commission of KSh ' || _amount::text || ' has been marked as paid. Payment reference: ' || COALESCE(_reference,'-') || '.',
      '/product-agent');
END $$;

-- 9. Approve / hold / reverse helpers
CREATE OR REPLACE FUNCTION public.set_pia_commission_status(_commission_id uuid, _new_status text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.pia_commissions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins'; END IF;
  IF _new_status NOT IN ('pending','confirmed','approved','on_hold','cancelled','reversed','disputed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  SELECT * INTO c FROM public.pia_commissions WHERE id = _commission_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF c.commission_status = 'paid' THEN RAISE EXCEPTION 'Paid commissions cannot change status; create an adjustment'; END IF;

  UPDATE public.pia_commissions SET
    commission_status = _new_status,
    approved_at = CASE WHEN _new_status='approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
    confirmed_at = CASE WHEN _new_status='confirmed' THEN COALESCE(confirmed_at, now()) ELSE confirmed_at END,
    admin_notes = COALESCE(_note, admin_notes)
  WHERE id = _commission_id;

  INSERT INTO public.pia_commission_audit(commission_id, agent_id, event, from_status, to_status, actor_id, details)
    VALUES (_commission_id, c.agent_id, 'status_change', c.commission_status, _new_status, auth.uid(),
      jsonb_build_object('note', _note));

  INSERT INTO public.notifications(user_id, title, body, link)
    VALUES (c.agent_id, 'Commission ' || _new_status,
      'Your commission for "' || c.product_name || '" is now ' || _new_status || '.',
      '/product-agent');
END $$;
