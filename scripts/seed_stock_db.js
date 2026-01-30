const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
    console.log("🌱 Seeding stock...");

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const products = [
        // 1. BEBIDAS (Insumos de Reventa)
        { name: 'Agua mineral 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Agua con gas 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Coca Cola 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Coca Cola Zero 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Sprite 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Sprite Zero 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Fanta 500ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Agua Saborizada Naranja', kind: 'raw', unit: 'u', track_stock: true, min_stock: 12, price: 0 },
        { name: 'Agua Saborizada Pomelo', kind: 'raw', unit: 'u', track_stock: true, min_stock: 12, price: 0 },
        { name: 'Agua Saborizada Manzana', kind: 'raw', unit: 'u', track_stock: true, min_stock: 12, price: 0 },
        { name: 'Cerveza Lata 473ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Cerveza Botella 1L', kind: 'raw', unit: 'u', track_stock: true, min_stock: 12, price: 0 },
        { name: 'Vino Malbec 750ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 6, price: 0 },
        { name: 'Vino Blanco 750ml', kind: 'raw', unit: 'u', track_stock: true, min_stock: 6, price: 0 },

        // 2. VEGETALES Y FRUTAS
        { name: 'Limón', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Banana', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Frutilla', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 2, price: 0 },
        { name: 'Lechuga', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Tomate', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Tomate Cherry', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 2, price: 0 },
        { name: 'Zanahoria', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Palta', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Choclo', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Rúcula', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 3, price: 0 },
        { name: 'Cebolla', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Morrón', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Papa', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 50, price: 0 },
        { name: 'Calabaza', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Acelga/Espinaca', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Champignones', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 2, price: 0 },

        // 3. CARNES, PESCADOS Y HUEVOS
        { name: 'Pollo (Pechuga/Muslo)', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 20, price: 0 },
        { name: 'Carne Picada', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Nalga (Milanesa)', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 15, price: 0 },
        { name: 'Bife de Costilla', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Jamón Crudo', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 2, price: 0 },
        { name: 'Filet de Merluza', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Huevos', kind: 'raw', unit: 'u', track_stock: true, min_stock: 100, price: 0 },

        // 4. LÁCTEOS Y FIAMBRES
        { name: 'Leche', kind: 'raw', unit: 'l', track_stock: true, min_stock: 50, price: 0 },
        { name: 'Manteca', kind: 'raw', unit: 'g', track_stock: true, min_stock: 2000, price: 0 },
        { name: 'Queso Tybo (Barra)', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Jamón Cocido', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Queso Parmesano', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Queso Muzzarella', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 20, price: 0 },
        { name: 'Ricota', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Dulce de Leche', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Crema de Leche', kind: 'raw', unit: 'ml', track_stock: true, min_stock: 5000, price: 0 },

        // 5. ALMACÉN Y VARIOS
        { name: 'Café Grano', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Azúcar', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Chocolate Taza/Submarino', kind: 'raw', unit: 'g', track_stock: true, min_stock: 1000, price: 0 },
        { name: 'Té (Saquitos)', kind: 'raw', unit: 'u', track_stock: true, min_stock: 100, price: 0 },
        { name: 'Yerba Mate', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Pan Rallado', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Arroz', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Lentejas', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Fideos/Pasta Seca', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Salsa de Tomate', kind: 'raw', unit: 'l', track_stock: true, min_stock: 20, price: 0 },
        { name: 'Aceite', kind: 'raw', unit: 'l', track_stock: true, min_stock: 50, price: 0 },
        { name: 'Vinagre/Aceto', kind: 'raw', unit: 'l', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Sal', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Granola', kind: 'raw', unit: 'g', track_stock: true, min_stock: 2000, price: 0 },
        { name: 'Cacao en polvo', kind: 'raw', unit: 'g', track_stock: true, min_stock: 1000, price: 0 },
        { name: 'Croutons', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 2, price: 0 },
        { name: 'Salsa Caesar', kind: 'raw', unit: 'l', track_stock: true, min_stock: 5, price: 0 },

        // 6. PANIFICADOS
        { name: 'Pan Miga', kind: 'raw', unit: 'u', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Pan Burger', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Pan Árabe', kind: 'raw', unit: 'u', track_stock: true, min_stock: 24, price: 0 },
        { name: 'Pan de Campo', kind: 'raw', unit: 'kg', track_stock: true, min_stock: 5, price: 0 },
        { name: 'Tapas de Empanada', kind: 'raw', unit: 'u', track_stock: true, min_stock: 100, price: 0 },
        { name: 'Prepizza', kind: 'raw', unit: 'u', track_stock: true, min_stock: 10, price: 0 },
        { name: 'Medialunas', kind: 'raw', unit: 'u', track_stock: true, min_stock: 50, price: 0 },
        { name: 'Facturas Surtidas', kind: 'raw', unit: 'u', track_stock: true, min_stock: 50, price: 0 }
    ];

    for (const item of products) {
        // 1. Insert/Get Product
        let { data: existing } = await supabase.from('products').select('id').eq('name', item.name).single();

        let productId;
        if (!existing) {
            const { data: inserted, error } = await supabase.from('products').insert([item]).select().single();
            if (error) {
                console.error(`Error inserting ${item.name}:`, error.message);
                continue;
            }
            productId = inserted.id;
            console.log(`Created: ${item.name}`);
        } else {
            productId = existing.id;
            console.log(`Exists: ${item.name}`);
        }

        // 2. Add Opening Stock if none exists
        const { data: movement } = await supabase
            .from('inventory_movements')
            .select('id')
            .eq('raw_product_id', productId)
            .limit(1);

        if (!movement || movement.length === 0) {
            await supabase.from('inventory_movements').insert([{
                raw_product_id: productId,
                qty: 500,
                reason: 'opening',
                note: 'Stock Inicial Automático'
            }]);
            console.log(`  -> Add stock 500 for ${item.name}`);
        }
    }

    console.log("✅ Seed complete.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
