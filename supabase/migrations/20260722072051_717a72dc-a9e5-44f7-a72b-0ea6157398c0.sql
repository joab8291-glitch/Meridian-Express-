
-- 1) Add new role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_intro_agent';

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE public.pia_status AS ENUM ('pending','active','suspended','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.supplier_intro_status AS ENUM ('new','contacted','verification_pending','verified','active','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.product_submission_status AS ENUM ('draft','submitted','under_review','changes_requested','resubmitted','approved','live','rejected','archived','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Sequence for agent codes
CREATE SEQUENCE IF NOT EXISTS public.pia_code_seq START 1;

-- 4) product_intro_agents
CREATE TABLE IF NOT EXISTS public.product_intro_agents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  national_id text,
  county text,
  town text,
  assigned_region text,
  mpesa_number text,
  referred_by_code text,
  agent_code text UNIQUE,
  status public.pia_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  last_login_at timestamptz,
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_intro_agents TO authenticated;
GRANT ALL ON public.product_intro_agents TO service_role;
ALTER TABLE public.product_intro_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PIA can view own" ON public.product_intro_agents FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "PIA can insert own" ON public.product_intro_agents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "PIA can update own limited" ON public.product_intro_agents FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete PIA" ON public.product_intro_agents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.assign_pia_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    IF NEW.agent_code IS NULL THEN
      NEW.agent_code := 'MEX-PIA-' || LPAD(nextval('public.pia_code_seq')::text, 4, '0');
    END IF;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'product_intro_agent'::public.app_role)
      ON CONFLICT DO NOTHING;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_pia_code ON public.product_intro_agents;
CREATE TRIGGER trg_assign_pia_code BEFORE UPDATE ON public.product_intro_agents
FOR EACH ROW EXECUTE FUNCTION public.assign_pia_code();

CREATE OR REPLACE FUNCTION public.protect_pia_sensitive() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.status := OLD.status;
    NEW.agent_code := OLD.agent_code;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.national_id := OLD.national_id;
    NEW.applied_at := OLD.applied_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_pia ON public.product_intro_agents;
CREATE TRIGGER trg_protect_pia BEFORE UPDATE ON public.product_intro_agents
FOR EACH ROW EXECUTE FUNCTION public.protect_pia_sensitive();

-- 5) supplier_introductions
CREATE TABLE IF NOT EXISTS public.supplier_introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.product_intro_agents(id) ON DELETE RESTRICT,
  agent_code text,
  name text NOT NULL,
  contact_person text,
  phone text NOT NULL,
  alt_phone text,
  email text,
  county text,
  town text,
  address text,
  product_categories text[] DEFAULT '{}',
  registration_number text,
  status public.supplier_intro_status NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.supplier_introductions TO authenticated;
GRANT ALL ON public.supplier_introductions TO service_role;
ALTER TABLE public.supplier_introductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers agent own or admin" ON public.supplier_introductions FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Suppliers agent insert own" ON public.supplier_introductions FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Suppliers agent update own or admin" ON public.supplier_introductions FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Suppliers admin delete" ON public.supplier_introductions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_supplier_intro_touch BEFORE UPDATE ON public.supplier_introductions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) product_submissions
CREATE TABLE IF NOT EXISTS public.product_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.product_intro_agents(id) ON DELETE RESTRICT,
  agent_code text,
  supplier_introduction_id uuid REFERENCES public.supplier_introductions(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  subcategory text,
  description text,
  specifications text,
  supplier_price numeric(12,2),
  proposed_selling_price numeric(12,2),
  stock int DEFAULT 0,
  stock_status text,
  min_order_qty int DEFAULT 1,
  delivery_available boolean DEFAULT false,
  delivery_locations text,
  warranty text,
  condition text,
  brand text,
  model text,
  images text[] DEFAULT '{}',
  main_image text,
  agent_notes text,
  admin_notes text,
  status public.product_submission_status NOT NULL DEFAULT 'draft',
  reviewer_id uuid REFERENCES auth.users(id),
  review_started_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  published_at timestamptz,
  published_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  rejection_reason text,
  resubmission_allowed boolean DEFAULT true,
  confirmations jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_submissions TO authenticated;
GRANT ALL ON public.product_submissions TO service_role;
ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PS agent own or admin" ON public.product_submissions FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "PS agent insert own" ON public.product_submissions FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());
CREATE POLICY "PS agent update own or admin" ON public.product_submissions FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "PS admin delete" ON public.product_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_product_submissions_touch BEFORE UPDATE ON public.product_submissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Protect fields agents cannot change
CREATE OR REPLACE FUNCTION public.protect_product_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.status := CASE
      WHEN OLD.status='draft' AND NEW.status IN ('draft','submitted') THEN NEW.status
      WHEN OLD.status='changes_requested' AND NEW.status IN ('changes_requested','resubmitted') THEN NEW.status
      WHEN OLD.status='rejected' AND NEW.status='draft' AND OLD.resubmission_allowed THEN 'draft'::public.product_submission_status
      ELSE OLD.status
    END;
    NEW.admin_notes := OLD.admin_notes;
    NEW.reviewer_id := OLD.reviewer_id;
    NEW.review_started_at := OLD.review_started_at;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.published_at := OLD.published_at;
    NEW.published_product_id := OLD.published_product_id;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.resubmission_allowed := OLD.resubmission_allowed;
    NEW.agent_id := OLD.agent_id;
    NEW.agent_code := OLD.agent_code;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_product_submission ON public.product_submissions;
CREATE TRIGGER trg_protect_product_submission BEFORE UPDATE ON public.product_submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_product_submission();

-- 7) review history
CREATE TABLE IF NOT EXISTS public.product_submission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.product_submissions(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  reason_codes text[] DEFAULT '{}',
  notes text,
  admin_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.product_submission_reviews TO authenticated;
GRANT ALL ON public.product_submission_reviews TO service_role;
ALTER TABLE public.product_submission_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PSR agent own via submission or admin" ON public.product_submission_reviews FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.product_submissions ps
      WHERE ps.id = product_submission_reviews.submission_id AND ps.agent_id = auth.uid()
    )
  );
CREATE POLICY "PSR admin insert" ON public.product_submission_reviews FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 8) activity log
CREATE TABLE IF NOT EXISTS public.pia_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_role text,
  agent_id uuid REFERENCES public.product_intro_agents(id) ON DELETE SET NULL,
  submission_id uuid REFERENCES public.product_submissions(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.supplier_introductions(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pia_activity_log TO authenticated;
GRANT ALL ON public.pia_activity_log TO service_role;
ALTER TABLE public.pia_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PIA log agent own or admin" ON public.pia_activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR agent_id = auth.uid() OR actor_id = auth.uid());
CREATE POLICY "PIA log authenticated insert own" ON public.pia_activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 9) RPC: approve/publish product submission (admin only)
CREATE OR REPLACE FUNCTION public.publish_product_submission(_submission_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  s public.product_submissions;
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

  INSERT INTO public.products (title, description, category, price, stock, images, active)
  VALUES (
    s.name,
    COALESCE(s.description,''),
    COALESCE(s.category,'uncategorized'),
    COALESCE(s.proposed_selling_price, 0),
    COALESCE(s.stock, 0),
    COALESCE(s.images, '{}'),
    true
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
END $$;
