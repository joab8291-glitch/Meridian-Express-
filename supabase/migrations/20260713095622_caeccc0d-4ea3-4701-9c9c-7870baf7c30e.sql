
-- ===== Implementer overhaul migration =====

-- 1. Agents: implementer-specific columns
DO $$ BEGIN
  CREATE TYPE public.implementer_availability AS ENUM ('available','busy','unavailable','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS availability public.implementer_availability NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS service_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_assignments int NOT NULL DEFAULT 0;

-- 2. sales_orders: assignment + implementation tracking
DO $$ BEGIN
  CREATE TYPE public.implementation_status AS ENUM (
    'unassigned','assigned','customer_contacted','visit_scheduled',
    'quotation_sent','awaiting_customer_confirmation','confirmed',
    'in_progress','awaiting_payment','completed','unable_to_complete','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS assignment_notes text,
  ADD COLUMN IF NOT EXISTS implementation_status public.implementation_status NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS last_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_county text,
  ADD COLUMN IF NOT EXISTS customer_town text,
  ADD COLUMN IF NOT EXISTS customer_area text;

CREATE INDEX IF NOT EXISTS idx_sales_orders_assigned_agent ON public.sales_orders(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_impl_status ON public.sales_orders(implementation_status);

-- Allow assigned implementer to read the order
CREATE POLICY "Assigned implementer can view order"
  ON public.sales_orders FOR SELECT
  TO authenticated
  USING (assigned_agent_id = auth.uid());

-- Allow assigned implementer to update status/assignment_notes fields
-- (we can't restrict to columns via policy alone; app-layer restricts)
CREATE POLICY "Assigned implementer can update status"
  ON public.sales_orders FOR UPDATE
  TO authenticated
  USING (assigned_agent_id = auth.uid())
  WITH CHECK (assigned_agent_id = auth.uid());

-- 3. Order status history (append-only)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_by_role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all status history" ON public.order_status_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Implementer views own order history" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM public.sales_orders o WHERE o.id = order_id AND o.assigned_agent_id = auth.uid())
  );
CREATE POLICY "Authenticated can insert own history entries" ON public.order_status_history
  FOR INSERT TO authenticated WITH CHECK (
    changed_by = auth.uid() AND (
      public.has_role(auth.uid(),'admin')
      OR EXISTS(SELECT 1 FROM public.sales_orders o WHERE o.id = order_id AND o.assigned_agent_id = auth.uid())
    )
  );

-- 4. Order assignment history
CREATE TABLE IF NOT EXISTS public.order_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  from_agent_id uuid,
  to_agent_id uuid,
  changed_by uuid,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_assignment_history TO authenticated;
GRANT ALL ON public.order_assignment_history TO service_role;
ALTER TABLE public.order_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assignment history" ON public.order_assignment_history
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Implementers see own assignment history" ON public.order_assignment_history
  FOR SELECT TO authenticated USING (from_agent_id = auth.uid() OR to_agent_id = auth.uid());

-- 5. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 6. Assignment candidates (ranked nearest implementer)
CREATE OR REPLACE FUNCTION public.get_assignment_candidates(_order_id uuid)
RETURNS TABLE(
  id uuid, full_name text, phone text, whatsapp text, county text, town text, area text,
  availability public.implementer_availability, active_assignments int, referral_code text,
  match_rank int, match_label text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN; END IF;
  SELECT customer_county, customer_town, customer_area INTO o FROM public.sales_orders WHERE sales_orders.id = _order_id;
  RETURN QUERY
    SELECT a.id, a.full_name, a.phone, a.whatsapp, a.county, a.town, a.area, a.availability,
      a.active_assignments, a.referral_code,
      CASE
        WHEN o.customer_area IS NOT NULL AND lower(a.area) = lower(o.customer_area) THEN 1
        WHEN o.customer_town IS NOT NULL AND lower(a.town) = lower(o.customer_town) THEN 2
        WHEN o.customer_county IS NOT NULL AND lower(a.county) = lower(o.customer_county) THEN 3
        ELSE 4
      END AS match_rank,
      CASE
        WHEN o.customer_area IS NOT NULL AND lower(a.area) = lower(o.customer_area) THEN 'Same area'
        WHEN o.customer_town IS NOT NULL AND lower(a.town) = lower(o.customer_town) THEN 'Same town'
        WHEN o.customer_county IS NOT NULL AND lower(a.county) = lower(o.customer_county) THEN 'Same county'
        ELSE 'Any approved'
      END AS match_label
    FROM public.agents a
    WHERE a.status = 'approved' AND a.availability IN ('available','busy')
    ORDER BY 11 ASC, a.availability ASC, a.active_assignments ASC, a.full_name ASC;
END $$;

REVOKE ALL ON FUNCTION public.get_assignment_candidates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_candidates(uuid) TO authenticated;

-- 7. Assign implementer helper (atomic: updates order + history + counters + notification)
CREATE OR REPLACE FUNCTION public.assign_implementer(
  _order_id uuid, _new_agent_id uuid, _notes text DEFAULT NULL, _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can assign implementers';
  END IF;

  SELECT assigned_agent_id INTO v_prev FROM public.sales_orders WHERE id = _order_id FOR UPDATE;

  UPDATE public.sales_orders SET
    assigned_agent_id = _new_agent_id,
    assigned_at = now(),
    assigned_by = auth.uid(),
    assignment_notes = _notes,
    implementation_status = 'assigned',
    last_status_at = now()
  WHERE id = _order_id;

  INSERT INTO public.order_assignment_history(order_id, from_agent_id, to_agent_id, changed_by, reason, notes)
    VALUES (_order_id, v_prev, _new_agent_id, auth.uid(), _reason, _notes);

  INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by, changed_by_role, notes)
    VALUES (_order_id, 'unassigned', 'assigned', auth.uid(), 'admin', _notes);

  IF v_prev IS NOT NULL AND v_prev <> _new_agent_id THEN
    UPDATE public.agents SET active_assignments = GREATEST(active_assignments - 1, 0) WHERE id = v_prev;
    INSERT INTO public.notifications(user_id, title, body, link)
      VALUES (v_prev, 'Order reassigned', 'An order previously assigned to you has been reassigned.', '/implementer');
  END IF;
  IF v_prev IS DISTINCT FROM _new_agent_id THEN
    UPDATE public.agents SET active_assignments = active_assignments + 1 WHERE id = _new_agent_id;
    INSERT INTO public.notifications(user_id, title, body, link)
      VALUES (_new_agent_id, 'New assignment', 'You have been assigned a new order. Open your dashboard to view details.', '/implementer');
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.assign_implementer(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_implementer(uuid, uuid, text, text) TO authenticated;

-- 8. Update implementation status (implementer OR admin)
CREATE OR REPLACE FUNCTION public.update_implementation_status(
  _order_id uuid, _new_status public.implementation_status, _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev public.implementation_status;
  v_agent uuid;
  v_role text;
BEGIN
  SELECT implementation_status, assigned_agent_id INTO v_prev, v_agent
    FROM public.sales_orders WHERE id = _order_id FOR UPDATE;

  IF public.has_role(auth.uid(),'admin') THEN v_role := 'admin';
  ELSIF v_agent = auth.uid() THEN v_role := 'implementer';
  ELSE RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  UPDATE public.sales_orders SET
    implementation_status = _new_status,
    last_status_at = now()
  WHERE id = _order_id;

  INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by, changed_by_role, notes)
    VALUES (_order_id, v_prev::text, _new_status::text, auth.uid(), v_role, _notes);

  -- Notify the other party
  IF v_role = 'implementer' THEN
    -- notify admins? we skip; admin dashboard shows history
    NULL;
  ELSIF v_agent IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, link)
      VALUES (v_agent, 'Order status updated', 'Admin updated the status of one of your assigned orders.', '/implementer');
  END IF;

  IF _new_status IN ('completed','cancelled','unable_to_complete') AND v_agent IS NOT NULL THEN
    UPDATE public.agents SET active_assignments = GREATEST(active_assignments - 1, 0) WHERE id = v_agent;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.update_implementation_status(uuid, public.implementation_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_implementation_status(uuid, public.implementation_status, text) TO authenticated;
