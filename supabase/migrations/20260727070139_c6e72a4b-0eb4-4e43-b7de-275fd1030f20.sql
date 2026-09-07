
CREATE TABLE public.referral_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX referral_agents_code_upper_key ON public.referral_agents (upper(code));

GRANT SELECT ON public.referral_agents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.referral_agents TO authenticated;
GRANT ALL ON public.referral_agents TO service_role;

ALTER TABLE public.referral_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active referral agents"
  ON public.referral_agents FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage referral agents"
  ON public.referral_agents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_referral_agents_updated
  BEFORE UPDATE ON public.referral_agents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Preserve referral codes belonging to referral_agents on new sales_orders.
CREATE OR REPLACE FUNCTION public.validate_sales_order_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agent_id uuid;
  v_ref_exists boolean;
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
    IF v_agent_id IS NOT NULL THEN
      NEW.agent_id := v_agent_id;
    ELSE
      -- Fall back: check referral_agents (simple referral system)
      SELECT EXISTS(
        SELECT 1 FROM public.referral_agents
        WHERE upper(code) = upper(NEW.referral_code) AND active = true
      ) INTO v_ref_exists;
      IF v_ref_exists THEN
        NEW.agent_id := NULL;
        -- keep referral_code as-is
      ELSE
        NEW.referral_code := NULL;
        NEW.agent_id := NULL;
      END IF;
    END IF;
  ELSE
    NEW.agent_id := NULL;
  END IF;

  RETURN NEW;
END;
$function$;
