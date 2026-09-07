
-- 1) Restrict app_settings public read to authenticated only
DROP POLICY IF EXISTS "settings public read" ON public.app_settings;
CREATE POLICY "settings authenticated read" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- 2) Prevent non-admin agents from changing sensitive columns via a BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.protect_agent_sensitive_columns()
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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_agent_sensitive_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_agent_sensitive_columns_trg ON public.agents;
CREATE TRIGGER protect_agent_sensitive_columns_trg
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_agent_sensitive_columns();
