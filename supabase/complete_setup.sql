-- ==========================================
-- 1. TIPOS Y ENUMS
-- ==========================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'WAITER', 'KITCHEN', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.table_status AS ENUM ('FREE', 'OCCUPIED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'MERCADO_PAGO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- 2. TABLAS PRINCIPALES
-- ==========================================

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.user_role DEFAULT 'WAITER'::public.user_role NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mesas del Salón
CREATE TABLE IF NOT EXISTS public.salon_tables (
    id INTEGER PRIMARY KEY,
    status public.table_status DEFAULT 'FREE',
    total DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías de Productos
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos del Menú
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Órdenes / Ventas
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id INTEGER NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    waiter_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- 3. SEGURIDAD (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de Mesas
DROP POLICY IF EXISTS "Public read tables" ON public.salon_tables;
DROP POLICY IF EXISTS "Update tables" ON public.salon_tables;
CREATE POLICY "Full access tables" ON public.salon_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Categorías
DROP POLICY IF EXISTS "Read categories" ON public.categories;
CREATE POLICY "Full access categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Productos
DROP POLICY IF EXISTS "Read products" ON public.products;
CREATE POLICY "Full access products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Órdenes
DROP POLICY IF EXISTS "Authenticated create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated view orders" ON public.orders;
CREATE POLICY "Full access orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Perfiles
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
CREATE POLICY "Full access profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 4. TRIGGERS Y FUNCIONES
-- ==========================================

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'WAITER'::public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. SEMILLAS (DATA INICIAL CONSOLIDADA)
-- ==========================================

-- Crear 30 mesas iniciales
DO $$
BEGIN
    FOR i IN 1..30 LOOP
        INSERT INTO public.salon_tables (id, status, total)
        VALUES (i, 'FREE', 0)
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Limpiar productos y categorías
TRUNCATE public.categories CASCADE;
TRUNCATE public.products CASCADE;

-- Insertar Categoría Única y Productos
DO $$
DECLARE
    cat_id UUID;
BEGIN
    INSERT INTO public.categories (name) VALUES ('MENÚ COMPRETO') RETURNING id INTO cat_id;

    INSERT INTO public.products (name, price, category_id) VALUES 
    ('Café pocillo', 2300, cat_id),
    ('Café jarrito', 3000, cat_id),
    ('Café doble', 4300, cat_id),
    ('Café con leche', 4100, cat_id),
    ('Capuccino', 6000, cat_id),
    ('Submarino', 6000, cat_id),
    ('Té / Mate Cocido', 2800, cat_id),
    ('Factura (uni)', 1000, cat_id),
    ('Medialuna J&Q', 2000, cat_id),
    ('Tostado Miga', 5600, cat_id),
    ('1/2 Tostado Miga', 3200, cat_id),
    ('Tostado Árabe', 5600, cat_id),
    ('Tostadas Huevo/Palta', 7400, cat_id),
    ('Exprimido Naranja', 5900, cat_id),
    ('Licuado banana/fru', 6500, cat_id),
    ('Limonada', 6500, cat_id),
    ('Tarta Coco', 7500, cat_id),
    ('Lemon Pie', 7500, cat_id),
    ('Brownie Merengue', 7500, cat_id),
    ('Alfajor Maicena', 3500, cat_id),
    ('Cafe + 2 Facturas', 5500, cat_id),
    ('Cafe + 2 Med J&Q', 6900, cat_id),
    ('Jarrito + 1 Fact', 3600, cat_id),
    ('Ensalada Caesar', 7400, cat_id),
    ('Ensalada Bloom', 8600, cat_id),
    ('Tortilla Clásica', 7900, cat_id),
    ('Tortilla Bloom', 8900, cat_id),
    ('Burger Sola c/p', 10900, cat_id),
    ('Burger J&Q c/p', 11900, cat_id),
    ('Burger Comp c/p', 13200, cat_id),
    ('Milanesa Sola c/p', 10900, cat_id),
    ('Milanesa J&Q c/p', 11900, cat_id),
    ('Milanesa Napo esp', 14500, cat_id),
    ('Milanesa Comp c/p', 13200, cat_id),
    ('Spaghettis', 8900, cat_id),
    ('Ñoquis Papa', 9900, cat_id),
    ('Sorrentinos J&Q', 9900, cat_id),
    ('Pizza Muzzarella', 10900, cat_id),
    ('Pizza Especial', 11900, cat_id),
    ('Empanada (uni)', 1600, cat_id),
    ('Plato Diario', 11900, cat_id),
    ('Pastel de Papas', 11900, cat_id),
    ('Flan Casero', 3500, cat_id),
    ('Budín Pan', 3500, cat_id),
    ('Ensalada Frutas', 4000, cat_id),
    ('Agua c/s gas', 2500, cat_id),
    ('Coca-Cola 500', 3900, cat_id),
    ('Cerveza/Vino', 0, cat_id);
END $$;
