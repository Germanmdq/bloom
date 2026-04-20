-- ============================================================
--  INSPECCIÓN DE BASE DE DATOS BLOOM
--  Pegar en Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. CONTEOS DE TABLAS PRINCIPALES ────────────────────────
SELECT 'orders'         AS tabla, COUNT(*)::int AS total FROM orders
UNION ALL
SELECT 'products',        COUNT(*) FROM products
UNION ALL
SELECT 'categories',      COUNT(*) FROM categories
UNION ALL
SELECT 'salon_tables',    COUNT(*) FROM salon_tables
UNION ALL
SELECT 'kitchen_tickets', COUNT(*) FROM kitchen_tickets
UNION ALL
SELECT 'profiles',        COUNT(*) FROM profiles
UNION ALL
SELECT 'reservations',    COUNT(*) FROM reservations
ORDER BY tabla;

-- ── 2. ESTADO DE MESAS ──────────────────────────────────────
SELECT
  status,
  order_type,
  COUNT(*)::int AS cantidad
FROM salon_tables
GROUP BY status, order_type
ORDER BY status, order_type;

-- ── 3. MESAS OCUPADAS (detalle) ─────────────────────────────
SELECT
  id,
  status,
  order_type,
  total,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutos_abierta
FROM salon_tables
WHERE status = 'OCCUPIED'
ORDER BY id;

-- ── 4. ÚLTIMOS 15 PEDIDOS ───────────────────────────────────
SELECT
  id,
  created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' AS fecha_local,
  table_id,
  order_type,
  delivery_type,
  status,
  paid,
  total,
  payment_method,
  customer_name
FROM orders
ORDER BY created_at DESC
LIMIT 15;

-- ── 5. PEDIDOS WEB SIN SLOT EN SALON_TABLES ─────────────────
SELECT
  o.id,
  o.table_id,
  o.order_type,
  o.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' AS fecha_local
FROM orders o
WHERE o.order_type = 'web'
  AND o.table_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM salon_tables st WHERE st.id = o.table_id
  )
ORDER BY o.created_at DESC
LIMIT 20;

-- ── 6. PRODUCTOS SIN IMAGEN ─────────────────────────────────
SELECT
  p.id,
  p.name,
  p.active,
  c.name AS categoria
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.image_url IS NULL OR TRIM(p.image_url) = ''
ORDER BY c.name, p.name;

-- ── 7. RESUMEN DE PRODUCTOS POR CATEGORÍA ───────────────────
SELECT
  c.name AS categoria,
  COUNT(p.id)::int                                 AS total,
  COUNT(p.id) FILTER (WHERE p.active)::int         AS activos,
  COUNT(p.id) FILTER (WHERE NOT p.active)::int     AS inactivos,
  COUNT(p.id) FILTER (WHERE p.image_url IS NULL OR TRIM(p.image_url) = '')::int AS sin_imagen
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- ── 8. KITCHEN TICKETS PENDIENTES ───────────────────────────
SELECT
  id,
  table_id,
  status,
  created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' AS fecha_local
FROM kitchen_tickets
WHERE status <> 'DONE'
ORDER BY created_at DESC
LIMIT 20;

-- ── 9. ERRORES POTENCIALES: PEDIDOS SIN TOTAL ───────────────
SELECT id, created_at, table_id, order_type, total
FROM orders
WHERE total IS NULL OR total = 0
ORDER BY created_at DESC
LIMIT 10;
