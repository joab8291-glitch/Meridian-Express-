DROP POLICY IF EXISTS "Anyone can view active referral agents" ON public.referral_agents;
REVOKE SELECT (id, name, code, active) ON public.referral_agents FROM anon;