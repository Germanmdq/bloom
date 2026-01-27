
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deduplicate() {
    console.log("Checking for duplicates...");

    // Fetch all products
    const { data: products, error } = await supabase.from('products').select('id, name, category_id, created_at').order('created_at', { ascending: false });

    if (error || !products) {
        console.error("Error fetching products:", error);
        return;
    }

    const seen = new Set<string>();
    const duplicates = [];

    for (const p of products) {
        const key = `${p.category_id}-${p.name.toLowerCase().trim()}`;
        if (seen.has(key)) {
            duplicates.push(p.id);
        } else {
            seen.add(key);
        }
    }

    console.log(`Found ${duplicates.length} duplicates.`);

    if (duplicates.length > 0) {
        const { error: delError } = await supabase.from('products').delete().in('id', duplicates);
        if (delError) {
            console.error("Error deleting duplicates:", delError);
        } else {
            console.log("Deleted duplicates successfully.");
        }
    } else {
        console.log("No duplicates found.");
    }
}

deduplicate();
