
DROP POLICY IF EXISTS "settings authenticated read" ON public.app_settings;
CREATE POLICY "settings admin read" ON public.app_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "businesses admin read" ON public.businesses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
