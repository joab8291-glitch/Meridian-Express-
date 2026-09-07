DROP POLICY IF EXISTS "pi approved anon minimal" ON public.product_introducers;
REVOKE SELECT (id, full_name, referral_code, status) ON public.product_introducers FROM anon;