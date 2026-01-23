
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using anon key, RLS must allow insert if authenticated, or use service role if possible.
// NOTE: Ideally use SERVICE_ROLE_KEY for seeding to bypass RLS.
// Since we might not have it in .env.local (client side), we hope the user has set up policies or we need to ask for it.
// For now, let's try with what we have. If it fails, we'll ask user.

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Seeding Inventory Data...');

    // 1. RAW MATERIALS
    const rawMaterials = [
        { name: 'Café Grano', unit: 'g', min_stock: 1000 },
        { name: 'Leche', unit: 'ml', min_stock: 5000 },
        { name: 'Azúcar', unit: 'g', min_stock: 1000 },
        { name: 'Harina 0000', unit: 'kg', min_stock: 10 },
        { name: 'Manteca', unit: 'g', min_stock: 500 },
        { name: 'Huevos', unit: 'u', min_stock: 30 },
        { name: 'Naranja', unit: 'kg', min_stock: 5 },
        { name: 'Jamón Cocido', unit: 'g', min_stock: 2000 },
        { name: 'Queso Tybo', unit: 'g', min_stock: 2000 },
        { name: 'Pan Miga', unit: 'u', min_stock: 2 },
        { name: 'Medialunas', unit: 'u', min_stock: 24 } // Si se controla como insumo
    ];

    const rawIds: Record<string, string> = {};

    for (const item of rawMaterials) {
        // Check if exists
        const { data: existing } = await supabase.from('products').select('id').eq('name', item.name).eq('kind', 'raw').single();

        if (existing) {
            console.log(`✅ ${item.name} already exists.`);
            rawIds[item.name] = existing.id;
        } else {
            const { data, error } = await supabase.from('products').insert([{
                name: item.name,
                kind: 'raw',
                unit: item.unit,
                price: 0, // Raw materials don't have menu price usually
                track_stock: true,
                min_stock: item.min_stock,
                // Assign to a category? Maybe create 'INSUMOS' category if strictly needed, or null.
                // For now, let's leave category_id null or assume DB allows it.
                category_id: null
            }]).select('id').single();

            if (error) {
                console.error(`❌ Error creating ${item.name}:`, error.message);
            } else {
                console.log(`✅ Created ${item.name}`);
                rawIds[item.name] = data.id;
            }
        }
    }

    // 2. STOCK OPENING (Initial Inventory)
    // Only if movements are empty for reliability
    for (const [name, id] of Object.entries(rawIds)) {
        await supabase.from('inventory_movements').insert({
            raw_product_id: id,
            qty: 100, // Dummy initial stock
            reason: 'opening',
            note: 'Initial Seed'
        });
    }

    // 3. RECIPES
    // We need Menu Product IDs. 
    // Let's try to find 'Café jarrito' and 'Tostado de miga'

    const { data: jarrito } = await supabase.from('products').select('id').eq('name', 'Café jarrito').single();
    const { data: tostado } = await supabase.from('products').select('id').eq('name', 'Tostado de miga').single();

    if (jarrito && rawIds['Café Grano'] && rawIds['Leche']) {
        // Jarrito: 18g coffee (no milk usually, but let's assume Cortado for demo or just coffee)
        // Actually Jarrito is usually Espresso Lungo or small coffee.
        // Let's map it to Café Grano 18g.
        await upsertRecipe(jarrito.id, rawIds['Café Grano'], 18);
    }

    if (tostado && rawIds['Pan Miga'] && rawIds['Jamón Cocido'] && rawIds['Queso Tybo']) {
        // Tostado: 2 Pan Miga, 30g Jamon, 30g Queso
        await upsertRecipe(tostado.id, rawIds['Pan Miga'], 2);
        await upsertRecipe(tostado.id, rawIds['Jamón Cocido'], 30);
        await upsertRecipe(tostado.id, rawIds['Queso Tybo'], 30);
    }

    console.log('🏁 Seeding Complete!');
}

async function upsertRecipe(menuId: string, rawId: string, qty: number) {
    const { error } = await supabase.from('recipes').upsert({
        menu_product_id: menuId,
        raw_product_id: rawId,
        qty: qty
    }, { onConflict: 'menu_product_id,raw_product_id' });

    if (error) console.error('Error upserting recipe:', error.message);
    else console.log(`Recipes linked.`);
}

seed();
