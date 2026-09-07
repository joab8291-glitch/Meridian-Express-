
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Keep insert trigger forcing admin_approved=false on new rows
CREATE OR REPLACE FUNCTION public.validate_sales_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agent_id uuid;
BEGIN
  NEW.commission_amount := 0;
  NEW.commission_status := 'pending';
  NEW.payment_status   := 'unpaid';
  NEW.admin_approved   := false;
  NEW.approved_at      := NULL;

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
$function$;

DROP TRIGGER IF EXISTS validate_sales_order_insert_trg ON public.sales_orders;
CREATE TRIGGER validate_sales_order_insert_trg
BEFORE INSERT ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_sales_order_insert();

-- Set approved_at automatically when admin_approved flips to true
CREATE OR REPLACE FUNCTION public.set_order_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_approved = true AND (OLD.admin_approved IS DISTINCT FROM true) THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_order_approved_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_order_approved_at_trg ON public.sales_orders;
CREATE TRIGGER set_order_approved_at_trg
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_approved_at();

-- Replace read policy: agent only sees admin-approved orders
DROP POLICY IF EXISTS "orders read" ON public.sales_orders;
CREATE POLICY "orders read" ON public.sales_orders
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (agent_id = auth.uid() AND admin_approved = true)
);
