
-- 1) Add 'agent' enum value (only referenced at runtime by trigger, never in this tx)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';

-- 2) app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.app_settings(key,value) VALUES ('commission', jsonb_build_object('type','percent','value',5))
ON CONFLICT (key) DO NOTHING;

-- 3) Agents
CREATE SEQUENCE IF NOT EXISTS public.agent_code_seq START 1;
CREATE TABLE public.agents (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  email text NOT NULL,
  county text,
  area text,
  social text,
  id_number text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  referral_code text UNIQUE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agents TO authenticated;
GRANT SELECT ON public.agents TO anon;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents self read" ON public.agents FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agents public lookup" ON public.agents FOR SELECT TO anon
  USING (status = 'approved');
CREATE POLICY "agents self insert" ON public.agents FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "agents self update profile" ON public.agents FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Trigger: when admin sets status='approved', assign code & grant agent role
CREATE OR REPLACE FUNCTION public.assign_agent_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.referral_code IS NULL THEN
      NEW.referral_code := 'ME-AGT-' || LPAD(nextval('public.agent_code_seq')::text, 4, '0');
    END IF;
    NEW.approved_at := now();
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'agent'::public.app_role)
      ON CONFLICT DO NOTHING;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER t_agents_update BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.assign_agent_code();

-- 4) Sales orders
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  customer_phone text,
  customer_email text,
  account_type text DEFAULT 'guest',
  items jsonb NOT NULL,
  total numeric(12,2) NOT NULL DEFAULT 0,
  referral_code text,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name text,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  payment_status text NOT NULL DEFAULT 'unpaid',
  commission_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sales_orders TO authenticated;
GRANT INSERT ON public.sales_orders TO anon;
GRANT ALL ON public.sales_orders TO service_role;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders anon insert" ON public.sales_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "orders auth insert" ON public.sales_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orders read" ON public.sales_orders FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders admin update" ON public.sales_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Seed super admin user
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email='karuanakevin@gmail.com';
  IF uid IS NULL THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'karuanakevin@gmail.com', crypt('Kaka1963@', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Kevin Karuana"}'::jsonb, now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities(id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), uid, jsonb_build_object('sub', uid::text, 'email', 'karuanakevin@gmail.com'),
            'email', uid::text, now(), now(), now());
    INSERT INTO public.profiles(id, full_name, account_type) VALUES (uid, 'Kevin Karuana', 'personal') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin'::public.app_role) ON CONFLICT DO NOTHING;
END $$;
