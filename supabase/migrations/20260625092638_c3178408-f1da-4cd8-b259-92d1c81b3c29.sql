
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS tracking_status text NOT NULL DEFAULT 'order_received',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_orders_user_id_idx ON public.sales_orders(user_id);

DROP POLICY IF EXISTS "Customers can view own orders" ON public.sales_orders;
CREATE POLICY "Customers can view own orders"
ON public.sales_orders
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());
