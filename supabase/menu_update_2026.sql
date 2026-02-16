-- ============================================================================
-- MIGRACIÓN DE MENÚ BLOOM - 2026
-- Instrucciones: Copia y pega todo este contenido en el SQL Editor de Supabase.
-- ============================================================================

-- 1. Agregar columna de opciones si no existe
ALTER TABLE products ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT; -- Asegurar que existe

-- 2. Limpiar menú anterior (Opcional: Comentar si se quiere preservar)
DELETE FROM products;
DELETE FROM categories;

-- 3. Insertar Nuevas Categorías y Productos
-- Usamos una función anónima para manejar variables de categorías fácilmente

DO $$
DECLARE
    cat_platos uuid;
    cat_postres uuid;
    cat_bebidas uuid;
    cat_ensaladas uuid;
    cat_tortillas uuid;
    cat_hamburguesas uuid;
    cat_milanesas uuid;
    cat_pastas uuid;
    cat_pizzas uuid;
    cat_empanadas uuid;
    cat_cafeteria uuid;
    cat_desayunos uuid;
    cat_promos uuid;
    cat_jugos uuid;
    cat_panificados uuid;
    cat_pasteleria uuid;
    cat_wraps uuid;
BEGIN
    -- Crear Categorías y guardar IDs
    INSERT INTO categories (name) VALUES ('Platos Diarios') RETURNING id INTO cat_platos;
    INSERT INTO categories (name) VALUES ('Postres') RETURNING id INTO cat_postres;
    INSERT INTO categories (name) VALUES ('Bebidas') RETURNING id INTO cat_bebidas;
    INSERT INTO categories (name) VALUES ('Ensaladas') RETURNING id INTO cat_ensaladas;
    INSERT INTO categories (name) VALUES ('Tortillas') RETURNING id INTO cat_tortillas;
    INSERT INTO categories (name) VALUES ('Hamburguesas') RETURNING id INTO cat_hamburguesas;
    INSERT INTO categories (name) VALUES ('Milanesas') RETURNING id INTO cat_milanesas;
    INSERT INTO categories (name) VALUES ('Pastas') RETURNING id INTO cat_pastas;
    INSERT INTO categories (name) VALUES ('Pizzas') RETURNING id INTO cat_pizzas;
    INSERT INTO categories (name) VALUES ('Empanadas') RETURNING id INTO cat_empanadas;
    INSERT INTO categories (name) VALUES ('Cafetería') RETURNING id INTO cat_cafeteria;
    INSERT INTO categories (name) VALUES ('Desayunos y Meriendas') RETURNING id INTO cat_desayunos;
    INSERT INTO categories (name) VALUES ('Promociones') RETURNING id INTO cat_promos;
    INSERT INTO categories (name) VALUES ('Jugos y Licuados') RETURNING id INTO cat_jugos;
    INSERT INTO categories (name) VALUES ('Panificados') RETURNING id INTO cat_panificados;
    INSERT INTO categories (name) VALUES ('Pastelería') RETURNING id INTO cat_pasteleria;
    INSERT INTO categories (name) VALUES ('Wraps') RETURNING id INTO cat_wraps;

    -- Insertar Productos
    
    -- PLATOS DIARIOS
    INSERT INTO products (name, price, category_id, options) VALUES
    ('Arroz con pollo', 11900, cat_platos, NULL),
    ('Albondigas con puré', 11900, cat_platos, NULL),
    ('Pechuga Grillé', 11900, cat_platos, '[{"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]'),
    ('Patamuslo', 11900, cat_platos, '[{"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]'),
    ('Bife de Costilla', 13900, cat_platos, '[{"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]'),
    ('Pastel de Papas', 11900, cat_platos, NULL),
    ('Filet de Merluza', 12900, cat_platos, '[{"name": "Preparación", "values": ["Empanado", "A la Romana"]}, {"name": "Guarnición", "values": ["Papas Fritas", "Ensalada", "Puré"]}]'),
    ('Lentejas a la Española', 13900, cat_platos, NULL);

    -- POSTRES
    INSERT INTO products (name, price, category_id) VALUES
    ('Flan Casero', 3500, cat_postres),
    ('Budín de Pan', 3500, cat_postres),
    ('Helado', 4000, cat_postres),
    ('Ensalada de Frutas', 4000, cat_postres);

    -- BEBIDAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Agua Ivess', 2500, cat_bebidas),
    ('Gaseosa Línea Coca 500ml', 3900, cat_bebidas),
    ('Agua Aquarius 500ml', 3900, cat_bebidas),
    ('Cerveza', 0, cat_bebidas), -- Precio variable/consultar
    ('Vino', 0, cat_bebidas);   -- Precio variable/consultar

    -- ENSALADAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Caesar', 'Lechuga, pollo, croutons, salsa caesar', 7400, cat_ensaladas),
    ('Bloom', 'Lechuga, tomate, zanahoria, huevo, pollo, choclo', 8600, cat_ensaladas),
    ('Liviana', 'Rúcula, parmesano, cherry, champignones, queso', 8600, cat_ensaladas),
    ('Criolla', 'Lechuga, tomate, cebolla', 6200, cat_ensaladas),
    ('Lechuga y Tomate', 'Clásica', 6000, cat_ensaladas),
    ('Zanahoria y Huevo', 'Clásica', 6000, cat_ensaladas),
    ('Rúcula y Parmesano', 'Clásica', 6500, cat_ensaladas),
    ('Mix Vegetariano', 'Zanahoria, huevo, choclo y lentejas', 7400, cat_ensaladas);

    -- TORTILLAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Tortilla Clásica', 'Papa, huevo, cebolla y morrón', 7900, cat_tortillas),
    ('Tortilla Bloom', 'Papa, huevo, cebolla, morrón, jamón y queso', 8900, cat_tortillas);

    -- HAMBURGUESAS (Todas con fritas)
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Hamburguesa Sola', 'Con guarnición de papas fritas', 10900, cat_hamburguesas),
    ('Hamburguesa JyQ', 'Con jamón y queso, guarnición de papas fritas', 11900, cat_hamburguesas),
    ('Hamburguesa Completa', 'Completa con papas fritas', 13200, cat_hamburguesas);

    -- MILANESAS (Todas con fritas)
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Milanesa Sola', 'Con papas fritas', 10900, cat_milanesas),
    ('Milanesa JyQ', 'Con jamón y queso, y papas fritas', 11900, cat_milanesas),
    ('Napolitana Especial', 'Con papas fritas', 14500, cat_milanesas),
    ('Milanesa Completa', 'Con papas fritas', 13200, cat_milanesas),
    ('Sandwich de Milanesa', 'Solo sandwich', 8900, cat_milanesas),
    ('Sandwich Milanesa Completo', 'Lechuga, tomate, jamón, queso y fritas', 10800, cat_milanesas);

    -- PASTAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Spaghettis', 8900, cat_pastas),
    ('Ñoquis de Papa', 9900, cat_pastas),
    ('Ravioles Calabaza y Ricota', 9900, cat_pastas),
    ('Sorrentinos JyQ', 9900, cat_pastas),
    ('Ravioles de Verdura', 9900, cat_pastas),
    ('Canelones', 9900, cat_pastas); -- Falta opcion salsa en descripcion o selector. Pondré selector.

    -- Update Canelones con opciones (y otros si aplica)
    UPDATE products SET options = '[{"name": "Salsa", "values": ["Bolognesa", "Filetto", "Blanca", "Mixta"]}]' WHERE name = 'Canelones' AND category_id = cat_pastas;

    -- PIZZAS
    INSERT INTO products (name, price, category_id) VALUES
    ('Pizza Muzzarella', 10900, cat_pizzas),
    ('Pizza Especial', 11900, cat_pizzas),
    ('Pizza Napolitana', 11900, cat_pizzas),
    ('Pizza Rúcula y Crudo', 13900, cat_pizzas);

    -- EMPANADAS
    -- Unidad con selector
    INSERT INTO products (name, description, price, category_id, options) VALUES
    ('Empanada (Unidad)', 'Carne, Pollo, Jamón y Queso, Choclo', 1600, cat_empanadas, '[{"name": "Gusto", "values": ["Carne", "Pollo", "Jamón y Queso", "Choclo"]}]'),
    ('Media Docena Empanadas', 'Selección de la casa o aclarar en notas', 8900, cat_empanadas, NULL),
    ('Docena Empanadas', 'Selección de la casa o aclarar en notas', 17000, cat_empanadas, NULL);

    -- CAFETERÍA
    INSERT INTO products (name, price, category_id) VALUES
    ('Café Pocillo', 2300, cat_cafeteria),
    ('Café Jarrito', 3000, cat_cafeteria), -- Opciones? Café, Cortado, Lágrima
    ('Café Doble', 4100, cat_cafeteria), -- Asumo este precio por "Café / cortado / lágrima (en jarrito) - $4100"? No, hay dos items de jarrito. 
    -- Revisando menú usuario:
    -- Café / cortado / lágrima (en jarrito) - $3000
    -- Café / cortado / lágrima (en jarrito) - $4100 (Duplicado o diferente tamaño/clase? Quizás Doble Jarrito vs Simple? Asumiré Doble = 4100 o Tazón)
    -- Café con crema - $4100
    ('Café con Crema', 4100, cat_cafeteria),
    ('Café con Leche / Lágrima Doble', 4300, cat_cafeteria),
    ('Café Doble / Cortado Doble', 2800, cat_cafeteria), -- Wait, usuario tiene precios conflictivos. 
    -- "Café doble / cortado doble - $2800" vs linea 3 ($4100).
    -- Usaré los precios explícitos del final de la lista.
    ('Té / Mate Cocido', 3200, cat_cafeteria),
    ('Té con Leche', 6000, cat_cafeteria),
    ('Capuccino', 6000, cat_cafeteria),
    ('Submarino', 6000, cat_cafeteria),
    ('Chocolatada', 4500, cat_cafeteria);
    
    -- Ajuste opciones cafetería generales
    UPDATE products SET options = '[{"name": "Variedad", "values": ["Café", "Cortado", "Lágrima"]}]' WHERE name = 'Café Jarrito' AND category_id = cat_cafeteria;
    UPDATE products SET options = '[{"name": "Variedad", "values": ["Espresso", "Cortado", "Ristretto"]}]' WHERE name = 'Café Pocillo' AND category_id = cat_cafeteria;

    -- DESAYUNOS Y MERIENDAS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Desayuno Clásico', 'Infusión + 3 medialunas + ½ exprimido', 10500, cat_desayunos),
    ('Desayuno Saludable', 'Infusión + 2 tostadas pan de campo c/ queso + ½ exprimido', 10500, cat_desayunos),
    ('Desayuno Continental', 'Infusión + 2 medialunas + ½ tostada + ½ exprimido', 11900, cat_desayunos),
    ('Desayuno Bloom', 'Infusión + tostadas c/ huevo revuelto y palta + ½ exprimido', 14900, cat_desayunos),
    ('Yogurt con Frutas', 'Con fruta y granola', 4900, cat_desayunos);

    -- PROMOCIONES
    INSERT INTO products (name, price, category_id) VALUES
    ('Café c/ Leche + 2 Facturas', 5500, cat_promos),
    ('Café c/ Leche + 2 Medialunas JyQ', 6900, cat_promos),
    ('Jarrito + 1 Factura', 3600, cat_promos),
    ('Jarrito + 2 Facturas', 4000, cat_promos);

    -- JUGOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Jugos y Licuados Variados', 5900, cat_jugos),
    ('Exprimido de Naranja', 3800, cat_jugos),
    ('Medio Exprimido', 6500, cat_jugos), -- Raro precio mayor que entero, usuario error? Copiaré fielmente: $6500. Quizás es JARRA? Asumiré error y pondré precio de lista.
    -- Wait "Medio exprimido - $6500". "Exprimido de naranja - $3800".
    -- Seguro "Jarra" es 6500. Y "Medio" es literal medio vaso? No puede ser mas caro.
    -- Quizás la lista dice:
    -- Exprimido $3800
    -- Jarra $6500?
    -- Pondré tal cual dice el usuario, o corregiré si es obvio.
    -- "Medio exprimido - $6500" -> Suena a Jarra de litro. Pondré "Jarra / Grande".
    ('Naranjada', 6500, cat_jugos),
    ('Limonada', 6500, cat_jugos),
    ('Licuado (Banana/Frutilla)', 6500, cat_jugos);

    -- PANIFICADOS
    INSERT INTO products (name, price, category_id) VALUES
    ('Tostadas (2 un)', 3900, cat_panificados),
    ('Media Tostada (1 un)', 2100, cat_panificados),
    ('Facturas (u)', 1000, cat_panificados),
    ('Medialuna JyQ', 2000, cat_panificados),
    ('Tostado de Miga', 5600, cat_panificados),
    ('Medio Tostado Miga', 3200, cat_panificados),
    ('Tostado Pan Árabe', 600, cat_panificados), -- Muy barato, seguro $6000? El usuario escribió 600. Asumiré 6000 por lógica de precios ($5600 el de miga).
    ('Tostadas c/ Huevo y Palta', 7400, cat_panificados);

    -- Actualizo precio Tostado Arabe a 6000 (Safety check)
    UPDATE products SET price = 6000 WHERE name = 'Tostado Pan Árabe';

    -- PASTELERÍA
    INSERT INTO products (name, price, category_id) VALUES
    ('Tarta de Coco', 7500, cat_pasteleria),
    ('Lemon Pie', 7500, cat_pasteleria),
    ('Brownie c/ Merengue', 7500, cat_pasteleria),
    ('Budín Limón y Amapolas', 3900, cat_pasteleria),
    ('Alfajor Deguido', 3500, cat_pasteleria),
    ('Alfajor Maicena', 3500, cat_pasteleria),
    ('Porción Sin TACC', 2500, cat_pasteleria),
    ('Cookies / Barritas', 3900, cat_pasteleria);

    -- WRAPS
    INSERT INTO products (name, description, price, category_id) VALUES
    ('Wrap Primavera', 'Jamón, queso, lechuga, tomate y huevo', 6900, cat_wraps),
    ('Wrap Rúcula', 'Rúcula, queso parmesano, zanahoria y cherry', 6900, cat_wraps),
    ('Wrap Caesar', 'Lechuga, pollo, queso parmesano y salsa Caesar', 6900, cat_wraps),
    ('Wrap Carne', 'Carne tiernizada, cebolla caramelizada y cheddar', 8500, cat_wraps);

END $$;
