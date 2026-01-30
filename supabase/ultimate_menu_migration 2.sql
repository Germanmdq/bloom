-- SCRIPT DE MIGRACIÓN BLOOM (VERSIÓN ROBUSTA SIN DO $$)
-- Limpia y carga el menú completo en 4 categorías principales.

BEGIN;

-- 1. Limpieza total
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;

-- 2. Inserción de Categorías y Productos usando CTE
WITH categories_insert AS (
    INSERT INTO public.categories (name) VALUES 
    ('☕ CAFETERÍA & DULCES'),
    ('🥤 BEBIDAS & JUGOS'),
    ('🥐 COMBOS & PROMOS'),
    ('🍽️ COCINA & RESTÓ')
    RETURNING id, name
),
cat_ids AS (
    SELECT 
        (SELECT id FROM categories_insert WHERE name = '☕ CAFETERÍA & DULCES') as cat_cafe,
        (SELECT id FROM categories_insert WHERE name = '🥤 BEBIDAS & JUGOS') as cat_bebidas,
        (SELECT id FROM categories_insert WHERE name = '🥐 COMBOS & PROMOS') as cat_combos,
        (SELECT id FROM categories_insert WHERE name = '🍽️ COCINA & RESTÓ') as cat_resto
)
INSERT INTO public.products (name, description, price, category_id)
SELECT 
    data.name, 
    data.description, 
    data.price, 
    CASE 
        WHEN data.cat_group = 'cafe' THEN cat_ids.cat_cafe
        WHEN data.cat_group = 'bebidas' THEN cat_ids.cat_bebidas
        WHEN data.cat_group = 'combos' THEN cat_ids.cat_combos
        WHEN data.cat_group = 'resto' THEN cat_ids.cat_resto
    END
FROM (
    -- CAFETERÍA & DULCES
    VALUES 
    ('Café pocillo (espresso / cortado / ristretto)', '', 2300, 'cafe'),
    ('Café / cortado / lágrima (en jarrito)', '', 3000, 'cafe'),
    ('Café con crema (en jarrito)', '', 4100, 'cafe'),
    ('Café c/ leche - lágrima doble', '', 4100, 'cafe'),
    ('Café doble / cortado doble', '', 4300, 'cafe'),
    ('Té / té saborizado / mate cocido', '', 2800, 'cafe'),
    ('Té c/ leche / mate cocido c/ leche', '', 3200, 'cafe'),
    ('Capuccino', '', 6000, 'cafe'),
    ('Submarino', '', 6000, 'cafe'),
    ('Chocolatada', '', 4500, 'cafe'),
    ('Facturas (unidad)', '', 1000, 'cafe'),
    ('Porción de tostadas (2 uni)', '', 3900, 'cafe'),
    ('1/2 porp. tostadas (1 uni)', '', 2100, 'cafe'),
    ('Tarta de coco', '', 7500, 'cafe'),
    ('Lemon pie', '', 7500, 'cafe'),
    ('Brownie c/ merengue', '', 7500, 'cafe'),
    ('Budín de limón y amapolas', '', 3900, 'cafe'),
    ('Alfajores de seguido', '', 3500, 'cafe'),
    ('Alfajores de maicena', '', 3500, 'cafe'),
    ('Cookies / barritas', '', 2500, 'cafe'),
    ('Porciones sin TACC', '', 3900, 'cafe'),
    ('Flan casero', '', 3500, 'cafe'),
    ('Budín de pan', '', 3500, 'cafe'),
    ('Helado', '', 4000, 'cafe'),
    ('Ensalada de frutas', '', 4000, 'cafe'),

    -- BEBIDAS & JUGOS
    ('Exprimido de naranja', '', 5900, 'bebidas'),
    ('Medio exprimido', '', 3900, 'bebidas'),
    ('Naranjada', '', 6500, 'bebidas'),
    ('Limonada', '', 6500, 'bebidas'),
    ('Licuado (banana / frutilla)', '', 6500, 'bebidas'),
    ('Agua con o sin gas Ivess', '', 2500, 'bebidas'),
    ('Gaseosa línea Coca x 500 ml', '', 3900, 'bebidas'),
    ('Agua saborizada Aquarius x 500 ml', '', 3900, 'bebidas'),
    ('Cervezas (consultar)', '', 0, 'bebidas'),
    ('Vinos (consultar)', '', 0, 'bebidas'),

    -- COMBOS & PROMOS
    ('Des. Clásico', 'Infusión + 3 medialunas + 1/2 exprimido', 10500, 'combos'),
    ('Des. Saludable', 'Infusión + 2 tostadas pan campo c/ queso + 1/2 exprimido', 10500, 'combos'),
    ('Des. Continental', 'Infusión + 2 medialunas + 1/2 tostado + 1/2 exprimido', 11900, 'combos'),
    ('Des. Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + 1/2 exprimido', 14900, 'combos'),
    ('Yogurt c/ fruta y granola', '', 4900, 'combos'),
    ('Promo Café c/ leche + 2 facturas', '', 5500, 'combos'),
    ('Promo Café c/ leche + 2 med J&Q', '', 6900, 'combos'),
    ('Promo Jarrito + 1 factura', '', 3600, 'combos'),
    ('Promo Jarrito + 2 facturas', '', 4000, 'combos'),

    -- COCINA & RESTÓ
    ('Tostado de miga (Entero)', '', 5600, 'resto'),
    ('1/2 Tostado de miga', '', 3200, 'resto'),
    ('Tostado de pan árabe', '', 5600, 'resto'),
    ('Medialuna c/ J&Q', '', 2000, 'resto'),
    ('Tostadas c/ huevo revuelto y palta (2 uni)', '', 7400, 'resto'),
    ('Ensalada Caesar', 'lechuga / pollo / croutons / salsa caesar', 7400, 'resto'),
    ('Ensalada Bloom', 'lechuga / tomate / zanahoria / huevo / palta / choclo', 8600, 'resto'),
    ('Ensalada Liviana', 'rúcula / parmesano / cherry / champignones / queso', 8600, 'resto'),
    ('Ensalada Criolla', 'lechuga / tomate / cebolla', 6200, 'resto'),
    ('Ensalada Lechuga y tomate', '', 6000, 'resto'),
    ('Ensalada Zanahoria y huevo', '', 6000, 'resto'),
    ('Ensalada Rúcula y parmesano', '', 6500, 'resto'),
    ('Ensalada Zanahoria, huevo / choclo y lentejas', '', 7400, 'resto'),
    ('Tortilla Clásica', 'papa, huevo, cebolla y morrón', 7900, 'resto'),
    ('Tortilla Bloom', 'papa, huevo, cebolla, morrón, jamón y queso', 8900, 'resto'),
    ('Burger Sola', 'con papas fritas', 10900, 'resto'),
    ('Burger con jamón y queso', 'con papas fritas', 11900, 'resto'),
    ('Burger Completa', 'con papas fritas', 13200, 'resto'),
    ('Spaghettis', 'Salsa: boloñesa, filetto, blanca o mixta', 8900, 'resto'),
    ('Ñoquis de papa', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'resto'),
    ('Ravioles de calabaza y ricota', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'resto'),
    ('Sorrentinos de jamón y queso', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'resto'),
    ('Ravioles de verdura', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'resto'),
    ('Canelones de verdura y ricota', 'Salsa: boloñesa, filetto, blanca o mixta', 9900, 'resto'),
    ('Milanesa Sola', 'con papas fritas', 10900, 'resto'),
    ('Milanesa con jamón y queso', 'con papas fritas', 11900, 'resto'),
    ('Milanesa Napolitana especial', 'con papas fritas', 14500, 'resto'),
    ('Milanesa Completa', 'con papas fritas', 13200, 'resto'),
    ('Sándwich milanesa solo', '', 8900, 'resto'),
    ('Sándwich completo milanesa c/ fritas', 'lechuga, tomate, jamón y queso', 10900, 'resto'),
    ('Pizza Muzzarella', '', 10900, 'resto'),
    ('Pizza Especial', '', 11900, 'resto'),
    ('Pizza Napolitana', '', 11900, 'resto'),
    ('Pizza Rúcula, crudo y parmesano', '', 13900, 'resto'),
    ('Empanada (Unidad)', 'Carne / pollo / J&Q / choclo', 1600, 'resto'),
    ('1/2 Docena Empanadas', '', 8900, 'resto'),
    ('1 Docena Empanadas', '', 17000, 'resto'),
    ('Plato: Arroz con pollo', '', 11900, 'resto'),
    ('Plato: Albóndigas con puré', '', 11900, 'resto'),
    ('Plato: Pechuga grille c/ guarnición', 'papas fritas / ensalada o puré', 11900, 'resto'),
    ('Plato: Patamuslo c/ guarnición', 'papas fritas / ensalada o puré', 11900, 'resto'),
    ('Plato: Bife de costilla c/ guarnición', 'papas fritas / ensalada o puré', 13900, 'resto'),
    ('Plato: Pastel de papas', '', 11900, 'resto'),
    ('Plato: Filet de merluza empanado o romana', '', 12900, 'resto'),
    ('Plato: Lentejas a la española', '', 13900, 'resto')
) AS data(name, description, price, cat_group),
cat_ids;

COMMIT;
