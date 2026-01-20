
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const categories = [
    "Ensaladas",
    "Tortilla",
    "Hamburguesas",
    "Pastas",
    "Milanesas",
    "Pizzas",
    "Empanadas",
    "Nuestros Platos Diarios",
    "Postres",
    "Bebidas",
    "Cafetería",
    "Desayuno y merienda",
    "Promociones",
    "Jugos y licuados",
    "Panificados",
    "Pastelería"
];

const dailyDishes = [
    { name: "Arroz con pollo", price: 0 },
    { name: "Albóndigas con puré", price: 0 },
    { name: "Pechuga grillé con guarnición", price: 0 },
    { name: "Bife de costilla con guarnición", price: 0 },
    { name: "Pastel de papas", price: 0 }
];

async function seed() {
    console.log("Seeding Database...");

    // 1. Create/Get Categories
    const catMap: Record<string, string> = {};

    for (const name of categories) {
        // Check if exists
        let { data: existing } = await supabase.from('categories').select('id').eq('name', name).single();

        if (!existing) {
            console.log(`Creating category: ${name}`);
            const { data: newCat, error } = await supabase.from('categories').insert([{ name }]).select().single();
            if (error) {
                console.error(`Error creating ${name}:`, error.message);
                continue;
            }
            existing = newCat;
        } else {
            console.log(`Category exists: ${name}`);
        }

        if (existing) catMap[name] = existing.id;
    }

    // 2. Add Daily Dishes
    const dailyCatId = catMap["Nuestros Platos Diarios"];
    if (dailyCatId) {
        for (const prod of dailyDishes) {
            const { error } = await supabase.from('products').insert([{
                name: prod.name,
                price: prod.price, // Default price, can be edited later
                category_id: dailyCatId,
                active: true
            }]);

            if (error) console.error(`Error adding product ${prod.name}:`, error.message);
            else console.log(`Added product: ${prod.name}`);
        }
    }

    console.log("Done!");
}

seed();
