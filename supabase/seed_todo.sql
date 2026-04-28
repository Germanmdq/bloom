-- ============================================
-- PASO 1: LIMPIAR POR SI ALGO QUEDO A MEDIAS
-- ============================================
DELETE FROM public.insumos;
DELETE FROM public.gastos_fijos;
DELETE FROM public.proveedores;

-- ============================================
-- PASO 2: PROVEEDORES
-- ============================================
INSERT INTO public.proveedores (nombre) VALUES
('Cabrales'),
('San Diego'),
('Caseria'),
('Tapamar'),
('Bimbo'),
('Los Pinos'),
('Carniceria'),
('Avicola'),
('Verduleria'),
('Distribuidora General');

-- ============================================
-- PASO 3: INSUMOS
-- ============================================
INSERT INTO public.insumos (nombre,unidad,stock_actual,stock_minimo,categoria,proveedor_id) VALUES
('Cafe en Grano','kg',0,10,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Azucar','kg',0,20,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Edulcorante','un',0,50,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Submarino','kg',0,5,'Cafeteria',(SELECT id FROM proveedores WHERE nombre='Cabrales' LIMIT 1)),
('Rapiditas','un',0,50,'Panificados',(SELECT id FROM proveedores WHERE nombre='Bimbo' LIMIT 1)),
('Pan Lactal','un',0,20,'Panificados',(SELECT id FROM proveedores WHERE nombre='Bimbo' LIMIT 1)),
('Pan de Miga','un',0,20,'Panificados',(SELECT id FROM proveedores WHERE nombre='Los Pinos' LIMIT 1)),
('Medialuna Manteca','un',0,100,'Panificados',(SELECT id FROM proveedores WHERE nombre='Los Pinos' LIMIT 1)),
('Pan Burger Brioche','un',0,80,'Panificados',(SELECT id FROM proveedores WHERE nombre='Los Pinos' LIMIT 1)),
('Lomo Limpio','kg',0,5,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Bife de Chorizo','kg',0,10,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Carne Picada','kg',0,15,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Bondiola de Cerdo','kg',0,8,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Panceta','kg',0,5,'Carniceria',(SELECT id FROM proveedores WHERE nombre='Carniceria' LIMIT 1)),
('Pollo Entero','kg',0,20,'Avicola',(SELECT id FROM proveedores WHERE nombre='Avicola' LIMIT 1)),
('Pechuga de Pollo','kg',0,15,'Avicola',(SELECT id FROM proveedores WHERE nombre='Avicola' LIMIT 1)),
('Huevo Blanco','un',0,180,'Avicola',(SELECT id FROM proveedores WHERE nombre='Avicola' LIMIT 1)),
('Papa','kg',0,100,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Cebolla','kg',0,40,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Tomate','kg',0,20,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Lechuga','kg',0,10,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Morron Rojo','kg',0,5,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Palta','kg',0,4,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Limon','kg',0,10,'Verduleria',(SELECT id FROM proveedores WHERE nombre='Verduleria' LIMIT 1)),
('Aceite Girasol','l',0,40,'Almacen',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Aceite Oliva','l',0,10,'Almacen',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Harina 0000','kg',0,50,'Almacen',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Arroz','kg',0,20,'Almacen',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Fideos','kg',0,10,'Almacen',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Sal Fina','kg',0,10,'Almacen',(SELECT id FROM proveedores WHERE nombre='San Diego' LIMIT 1)),
('Leche Entera','l',0,60,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Caseria' LIMIT 1)),
('Crema de Leche','l',0,10,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Caseria' LIMIT 1)),
('Manteca','kg',0,10,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Caseria' LIMIT 1)),
('Queso Muzzarella','kg',0,30,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Caseria' LIMIT 1)),
('Queso Cheddar','kg',0,5,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Caseria' LIMIT 1)),
('Jamon Cocido','kg',0,15,'Lacteos',(SELECT id FROM proveedores WHERE nombre='Caseria' LIMIT 1)),
('Mayonesa','kg',0,5,'Aderezos',(SELECT id FROM proveedores WHERE nombre='Tapamar' LIMIT 1)),
('Mostaza','kg',0,3,'Aderezos',(SELECT id FROM proveedores WHERE nombre='Tapamar' LIMIT 1)),
('Ketchup','kg',0,3,'Aderezos',(SELECT id FROM proveedores WHERE nombre='Tapamar' LIMIT 1)),
('Dulce de Leche','kg',0,10,'Aderezos',(SELECT id FROM proveedores WHERE nombre='Tapamar' LIMIT 1));

-- ============================================
-- PASO 4: GASTOS FIJOS
-- ============================================
INSERT INTO public.gastos_fijos (nombre, monto, fecha_vencimiento, estado, categoria) VALUES
('Alquiler', 2000000, '2026-05-05', 'pendiente', 'urgente'),
('Luz', 1000000, '2026-05-10', 'pendiente', 'urgente'),
('Sueldo Carla', 6875000, '2026-05-05', 'pendiente', 'urgente'),
('Sueldo Alina', 6875000, '2026-05-05', 'pendiente', 'urgente'),
('Expensas', 248000, '2026-05-15', 'pendiente', 'normal'),
('Contador', 700000, '2026-05-10', 'pendiente', 'normal'),
('Tasas Municipales', 0, '2026-05-15', 'pendiente', 'normal'),
('OSSE Agua', 0, '2026-05-20', 'pendiente', 'normal'),
('Gas', 0, '2026-05-15', 'pendiente', 'normal'),
('Contenedor', 0, '2026-05-15', 'pendiente', 'normal');

-- ============================================
-- PASO 5: INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_insumos_proveedor ON public.insumos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON public.compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra ON public.compras_detalle(compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_insumo ON public.compras_detalle(insumo_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_estado ON public.gastos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_vencimiento ON public.gastos_fijos(fecha_vencimiento);
