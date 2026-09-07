
-- Audit table for subagent approvals
CREATE TABLE IF NOT EXISTS public.agent_approval_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  agent_name text,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  approved_by uuid,
  approval_method text NOT NULL DEFAULT 'individual',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_approval_audit TO authenticated;
GRANT ALL ON public.agent_approval_audit TO service_role;
ALTER TABLE public.agent_approval_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit" ON public.agent_approval_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Bulk approve RPC
CREATE OR REPLACE FUNCTION public.bulk_approve_pending_agents()
RETURNS TABLE(approved_count int, skipped_count int, failed_count int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_approved int := 0;
  v_skipped int := 0;
  v_failed int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can bulk approve';
  END IF;

  FOR r IN SELECT id, full_name, status FROM public.agents WHERE status = 'pending' LOOP
    BEGIN
      UPDATE public.agents SET status = 'approved' WHERE id = r.id AND status = 'pending';
      IF FOUND THEN
        v_approved := v_approved + 1;
        INSERT INTO public.agent_approval_audit(agent_id, agent_name, previous_status, new_status, approved_by, approval_method)
          VALUES (r.id, r.full_name, 'pending', 'approved', auth.uid(), 'bulk');
        INSERT INTO public.notifications(user_id, title, body, link)
          VALUES (r.id,
            'Your Meridian Express Account Has Been Approved',
            'Your Meridian Express subagent account has been approved. You can now log in and access the available features in your dashboard.',
            '/agent');
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  approved_count := v_approved;
  skipped_count := v_skipped;
  failed_count := v_failed;
  RETURN NEXT;
END $$;

GRANT EXECUTE ON FUNCTION public.bulk_approve_pending_agents() TO authenticated;
