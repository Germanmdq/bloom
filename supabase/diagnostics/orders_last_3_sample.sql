-- Run in Supabase SQL Editor to inspect recent web vs POS orders (PRIORITY 1 debug).
SELECT
  id,
  order_type,
  delivery_type,
  status,
  customer_name,
  paid,
  created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 3;
