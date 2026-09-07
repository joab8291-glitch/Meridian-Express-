CREATE TYPE public.mpesa_payment_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');

CREATE TABLE public.mpesa_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid,
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  phone_number text,
  amount numeric,
  result_code integer,
  result_description text,
  payment_status public.mpesa_payment_status NOT NULL DEFAULT 'pending',
  transaction_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mpesa_payments_order_fk FOREIGN KEY (order_id) REFERENCES public.sales_orders (id) ON DELETE SET NULL
);

CREATE INDEX mpesa_payments_order_id_idx ON public.mpesa_payments (order_id);
CREATE INDEX mpesa_payments_checkout_request_id_idx ON public.mpesa_payments (checkout_request_id);
CREATE INDEX mpesa_payments_merchant_request_id_idx ON public.mpesa_payments (merchant_request_id);
CREATE INDEX mpesa_payments_receipt_idx ON public.mpesa_payments (mpesa_receipt_number);
CREATE INDEX mpesa_payments_status_idx ON public.mpesa_payments (payment_status);

GRANT SELECT ON public.mpesa_payments TO authenticated;
GRANT ALL ON public.mpesa_payments TO service_role;

ALTER TABLE public.mpesa_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own M-PESA payments"
  ON public.mpesa_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sales_orders
      WHERE sales_orders.id = mpesa_payments.order_id
        AND sales_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all M-PESA payments"
  ON public.mpesa_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER mpesa_payments_touch_updated_at
  BEFORE UPDATE ON public.mpesa_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();