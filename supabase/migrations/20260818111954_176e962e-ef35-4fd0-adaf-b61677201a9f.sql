REVOKE SELECT ON public.product_introducers FROM anon;
GRANT SELECT (id, full_name, referral_code, status) ON public.product_introducers TO anon;

REVOKE SELECT ON public.referral_agents FROM anon;
GRANT SELECT (id, name, code, active) ON public.referral_agents TO anon;

CREATE OR REPLACE FUNCTION public.lookup_referral_agent(_code text)
RETURNS TABLE(id uuid, name text, phone text, code text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT id, name, phone, code
  FROM public.referral_agents
  WHERE upper(code) = upper(_code)
    AND active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_referral_agent(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_referral_agent(text) TO anon, authenticated;